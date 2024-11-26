'use strict';

import * as twgl from 'twgl.js';
import GUI from 'lil-gui';

// Define the vertex shader code, using GLSL 3.00
const vsGLSL = `#version 300 es
in vec4 a_position;
in vec4 a_color;

uniform mat4 u_transforms;
uniform mat4 u_matrix;

out vec4 v_color;

void main() {
gl_Position = u_matrix * a_position;
v_color = a_color;
}
`;

// Define the fragment shader code, using GLSL 3.00
const fsGLSL = `#version 300 es
precision highp float;

in vec4 v_color;

out vec4 outColor;

void main() {
outColor = v_color;
}
`;

// Define the Object3D class to represent 3D objects
class Object3D {
  constructor(id, position=[0,0,0], rotation=[0,0,0], scale=[1,1,1]){
  this.id = id;
  this.position = position;
  this.rotation = rotation;
  this.scale = scale;
  this.matrix = twgl.m4.create();
  }
}

// Define the agent server URI
const agent_server_uri = "http://localhost:8585/";

// Initialize arrays to store dynamicAgents and staticAgents
const agents = [];
const staticAgents = [];

// Initialize WebGL-related variables
let gl, programInfo, agentArrays, obstacleArrays, agentsBufferInfo, obstaclesBufferInfo, agentsVao, obstaclesVao;

// Define the camera position
let cameraPosition = {x:0, y:9, z:9};

// Initialize the frame count
let frameCount = 0;

// Define the data object
const data = {};

// Main function to initialize and run the application
async function main() {
  const canvas = document.querySelector('canvas');
  gl = canvas.getContext('webgl2');

  // Create the program information using the vertex and fragment shaders
  programInfo = twgl.createProgramInfo(gl, [vsGLSL, fsGLSL]);

  await initAgentsModel();

  // Generate the agent and obstacle data
  agentArrays = generateData(1);
  obstacleArrays = generateObstacleData(1);

  // Create buffer information from the agent and obstacle data
  agentsBufferInfo = twgl.createBufferInfoFromArrays(gl, agentArrays);
  obstaclesBufferInfo = twgl.createBufferInfoFromArrays(gl, obstacleArrays);

  // Create vertex array objects (VAOs) from the buffer information
  agentsVao = twgl.createVAOFromBufferInfo(gl, programInfo, agentsBufferInfo);
  obstaclesVao = twgl.createVAOFromBufferInfo(gl, programInfo, obstaclesBufferInfo);

  // Set up the user interface
  setupUI();

  // Initialize the agents model
  await initAgentsModel();

  // Get the agents and obstacles
  await getDynamicAgents();
  await getStaticAgents();

  // Draw the scene
  await drawScene(gl, programInfo, agentsVao, agentsBufferInfo, obstaclesVao, obstaclesBufferInfo);
}

/*
 * Initializes the agents model by sending a POST request to the agent server.
 */
async function initAgentsModel() {
  try {
    const initialMap = [
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
      let response = await fetch(agent_server_uri + "init", {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mapa: initialMap }) // Enviamos mapa
      });

      if (response.ok) {
          let result = await response.json();

          // Actualiza dinámicamente las dimensiones del mapa
          data.width = result.width;
          data.height = result.height;

          console.log("Modelo inicializado dinámicamente:", result.message);
      } else {
          console.error("Error al inicializar el modelo:", response.status);
      }
  } catch (error) {
      console.error("Error de conexión:", error);
  }
}

/*
 * Retrieves the current positions of all dynamic agents from the agent server.
 */
async function getDynamicAgents() {
  try {
    // Send a GET request to the agent server to retrieve dynamic agents
    let response = await fetch(agent_server_uri + "getDynamicAgents");

    // Check if the response was successful
    if (response.ok) {
      // Parse the response as JSON
      let result = await response.json();

      // Log the dynamic agents count
      console.log(`Number of dynamic agents: ${result.dynamicAgents.length}`);

      // Check if the agents array is empty
      if (agents.length === 0) {
        // Create new dynamic agents and add them to the agents array
        for (const agent of result.dynamicAgents) {
          const newAgent = new Object3D(agent.id, [agent.pos[0], 0, agent.pos[1]]);
          agents.push(newAgent);
        }
        // Log the agents array
        console.log("Dynamic Agents:", agents);
      } else {
        // Update the positions of existing dynamic agents
        for (const agent of result.dynamicAgents) {
          const currentAgent = agents.find((object3d) => object3d.id === agent.id);

          // Check if the agent exists in the agents array
          if (currentAgent !== undefined) {
            // Update the agent's position
            currentAgent.position = [agent.pos[0], 0, agent.pos[1]];
          }
        }
      }
    } else {
      // Log an error if the response was not successful
      console.error("Failed to fetch dynamic agents:", response.status);
    }
  } catch (error) {
    // Log any errors that occur during the request
    console.error("An error occurred while fetching dynamic agents:", error);
  }
}


