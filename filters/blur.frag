# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform vec2 size;
uniform float param;

in vec2 uv;
out vec4 color;

#define len (param * 2.0 + 1.0)
#define count (len * len)

#define TAU (6.2831853071795864769252867665590057683943)

void main() {    
    vec4 total = vec4(0.0);
    float matrixTotal = 0.0;
    for(float y = -param; y <= param; y++) {
        for(float x = -param; x <= param; x++) {
            vec4 tex = texture(sampler, uv + vec2(x, y) / size);
            float gaussian = exp(- (x * x + y * y) / (2.0 * param * param)) / (TAU * param * param);
            matrixTotal += gaussian;
            total += vec4(tex.rgb * gaussian, tex.a);
        }
    }

    color = total / matrixTotal;
}