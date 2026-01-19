export const FLIP_FRAG_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform float u_flipX;
uniform float u_flipY;

void main() {
  vec2 uv = v_uv;
  uv.x = mix(uv.x, 1.0 - uv.x, u_flipX);
  uv.y = mix(uv.y, 1.0 - uv.y, u_flipY);
  outColor = texture(u_src, uv);
}
`;
