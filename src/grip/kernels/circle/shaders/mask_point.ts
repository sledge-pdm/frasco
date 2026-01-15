export const CIRCLE_MASK_POINT_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform vec2 u_center;
uniform float u_radius;
uniform vec2 u_origin;

void main() {
  vec4 src = texture(u_src, v_uv);
  vec2 coord = gl_FragCoord.xy + u_origin;
  float dist = distance(coord, u_center);
  float inside = step(dist, u_radius);
  float mask = max(src.r, inside);
  outColor = vec4(mask, 0.0, 0.0, 1.0);
}
`;
