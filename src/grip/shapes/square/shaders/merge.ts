export const SQUARE_MERGE_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_base;
uniform sampler2D u_mask;
uniform vec4 u_color;
uniform float u_opacity;

void main() {
  vec4 base = texture(u_base, v_uv);
  float mask = texture(u_mask, v_uv).r;
  float t = clamp(u_opacity, 0.0, 1.0) * mask;
  outColor = mix(base, u_color, t);
}
`;
