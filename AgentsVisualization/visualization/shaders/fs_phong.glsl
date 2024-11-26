#version 300 es
precision highp float;

in vec3 v_normal;
in vec3 v_cameraDirection;
in vec3 v_lightDirection;

uniform vec4 u_ambientLight;
uniform vec4 u_diffuseLight;
uniform vec4 u_specularLight;

uniform vec4 u_ambientColor;
uniform vec4 u_diffuseColor;
uniform vec4 u_specularColor;
uniform float u_shininess;

out vec4 outColor;

void main() {
    vec4 ambient = u_ambientLight * u_ambientColor;

    // Diffuse component
    // Normalize the vectors
    vec3 normalVector = normalize(v_normal);
    vec3 lightVector = normalize(v_lightDirection);
    float lambert = dot(normalVector, lightVector);

    vec4 diffuse = vec4(0, 0, 0, 1);
    if (lambert > 0.0) {
        diffuse = u_diffuseLight * u_diffuseColor * lambert;
    }

    // Specular component
    vec3 reflectionVector = reflect(-lightVector, normalVector);
    vec3 cameraVector = normalize(v_cameraDirection);
    float specularFactor = pow(max(dot(reflectionVector, cameraVector), 0.0), u_shininess);

    vec4 specular = vec4(0, 0, 0, 1);
    if (lambert > 0.0) {
        specular = u_specularLight * u_specularColor * specularFactor;
    }

    // Combine all components
    outColor = ambient + diffuse + specular;
}