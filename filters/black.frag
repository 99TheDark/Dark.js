# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform float param;

in vec2 uv;
out vec4 color;

void main() {
    vec4 tex = texture(sampler, uv);
    float luminance = 0.2126 * tex.r + 0.7152 * tex.g + 0.0722 * tex.b; // Same as grayscale

    if(luminance <= param) {
        color = vec4(vec3(0.0), tex.a);
    } else {
        color = tex;
    }
}
