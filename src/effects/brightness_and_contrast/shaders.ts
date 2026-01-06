export const BRIGHTNESS_CONTRAST_FRAG_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform float u_brightness;
uniform float u_contrast;

void main() {
  vec4 color = texture(u_src, v_uv);
  vec3 rgb = color.rgb * 255.0;
  float brightnessOffset = (u_brightness / 100.0) * 255.0;
  float contrastFactor = 1.0 + (u_contrast / 100.0);
  vec3 adjusted = ((rgb - 127.5) * contrastFactor) + 127.5 + brightnessOffset;
  adjusted = clamp(adjusted, 0.0, 255.0);
  adjusted = floor(adjusted);
  outColor = vec4(adjusted / 255.0, color.a);
}
`;
