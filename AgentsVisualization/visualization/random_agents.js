"use strict";

// Import necessary libraries
import * as twgl from "twgl.js";
import GUI from "lil-gui";
import vs_phong from "./shaders/vs_phong.glsl?raw";
import fs_phong from "./shaders/fs_phong.glsl?raw";

// Server URI
const agent_server_uri = "http://localhost:8585/";

// Arrays for entities
const obstacles = [];
const destinations = [];
const trafficLights = [];
const roads = [];

// Object for cars
const cars = {};

// Mapa data
const mapa = [
  ">>>>>>>>>>>>>>>d>>>>>>>>vv",
  ">>>>>>>>>>>>>>>d>>>>>>>>vv",
  "^^##D###vv######AA#####Dvv",
  "^^######vv######^^######vv",
  "^^######vvD#####^^######vv",
  "^^######vv######^^######vv",
  "^^######vv######^^######vv",
  "^^###D##BB######^^####D#vv",
  "^^i<<<<<<<i<<<<<<<i<<<<<vv",
  "^^i<<<<<<<i<<<<<<<i<<<<<vv",
  "AA######vv######AA######vv",
  "^^######vv######^^######vv",
  "^^######vv######^^######vv",
  "^^D#####vv#####D^^######vv",
  "^^######vv######^^######vv",
  "^^######BB######^^######BB",
  "^^>>>>>d>>>>>>>>>>>>>>>dvv",
  "^^>>>>>d>>>>>>>>>>>>>>>dvv",
  "^^######vv####D#########vv",
  "^^######vv##############vv",
  "^^#####Dvv#############Dvv",
  "^^######vv##############vv",
  "^^######vv##############vv",
  "^^######BB#########D####vv",
  "^^<<<<<<<<i<<<<<<<<<<<<<<<",
  "^^<<<<<<<<i<<<<<<<<<<<<<<<",
];

// WebGL variables
let gl, programInfo, carBufferInfo, cubeBufferInfo, obstacleBufferInfo, destinationBufferInfo;
let carVAO, cubeVAO, obstacleVAO, destinationVAO;

// Camera settings
let cameraPosition = { x: 10, y: 40, z: 20 };
let frameCount = 0;
let framesSinceUpdate = 0;

// Lighting Settings
const lightingSettings = {
  ambientLight: [0.2, 0.2, 0.2, 1.0],
  diffuseLight: [0.7, 0.7, 0.7, 1.0],
  specularLight: [1.0, 1.0, 1.0, 1.0],
  lightPosition: { x: 7, y: 10, z: 7 },
};

// Color array for cars
const carColors = [
  [1, 0, 0, 1],    // Red
  [0, 1, 0, 1],    // Green
  [0, 0, 1, 1],    // Blue
  [1, 1, 0, 1],    // Yellow
  [1, 0, 1, 1],    // Magenta
  [0, 1, 1, 1],    // Cyan
  [0.5, 0.5, 0.5, 1],  // Gray
  [1, 0.5, 0, 1],  // Orange
  [0.5, 0, 0.5, 1],    // Purple
];

