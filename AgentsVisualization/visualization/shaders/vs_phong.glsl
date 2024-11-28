#version 300 es

precision highp float;

// Attributes
in vec4 a_position;
in vec3 a_normal;
in vec2 a_texCoord;
in vec4 a_color;

// Uniforms
uniform mat4 u_worldViewProjection;
uniform mat4 u_world;
uniform mat4 u_worldInverseTranspose;

// Varyings
out vec3 v_normal;
out vec3 v_worldPosition;

void main() {
    // Calculate world position of the vertex
    vec4 worldPosition = u_world * a_position;
    v_worldPosition = worldPosition.xyz;

    // Transform the normal to world space
    v_normal = mat3(u_worldInverseTranspose) * a_normal;

    // Set the final position of the vertex
    gl_Position = u_worldViewProjection * a_position;
}
