import { LayerHistory } from '../history/LayerHistory';
import type { HistoryBackend, HistoryRawSnapshot, HistoryTarget } from '../history/types';
import { MaskSurfaceImpl } from '../surface/MaskSurface';
import type { MaskSurface, SurfaceBounds } from '../surface/types';
import { COPY_FRAG_300ES, FULLSCREEN_VERT_300ES } from './shaders';
import type { LayerEffect, LayerExportOptions, LayerInit, RawPixelData, Rgba8, Size } from './types';

type TexturePair = {
  front: WebGLTexture;
  back: WebGLTexture;
};

export class Layer implements HistoryTarget {
  private readonly gl: WebGL2RenderingContext;
  private size: Size;
  private textures: TexturePair;
  private readonly fbo: WebGLFramebuffer;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vbo: WebGLBuffer;
  private readonly programs: Map<string, WebGLProgram> = new Map();
  private history?: LayerHistory<unknown>;
  private disposed = false;

  constructor(gl: WebGL2RenderingContext, init: LayerInit) {
    this.gl = gl;
    this.size = { width: init.width, height: init.height };

    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('Layer: failed to create framebuffer');
    this.fbo = fbo;

    const vao = gl.createVertexArray();
    if (!vao) throw new Error('Layer: failed to create VAO');
    this.vao = vao;

    const vbo = gl.createBuffer();
    if (!vbo) throw new Error('Layer: failed to create VBO');
    this.vbo = vbo;

    this.initFullscreenQuad();

    this.textures = {
      front: this.createTexture(this.size.width, this.size.height, init.data),
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

  createMaskSurface(size?: Size): MaskSurface {
    this.assertNotDisposed();
    const target = size ?? this.size;
    return new MaskSurfaceImpl(this.gl, target);
  }

  createTextureCopy(): WebGLTexture {
    this.assertNotDisposed();
    const { gl } = this;
    const tex = this.createTexture(this.size.width, this.size.height);
    this.bindFramebuffer(this.textures.front);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.size.width, this.size.height);
    return tex;
  }

  deleteTexture(texture: WebGLTexture): void {
    this.assertNotDisposed();
    this.gl.deleteTexture(texture);
  }

  setHistoryBackend<TSnapshot>(backend: HistoryBackend<TSnapshot>, maxItems = 100): void {
    this.history?.dispose();
    this.history = new LayerHistory<TSnapshot>(this, backend, maxItems) as LayerHistory<unknown>;
  }

  getHistory(): LayerHistory<unknown> | undefined {
    return this.history;
  }

  captureHistory(bounds?: SurfaceBounds): unknown | undefined {
    return this.history?.capture(bounds);
  }

  pushHistory(snapshot: unknown): void {
    this.history?.push(snapshot);
  }

  commitHistory(bounds?: SurfaceBounds): unknown | undefined {
    return this.history?.commit(bounds);
  }

  undo(): void {
    this.history?.undo();
  }

  redo(): void {
    this.history?.redo();
  }

  canUndo(): boolean {
    return this.history?.canUndo() ?? false;
  }

  canRedo(): boolean {
    return this.history?.canRedo() ?? false;
  }

  clearHistory(): void {
    this.history?.clear();
  }

  exportHistoryRaw(): { undoStack: HistoryRawSnapshot[]; redoStack: HistoryRawSnapshot[] } | undefined {
    return this.history?.exportRaw();
  }

  importHistoryRaw(undoStack: HistoryRawSnapshot[], redoStack: HistoryRawSnapshot[]): void {
    this.history?.importRaw(undoStack, redoStack);
  }

  pushHistoryRaw(snapshot: HistoryRawSnapshot): void {
    this.history?.pushRaw(snapshot);
  }

  commitHistoryFromTexture(texture: WebGLTexture, bounds: SurfaceBounds): void {
    const history = this.history;
    if (!history) return;
    const buffer = this.readTexturePixelsFrom(texture, bounds);
    history.pushRaw({
      bounds,
      size: { width: bounds.width, height: bounds.height },
      buffer,
    });
  }

  dispose(): void {
    if (this.disposed) return;
    const { gl } = this;

    this.history?.dispose();
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

  clear(color: Rgba8 = [0, 0, 0, 0]): void {
    this.assertNotDisposed();
    const { gl } = this;
    this.bindFramebuffer(this.textures.front);
    gl.disable(gl.BLEND);
    gl.clearColor(color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.flush();
  }

  resize(width: number, height: number): void {
    this.assertNotDisposed();
    if (width <= 0 || height <= 0) throw new Error('Layer.resize: width/height must be > 0');
    if (width === this.size.width && height === this.size.height) return;

    const { gl } = this;
    gl.deleteTexture(this.textures.front);
    gl.deleteTexture(this.textures.back);

    this.size = { width, height };
    this.textures = {
      front: this.createTexture(width, height),
      back: this.createTexture(width, height),
    };
  }

  replaceBuffer(buffer: RawPixelData, width?: number, height?: number): void {
    this.assertNotDisposed();
    if (width !== undefined && height !== undefined) {
      this.resize(width, height);
    }

    const expected = this.size.width * this.size.height * 4;
    if (buffer.length !== expected) {
      throw new Error(`Layer.replaceBuffer: buffer length ${buffer.length} !== expected ${expected}`);
    }

    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.textures.front);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, this.size.width, this.size.height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
  }

  exportRaw(options?: LayerExportOptions): Uint8Array {
    this.assertNotDisposed();
    const { gl } = this;
    this.bindFramebuffer(this.textures.front);

    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    const out = new Uint8Array(this.size.width * this.size.height * 4);
    gl.readPixels(0, 0, this.size.width, this.size.height, gl.RGBA, gl.UNSIGNED_BYTE, out);

    if (options?.flipY) {
      flipPixelsYInPlace(out, this.size.width, this.size.height);
    }
    return out;
  }

  readPixels(bounds: SurfaceBounds): Uint8Array {
    this.assertNotDisposed();
    const { gl } = this;
    this.bindFramebuffer(this.textures.front);

    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    const out = new Uint8Array(bounds.width * bounds.height * 4);
    gl.readPixels(bounds.x, bounds.y, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return out;
  }

  writePixels(bounds: SurfaceBounds, buffer: Uint8Array): void {
    this.assertNotDisposed();
    const expected = bounds.width * bounds.height * 4;
    if (buffer.length !== expected) {
      throw new Error(`Layer.writePixels: buffer length ${buffer.length} !== expected ${expected}`);
    }
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.textures.front);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, bounds.x, bounds.y, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
  }

  copyTexture(bounds: SurfaceBounds): WebGLTexture {
    this.assertNotDisposed();
    const { gl } = this;
    const tex = this.createTexture(bounds.width, bounds.height);
    this.bindFramebuffer(this.textures.front);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, bounds.x, bounds.y, bounds.width, bounds.height);
    return tex;
  }

  drawTexture(bounds: SurfaceBounds, texture: WebGLTexture): void {
    this.assertNotDisposed();
    const { gl } = this;
    const program = this.getOrCreateProgram('__history_copy__', COPY_FRAG_300ES);

    this.copyFrontToBack();
    this.bindFramebuffer(this.textures.back);
    gl.viewport(bounds.x, bounds.y, bounds.width, bounds.height);
    gl.disable(gl.BLEND);
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    const srcLoc = gl.getUniformLocation(program, 'u_src');
    if (srcLoc) gl.uniform1i(srcLoc, 0);

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.useProgram(null);

    this.swapTextures();
  }

  createTextureFromRaw(buffer: Uint8Array, size: Size): WebGLTexture {
    this.assertNotDisposed();
    const expected = size.width * size.height * 4;
    if (buffer.length !== expected) {
      throw new Error(`Layer.createTextureFromRaw: buffer length ${buffer.length} !== expected ${expected}`);
    }
    return this.createTexture(size.width, size.height, buffer);
  }

  readTexturePixels(texture: WebGLTexture, size: Size): Uint8Array {
    this.assertNotDisposed();
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    const out = new Uint8Array(size.width * size.height * 4);
    gl.readPixels(0, 0, size.width, size.height, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return out;
  }

  readTexturePixelsFrom(texture: WebGLTexture, bounds: SurfaceBounds): Uint8Array {
    this.assertNotDisposed();
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    const out = new Uint8Array(bounds.width * bounds.height * 4);
    gl.readPixels(bounds.x, bounds.y, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return out;
  }

  applyEffect(effect: LayerEffect): void {
    this.assertNotDisposed();
    this.runProgram(effect.fragmentSrc, effect.uniforms);
  }

  applyEffectWithTextures(effect: LayerEffect, textures: Record<string, WebGLTexture>, bounds?: SurfaceBounds): void {
    this.assertNotDisposed();
    this.runProgramWithTextures(effect.fragmentSrc, effect.uniforms, textures, bounds);
  }

  copyFrom(layer: Layer): void {
    this.assertNotDisposed();
    if (layer.getWidth() !== this.size.width || layer.getHeight() !== this.size.height) {
      throw new Error('Layer.copyFrom: size mismatch');
    }
    const src = layer.exportRaw();
    this.replaceBuffer(src);
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

  private runProgram(fragmentSrc: string, uniforms?: Record<string, number | readonly number[]>): void {
    const { gl } = this;
    const program = this.getOrCreateProgram(fragmentSrc, fragmentSrc);

    this.bindFramebuffer(this.textures.back);
    gl.viewport(0, 0, this.size.width, this.size.height);
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
          throw new Error(`Layer.runProgram: unsupported uniform length for ${name}`);
        }
      }
    }

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.useProgram(null);

    this.swapTextures();
  }

  private runProgramWithTextures(
    fragmentSrc: string,
    uniforms: Record<string, number | readonly number[]> | undefined,
    textures: Record<string, WebGLTexture>,
    bounds?: SurfaceBounds
  ): void {
    const { gl } = this;
    const program = this.getOrCreateProgram(fragmentSrc, fragmentSrc);

    if (bounds) {
      this.copyFrontToBack();
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

    let unit = 1;
    for (const [name, texture] of Object.entries(textures)) {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      const loc = gl.getUniformLocation(program, name);
      if (loc) gl.uniform1i(loc, unit);
      unit += 1;
    }

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
          throw new Error(`Layer.runProgram: unsupported uniform length for ${name}`);
        }
      }
    }

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.useProgram(null);
    if (bounds) gl.disable(gl.SCISSOR_TEST);

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

