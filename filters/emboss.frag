# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform vec2 size;

in vec2 uv;
out vec4 color;

vec4 get(float x, float y) {
    return texture(sampler, uv + vec2(x, y) / size);
}

void main() {
    vec4 tex = texture(sampler, uv);

    const float kernel[9] = float[](
        -2.0, -1.0, 0.0,
        -1.0, 1.0, 1.0,
        0.0, 1.0, 2.0
    ); 

    color = vec4((
        get(-1.0, -1.0) * kernel[0] +
        get(0.0, -1.0) * kernel[1] +
        get(1.0, -1.0) * kernel[2] +
        get(-1.0, 0.0) * kernel[3] +
        get(0.0, 0.0) * kernel[4] +
        get(1.0, 0.0) * kernel[5] +
        get(-1.0, 1.0) * kernel[6] +
        get(0.0, 1.0) * kernel[7] +
        get(1.0, 1.0) * kernel[8]
    ).rgb, tex.a);
}