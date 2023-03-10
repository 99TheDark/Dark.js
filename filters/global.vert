# version 300 es

precision lowp float;

in vec2 vertPos;
in vec2 vertUV;
out vec2 uv;
out vec2 pos;

void main() {
    pos = vertPos;
    uv = vertUV;
    gl_Position = vec4(vertPos, 0.0, 1.0);
}
