#version 300 es

precision highp float;

// Varyings from vertex shader
in vec3 v_normal;
in vec3 v_worldPosition;

// Output color
out vec4 outColor;

// Uniforms for global lighting
uniform vec3 u_viewWorldPosition;

// Directional Light Uniforms
uniform vec3 u_lightWorldPosition;
uniform vec3 u_ambientLight;
uniform vec3 u_diffuseLight;
uniform vec3 u_specularLight;

// Material Uniforms
uniform vec4 u_ambientColor;
uniform vec4 u_diffuseColor;
uniform vec4 u_specularColor;
uniform float u_shininess;

// Point Lights
const int MAX_POINT_LIGHTS = 28;
uniform int u_numPointLights;
uniform vec3 u_pointLightPositions[MAX_POINT_LIGHTS];
uniform vec4 u_pointLightColors[MAX_POINT_LIGHTS];

void main() {
    vec3 N = normalize(v_normal);
    vec3 V = normalize(u_viewWorldPosition - v_worldPosition);

    // Ambient component
    vec3 ambient = u_ambientLight * u_ambientColor.rgb;

    // Directional Light calculations
    vec3 Ld = normalize(u_lightWorldPosition - v_worldPosition);
    float lambertian_d = max(dot(N, Ld), 0.0);
    vec3 diffuse_d = u_diffuseLight * u_diffuseColor.rgb * lambertian_d;

    vec3 H_d = normalize(Ld + V);
    float specularAngle_d = max(dot(H_d, N), 0.0);
    float specularFactor_d = pow(specularAngle_d, u_shininess);
    vec3 specular_d = u_specularLight * u_specularColor.rgb * specularFactor_d;

    // Point Lights calculations
    vec3 totalDiffuse = vec3(0.0);
    vec3 totalSpecular = vec3(0.0);

    for (int i = 0; i < MAX_POINT_LIGHTS; ++i) {
        if (i >= u_numPointLights) break;

        vec3 lightDir = u_pointLightPositions[i] - v_worldPosition;
        float distance = length(lightDir);
        vec3 L = normalize(lightDir);

        // Attenuation
        float attenuation = 1.0 / (distance * distance);

        // Diffuse component
        float lambertian = max(dot(N, L), 0.0);
        vec3 diffuse = u_pointLightColors[i].rgb * u_diffuseColor.rgb * lambertian * attenuation;
        totalDiffuse += diffuse;

        // Specular component
        vec3 H = normalize(L + V);
        float specAngle = max(dot(H, N), 0.0);
        float specularFactor = pow(specAngle, u_shininess);
        vec3 specular = u_pointLightColors[i].rgb * u_specularColor.rgb * specularFactor * attenuation;
        totalSpecular += specular;
    }

    // Combine all components
    vec3 color = ambient + diffuse_d + specular_d + totalDiffuse + totalSpecular;
    outColor = vec4(color, u_diffuseColor.a);
}
