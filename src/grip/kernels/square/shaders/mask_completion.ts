export const SQUARE_MASK_COMPLETION_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform vec2 u_from;
uniform vec2 u_to;
uniform float u_half;
uniform vec2 u_origin;

void main() {
  vec4 src = texture(u_src, v_uv);
  vec2 coord = gl_FragCoord.xy + u_origin;
  vec2 ab = u_to - u_from;
  float len = length(ab);
  if (len <= 0.0) {
    vec2 d0 = abs(coord - u_from);
    float inside0 = step(max(d0.x, d0.y), u_half);
    float mask0 = max(src.r, inside0);
    outColor = vec4(mask0, 0.0, 0.0, 1.0);
    return;
  }

  float dx = ab.x;
  float dy = ab.y;
  float tMin = 0.0;
  float tMax = 1.0;

  if (abs(dx) < 1e-6) {
    if (abs(coord.x - u_from.x) > u_half) {
      outColor = vec4(src.r, 0.0, 0.0, 1.0);
      return;
    }
  } else {
    float tx0 = (coord.x - u_half - u_from.x) / dx;
    float tx1 = (coord.x + u_half - u_from.x) / dx;
    if (tx0 > tx1) {
      float tmp = tx0;
      tx0 = tx1;
      tx1 = tmp;
    }
    tMin = max(tMin, tx0);
    tMax = min(tMax, tx1);
  }

  if (abs(dy) < 1e-6) {
    if (abs(coord.y - u_from.y) > u_half) {
      outColor = vec4(src.r, 0.0, 0.0, 1.0);
      return;
    }
  } else {
    float ty0 = (coord.y - u_half - u_from.y) / dy;
    float ty1 = (coord.y + u_half - u_from.y) / dy;
    if (ty0 > ty1) {
      float tmp = ty0;
      ty0 = ty1;
      ty1 = tmp;
    }
    tMin = max(tMin, ty0);
    tMax = min(tMax, ty1);
  }

  float inside = step(tMin, tMax);
  float mask = max(src.r, inside);
  outColor = vec4(mask, 0.0, 0.0, 1.0);
}
`;