// Main function
async function main() {
  const canvas = document.querySelector("canvas");
  gl = canvas.getContext("webgl2");
  if (!gl) {
    console.error("WebGL2 not supported");
    return;
  }

  // Compile shaders and link program
  programInfo = twgl.createProgramInfo(gl, [vs_phong, fs_phong]);

  // Load and parse car model
  const carObjContent = await loadOBJFile("./objects/coche.obj");
  if (carObjContent) {
    const carVertexData = parseOBJ(carObjContent);
    if (carVertexData) {
      console.log("Parsed Car Model Data:", carVertexData);
      validateVertexData(carVertexData);
      carBufferInfo = twgl.createBufferInfoFromArrays(gl, carVertexData);
      carVAO = twgl.createVAOFromBufferInfo(gl, programInfo, carBufferInfo);
    }
  }

  // Load and parse obstacle model (Edificio)
  const obstacleObjContent = await loadOBJFile("./objects/edificio.obj");
  if (obstacleObjContent) {
    const obstacleVertexData = parseOBJ(obstacleObjContent);
    if (obstacleVertexData) {
      console.log("Parsed Obstacle Model Data:", obstacleVertexData);
      validateVertexData(obstacleVertexData);
      obstacleBufferInfo = twgl.createBufferInfoFromArrays(
        gl,
        obstacleVertexData
      );
      obstacleVAO = twgl.createVAOFromBufferInfo(
        gl,
        programInfo,
        obstacleBufferInfo
      );
    }
  }

  // Load and parse destination model
  const destinationObjContent = await loadOBJFile("./objects/destino.obj");
  if (destinationObjContent) {
    const destinationVertexData = parseOBJ(destinationObjContent);
    if (destinationVertexData) {
      console.log("Parsed Destination Model Data:", destinationVertexData);
      validateVertexData(destinationVertexData);
      destinationBufferInfo = twgl.createBufferInfoFromArrays(
        gl,
        destinationVertexData
      );
      destinationVAO = twgl.createVAOFromBufferInfo(
        gl,
        programInfo,
        destinationBufferInfo
      );
    }
  }

  // Generate cube data for traffic lights and roads
  const cubeData = generateCubeData(1);
  cubeBufferInfo = twgl.createBufferInfoFromArrays(gl, cubeData);
  cubeVAO = twgl.createVAOFromBufferInfo(gl, programInfo, cubeBufferInfo);

  // Initialize model on the server and fetch initial entities
  await initModel();
  await fetchEntities();

  // Setup the GUI for camera and lighting controls
  setupGUI();

  // Start rendering loop
  drawScene();
}

// Updates agents' positions
async function update() {
  try {
    const response = await fetch(agent_server_uri + "update");
    if (response.ok) {
      await fetchDynamicAgents();
    }
  } catch (error) {
    console.error("Error updating agents:", error);
  }
}

// Validate the vertex data for consistency
function validateVertexData(data) {
  if (!data) {
    console.error("Invalid vertex data.");
    return;
  }
  console.assert(data.a_position.data.length > 0, "Missing position data");
  console.assert(data.indices.data.length > 0, "Missing indices");
  console.assert(
    data.a_normal.data.length / 3 === data.a_position.data.length / 3,
    "Mismatch between normals and positions"
  );
}

// Load the `.obj` file
async function loadOBJFile(filename) {
  try {
    const response = await fetch(filename);
    if (!response.ok) throw new Error(`Failed to load ${filename}`);
    const objContent = await response.text();
    return objContent; // Return raw string
  } catch (error) {
    console.error("Error loading OBJ file:", error);
    return null;
  }
}

