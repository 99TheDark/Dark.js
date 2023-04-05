# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform float param;

in vec2 uv;
out vec4 color;

void main() {
    vec4 tex = texture(sampler, uv);
    float luminance = 0.2126 * tex.r + 0.7152 * tex.g + 0.0722 * tex.b; // Same as grayscale
    float s = (param / 100.0 + 0.5);

    color = vec4(mix(vec3(luminance), tex.rgb, s), tex.a);
}