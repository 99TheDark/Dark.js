# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform float param;

in vec2 uv;
out vec4 color;

void main() {
    vec4 tex = texture(sampler, uv);

    vec2 pos = (uv * 2.0 - 1.0) * param;
    float dist = 1.0 - sqrt(pos.x * pos.x + pos.y * pos.y);

    color = vec4(tex.rgb * dist, tex.a);
}
