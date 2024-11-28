"use strict";

// Import necessary libraries
import * as twgl from "twgl.js";
import GUI from "lil-gui";
import vs_phong from "./shaders/vs_phong.glsl?raw";
import fs_phong from "./shaders/fs_phong.glsl?raw";

// Define the agent server URI
const agent_server_uri = "http://localhost:8585/";

// Initialize arrays to store agents
const obstacles = [];
const destinations = [];
const trafficLights = [];
const roads = [];

// Object for cars
const cars = {};

// Mapa data
const mapa = [
  "v<<<<<<<<<<<<<<<<i<<<<<<<<<<<<",
  "vv<<<<<<<<<<<<<<<i<<<<<<<<<<<^",
  "vv##^###^###vv#AA#####D#####^^",
  "vv##^#D#^###vv#^^<<<<<<<<<<<^^",
  "vv>>>>>>>>>>vv#^^<<<<<<<<<<<^^",
  "vv#Dv#v#^#v#vv#^^###########^^",
  "vv##v#v#^Dv#vv#^^>>>>>>>>>>>^^",
  "vv<<<<<<<<v<vv#^^>>>>>>>>>>>^^",
  "vv#Dv#D###v#vv#^^####vv##D##^^",
  "vv>>>>>>>>v>vv#^^D###vv#####^^",
  "vv##B##D##v#vv#^^####BB#####^^",
  "vv<<<i<<<<<<<<<<<<<<<<<i<<<<^^",
  "vv<<<i<<<<<<<<<<<<<<<<<i<<<<^^",
  "vv#########vv###^^##########^^",
  "vv########Dvv###^^##########^^",
  "vv#########vv###^^###D######^^",
  "vv>>>d>>>>>>>>>>>>>>>>>>>>>d^^",
  "vv>>>d>>>>>>>>>>>>>>>>>>>>>d^^",
  "vv#vv#AA####vv#^^####vv#####AA",
  "vv#vv#^^D###vv#^^###Dvv#####^^",
  "vv#vv#^^####vv#^^####vv#####^^",
  "vv#vv#^^#D##vv#^^####vv#####^^",
  "vv#vv#^^<<<<vv<^^<<<<vv<<<<<^^",
  "vv#vv#^^<<<<vv<^^<<<<vv<<<<<^^",
  "vv#vv#^^####vv#^^#D##vv#####^^",
  "vv#vv#^^D###vv#^^####vv#####^^",
  "vv#vv#^^####vv#^^####vv#####^^",
  "vv#vv#^^####BB#^^####BB##D##^^",
  "v>>>>>>>>>>d>>>>>>>>d>>>>>>>^^",
  ">>>>>>>>>>>d>>>>>>>>d>>>>>>>>^",
];

// Initialize WebGL-related variables
let gl, programInfo, carBufferInfo, cubeBufferInfo, obstacleBufferInfo, destinationBufferInfo;
let carVAO, cubeVAO, obstacleVAO, destinationVAO;

// Define the camera position
let cameraPosition = { x: 10, y: 40, z: 20 };

// Initialize the frame count
let frameCount = 0;
let framesSinceUpdate = 0;

// Map dimensions
let mapWidth = mapa[0].length;
let mapHeight = mapa.length;

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

