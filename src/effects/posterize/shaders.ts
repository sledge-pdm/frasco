export const POSTERIZE_FRAG_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform float u_levels;

void main() {
  vec4 color = texture(u_src, v_uv);
  float levels = max(u_levels, 1.0);
  if (levels <= 1.0) {
    outColor = vec4(0.0, 0.0, 0.0, color.a);
    return;
  }

  float step = 255.0 / (levels - 1.0);
  vec3 rgb = color.rgb * 255.0;
  vec3 level = round(rgb / step);
  vec3 quantized = level * step;
  quantized = clamp(quantized, 0.0, 255.0);
  quantized = floor(quantized);
  outColor = vec4(quantized / 255.0, color.a);
}
`;
