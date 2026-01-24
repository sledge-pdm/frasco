export const GAUSSIAN_BLUR_FRAG_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform vec2 u_texel;
uniform float u_alphaMode;

bool inBounds(vec2 uv) {
  return uv.x >= 0.0 && uv.x <= 1.0 && uv.y >= 0.0 && uv.y <= 1.0;
}

void main() {
  vec4 original = texture(u_src, v_uv);
  vec4 original255 = floor(original * 255.0 + 0.5);
  vec4 sum = vec4(0.0);
  float weightSum = 0.0;

  vec2 uv;

  uv = v_uv + vec2(-1.0, -1.0) * u_texel;
  if (inBounds(uv)) { sum += floor(texture(u_src, uv) * 255.0 + 0.5) * 1.0; weightSum += 1.0; }
  uv = v_uv + vec2(0.0, -1.0) * u_texel;
  if (inBounds(uv)) { sum += floor(texture(u_src, uv) * 255.0 + 0.5) * 2.0; weightSum += 2.0; }
  uv = v_uv + vec2(1.0, -1.0) * u_texel;
  if (inBounds(uv)) { sum += floor(texture(u_src, uv) * 255.0 + 0.5) * 1.0; weightSum += 1.0; }

  uv = v_uv + vec2(-1.0, 0.0) * u_texel;
  if (inBounds(uv)) { sum += floor(texture(u_src, uv) * 255.0 + 0.5) * 2.0; weightSum += 2.0; }
  uv = v_uv;
  if (inBounds(uv)) { sum += floor(texture(u_src, uv) * 255.0 + 0.5) * 4.0; weightSum += 4.0; }
  uv = v_uv + vec2(1.0, 0.0) * u_texel;
  if (inBounds(uv)) { sum += floor(texture(u_src, uv) * 255.0 + 0.5) * 2.0; weightSum += 2.0; }

  uv = v_uv + vec2(-1.0, 1.0) * u_texel;
  if (inBounds(uv)) { sum += floor(texture(u_src, uv) * 255.0 + 0.5) * 1.0; weightSum += 1.0; }
  uv = v_uv + vec2(0.0, 1.0) * u_texel;
  if (inBounds(uv)) { sum += floor(texture(u_src, uv) * 255.0 + 0.5) * 2.0; weightSum += 2.0; }
  uv = v_uv + vec2(1.0, 1.0) * u_texel;
  if (inBounds(uv)) { sum += floor(texture(u_src, uv) * 255.0 + 0.5) * 1.0; weightSum += 1.0; }

  vec4 blurred255 = weightSum > 0.0 ? (sum / weightSum) : original255;
  blurred255 = floor(blurred255);
  float alpha255 = u_alphaMode < 0.5 ? original255.a : blurred255.a;
  outColor = vec4(blurred255.rgb / 255.0, alpha255 / 255.0);
}
`;
