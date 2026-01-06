export const BLEND_FRAG_300ES = `#version 300 es
precision highp float;
precision highp sampler2D;
precision highp int;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform sampler2D u_dst;
uniform float u_opacity;
uniform int u_blendMode;

float blendAlpha(float s, float d) {
  return s + d * (1.0 - s);
}
vec3 blendNormalRGB(vec3 src, vec3 dst) {
  return src;
}
vec3 blendAddRGB(vec3 src, vec3 dst) {
  return min(src + dst, 1.0);
}
vec3 blendMultiplyRGB(vec3 src, vec3 dst) {
  return src * dst;
}
vec3 blendScreenRGB(vec3 src, vec3 dst) {
  return 1.0 - (1.0 - src) * (1.0 - dst);
}
vec3 blendOverlayRGB(vec3 src, vec3 dst) {
  return mix(2.0 * src * dst, 1.0 - 2.0 * (1.0 - src) * (1.0 - dst), step(0.5, dst));
}
vec3 blendSoftLightRGB(vec3 src, vec3 dst) {
  return mix(
    2.0 * src * dst + src * src * (1.0 - 2.0 * dst),
    sqrt(src) * (2.0 * dst - 1.0) + 2.0 * src * (1.0 - dst),
    step(0.5, dst)
  );
}
vec3 blendHardLightRGB(vec3 src, vec3 dst) {
  return blendOverlayRGB(dst, src);
}
vec3 blendLinearLightRGB(vec3 src, vec3 dst) {
  return clamp(src + 2.0 * dst - 1.0, 0.0, 1.0);
}
vec3 blendVividLightRGB(vec3 src, vec3 dst) {
  vec3 result;
  for (int i = 0; i < 3; ++i) {
    if (src[i] < 0.5) {
      result[i] = 1.0 - (1.0 - dst[i]) / max(2.0 * src[i], 1e-5);
    } else {
      result[i] = dst[i] / max(2.0 * (1.0 - src[i]), 1e-5);
    }
    result[i] = clamp(result[i], 0.0, 1.0);
  }
  return result;
}

vec4 blendNormal(vec4 src, vec4 dst) {
  float Sa = src.a;
  vec3 rgb = dst.rgb * (1.0 - Sa) + src.rgb * Sa;
  return vec4(rgb, blendAlpha(Sa, dst.a));
}
vec4 blendAdd(vec4 src, vec4 dst) {
  float Sa = src.a;
  vec3 rgb = dst.rgb * (1.0 - Sa) + blendAddRGB(src.rgb, dst.rgb) * Sa;
  return vec4(rgb, blendAlpha(Sa, dst.a));
}
vec4 blendMultiply(vec4 src, vec4 dst) {
  float Sa = src.a;
  vec3 rgb = dst.rgb * (1.0 - Sa) + blendMultiplyRGB(src.rgb, dst.rgb) * Sa;
  return vec4(rgb, blendAlpha(Sa, dst.a));
}
vec4 blendScreen(vec4 src, vec4 dst) {
  float Sa = src.a;
  vec3 rgb = dst.rgb * (1.0 - Sa) + blendScreenRGB(src.rgb, dst.rgb) * Sa;
  return vec4(rgb, blendAlpha(Sa, dst.a));
}
vec4 blendOverlay(vec4 src, vec4 dst) {
  float Sa = src.a;
  vec3 rgb = dst.rgb * (1.0 - Sa) + blendOverlayRGB(src.rgb, dst.rgb) * Sa;
  return vec4(rgb, blendAlpha(Sa, dst.a));
}
vec4 blendSoftLight(vec4 src, vec4 dst) {
  float Sa = src.a;
  vec3 rgb = dst.rgb * (1.0 - Sa) + blendSoftLightRGB(src.rgb, dst.rgb) * Sa;
  return vec4(rgb, blendAlpha(Sa, dst.a));
}
vec4 blendHardLight(vec4 src, vec4 dst) {
  float Sa = src.a;
  vec3 rgb = dst.rgb * (1.0 - Sa) + blendHardLightRGB(src.rgb, dst.rgb) * Sa;
  return vec4(rgb, blendAlpha(Sa, dst.a));
}
vec4 blendLinearLight(vec4 src, vec4 dst) {
  float Sa = src.a;
  vec3 rgb = dst.rgb * (1.0 - Sa) + blendLinearLightRGB(src.rgb, dst.rgb) * Sa;
  return vec4(rgb, blendAlpha(Sa, dst.a));
}
vec4 blendVividLight(vec4 src, vec4 dst) {
  float Sa = src.a;
  vec3 rgb = dst.rgb * (1.0 - Sa) + blendVividLightRGB(src.rgb, dst.rgb) * Sa;
  return vec4(rgb, blendAlpha(Sa, dst.a));
}

void main() {
  vec4 src = texture(u_src, v_uv) * u_opacity;
  vec4 dst = texture(u_dst, v_uv);
  if (u_blendMode == 1) {
    outColor = blendMultiply(src, dst);
  } else if (u_blendMode == 2) {
    outColor = blendScreen(src, dst);
  } else if (u_blendMode == 3) {
    outColor = blendOverlay(src, dst);
  } else if (u_blendMode == 4) {
    outColor = blendSoftLight(src, dst);
  } else if (u_blendMode == 5) {
    outColor = blendHardLight(src, dst);
  } else if (u_blendMode == 6) {
    outColor = blendLinearLight(src, dst);
  } else if (u_blendMode == 7) {
    outColor = blendVividLight(src, dst);
  } else {
    outColor = blendNormal(src, dst);
  }
}
`;

export const COPY_FRAG_FLIP_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform bool u_flipY;

void main() {
  vec2 uv = v_uv;
  if (u_flipY) {
    uv.y = 1.0 - uv.y;
  }
  outColor = texture(u_src, uv);
}
`;
