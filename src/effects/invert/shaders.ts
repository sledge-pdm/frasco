export const INVERT_FRAG_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;

void main() {
  vec4 color = texture(u_src, v_uv);
  outColor = vec4(1.0 - color.rgb, color.a);
}
`;
