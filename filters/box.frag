# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform vec2 size;
uniform float param;

in vec2 uv;
out vec4 color;

#define len (param * 2.0 + 1.0)
#define count (len * len)

void main() {
    vec4 tex = texture(sampler, uv);
    
    vec4 total = vec4(0.0);
    for(float y = -param; y <= param; y++) {
        for(float x = -param; x <= param; x++) {
            total += texture(sampler, uv + vec2(x, y) / size);
        }
    }

    color = vec4(total / count);
}