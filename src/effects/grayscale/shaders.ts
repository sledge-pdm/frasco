export const GRAYSCALE_BT709_FRAG_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;

void main() {
  vec4 color = texture(u_src, v_uv);
  vec3 rgb = color.rgb * 255.0;
  float gray = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
  gray = floor(gray + 0.5);
  outColor = vec4(vec3(gray / 255.0), color.a);
}
`;

export const GRAYSCALE_BT601_FRAG_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;

void main() {
  vec4 color = texture(u_src, v_uv);
  vec3 rgb = color.rgb * 255.0;
  float gray = dot(rgb, vec3(0.299, 0.587, 0.114));
  gray = floor(gray + 0.5);
  outColor = vec4(vec3(gray / 255.0), color.a);
}
`;
