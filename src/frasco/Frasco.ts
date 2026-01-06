import { FULLSCREEN_VERT_300ES } from '../layer/shaders';
import type { RgbaFloat, Size } from '../layer/types';
import { BLEND_FRAG_300ES, COPY_FRAG_FLIP_300ES } from './shaders';
import type { ComposeOptions, CompositeLayer, FrascoOptions } from './types';
import { getBlendModeId } from './types';

type TexturePair = {
  front: WebGLTexture;
  back: WebGLTexture;
};

export class Frasco {
  private readonly gl: WebGL2RenderingContext;
  private size?: Size;
  private baseColor?: RgbaFloat;
  private readonly fbo: WebGLFramebuffer;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vbo: WebGLBuffer;
  private readonly blendProgram: WebGLProgram;
  private readonly copyProgram: WebGLProgram;
  private textures?: TexturePair;
  private disposed = false;

  constructor(gl: WebGL2RenderingContext, options?: FrascoOptions) {
    this.gl = gl;
    this.size = options?.size ? { ...options.size } : undefined;
    this.baseColor = options?.baseColor;

    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('Frasco: failed to create framebuffer');
    this.fbo = fbo;

    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Frasco: failed to create VAO');
    this.vao = vao;

    const vbo = gl.createBuffer();
    if (!vbo) throw new Error('Frasco: failed to create VBO');
    this.vbo = vbo;

    this.initFullscreenQuad();

    const vs = compileShader(gl, gl.VERTEX_SHADER, FULLSCREEN_VERT_300ES);
    const blendFs = compileShader(gl, gl.FRAGMENT_SHADER, BLEND_FRAG_300ES);
    this.blendProgram = linkProgram(gl, vs, blendFs);
    gl.deleteShader(blendFs);

    const copyFs = compileShader(gl, gl.FRAGMENT_SHADER, COPY_FRAG_FLIP_300ES);
    this.copyProgram = linkProgram(gl, vs, copyFs);
    gl.deleteShader(copyFs);
    gl.deleteShader(vs);

    if (this.size) {
      this.textures = this.createTexturePair(this.size);
    }
  }

  setBaseColor(color?: RgbaFloat): void {
    this.baseColor = color;
  }

  resize(size: Size): void {
    this.assertNotDisposed();
    if (size.width <= 0 || size.height <= 0) {
      throw new Error('Frasco.resize: width/height must be > 0');
    }
    if (this.size && size.width === this.size.width && size.height === this.size.height) return;
    this.size = { ...size };
    this.recreateTextures(this.size);
  }

  compose(layers: CompositeLayer[], options?: ComposeOptions): void {
    this.assertNotDisposed();
    const targetSize = options?.size ?? this.size;
    if (!targetSize) {
      throw new Error('Frasco.compose: size is required before composing');
    }

    this.ensureSize(targetSize);
    if (!this.textures) throw new Error('Frasco.compose: textures not initialized');

    const { gl } = this;
    const activeLayers = layers.filter((layer) => layer.enabled !== false);
    const baseColor = options?.baseColor ?? this.baseColor;

    gl.disable(gl.BLEND);
    gl.disable(gl.SCISSOR_TEST);
    gl.viewport(0, 0, targetSize.width, targetSize.height);

    this.clearTexture(this.textures.front, baseColor ?? [0, 0, 0, 0]);

    let front = this.textures.front;
    let back = this.textures.back;

    for (const layer of activeLayers) {
      this.drawBlend(layer.texture, front, back, layer.opacity, getBlendModeId(layer.blendMode));
      const tmp = front;
      front = back;
      back = tmp;
    }

    const target = options?.target ?? null;
    const flipY = options?.flipY ?? false;
    if (target && target === front) return;
    this.drawCopy(front, target, flipY);
  }

  dispose(): void {
    if (this.disposed) return;
    const { gl } = this;

    if (this.textures) {
      gl.deleteTexture(this.textures.front);
      gl.deleteTexture(this.textures.back);
      this.textures = undefined;
    }

    gl.deleteProgram(this.blendProgram);
    gl.deleteProgram(this.copyProgram);
    gl.deleteBuffer(this.vbo);
    gl.deleteVertexArray(this.vao);
    gl.deleteFramebuffer(this.fbo);

    this.disposed = true;
  }

  private ensureSize(size: Size): void {
    if (!this.size) {
      this.size = { ...size };
      this.textures = this.createTexturePair(size);
      return;
    }
    if (this.size.width !== size.width || this.size.height !== size.height) {
      this.size = { ...size };
      this.recreateTextures(size);
    }
  }

  private recreateTextures(size: Size): void {
    const { gl } = this;
    if (this.textures) {
      gl.deleteTexture(this.textures.front);
      gl.deleteTexture(this.textures.back);
    }
    this.textures = this.createTexturePair(size);
  }

  private createTexturePair(size: Size): TexturePair {
    return {
      front: this.createTexture(size.width, size.height),
      back: this.createTexture(size.width, size.height),
    };
  }

  private createTexture(width: number, height: number): WebGLTexture {
    const { gl } = this;
    const tex = gl.createTexture();
    if (!tex) throw new Error('Frasco: failed to create texture');

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return tex;
  }

  private clearTexture(texture: WebGLTexture, color: RgbaFloat): void {
    const { gl } = this;
    this.bindFramebuffer(texture);
    gl.clearColor(color[0], color[1], color[2], color[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  private drawBlend(src: WebGLTexture, dst: WebGLTexture, out: WebGLTexture, opacity: number, mode: number): void {
    const { gl } = this;
    this.bindFramebuffer(out);
    gl.useProgram(this.blendProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    const srcLoc = gl.getUniformLocation(this.blendProgram, 'u_src');
    if (srcLoc) gl.uniform1i(srcLoc, 0);

    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, dst);
    const dstLoc = gl.getUniformLocation(this.blendProgram, 'u_dst');
    if (dstLoc) gl.uniform1i(dstLoc, 1);

    const opacityLoc = gl.getUniformLocation(this.blendProgram, 'u_opacity');
    if (opacityLoc) gl.uniform1f(opacityLoc, opacity);

    const modeLoc = gl.getUniformLocation(this.blendProgram, 'u_blendMode');
    if (modeLoc) gl.uniform1i(modeLoc, mode);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  private drawCopy(src: WebGLTexture, target: WebGLTexture | null, flipY: boolean): void {
    const { gl } = this;
    if (target) {
      this.bindFramebuffer(target);
    } else {
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }
    gl.useProgram(this.copyProgram);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, src);
    const srcLoc = gl.getUniformLocation(this.copyProgram, 'u_src');
    if (srcLoc) gl.uniform1i(srcLoc, 0);

    const flipLoc = gl.getUniformLocation(this.copyProgram, 'u_flipY');
    if (flipLoc) gl.uniform1i(flipLoc, flipY ? 1 : 0);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.useProgram(null);
  }

  private initFullscreenQuad(): void {
    const { gl } = this;
    gl.bindVertexArray(this.vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);

    const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1]);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    gl.bindVertexArray(null);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
  }

  private bindFramebuffer(texture: WebGLTexture): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  }

  private assertNotDisposed(): void {
    if (this.disposed) throw new Error('Frasco: disposed');
  }
}

function compileShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Frasco: failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'unknown';
    gl.deleteShader(shader);
    throw new Error(`Frasco: shader compile error: ${info}`);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Frasco: failed to create program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'unknown';
    gl.deleteProgram(program);
    throw new Error(`Frasco: program link error: ${info}`);
  }
  return program;
}