// Parse the `.obj` file content
function parseOBJ(objContent) {
  if (typeof objContent !== "string") {
    console.error("OBJ content is not a string");
    return null;
  }

  const positions = [];
  const normals = [];
  const texCoords = [];
  const positionData = [];
  const normalData = [];
  const texCoordData = [];
  const colorData = [];
  const indices = [];

  const lines = objContent.split("\n");
  let vertexIndex = 0;

  lines.forEach((line) => {
    const parts = line.trim().split(" ");
    if (parts.length === 0) return;
    switch (parts[0]) {
      case "v": // Vertex positions
        positions.push(parts.slice(1).map(parseFloat));
        break;
      case "vn": // Vertex normals
        normals.push(parts.slice(1).map(parseFloat));
        break;
      case "vt": // Texture coordinates
        texCoords.push(parts.slice(1).map(parseFloat));
        break;
      case "f": // Faces
        const vertices = parts.slice(1);
        vertices.forEach((vertex) => {
          const [vIdx, vtIdx, vnIdx] = vertex
            .split("/")
            .map((n) => (n ? parseInt(n, 10) - 1 : undefined));

          // Add position data
          if (positions[vIdx]) {
            positionData.push(...positions[vIdx]);
          } else {
            console.error("Missing position for vertex", vIdx);
            positionData.push(0, 0, 0, 0); // Default fallback
          }

          // Add texture coordinates (use a default if missing)
          if (vtIdx !== undefined && texCoords[vtIdx]) {
            texCoordData.push(...texCoords[vtIdx]);
          } else {
            texCoordData.push(0, 0); // Default texture coordinates
          }

          // Add normal data (use a default normal if missing)
          if (vnIdx !== undefined && normals[vnIdx]) {
            normalData.push(...normals[vnIdx]);
          } else {
            normalData.push(0, 0, 1); // Default normal
          }

          // Add default color (e.g., gray)
          colorData.push(0.5, 0.5, 0.5, 1);

          // Track indices
          indices.push(vertexIndex++);
        });
        break;
    }
  });

  // Ensure all arrays are consistent
  const vertexCount = positionData.length / 3;
  while (normalData.length / 3 < vertexCount) normalData.push(0, 0, 1);
  while (texCoordData.length / 2 < vertexCount) texCoordData.push(0, 0);
  while (colorData.length / 4 < vertexCount) colorData.push(0.5, 0.5, 0.5, 1);

  return {
    a_position: { numComponents: 3, data: positionData },
    a_normal: { numComponents: 3, data: normalData },
    a_texCoord: { numComponents: 2, data: texCoordData },
    a_color: { numComponents: 4, data: colorData },
    indices: { numComponents: 3, data: indices },
  };
}

// Generate cube vertex data
function generateCubeData(size) {
  return {
    a_position: {
      numComponents: 3,
      data: [
        // Front face
        -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5,
        // Back face
        -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5,
        // Top face
        -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, -0.5,
        // Bottom face
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5,
        // Right face
        0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, 0.5, 0.5, 0.5, -0.5, 0.5,
        // Left face
        -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5, 0.5, -0.5,
      ].map((v) => v * size),
    },
    a_normal: {
      numComponents: 3,
      data: [
        // Front face normals
        0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1,
        // Back face normals
        0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1,
        // Top face normals
        0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0,
        // Bottom face normals
        0, -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0,
        // Right face normals
        1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0,
        // Left face normals
        -1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0,
      ],
    },
    a_texCoord: {
      numComponents: 2,
      data: Array(24).fill([0, 0]).flat(),
    },
    a_color: {
      numComponents: 4,
      data: Array(24).fill([1.0, 1.0, 1.0, 1.0]).flat(),
    },
    indices: {
      numComponents: 3,
      data: [
        0,
        1,
        2,
        0,
        2,
        3, // Front
        4,
        5,
        6,
        4,
        6,
        7, // Back
        8,
        9,
        10,
        8,
        10,
        11, // Top
        12,
        13,
        14,
        12,
        14,
        15, // Bottom
        16,
        17,
        18,
        16,
        18,
        19, // Right
        20,
        21,
        22,
        20,
        22,
        23, // Left
      ],
    },
  };
}

