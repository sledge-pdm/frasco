export const FULLSCREEN_VERT_300ES = `#version 300 es
precision mediump float;

layout(location = 0) in vec2 a_pos;
out vec2 v_uv;

void main() {
  vec2 uv = a_pos * 0.5 + 0.5;
  v_uv = uv;
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`;

export const COPY_FRAG_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;

void main() {
  outColor = texture(u_src, v_uv);
}
`;

export const SOLID_FRAG_300ES = `#version 300 es
precision highp float;

out vec4 outColor;

uniform vec4 u_color;

void main() {
  outColor = u_color;
}
`;
