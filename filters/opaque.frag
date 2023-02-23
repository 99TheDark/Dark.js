# version 300 es

precision lowp float;

uniform sampler2D sampler;

in vec2 uv;
out vec4 color;

void main() {
    vec4 tex = texture(sampler, uv);
    color = vec4(tex.rgb, 1.0);
}