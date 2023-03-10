# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform vec2 size;

in vec2 uv;
out vec4 color;

vec4 get(float x, float y) {
    return texture(sampler, uv + vec2(x, y) / size);
}

float luminance(vec4 col) {
    return 0.2126 * col.r + 0.7152 * col.g + 0.0722 * col.b; // from grayscale
}

void main() {
    vec4 middle = get(0.0, 0.0);
    vec4 top = get(0.0, 1.0);
    vec4 bottom = get(0.0, -1.0);
    vec4 right = get(1.0, 0.0);
    vec4 left = get(-1.0, 0.0);
    float lumMiddle = luminance(middle);
    float lumTop = luminance(top);
    float lumBottom = luminance(bottom);
    float lumRight = luminance(right);
    float lumLeft = luminance(left);

    if(lumBottom > lumMiddle) {
        color = bottom;
    } else if(lumTop > lumMiddle) {
        color = top;
    } else if(lumRight > lumMiddle) {
        color = right;
    } else if(lumLeft > lumMiddle) {
        color = left;
    } else {
        color = middle;
    }
}