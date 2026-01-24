export const DITHERING_RANDOM_FRAG_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform vec2 u_size;
uniform float u_levels;
uniform float u_strength;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

vec3 quantize(vec3 rgb, vec3 noise, float step, float maxLevel) {
  vec3 noisy = rgb + noise;
  vec3 level = round(noisy / step);
  level = clamp(level, 0.0, maxLevel);
  vec3 quantized = level * step;
  quantized = clamp(quantized, 0.0, 255.0);
  quantized = floor(quantized);
  return quantized;
}

void main() {
  vec4 color = texture(u_src, v_uv);
  float levels = max(u_levels, 2.0);
  float step = 255.0 / (levels - 1.0);
  float maxLevel = levels - 1.0;
  vec2 pixel = clamp(floor(v_uv * u_size), vec2(0.0), u_size - 1.0);

  float noiseScale = 2.0 * u_strength * step;
  float noiseR = (rand(pixel + vec2(0.0, 0.0)) - 0.5) * noiseScale;
  float noiseG = (rand(pixel + vec2(13.5, 7.2)) - 0.5) * noiseScale;
  float noiseB = (rand(pixel + vec2(5.2, 19.1)) - 0.5) * noiseScale;

  vec3 rgb = floor(color.rgb * 255.0 + 0.5);
  vec3 quantized = quantize(rgb, vec3(noiseR, noiseG, noiseB), step, maxLevel);
  outColor = vec4(quantized / 255.0, color.a);
}
`;

export const DITHERING_ORDERED_FRAG_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform vec2 u_size;
uniform float u_levels;
uniform float u_strength;

const float BAYER4X4[16] = float[16](
  0.0, 8.0, 2.0, 10.0,
  12.0, 4.0, 14.0, 6.0,
  3.0, 11.0, 1.0, 9.0,
  15.0, 7.0, 13.0, 5.0
);

float getThreshold(ivec2 p) {
  int ix = p.x % 4;
  int iy = p.y % 4;
  int index = iy * 4 + ix;
  return BAYER4X4[index] / 16.0;
}

vec3 quantize(vec3 rgb, float noise, float step, float maxLevel) {
  vec3 noisy = rgb + noise;
  vec3 level = round(noisy / step);
  level = clamp(level, 0.0, maxLevel);
  vec3 quantized = level * step;
  quantized = clamp(quantized, 0.0, 255.0);
  quantized = floor(quantized);
  return quantized;
}

void main() {
  vec4 color = texture(u_src, v_uv);
  float levels = max(u_levels, 2.0);
  float step = 255.0 / (levels - 1.0);
  float maxLevel = levels - 1.0;
  vec2 pixel = clamp(floor(v_uv * u_size), vec2(0.0), u_size - 1.0);
  ivec2 ip = ivec2(pixel);
  float threshold = getThreshold(ip);
  float noise = (threshold - 0.5) * u_strength * step;

  vec3 rgb = floor(color.rgb * 255.0 + 0.5);
  vec3 quantized = quantize(rgb, noise, step, maxLevel);
  outColor = vec4(quantized / 255.0, color.a);
}
`;
