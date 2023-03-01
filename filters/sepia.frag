# version 300 es

precision lowp float;

uniform sampler2D sampler;

in vec2 uv;
out vec4 color;

void main() {
    vec4 tex = texture(sampler, uv);
    
    color = vec4(
        0.393 * tex.r + 0.769 * tex.g + 0.189 * tex.b,
        0.349 * tex.r + 0.686 * tex.g + 0.168 * tex.b,
        0.272 * tex.r + 0.534 * tex.g + 0.131 * tex.b,
        tex.a
    );
}