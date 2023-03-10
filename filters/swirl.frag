# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform vec2 size;
uniform float param;

in vec2 uv;
out vec4 color;

#define radius (0.5)

void main() {
    vec2 cUV = uv - vec2(0.5); // centered UV

    float len = length(cUV);
    float theta = atan(cUV.y, cUV.x) + param * smoothstep(radius, 0.0, len);
    float dist = length(cUV);

    vec4 tex = texture(sampler, vec2(dist * cos(theta), dist * sin(theta)) + vec2(0.5));
    
    color = tex;
}