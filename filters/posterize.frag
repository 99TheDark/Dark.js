# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform float param;

in vec2 uv;
out vec4 color;

float posterize(float val) {
    return floor(val * param + 0.5) / param;
}

void main() {
    vec4 tex = texture(sampler, uv);

    float red = posterize(tex.r);
    float green = posterize(tex.g);
    float blue = posterize(tex.b);
    
    color = vec4(red, green, blue, 1.0);
}