  private createTexture(width: number, height: number, data?: RawPixelData): WebGLTexture {
    const { gl } = this;
    const tex = gl.createTexture();
    if (!tex) throw new Error('Layer: failed to create texture');

    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);

    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, data ?? null);
    return tex;
  }

  private copyFrontToBack(): void {
    const { gl } = this;
    this.bindFramebuffer(this.textures.front);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.back);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.size.width, this.size.height);
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
    if (this.disposed) throw new Error('Layer: disposed');
  }
}

function compileShader(gl: WebGL2RenderingContext, type: GLenum, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Layer: failed to create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader) ?? 'unknown';
    gl.deleteShader(shader);
    throw new Error(`Layer: shader compile error: ${info}`);
  }
  return shader;
}

function linkProgram(gl: WebGL2RenderingContext, vs: WebGLShader, fs: WebGLShader): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Layer: failed to create program');
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(program) ?? 'unknown';
    gl.deleteProgram(program);
    throw new Error(`Layer: program link error: ${info}`);
  }
  return program;
}

function flipPixelsYInPlace(buffer: Uint8Array, width: number, height: number): void {
  const rowBytes = width * 4;
  const tmp = new Uint8Array(rowBytes);
  const half = Math.floor(height / 2);
  for (let y = 0; y < half; y++) {
    const top = y * rowBytes;
    const bottom = (height - 1 - y) * rowBytes;
    tmp.set(buffer.subarray(top, top + rowBytes));
    buffer.copyWithin(top, bottom, bottom + rowBytes);
    buffer.set(tmp, bottom);
  }
}
