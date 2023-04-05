# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform float param;

in vec2 uv;
out vec4 color;

void main() {
    vec4 tex = texture(sampler, uv);

    float inv = 1.0 - param;
    color = vec4(tex.rg * inv, tex.b * param, tex.a);
}