// Initialize model on the server
async function initModel() {
  try {
    const response = await fetch(`${agent_server_uri}init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapa: mapa }),
    });
    if (!response.ok) {
      console.error("Error initializing model.");
    }
  } catch (error) {
    console.error("Error initializing model:", error);
  }
}

// Fetch all entities
async function fetchEntities() {
  await Promise.all([fetchStaticAgents(), fetchDynamicAgents()]);
}

// Fetch static agents
async function fetchStaticAgents() {
  try {
    const response = await fetch(`${agent_server_uri}getStaticAgents`);
    if (!response.ok) throw new Error("Failed to fetch static agents.");
    const result = await response.json();
    const staticAgents = result.staticAgents;

    // Clear existing arrays
    obstacles.length = 0;
    destinations.length = 0;
    roads.length = 0;

    // Process staticAgents
    staticAgents.forEach((agent) => {
      const agentType = agent.type;
      const pos = agent.pos; // [x, y]
      const x = pos[0];
      const z = pos[1];
      const y = 0; // Assuming y = 0

      if (agentType === "Edificio") {
        obstacles.push({ x: x, y: y, z: z });
      } else if (agentType === "Destino") {
        destinations.push({ x: x, y: y, z: z });
      } else if (agentType === "Calle") {
        roads.push({
          x: x,
          y: y,
          z: z,
          direction: agent.direction,
        });
      }
    });
  } catch (error) {
    console.error("Error fetching static agents:", error);
  }
}

// Fetch dynamic agents
async function fetchDynamicAgents() {
  try {
    const response = await fetch(`${agent_server_uri}getDynamicAgents`);
    if (!response.ok) throw new Error("Failed to fetch dynamic agents.");
    const result = await response.json();
    const dynamicAgents = result.dynamicAgents;

    // Clear trafficLights array
    trafficLights.length = 0;

    // Update 'cars' and 'trafficLights'
    const newCarIds = [];
    dynamicAgents.forEach((agent) => {
      const agentType = agent.type;
      const pos = agent.pos; // [x, y]
      const x = pos[0];
      const z = pos[1];
      const y = 0; // Assuming y = 0

      if (agentType === "Coche") {
        const carId = agent.id;

        if (cars[carId]) {
          // Existing car: update previous and current positions
          cars[carId].prevX = cars[carId].x;
          cars[carId].prevY = cars[carId].y;
          cars[carId].prevZ = cars[carId].z;
          cars[carId].x = x;
          cars[carId].y = y;
          cars[carId].z = z;
          cars[carId].interpolation = 0; // Reset interpolation factor
        } else {
          // New car: initialize positions and assign a random color
          const color = carColors[Math.floor(Math.random() * carColors.length)];
          cars[carId] = {
            id: carId,
            x: x,
            y: y,
            z: z,
            prevX: x,
            prevY: y,
            prevZ: z,
            lastAngle: 0, // Initialize last known angle
            interpolation: 0, // Initialize interpolation factor
            color: color, // Assign random color
          };
        }
        newCarIds.push(carId);
      } else if (agentType === "Semaforo") {
        trafficLights.push({
          x: x,
          y: y + 1, // Elevar la posición en 'y' una unidad
          z: z,
          state: agent.state, // Use agent.green
        });
      }
    });

    // Remove cars that no longer exist
    Object.keys(cars).forEach((carId) => {
      if (!newCarIds.includes(carId)) {
        delete cars[carId];
      }
    });
  } catch (error) {
    console.error("Error fetching dynamic agents:", error);
  }
}

async function fetchStats() {
  try {
    const response = await fetch(`${agent_server_uri}getStats`);
    if (!response.ok) throw new Error("Failed to fetch stats.");
    const stats = await response.json();
    return stats;
  } catch (error) {
    console.error("Error fetching stats:", error);
    return null;
  }
}

// Render the scene
async function drawScene() {
  twgl.resizeCanvasToDisplaySize(gl.canvas);
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.enable(gl.DEPTH_TEST);
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
  gl.useProgram(programInfo.program);

  const viewProjectionMatrix = setupCamera();

  // Calculate camera position in world space
  const cameraPositionVector = [
    cameraPosition.x,
    cameraPosition.y,
    cameraPosition.z,
  ];

  // Set global lighting uniforms
  twgl.setUniforms(programInfo, {
    u_viewWorldPosition: cameraPositionVector,
    u_lightWorldPosition: [
      lightingSettings.lightPosition.x,
      lightingSettings.lightPosition.y,
      lightingSettings.lightPosition.z,
    ],
    u_ambientLight: lightingSettings.ambientLight,
    u_diffuseLight: lightingSettings.diffuseLight,
    u_specularLight: lightingSettings.specularLight,
  });

  drawEntities(viewProjectionMatrix);

  frameCount++;
  framesSinceUpdate++; // Increment frames since last update

  if (frameCount % 30 === 0) {
    frameCount = 0;
    framesSinceUpdate = 0; // Reset frames since last update
    await update();

    // Obtener y mostrar las estadísticas
    const stats = await fetchStats();
    if (stats) {
      updateStatsDisplay(stats);
    }
  }

  requestAnimationFrame(drawScene);
}

// Función para actualizar la visualización de estadísticas
function updateStatsDisplay(stats) {
  const statsDiv = document.getElementById("stats");
  if (statsDiv) {
    statsDiv.innerHTML = `
      <p>Coches creados: ${stats.coches_creados}</p>
      <p>Coches al destino: ${stats.coches_al_destino}</p>
      <p>Promedio de pasos al destino: ${stats.promedio_pasos_al_destino.toFixed(2)}</p>
      <p>Accidentes: ${stats.accidentes}</p>
      <p>Coches en el grid: ${stats.coches_en_el_grid}</p>
    `;
  }
}

// Draw all entities
function drawEntities(viewProjectionMatrix) {
  drawRoads(viewProjectionMatrix);
  drawObstacles(viewProjectionMatrix);
  drawDestinations(viewProjectionMatrix);
  drawTrafficLights(viewProjectionMatrix);
  drawCars(viewProjectionMatrix);
}

// Draw cars
function drawCars(viewProjectionMatrix) {
  gl.bindVertexArray(carVAO);
  Object.values(cars).forEach((car) => {
    // Interpolation factor between 0 and 1
    const t = framesSinceUpdate / 30; // Interpolation factor between 0 and 1

    // Interpolated position
    const x = car.prevX + (car.x - car.prevX) * t;
    const y = car.prevY + (car.y - car.prevY) * t;
    const z = car.prevZ + (car.z - car.prevZ) * t;

    // Direction vector
    const dirX = car.x - car.prevX;
    const dirZ = car.z - car.prevZ;

    // Calculate the angle of rotation
    let angle = Math.atan2(dirX, dirZ);

    // Handle stationary cars (no movement)
    if (dirX === 0 && dirZ === 0) {
      // Use the last known angle or default to 0
      angle = car.lastAngle || 0;
    } else {
      car.lastAngle = angle; // Store the last known angle
    }

    // Create a world matrix for the car
    let worldMatrix = twgl.m4.identity();
    worldMatrix = twgl.m4.translate(worldMatrix, [x, y - 0.27, z]);
    worldMatrix = twgl.m4.rotateY(worldMatrix, angle); // Rotate the car
    worldMatrix = twgl.m4.scale(worldMatrix, [0.2, 0.2, 0.2]); // Scale the car

    // Calculate the world-view-projection matrix
    const worldViewProjectionMatrix = twgl.m4.multiply(
      viewProjectionMatrix,
      worldMatrix
    );

    // Set uniforms specific to the car
    twgl.setUniforms(programInfo, {
      u_worldViewProjection: worldViewProjectionMatrix,
      u_world: worldMatrix,
      u_worldInverseTranspose: twgl.m4.transpose(twgl.m4.inverse(worldMatrix)),
      u_ambientColor: car.color, // Use car's color
      u_diffuseColor: car.color, // Use car's color
      u_specularColor: [1, 1, 1, 1], // White specular color
      u_shininess: 32.0, // Shininess factor
    });

    // Draw the car
    twgl.drawBufferInfo(gl, carBufferInfo);
  });
}

// Draw obstacles (Edificios)
function drawObstacles(viewProjectionMatrix) {
  gl.bindVertexArray(obstacleVAO);
  obstacles.forEach((obstacle) => {
    // Create a world matrix for the obstacle
    let worldMatrix = twgl.m4.identity();
    worldMatrix = twgl.m4.translate(worldMatrix, [
      obstacle.x,
      obstacle.y - 0.7,
      obstacle.z,
    ]);
    worldMatrix = twgl.m4.scale(worldMatrix, [0.7, 1.5, 0.7]); // Scale the obstacle

    // Calculate the world-view-projection matrix
    const worldViewProjectionMatrix = twgl.m4.multiply(
      viewProjectionMatrix,
      worldMatrix
    );

    // Set uniforms specific to the obstacle
    twgl.setUniforms(programInfo, {
      u_worldViewProjection: worldViewProjectionMatrix,
      u_world: worldMatrix,
      u_worldInverseTranspose: twgl.m4.transpose(twgl.m4.inverse(worldMatrix)),
      u_ambientColor: [0.9, 0.8, 0.6, 1], // Light gray ambient color
      u_diffuseColor: [0.9, 0.8, 0.6, 1], // Light gray diffuse color
      u_specularColor: [0.9, 0.8, 0.6, 1], // Lighter gray specular color
      u_shininess: 32.0, // Shininess factor
    });

    // Draw the obstacle
    twgl.drawBufferInfo(gl, obstacleBufferInfo);
  });
}

// Draw destinations
function drawDestinations(viewProjectionMatrix) {
  gl.bindVertexArray(destinationVAO);
  destinations.forEach((destination) => {
    // Create a world matrix for the destination
    let worldMatrix = twgl.m4.identity();
    worldMatrix = twgl.m4.translate(worldMatrix, [
      destination.x,
      destination.y,
      destination.z,
    ]);
    worldMatrix = twgl.m4.scale(worldMatrix, [0.2, 0.2, 0.2]); // Scale as needed

    // Calculate the world-view-projection matrix
    const worldViewProjectionMatrix = twgl.m4.multiply(
      viewProjectionMatrix,
      worldMatrix
    );

    // Set uniforms specific to the destination
    twgl.setUniforms(programInfo, {
      u_worldViewProjection: worldViewProjectionMatrix,
      u_world: worldMatrix,
      u_worldInverseTranspose: twgl.m4.transpose(twgl.m4.inverse(worldMatrix)),
      u_ambientColor: [0.0, 0.2, 0.0, 1], // Dark green ambient color
      u_diffuseColor: [0.0, 0.5, 0.0, 1], // Green diffuse color
      u_specularColor: [0.5, 0.5, 0.5, 1], // Gray specular color
      u_shininess: 16.0, // Shininess factor
    });

    // Draw the destination
    twgl.drawBufferInfo(gl, destinationBufferInfo);
  });
}

// Draw traffic lights
function drawTrafficLights(viewProjectionMatrix) {
  gl.bindVertexArray(cubeVAO);
  trafficLights.forEach((light) => {
    // Create a world matrix for the traffic light
    let worldMatrix = twgl.m4.identity();
    worldMatrix = twgl.m4.translate(worldMatrix, [light.x, light.y, light.z]);
    worldMatrix = twgl.m4.scale(worldMatrix, [0.5, 0.5, 0.5]); // Scale as needed

    // Calculate the world-view-projection matrix
    const worldViewProjectionMatrix = twgl.m4.multiply(
      viewProjectionMatrix,
      worldMatrix
    );

    // Determine color based on light state
    const color = light.state ? [0, 1, 0, 1] : [1, 0, 0, 1]; // Green or Red

    // Set uniforms specific to the traffic light
    twgl.setUniforms(programInfo, {
      u_worldViewProjection: worldViewProjectionMatrix,
      u_world: worldMatrix,
      u_worldInverseTranspose: twgl.m4.transpose(twgl.m4.inverse(worldMatrix)),
      u_ambientColor: [0.1, 0.1, 0.1, 1], // Low ambient color
      u_diffuseColor: color, // Green or Red diffuse color
      u_specularColor: [0.5, 0.5, 0.5, 1], // Gray specular color
      u_shininess: 16.0, // Shininess factor
    });

    // Draw the traffic light
    twgl.drawBufferInfo(gl, cubeBufferInfo);
  });
}

// Draw roads
function drawRoads(viewProjectionMatrix) {
  gl.bindVertexArray(cubeVAO);
  roads.forEach((road) => {
    // Create a world matrix for the road
    let worldMatrix = twgl.m4.identity();
    worldMatrix = twgl.m4.translate(worldMatrix, [
      road.x,
      road.y - 0.7,
      road.z,
    ]);

    // Adjust scale based on direction
    let scale = [2.0, 0.5, 10.0]; // Default scale
    if (road.direction === "horizontal") {
      scale = [10.0, 0.5, 2.0];
    }

    worldMatrix = twgl.m4.scale(worldMatrix, scale); // Scale as needed

    // Calculate the world-view-projection matrix
    const worldViewProjectionMatrix = twgl.m4.multiply(
      viewProjectionMatrix,
      worldMatrix
    );

    // Set uniforms specific to the road
    twgl.setUniforms(programInfo, {
      u_worldViewProjection: worldViewProjectionMatrix,
      u_world: worldMatrix,
      u_worldInverseTranspose: twgl.m4.transpose(twgl.m4.inverse(worldMatrix)),
      u_ambientColor: [0.3, 0.3, 0.3, 1], // Brown ambient color
      u_diffuseColor: [0.3, 0.3, 0.3, 1], // Brown diffuse color
      u_specularColor: [0.3, 0.3, 0.3, 1], // Dark gray specular color
      u_shininess: 8.0, // Shininess factor
    });

    // Draw the road
    twgl.drawBufferInfo(gl, cubeBufferInfo);
  });
}

// Setup GUI for Camera and Lighting Controls
function setupGUI() {
  const gui = new GUI();

  // Camera Controls
  const cameraFolder = gui.addFolder("Camera Position");
  cameraFolder
    .add(cameraPosition, "x", -50, 50)
    .name("Camera X")
    .onChange(() => {});
  cameraFolder
    .add(cameraPosition, "y", 0, 100)
    .name("Camera Y")
    .onChange(() => {});
  cameraFolder
    .add(cameraPosition, "z", -50, 50)
    .name("Camera Z")
    .onChange(() => {});
  cameraFolder.open();

  // Lighting Controls
  const lightFolder = gui.addFolder("Lighting Settings");

  // Light Position
  lightFolder
    .add(lightingSettings.lightPosition, "x", -50, 50)
    .name("Light X")
    .onChange(() => {});
  lightFolder
    .add(lightingSettings.lightPosition, "y", -50, 50)
    .name("Light Y")
    .onChange(() => {});
  lightFolder
    .add(lightingSettings.lightPosition, "z", -50, 50)
    .name("Light Z")
    .onChange(() => {});

  // Ambient Light Color
  lightFolder
    .addColor(lightingSettings, "ambientLight")
    .name("Ambient Light")
    .onChange(() => {});

  // Diffuse Light Color
  lightFolder
    .addColor(lightingSettings, "diffuseLight")
    .name("Diffuse Light")
    .onChange(() => {});

  // Specular Light Color
  lightFolder
    .addColor(lightingSettings, "specularLight")
    .name("Specular Light")
    .onChange(() => {});

  lightFolder.open();
}

// Setup the camera view
function setupCamera() {
  const fov = (45 * Math.PI) / 180; // Field of view in radians
  const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight; // Aspect ratio
  const projectionMatrix = twgl.m4.perspective(fov, aspect, 1, 200);

  const target = [10, 0, 10]; // Look at the center
  const up = [0, 1, 0];
  const cameraMatrix = twgl.m4.lookAt(
    [cameraPosition.x, cameraPosition.y, cameraPosition.z],
    target,
    up
  );
  const viewMatrix = twgl.m4.inverse(cameraMatrix);
  return twgl.m4.multiply(projectionMatrix, viewMatrix);
}

// Start the application
main();
