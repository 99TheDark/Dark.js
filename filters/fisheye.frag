# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform float param;

in vec2 uv;
in vec2 pos;
out vec4 color;

void main() {
    vec2 mapped = (vec2(
        pos.x * sqrt(1.0 - pos.y * pos.y * param),
        pos.y * sqrt(1.0 - pos.x * pos.x * param)
    ) + 1.0) / 2.0;
    
    vec4 tex = texture(sampler, mapped);

    color = tex;
}