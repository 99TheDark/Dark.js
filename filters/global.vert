# version 300 es

precision lowp float;

in vec2 pos;
out vec2 uv;

void main() {
    uv = (pos + 1.0) * 0.5; // Vertex position = -1 to 1, UV = 0 to 1
    gl_Position = vec4(pos, 0.0, 1.0);
}
