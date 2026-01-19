export const ROTATE_90_FRAG_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform float u_dir;

void main() {
  vec2 uv;
  if (u_dir > 0.0) {
    uv = vec2(v_uv.y, 1.0 - v_uv.x);
  } else {
    uv = vec2(1.0 - v_uv.y, v_uv.x);
  }
  outColor = texture(u_src, uv);
}
`;