/*
 * Retrieves the current positions of all obstacles from the agent server.
 */
async function getStaticAgents() {
  try {
    // Send a GET request to the agent server to retrieve the obstacle positions
    let response = await fetch(agent_server_uri + "getStaticAgents") 

    // Check if the response was successful
    if(response.ok){
      // Parse the response as JSON
      let result = await response.json()

      // Create new obstacles and add them to the obstacles array
      for (const agent of result.staticAgents) {
        const staticAgent = new Object3D(agent.id, [agent.pos[0], 0, agent.pos[1]]);
        staticAgents.push(staticAgent); // Añade a la lista de obstáculos
      }
      // Log the obstacles array
      console.log("Agentes estáticos cargados:", staticAgents);
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log(error) 
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
      await getDynamicAgents()
      // Log a message indicating that the agents have been updated
      console.log("Updated agents")
    }

  } catch (error) {
    // Log any errors that occur during the request
    console.log(error) 
  }
}

/*
 * Draws the scene by rendering the agents and obstacles.
 * 
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @param {Object} programInfo - The program information.
 * @param {WebGLVertexArrayObject} agentsVao - The vertex array object for agents.
 * @param {Object} agentsBufferInfo - The buffer information for agents.
 * @param {WebGLVertexArrayObject} obstaclesVao - The vertex array object for obstacles.
 * @param {Object} obstaclesBufferInfo - The buffer information for obstacles.
 */
async function drawScene(gl, programInfo, agentsVao, agentsBufferInfo, obstaclesVao, obstaclesBufferInfo) {
    // Resize the canvas to match the display size
    twgl.resizeCanvasToDisplaySize(gl.canvas);

    // Set the viewport to match the canvas size
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    // Set the clear color and enable depth testing
    gl.clearColor(0.2, 0.2, 0.2, 1);
    gl.enable(gl.DEPTH_TEST);

    // Clear the color and depth buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // Use the program
    gl.useProgram(programInfo.program);

    // Set up the view-projection matrix
    const viewProjectionMatrix = setupWorldView(gl);

    // Set the distance for rendering
    const distance = 1

    // Draw the dynamic agents
    drawDynamicAgents(distance, agentsVao, agentsBufferInfo, viewProjectionMatrix)    
    // Draw the static agents
    drawStaticAgents(distance, obstaclesVao, obstaclesBufferInfo, viewProjectionMatrix)

    // Increment the frame count
    frameCount++

    // Update the scene every 30 frames
    if(frameCount%30 == 0){
      frameCount = 0
      await update()
    } 

    // Request the next frame
    requestAnimationFrame(()=>drawScene(gl, programInfo, agentsVao, agentsBufferInfo, obstaclesVao, obstaclesBufferInfo))
}

/*
 * Draws dynamic agents.
 * 
 * @param {Number} distance - The distance for rendering.
 * @param {WebGLVertexArrayObject} agentsVao - The vertex array object for dynamic agents.
 * @param {Object} agentsBufferInfo - The buffer information for dynamic agents.
 * @param {Float32Array} viewProjectionMatrix - The view-projection matrix.
 */
function drawDynamicAgents(distance, agentsVao, agentsBufferInfo, viewProjectionMatrix) {
  // Bind the vertex array object for dynamic agents
  gl.bindVertexArray(agentsVao);

  // Iterate over the dynamic agents
  for (const agent of agents) {
      // Calculate the dynamic agent's transformation matrix
      const translation = twgl.v3.create(
          agent.position[0] * distance,
          agent.position[1] * distance,
          agent.position[2]
      );
      const scale = twgl.v3.create(...agent.scale);

      agent.matrix = twgl.m4.translate(viewProjectionMatrix, translation);
      agent.matrix = twgl.m4.rotateX(agent.matrix, agent.rotation[0]);
      agent.matrix = twgl.m4.rotateY(agent.matrix, agent.rotation[1]);
      agent.matrix = twgl.m4.rotateZ(agent.matrix, agent.rotation[2]);
      agent.matrix = twgl.m4.scale(agent.matrix, scale);

      // Set the uniforms and draw the dynamic agent
      const uniforms = {
          u_matrix: agent.matrix,
      };
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, agentsBufferInfo);
  }
}

