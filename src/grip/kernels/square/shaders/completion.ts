export const SQUARE_COMPLETION_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform vec2 u_from;
uniform vec2 u_to;
uniform float u_half;
uniform vec4 u_color;
uniform float u_opacity;

void main() {
  vec4 src = texture(u_src, v_uv);
  vec2 ab = u_to - u_from;
  float len = length(ab);
  if (len <= 0.0) {
    vec2 d0 = abs(gl_FragCoord.xy - u_from);
    float inside0 = step(max(d0.x, d0.y), u_half);
    float t0 = clamp(u_opacity, 0.0, 1.0) * inside0;
    outColor = mix(src, u_color, t0);
    return;
  }

  float dx = ab.x;
  float dy = ab.y;
  float tMin = 0.0;
  float tMax = 1.0;

  if (abs(dx) < 1e-6) {
    if (abs(gl_FragCoord.x - u_from.x) > u_half) {
      outColor = src;
      return;
    }
  } else {
    float tx0 = (gl_FragCoord.x - u_half - u_from.x) / dx;
    float tx1 = (gl_FragCoord.x + u_half - u_from.x) / dx;
    if (tx0 > tx1) {
      float tmp = tx0;
      tx0 = tx1;
      tx1 = tmp;
    }
    tMin = max(tMin, tx0);
    tMax = min(tMax, tx1);
  }

  if (abs(dy) < 1e-6) {
    if (abs(gl_FragCoord.y - u_from.y) > u_half) {
      outColor = src;
      return;
    }
  } else {
    float ty0 = (gl_FragCoord.y - u_half - u_from.y) / dy;
    float ty1 = (gl_FragCoord.y + u_half - u_from.y) / dy;
    if (ty0 > ty1) {
      float tmp = ty0;
      ty0 = ty1;
      ty1 = tmp;
    }
    tMin = max(tMin, ty0);
    tMax = min(tMax, ty1);
  }

  float inside = step(tMin, tMax);
  float t = clamp(u_opacity, 0.0, 1.0) * inside;
  outColor = mix(src, u_color, t);
}
`;
