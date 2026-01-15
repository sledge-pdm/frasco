export const CIRCLE_MASK_COMPLETION_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform vec2 u_from;
uniform vec2 u_to;
uniform float u_radius;
uniform vec2 u_origin;

void main() {
  vec4 src = texture(u_src, v_uv);
  vec2 ab = u_to - u_from;
  float denom = dot(ab, ab);
  vec2 coord = gl_FragCoord.xy + u_origin;
  float t = denom > 0.0 ? clamp(dot(coord - u_from, ab) / denom, 0.0, 1.0) : 0.0;
  vec2 closest = u_from + ab * t;
  float dist = distance(coord, closest);
  float inside = step(dist, u_radius);
  float mask = max(src.r, inside);
  outColor = vec4(mask, 0.0, 0.0, 1.0);
}
`;