/*
* Draws static agents.
* 
* @param {Number} distance - The distance for rendering.
* @param {WebGLVertexArrayObject} obstaclesVao - The vertex array object for static agents.
* @param {Object} obstaclesBufferInfo - The buffer information for static agents.
* @param {Float32Array} viewProjectionMatrix - The view-projection matrix.
*/
function drawStaticAgents(distance, obstaclesVao, obstaclesBufferInfo, viewProjectionMatrix) {
  // Bind the vertex array object for static agents
  gl.bindVertexArray(obstaclesVao);

  // Iterate over the static agents
  for (const obstacle of staticAgents) {
      // Calculate the static agent's transformation matrix
      const translation = twgl.v3.create(
          obstacle.position[0] * distance,
          obstacle.position[1] * distance,
          obstacle.position[2]
      );
      const scale = twgl.v3.create(...obstacle.scale);

      obstacle.matrix = twgl.m4.translate(viewProjectionMatrix, translation);
      obstacle.matrix = twgl.m4.rotateX(obstacle.matrix, obstacle.rotation[0]);
      obstacle.matrix = twgl.m4.rotateY(obstacle.matrix, obstacle.rotation[1]);
      obstacle.matrix = twgl.m4.rotateZ(obstacle.matrix, obstacle.rotation[2]);
      obstacle.matrix = twgl.m4.scale(obstacle.matrix, scale);

      // Set the uniforms and draw the static agent
      const uniforms = {
          u_matrix: obstacle.matrix,
      };
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, obstaclesBufferInfo);
  }
}


/*
 * Sets up the world view by creating the view-projection matrix.
 * 
 * @param {WebGLRenderingContext} gl - The WebGL rendering context.
 * @returns {Float32Array} The view-projection matrix.
 */
function setupWorldView(gl) {
    // Set the field of view (FOV) in radians
    const fov = 45 * Math.PI / 180;

    // Calculate the aspect ratio of the canvas
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;

    // Create the projection matrix
    const projectionMatrix = twgl.m4.perspective(fov, aspect, 1, 200);

    // Set the target position
    const target = [data.width/2, 0, data.height/2];

    // Set the up vector
    const up = [0, 1, 0];

    // Calculate the camera position
    const camPos = twgl.v3.create(cameraPosition.x + data.width/2, cameraPosition.y, cameraPosition.z+data.height/2)

    // Create the camera matrix
    const cameraMatrix = twgl.m4.lookAt(camPos, target, up);

    // Calculate the view matrix
    const viewMatrix = twgl.m4.inverse(cameraMatrix);

    // Calculate the view-projection matrix
    const viewProjectionMatrix = twgl.m4.multiply(projectionMatrix, viewMatrix);

    // Return the view-projection matrix
    return viewProjectionMatrix;
}

/*
 * Sets up the user interface (UI) for the camera position.
 */
function setupUI() {
    // Create a new GUI instance
    const gui = new GUI();

    // Create a folder for the camera position
    const posFolder = gui.addFolder('Position:')

    // Add a slider for the x-axis
    posFolder.add(cameraPosition, 'x', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.x = value
        });

    // Add a slider for the y-axis
    posFolder.add( cameraPosition, 'y', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.y = value
        });

    // Add a slider for the z-axis
    posFolder.add( cameraPosition, 'z', -50, 50)
        .onChange( value => {
            // Update the camera position when the slider value changes
            cameraPosition.z = value
        });
}

function generateData(size) {
    let arrays =
    {
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
        a_color: {
                numComponents: 4,
                data: [
                  // Front face
                    1, 0, 0, 1, // v_1
                    1, 0, 0, 1, // v_1
                    1, 0, 0, 1, // v_1
                    1, 0, 0, 1, // v_1
                  // Back Face
                    0, 1, 0, 1, // v_2
                    0, 1, 0, 1, // v_2
                    0, 1, 0, 1, // v_2
                    0, 1, 0, 1, // v_2
                  // Top Face
                    0, 0, 1, 1, // v_3
                    0, 0, 1, 1, // v_3
                    0, 0, 1, 1, // v_3
                    0, 0, 1, 1, // v_3
                  // Bottom Face
                    1, 1, 0, 1, // v_4
                    1, 1, 0, 1, // v_4
                    1, 1, 0, 1, // v_4
                    1, 1, 0, 1, // v_4
                  // Right Face
                    0, 1, 1, 1, // v_5
                    0, 1, 1, 1, // v_5
                    0, 1, 1, 1, // v_5
                    0, 1, 1, 1, // v_5
                  // Left Face
                    1, 0, 1, 1, // v_6
                    1, 0, 1, 1, // v_6
                    1, 0, 1, 1, // v_6
                    1, 0, 1, 1, // v_6
                ]
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

    return arrays;
}

function generateObstacleData(size){

    let arrays =
    {
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
        a_color: {
                numComponents: 4,
                data: [
                  // Front face
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                    0, 0, 0, 1, // v_1
                  // Back Face
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                    0.333, 0.333, 0.333, 1, // v_2
                  // Top Face
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                    0.5, 0.5, 0.5, 1, // v_3
                  // Bottom Face
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                    0.666, 0.666, 0.666, 1, // v_4
                  // Right Face
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                    0.833, 0.833, 0.833, 1, // v_5
                  // Left Face
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                    1, 1, 1, 1, // v_6
                ]
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
    return arrays;
}

main()
