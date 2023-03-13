# version 300 es

precision lowp float;

uniform sampler2D sampler;
uniform float param;
uniform vec2 size;

in vec2 uv;
out vec4 color;

vec2 snap(vec2 point) {
    return floor(point * size / param) * param / size;
}

void main() {
    vec4 tex = texture(sampler, snap(uv));
    
    color = tex;
}
