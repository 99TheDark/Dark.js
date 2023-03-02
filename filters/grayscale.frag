# version 300 es

precision lowp float;

uniform sampler2D sampler;

in vec2 uv;
out vec4 color;

void main() {
    vec4 tex = texture(sampler, uv);
    float luminance = 0.2126 * tex.r + 0.7152 * tex.g + 0.0722 * tex.b; // Based on how human eyes precieve
    color = vec4(vec3(luminance), tex.a);
}