// Main function to initialize and run the application
async function main() {
  const canvas = document.querySelector("canvas");
  gl = canvas.getContext("webgl2");

  // Create the program information using the vertex and fragment shaders
  programInfo = twgl.createProgramInfo(gl, [vs_phong, fs_phong]);

  // Load car model (Coche)
  const carObjContent = await loadOBJFile("./objects/coche.obj");
  if (carObjContent) {
    const carVertexData = parseOBJ(carObjContent);
    if (carVertexData) {
      console.log("Parsed Car Model Data:", carVertexData);
      validateVertexData(carVertexData); // Validate data is in order
      carBufferInfo = twgl.createBufferInfoFromArrays(gl, carVertexData);
      carVAO = twgl.createVAOFromBufferInfo(gl, programInfo, carBufferInfo);
    }
  }

  // Load obstacle model (Edificio)
  const obstacleObjContent = await loadOBJFile("./objects/edificio.obj");
  if (obstacleObjContent) {
    const obstacleVertexData = parseOBJ(obstacleObjContent);
    if (obstacleVertexData) {
      console.log("Parsed Obstacle Model Data:", obstacleVertexData);
      validateVertexData(obstacleVertexData);
      obstacleBufferInfo = twgl.createBufferInfoFromArrays(gl,obstacleVertexData);
      obstacleVAO = twgl.createVAOFromBufferInfo(gl,programInfo,obstacleBufferInfo);
    }
  }

  // Load destination model (Destino)
  const destinationObjContent = await loadOBJFile("./objects/destino.obj");
  if (destinationObjContent) {
    const destinationVertexData = parseOBJ(destinationObjContent);
    if (destinationVertexData) {
      console.log("Parsed Destination Model Data:", destinationVertexData);
      validateVertexData(destinationVertexData);
      destinationBufferInfo = twgl.createBufferInfoFromArrays(gl,destinationVertexData);
      destinationVAO = twgl.createVAOFromBufferInfo(gl,programInfo,destinationBufferInfo);
    }
  }

  // Generate cube data for traffic lights
  const cubeData = generateCubeData(1);
  cubeBufferInfo = twgl.createBufferInfoFromArrays(gl, cubeData);
  cubeVAO = twgl.createVAOFromBufferInfo(gl, programInfo, cubeBufferInfo);

  // Set up the user interface
  setupGUI();

  // Initialize the agents model
  await initModel();

  // Fetch all entities
  await fetchEntities();

  // Draw the scene
  drawScene();
}

/*
 * Initializes the agents model by sending a POST request to the agent server.
 */
