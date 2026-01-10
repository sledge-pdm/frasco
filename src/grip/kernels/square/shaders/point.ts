export const SQUARE_POINT_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform vec2 u_center;
uniform float u_half;
uniform vec4 u_color;
uniform float u_opacity;

void main() {
  vec4 src = texture(u_src, v_uv);
  vec2 d = abs(gl_FragCoord.xy - u_center);
  float inside = step(max(d.x, d.y), u_half);
  float t = clamp(u_opacity, 0.0, 1.0) * inside;
  outColor = mix(src, u_color, t);
}
`;
