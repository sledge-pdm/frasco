import { FULLSCREEN_VERT_300ES } from '../layer/shaders';
import type { LayerEffectUniformValue, Size } from '../layer/types';
import type { MaskSurface, MaskSurfaceApplyOptions, MaskSurfaceEffect } from './types';

type TexturePair = {
  front: WebGLTexture;
  back: WebGLTexture;
};

export class MaskSurfaceImpl implements MaskSurface {
  private readonly gl: WebGL2RenderingContext;
  private readonly size: Size;
  private textures: TexturePair;
  private readonly fbo: WebGLFramebuffer;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vbo: WebGLBuffer;
  private readonly programs: Map<string, WebGLProgram> = new Map();
  private disposed = false;

  constructor(gl: WebGL2RenderingContext, size: Size) {
    this.gl = gl;
    this.size = { width: size.width, height: size.height };

    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('MaskSurface: failed to create framebuffer');
    this.fbo = fbo;

    const vao = gl.createVertexArray();
    if (!vao) throw new Error('MaskSurface: failed to create VAO');
    this.vao = vao;

    const vbo = gl.createBuffer();
    if (!vbo) throw new Error('MaskSurface: failed to create VBO');
    this.vbo = vbo;

    this.initFullscreenQuad();

    this.textures = {
      front: this.createTexture(this.size.width, this.size.height),
      back: this.createTexture(this.size.width, this.size.height),
    };
  }

  getWidth(): number {
    return this.size.width;
  }

  getHeight(): number {
    return this.size.height;
  }

  getSize(): Size {
    return { ...this.size };
  }

  getTextureHandle(): WebGLTexture {
    this.assertNotDisposed();
    return this.textures.front;
  }

  clear(value = 0): void {
    this.assertNotDisposed();
    const { gl } = this;
    this.bindFramebuffer(this.textures.front);
    gl.disable(gl.BLEND);
    gl.clearColor(value, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  replaceBuffer(buffer: Uint8Array | Uint8ClampedArray): void {
    this.assertNotDisposed();
    const expected = this.size.width * this.size.height;
    if (buffer.length !== expected) {
      throw new Error(`MaskSurface.replaceBuffer: buffer length ${buffer.length} !== expected ${expected}`);
    }
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.textures.front);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.size.width, this.size.height, gl.RED, gl.UNSIGNED_BYTE, buffer);
  }

  readPixels(): Uint8Array {
    this.assertNotDisposed();
    const { gl } = this;
    this.bindFramebuffer(this.textures.front);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    const out = new Uint8Array(this.size.width * this.size.height);
    gl.readPixels(0, 0, this.size.width, this.size.height, gl.RED, gl.UNSIGNED_BYTE, out);
    return out;
  }

  applyEffect(effect: MaskSurfaceEffect, options?: MaskSurfaceApplyOptions): void {
    this.assertNotDisposed();
    this.runProgram(effect.fragmentSrc, effect.uniforms, options);
  }

  dispose(): void {
    if (this.disposed) return;
    const { gl } = this;

    for (const program of this.programs.values()) {
      gl.deleteProgram(program);
    }
    this.programs.clear();

    gl.deleteTexture(this.textures.front);
    gl.deleteTexture(this.textures.back);
    gl.deleteFramebuffer(this.fbo);
    gl.deleteBuffer(this.vbo);
    gl.deleteVertexArray(this.vao);

    this.disposed = true;
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

  private runProgram(fragmentSrc: string, uniforms?: Record<string, LayerEffectUniformValue>, options?: MaskSurfaceApplyOptions): void {
    const { gl } = this;
    const program = this.getOrCreateProgram(fragmentSrc, fragmentSrc);
    const bounds = options?.bounds;

    if (bounds) {
      this.copyTextureBounds(this.textures.front, this.textures.back, bounds);
    }
    this.bindFramebuffer(this.textures.back);
    gl.viewport(0, 0, this.size.width, this.size.height);
    if (bounds) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(bounds.x, bounds.y, bounds.width, bounds.height);
    } else {
      gl.disable(gl.SCISSOR_TEST);
    }
    gl.disable(gl.BLEND);
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.front);
    const srcLoc = gl.getUniformLocation(program, 'u_src');
    if (srcLoc) gl.uniform1i(srcLoc, 0);

    if (uniforms) {
      for (const [name, value] of Object.entries(uniforms)) {
        const loc = gl.getUniformLocation(program, name);
        if (!loc) continue;
        if (typeof value === 'number') {
          gl.uniform1f(loc, value);
        } else if (value.length === 1) {
          gl.uniform1f(loc, value[0] as number);
        } else if (value.length === 2) {
          gl.uniform2f(loc, value[0] as number, value[1] as number);
        } else if (value.length === 3) {
          gl.uniform3f(loc, value[0] as number, value[1] as number, value[2] as number);
        } else if (value.length === 4) {
          gl.uniform4f(loc, value[0] as number, value[1] as number, value[2] as number, value[3] as number);
        } else {
          throw new Error(`MaskSurface.runProgram: unsupported uniform length for ${name}`);
        }
      }
    }

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.useProgram(null);
    if (bounds) {
      gl.disable(gl.SCISSOR_TEST);
      this.copyTextureBounds(this.textures.back, this.textures.front, bounds);
      return;
    }

    this.swapTextures();
  }

  private swapTextures(): void {
    const tmp = this.textures.front;
    this.textures.front = this.textures.back;
    this.textures.back = tmp;
  }

  private bindFramebuffer(tex: WebGLTexture): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  }

  private copyFrontToBack(): void {
    const { gl } = this;
    this.bindFramebuffer(this.textures.front);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.back);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.size.width, this.size.height);
  }

  private copyTextureBounds(src: WebGLTexture, dst: WebGLTexture, bounds: SurfaceBounds): void {
    const { gl } = this;
    this.bindFramebuffer(src);
    gl.bindTexture(gl.TEXTURE_2D, dst);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, bounds.x, bounds.y, bounds.x, bounds.y, bounds.width, bounds.height);
  }

  private createTexture(width: number, height: number): WebGLTexture {
    const { gl } = this;
    const tex = gl.createTexture();
    if (!tex) throw new Error('MaskSurface: failed to create texture');

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.R8, width, height, 0, gl.RED, gl.UNSIGNED_BYTE, null);
    return tex;
  }

  private getOrCreateProgram(key: string, fragmentSrc: string): WebGLProgram {
    const cached = this.programs.get(key);
    if (cached) return cached;

    const { gl } = this;
    const vs = compileShader(gl, gl.VERTEX_SHADER, FULLSCREEN_VERT_300ES);
    const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSrc);
    const program = linkProgram(gl, vs, fs);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    this.programs.set(key, program);
    return program;
  }

  private assertNotDisposed(): void {
    if (this.disposed) throw new Error('MaskSurface: disposed');
  }
}

function compileShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('MaskSurface: failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'unknown';
    gl.deleteShader(shader);
    throw new Error(`MaskSurface: shader compile error: ${info}`);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('MaskSurface: failed to create program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'unknown';
    gl.deleteProgram(program);
    throw new Error(`MaskSurface: program link error: ${info}`);
  }
  return program;
}
