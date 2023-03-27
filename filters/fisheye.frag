# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform float param;
uniform vec2 size;

in vec2 uv;
in vec2 pos;
out vec4 color;

#define R2 1.414213562373095048801688

void main() {
    float shifted = 2.0 - param;
    float squareness = shifted * shifted * shifted * shifted;

    vec2 c = pos * size / min(size.x, size.y) / squareness;

    float xsq = c.x * c.x;
    float ysq = c.y * c.y;

    vec2 worldMap = vec2(
        0.5 * (sqrt(2.0 + xsq - ysq + 2.0 * c.x * R2) - sqrt(2.0 + xsq - ysq - 2.0 * c.x * R2)),
        0.5 * (sqrt(2.0 - xsq + ysq + 2.0 * c.y * R2) - sqrt(2.0 - xsq + ysq - 2.0 * c.y * R2))
    ) * squareness;

    vec2 mapped = (worldMap + 1.0) / 2.0;
    
    if(abs(worldMap.x) <= 1.0 && abs(worldMap.y) <= 1.0) {
        color = texture(sampler, mapped);
    } else {
        color = vec4(vec3(0.0), 1.0);
    }
}