async function initModel() {
  try {
    // Send a POST request to the agent server to initialize the model
    const response = await fetch(`${agent_server_uri}init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mapa: mapa }),
    });

    // Check if the response was successful
    if (response.ok) {
      // Parse the response as JSON and log the message
      let result = await response.json()
      console.log(result.message)
    }

  } catch (error) {
    // Log any errors that occur during the request
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
    dynamicAgents.forEach((agent, index) => {
      const agentType = agent.type;
      const pos = agent.pos;

      const x = pos[0];
      const z = pos[1];
      const y = 0;

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
          y: y + 1, // over the ground
          z: z,
          state: agent.state,
          direction: agent.direction,
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

// Fetch statistics
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

/*
 * Updates the agent positions by sending a request to the agent server.
 */
async function update() {
  try {
    // Send a request to the agent server to update the agent positions
    let response = await fetch(agent_server_uri + "update") 

    // Check if the response was successful
    if(response.ok){
      // Retrieve the updated agent positions
      await fetchDynamicAgents()
      // Log a message indicating that the agents have been updated
      console.log("Updated agents")
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log(error) 
  }
}

// Validate the vertex data for consistency
function validateVertexData(data) {
  if (!data) {
    console.error("No hay datos para validar");
    return;
  }
  console.assert(data.a_position.data.length > 0, "Falta posición de los vértices");
  console.assert(data.indices.data.length > 0, "Faltan índices de los vértices");
  console.assert(
    data.a_normal.data.length / 3 === data.a_position.data.length / 3,
    "No hay igualdad en la cantidad de normales y posiciones"
  );
}

// Loads the obj file
async function loadOBJFile(filename) {
    const response = await fetch(filename);
    const objContent = await response.text();
    return objContent; // Return raw string
}

// Parse the obj file
function parseOBJ(objContent) {

  const indices = [];
  const positions = [];
  const positionData = [];
  const normals = [];
  const normalData = [];
  const texCoords = [];
  const texCoordData = [];
  const colorData = [];

  const lines = objContent.split("\n"); // Split by line
  let vertexIndex = 0;

  lines.forEach((line) => {
    const parts = line.trim().split(" ");
    if (parts.length === 0) return;
    switch (parts[0]) { // Detect the type of data
      case "v": // V positions
        positions.push(parts.slice(1).map(parseFloat));
        break;
      case "vn": // V normals
        normals.push(parts.slice(1).map(parseFloat));
        break;
      case "vt": // Texture
        texCoords.push(parts.slice(1).map(parseFloat));
        break;
      case "f": // Faces
        const vertices = parts.slice(1);
        vertices.forEach((vertex) => { // Process each vertex
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

          // Add texture
          if (vtIdx !== undefined && texCoords[vtIdx]) {
            texCoordData.push(...texCoords[vtIdx]);
          } else {
            texCoordData.push(0, 0); // Default texture
          }

          // Add normal
          if (vnIdx !== undefined && normals[vnIdx]) {
            normalData.push(...normals[vnIdx]);
          } else {
            normalData.push(0, 0, 1); // Default normal
          }

          // ID each vertex
          indices.push(vertexIndex++);
        });
        break;
    }
  });

  // Ensure all arrays are consistent before returning
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

/*
 * Draws the scene by rendering the agents and the environment.
*/
async function drawScene() {
  // Resize the canvas to match the display size
  twgl.resizeCanvasToDisplaySize(gl.canvas);

  // Set the viewport to match the canvas size
  gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

  // Set the clear color and enable depth testing
  gl.clearColor(0.9, 0.9, 0.9, 1);
  gl.enable(gl.DEPTH_TEST);

  // Clear the color and depth buffers
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  // Use the program
  gl.useProgram(programInfo.program);

  // Set up the view-projection matrix
  const viewProjectionMatrix = setupCamera();

  // Camera position
  const cameraPositionVector = [
    cameraPosition.x,
    cameraPosition.y,
    cameraPosition.z,
  ];

  // Global lighting uniforms
  twgl.setUniforms(programInfo, {
    u_viewWorldPosition: cameraPositionVector,
    u_lightWorldPosition: [
      lightingSettings.lightPosition.x,
      lightingSettings.lightPosition.y,
      lightingSettings.lightPosition.z,
    ],
    u_ambientLight: lightingSettings.ambientLight.slice(0, 3),
    u_diffuseLight: lightingSettings.diffuseLight.slice(0, 3),
    u_specularLight: lightingSettings.specularLight.slice(0, 3),
  });

  // Collect traffic light positions and colors
  const MAX_POINT_LIGHTS = 28; // number of traffic lights + 1 (for the sun)
  const pointLightPositions = new Float32Array(MAX_POINT_LIGHTS * 3);
  const pointLightColors = new Float32Array(MAX_POINT_LIGHTS * 4);

  // Set traffic light positions and colors
  trafficLights.slice(0, MAX_POINT_LIGHTS).forEach((light, index) => {
    pointLightPositions.set([light.x, light.y, light.z], index * 3);
    if (light.state) { // Verde
      pointLightColors.set([0.0, 1.0, 0.0, 1.0], index * 4);
    } else { // Rojo
      pointLightColors.set([1.0, 0.0, 0.0, 1.0], index * 4);
    }
  });

  // Set point light uniforms
  twgl.setUniforms(programInfo, {
    u_numPointLights: Math.min(trafficLights.length, MAX_POINT_LIGHTS),
    u_pointLightPositions: pointLightPositions,
    u_pointLightColors: pointLightColors,
  });

  // Draw the ground and entities
  drawGround(viewProjectionMatrix);
  drawEntities(viewProjectionMatrix);

  // Increment the frame count
  frameCount++;
  framesSinceUpdate++;

  // Update the scene every 30 frames
  if (frameCount % 5 === 0) {
    frameCount = 0;
    framesSinceUpdate = 0; // Reset frames since last update
    await update();

    // Fetch stats and update display
    const stats = await fetchStats();
    if (stats) {
      updateStatsDisplay(stats);
    }
  }

  // Request the next frame
  requestAnimationFrame(drawScene);
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
    const t = framesSinceUpdate / 5; // Interpolation factor between 0 and 1

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

    // Set uniforms for car
    twgl.setUniforms(programInfo, {
      u_worldViewProjection: worldViewProjectionMatrix,
      u_world: worldMatrix,
      u_worldInverseTranspose: twgl.m4.transpose(twgl.m4.inverse(worldMatrix)),
      u_ambientColor: car.color, // Same as its own color
      u_diffuseColor: car.color,
      u_specularColor: [1, 1, 1, 1],
      u_shininess: 32.0,
    });

    // Draw car
    twgl.drawBufferInfo(gl, carBufferInfo);
  });
}

// Draw ground
function drawGround(viewProjectionMatrix) {
  gl.bindVertexArray(cubeVAO);

  // Center ground
  let worldMatrix = twgl.m4.identity();
  worldMatrix = twgl.m4.translate(worldMatrix, [mapWidth / 2 - 0.5, -0.7,mapHeight / 2 - 0.5,]);

  // Scale ground
  worldMatrix = twgl.m4.scale(worldMatrix, [mapWidth, 0.05, mapHeight]);

  // Calculate world-view-projection matrix
  const worldViewProjectionMatrix = twgl.m4.multiply(viewProjectionMatrix, worldMatrix );

  // Set color for ground
  twgl.setUniforms(programInfo, {u_worldViewProjection: worldViewProjectionMatrix, u_world: worldMatrix, u_worldInverseTranspose: twgl.m4.transpose( twgl.m4.inverse(worldMatrix)),
    u_ambientColor: [0.2, 0.2, 0.2, 1],
    u_diffuseColor: [0.2, 0.2, 0.2, 1],
    u_specularColor: [0.1, 0.1, 0.1, 1],
    u_shininess: 8.0,
  });

  // Draw ground
  twgl.drawBufferInfo(gl, cubeBufferInfo);
}

// Draw obstacles (Edificios)
function drawObstacles(viewProjectionMatrix) {
  gl.bindVertexArray(obstacleVAO);
  obstacles.forEach((obstacle) => {
    // Create world matrix for building
    let worldMatrix = twgl.m4.identity();
    worldMatrix = twgl.m4.translate(worldMatrix, [ obstacle.x, obstacle.y - 0.7, obstacle.z,]);
    worldMatrix = twgl.m4.scale(worldMatrix, [0.7, 1.5, 0.7]); // Scale building

    // Calculate world-view-projection matrix
    const worldViewProjectionMatrix = twgl.m4.multiply( viewProjectionMatrix, worldMatrix);

    // Set uniforms
    twgl.setUniforms(programInfo, {
      u_worldViewProjection: worldViewProjectionMatrix,
      u_world: worldMatrix,
      u_worldInverseTranspose: twgl.m4.transpose(twgl.m4.inverse(worldMatrix)),
      u_ambientColor: [0.9, 0.8, 0.6, 1], // Building color
      u_diffuseColor: [0.9, 0.8, 0.6, 1],
      u_specularColor: [0.9, 0.8, 0.6, 1],
      u_shininess: 32.0,
    });

    // Draw
    twgl.drawBufferInfo(gl, obstacleBufferInfo);
  });
}

// Draw destinations
function drawDestinations(viewProjectionMatrix) {
  gl.bindVertexArray(destinationVAO);
  destinations.forEach((destination) => {
    // Create a world matrix for destination
    let worldMatrix = twgl.m4.identity();
    worldMatrix = twgl.m4.translate(worldMatrix, [ destination.x, destination.y - 0.7, destination.z, ]);
    worldMatrix = twgl.m4.scale(worldMatrix, [0.7, 1.5, 0.7]);

    // Calculate world-view-projection matrix
    const worldViewProjectionMatrix = twgl.m4.multiply(
      viewProjectionMatrix,
      worldMatrix
    );

    // Set uniforms specific to destination
    twgl.setUniforms(programInfo, {
      u_worldViewProjection: worldViewProjectionMatrix,
      u_world: worldMatrix,
      u_worldInverseTranspose: twgl.m4.transpose(twgl.m4.inverse(worldMatrix)),
      u_ambientColor: [1, 0.8, 0, 1],
      u_diffuseColor: [1, 0.8, 0, 1],
      u_specularColor: [1, 0.8, 0, 1],
      u_shininess: 16.0,
    });

    // Draw destination
    twgl.drawBufferInfo(gl, destinationBufferInfo);
  });
}

// Draw traffic lights
function drawTrafficLights(viewProjectionMatrix) {
  gl.bindVertexArray(cubeVAO);
  trafficLights.forEach((light) => {
    // Create a world matrix for traffic light
    let worldMatrix = twgl.m4.identity();
    worldMatrix = twgl.m4.translate(worldMatrix, [light.x, light.y, light.z]);
    worldMatrix = twgl.m4.scale(worldMatrix, [0.5, 0.5, 0.5]); // Adjust as needed

    // Calculate world-view-projection matrix
    const worldViewProjectionMatrix = twgl.m4.multiply(viewProjectionMatrix, worldMatrix);

    // Determine color based on state
    const color = light.state ? [0.0, 1.0, 0.0, 1.0] : [1.0, 0.0, 0.0, 1.0]; // Green or Red

    // Set uniforms specific to traffic light
    twgl.setUniforms(programInfo, {
      u_worldViewProjection: worldViewProjectionMatrix,
      u_world: worldMatrix,
      u_worldInverseTranspose: twgl.m4.transpose(twgl.m4.inverse(worldMatrix)),
      u_ambientColor: color, // Mantain color
      u_diffuseColor: color,
      u_specularColor: [1.0, 1.0, 1.0, 1.0],
      u_shininess: 64.0, // High shininess factor
    });

    // Draw traffic light
    twgl.drawBufferInfo(gl, cubeBufferInfo);
  });
}

// Draw roads
function drawRoads(viewProjectionMatrix) {
  // paint roads
  roads.forEach((road) => {
    {
      gl.bindVertexArray(cubeVAO);

      let worldMatrix = twgl.m4.identity();
      worldMatrix = twgl.m4.translate(worldMatrix, [
        road.x,
        road.y - 0.7,
        road.z,
      ]);

      // Scale according to direction
      let scale;
      if (road.direction === 0 || road.direction === 2) {
        scale = [1.0, 0.05, 0.9];
      } else if (road.direction === 1 || road.direction === 3) {
        scale = [0.9, 0.05, 1.0];
      }

      worldMatrix = twgl.m4.scale(worldMatrix, scale);

      // Calculate world-view-projection matrix
      const worldViewProjectionMatrix = twgl.m4.multiply(viewProjectionMatrix, worldMatrix);

      twgl.setUniforms(programInfo, {u_worldViewProjection: worldViewProjectionMatrix, u_world: worldMatrix, u_worldInverseTranspose: twgl.m4.transpose(twgl.m4.inverse(worldMatrix)),
        u_ambientColor: [0.2, 0.2, 0.2, 1], // Gray
        u_diffuseColor: [0.2, 0.2, 0.2, 1],
        u_specularColor: [0.1, 0.1, 0.1, 1],
        u_shininess: 8.0,
      });

      twgl.drawBufferInfo(gl, cubeBufferInfo);
    }

    // Draw white borders
    {
      gl.bindVertexArray(cubeVAO);

      let edgeScale;
      let edge1Position;
      let edge2Position;

      if (road.direction === 0 || road.direction === 2) {
        // Calle horizontal
        edgeScale = [0.05, 0.051, 0.9]; // Borde delgado a lo largo del eje Z
        edge1Position = [road.x - 0.5, road.y - 0.675, road.z]; // Borde izquierdo
        edge2Position = [road.x + 0.5, road.y - 0.675, road.z]; // Borde derecho
      } else if (road.direction === 1 || road.direction === 3) {
        // Calle vertical
        edgeScale = [0.9, 0.051, 0.05]; // Borde delgado a lo largo del eje X
        edge1Position = [road.x, road.y - 0.675, road.z - 0.5]; // Borde inferior
        edge2Position = [road.x, road.y - 0.675, road.z + 0.5]; // Borde superior
      }

      // Dibujar el primer borde
      {
        let worldMatrix = twgl.m4.identity();
        worldMatrix = twgl.m4.translate(worldMatrix, edge1Position);
        worldMatrix = twgl.m4.scale(worldMatrix, edgeScale);

        const worldViewProjectionMatrix = twgl.m4.multiply(
          viewProjectionMatrix,
          worldMatrix
        );

        twgl.setUniforms(programInfo, {
          u_worldViewProjection: worldViewProjectionMatrix,
          u_world: worldMatrix,
          u_worldInverseTranspose: twgl.m4.transpose(
            twgl.m4.inverse(worldMatrix)
          ),
          u_ambientColor: [1.0, 1.0, 1.0, 1], // Color blanco para el borde
          u_diffuseColor: [1.0, 1.0, 1.0, 1],
          u_specularColor: [0.8, 0.8, 0.8, 1],
          u_shininess: 16.0,
        });

        twgl.drawBufferInfo(gl, cubeBufferInfo);
      }

      // Dibujar el segundo borde
      {
        let worldMatrix = twgl.m4.identity();
        worldMatrix = twgl.m4.translate(worldMatrix, edge2Position);
        worldMatrix = twgl.m4.scale(worldMatrix, edgeScale);

        const worldViewProjectionMatrix = twgl.m4.multiply(
          viewProjectionMatrix,
          worldMatrix
        );

        twgl.setUniforms(programInfo, {
          u_worldViewProjection: worldViewProjectionMatrix,
          u_world: worldMatrix,
          u_worldInverseTranspose: twgl.m4.transpose(
            twgl.m4.inverse(worldMatrix)
          ),
          u_ambientColor: [1.0, 1.0, 1.0, 1], // Color blanco para el borde
          u_diffuseColor: [1.0, 1.0, 1.0, 1],
          u_specularColor: [0.8, 0.8, 0.8, 1],
          u_shininess: 16.0,
        });

        twgl.drawBufferInfo(gl, cubeBufferInfo);
      }
    }
  });
}

// Update stats
function updateStatsDisplay(stats) {
  const statsDiv = document.getElementById("stats");
  if (statsDiv) {
    statsDiv.innerHTML = `
      <p>Pasos Simulación: ${stats.pasos_simulacion}</p>
      <p>Coches creados: ${stats.coches_creados}</p>
      <p>Coches al destino: ${stats.coches_al_destino}</p>
      <p>Coches en el grid: ${stats.coches_en_el_grid}</p>
      <p>Accidentes: ${stats.accidentes}</p>
    `;
  }
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

  const target = [mapWidth/2, 0, mapHeight/2]; // Look at the center
  const up = [0, 1, 0];
  const cameraMatrix = twgl.m4.lookAt(
    [cameraPosition.x, cameraPosition.y, cameraPosition.z],
    target,
    up
  );
  const viewMatrix = twgl.m4.inverse(cameraMatrix);
  return twgl.m4.multiply(projectionMatrix, viewMatrix);
}

// Generate cube information
function generateCubeData(size) {
  return {
    a_position: {
      numComponents: 3,
        data: [
          // Front Face
          -0.5, -0.5,  0.5,
          0.5, -0.5,  0.5,
          0.5,  0.5,  0.5,
          -0.5,  0.5,  0.5,

          // Back face
          -0.5, -0.5, -0.5,
          -0.5,  0.5, -0.5,
          0.5,  0.5, -0.5,
          0.5, -0.5, -0.5,

          // Top face
          -0.5,  0.5, -0.5,
          -0.5,  0.5,  0.5,
          0.5,  0.5,  0.5,
          0.5,  0.5, -0.5,

          // Bottom face
          -0.5, -0.5, -0.5,
          0.5, -0.5, -0.5,
          0.5, -0.5,  0.5,
          -0.5, -0.5,  0.5,

          // Right face
          0.5, -0.5, -0.5,
          0.5,  0.5, -0.5,
          0.5,  0.5,  0.5,
          0.5, -0.5,  0.5,

          // Left face
          -0.5, -0.5, -0.5,
          -0.5, -0.5,  0.5,
          -0.5,  0.5,  0.5,
          -0.5,  0.5, -0.5
        ].map(e => size * e)
    },
    a_normal: {
      numComponents: 3,
      data: [
        // Front face normals
        0, 0, 1, 
        0, 0, 1, 
        0, 0, 1, 
        0, 0, 1,

        // Back face normals
        0, 0, -1, 
        0, 0, -1, 
        0, 0, -1, 
        0, 0, -1,

        // Top face normals
        0, 1, 0, 
        0, 1, 0, 
        0, 1, 0, 
        0, 1, 0,

        // Bottom face normals
        0, -1, 0, 
        0, -1, 0, 
        0, -1, 0, 
        0, -1, 0,

        // Right face normals
        1, 0, 0, 
        1, 0, 0, 
        1, 0, 0, 
        1, 0, 0,

        // Left face normals
        -1, 0, 0, 
        -1, 0, 0, 
        -1, 0, 0, 
        -1, 0, 0,
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
        0, 1, 2,      0, 2, 3,    // Front face
        4, 5, 6,      4, 6, 7,    // Back face
        8, 9, 10,     8, 10, 11,  // Top face
        12, 13, 14,   12, 14, 15, // Bottom face
        16, 17, 18,   16, 18, 19, // Right face
        20, 21, 22,   20, 22, 23  // Left face
      ]
    }
  };
}

// Start the application
main();