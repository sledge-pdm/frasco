import { RawPixelData } from '@sledge-pdm/core';
import type { HistoryBackend, HistoryRawSnapshot, HistoryTarget } from '~/history';
import { LayerHistory } from '~/history';
import type { MaskSurface, SurfaceBounds } from '~/surface';
import { MaskSurfaceImpl } from '~/surface';
import { createTexture, flipPixelsYInPlace, readTexturePixels } from '~/utils';
import type { LayerEvent, LayerEventFor, LayerEventType } from './events';
import { COPY_FRAG_300ES, FULLSCREEN_VERT_300ES } from './shaders';
import type { LayerEffect, LayerInit, ReadPixelsOptions, Rgba8, Size, WritePixelsOptions } from './types';

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
  private readonly listeners: Map<LayerEventType, Set<(event: LayerEvent) => void>> = new Map();
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
      front: createTexture(gl, this.size.width, this.size.height, init.data),
      back: createTexture(gl, this.size.width, this.size.height),
    };
  }

  getGLContext(): WebGL2RenderingContext {
    return this.gl;
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

  addListener<T extends LayerEventType>(type: T, listener: (event: LayerEventFor<T>) => void): void {
    let bucket = this.listeners.get(type);
    if (!bucket) {
      bucket = new Set();
      this.listeners.set(type, bucket);
    }
    bucket.add(listener as (event: LayerEvent) => void);
  }

  removeListener<T extends LayerEventType>(type: T, listener: (event: LayerEventFor<T>) => void): void {
    const bucket = this.listeners.get(type);
    if (!bucket) return;
    bucket.delete(listener as (event: LayerEvent) => void);
    if (bucket.size === 0) this.listeners.delete(type);
  }

  createMaskSurface(size?: Size): MaskSurface {
    this.assertNotDisposed();
    const target = size ?? this.size;
    return new MaskSurfaceImpl(this.gl, target);
  }

  createEmptyTexture(): WebGLTexture {
    this.assertNotDisposed();
    return createTexture(this.gl, this.size.width, this.size.height, undefined);
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
    if (!this.history) return;
    this.history.push(snapshot);
    this.emit({ type: 'historyRegistered', bounds: this.getFullBounds() });
  }

  commitHistory(bounds?: SurfaceBounds): unknown | undefined {
    if (!this.history) return undefined;
    const snapshot = this.history.commit(bounds);
    this.emit({ type: 'historyRegistered', bounds: bounds ?? this.getFullBounds() });
    return snapshot;
  }

  undo(): void {
    if (!this.history || !this.history.canUndo()) return;
    this.history.undo();
    this.emit({ type: 'historyApplied', bounds: this.getFullBounds() });
  }

  redo(): void {
    if (!this.history || !this.history.canRedo()) return;
    this.history.redo();
    this.emit({ type: 'historyApplied', bounds: this.getFullBounds() });
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
    if (!this.history) return;
    this.history.pushRaw(snapshot);
    this.emit({ type: 'historyRegistered', bounds: snapshot.bounds });
  }

  commitHistoryFromTexture(texture: WebGLTexture, bounds: SurfaceBounds): void {
    const history = this.history;
    if (!history) return;
    const buffer = readTexturePixels(this.gl, texture, bounds, this.fbo);
    history.pushRaw({
      bounds,
      size: { width: bounds.width, height: bounds.height },
      buffer,
    });
    this.emit({ type: 'historyRegistered', bounds });
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

  resizeClear(width: number, height: number): void {
    this.assertNotDisposed();
    if (width <= 0 || height <= 0) throw new Error('Layer.resizeClear: width/height must be > 0');
    if (width === this.size.width && height === this.size.height) return;

    const { gl } = this;
    gl.deleteTexture(this.textures.front);
    gl.deleteTexture(this.textures.back);

    this.size = { width, height };
    this.textures = {
      front: createTexture(gl, width, height, undefined),
      back: createTexture(gl, width, height, undefined),
    };
    this.emit({ type: 'resized', size: { width, height } });
  }

  resizePreserve(
    width: number,
    height: number,
    srcOrigin: { x: number; y: number } = { x: 0, y: 0 },
    destOrigin: { x: number; y: number } = { x: 0, y: 0 }
  ): void {
    this.assertNotDisposed();
    if (width <= 0 || height <= 0) throw new Error('Layer.resizePreserve: width/height must be > 0');
    if (width === this.size.width && height === this.size.height) return;

    const { gl } = this;
    const prevRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    const prevDraw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);

    const oldFront = this.textures.front;
    const oldBack = this.textures.back;
    const oldSize = { ...this.size };

    const nextFront = createTexture(gl, width, height, undefined);
    const nextBack = createTexture(gl, width, height, undefined);

    const srcX = Math.floor(srcOrigin.x);
    const srcY = Math.floor(srcOrigin.y);
    const destX = Math.floor(destOrigin.x);
    const destY = Math.floor(destOrigin.y);

    const validDxMin = destX - srcX;
    const validDxMax = destX - srcX + oldSize.width;
    const validDyMin = destY - srcY;
    const validDyMax = destY - srcY + oldSize.height;

    const copyLeft = Math.max(0, validDxMin);
    const copyRight = Math.min(width, validDxMax);
    const copyBottom = Math.max(0, validDyMin);
    const copyTop = Math.min(height, validDyMax);
    const copyWidth = copyRight - copyLeft;
    const copyHeight = copyTop - copyBottom;
    const readFbo = gl.createFramebuffer();
    if (!readFbo) throw new Error('Layer.resizePreserve: failed to create read framebuffer');
    const drawFbo = gl.createFramebuffer();
    if (!drawFbo) throw new Error('Layer.resizePreserve: failed to create draw framebuffer');

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, readFbo);
    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, oldFront, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, drawFbo);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, nextFront, 0);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (copyWidth > 0 && copyHeight > 0) {
      const srcX0 = copyLeft - destX + srcX;
      const srcY0 = copyBottom - destY + srcY;
      const srcX1 = srcX0 + copyWidth;
      const srcY1 = srcY0 + copyHeight;
      const dstX0 = copyLeft;
      const dstY0 = copyBottom;
      const dstX1 = dstX0 + copyWidth;
      const dstY1 = dstY0 + copyHeight;
      gl.blitFramebuffer(srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    }

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevRead);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevDraw);
    gl.deleteFramebuffer(readFbo);
    gl.deleteFramebuffer(drawFbo);

    gl.deleteTexture(oldFront);
    gl.deleteTexture(oldBack);

    this.size = { width, height };
    this.textures = {
      front: nextFront,
      back: nextBack,
    };
    this.emit({ type: 'resized', size: { width, height } });
  }

  writePixels(buffer: RawPixelData, options?: WritePixelsOptions): void {
    this.assertNotDisposed();

    const bounds = options?.bounds ?? this.getFullBounds();
    const expected = bounds.width * bounds.height * 4;
    if (buffer.length !== expected) {
      throw new Error(`Layer.writePixels: buffer length ${buffer.length} !== expected ${expected}`);
    }
    const { gl } = this;
    gl.bindTexture(gl.TEXTURE_2D, this.textures.front);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, bounds.x, bounds.y, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
    this.emit({ type: 'historyApplied', bounds });
  }

  readPixels(options?: ReadPixelsOptions): Uint8Array {
    this.assertNotDisposed();
    const bounds = options?.bounds ?? this.getFullBounds();
    const { gl } = this;
    this.bindFramebuffer(this.textures.front);

    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    const out = new Uint8Array(bounds.width * bounds.height * 4);
    gl.readPixels(bounds.x, bounds.y, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, out);

    if (options?.flipY) {
      flipPixelsYInPlace(out, bounds.width, bounds.height);
    }
    return out;
  }

  copyTexture(bounds?: SurfaceBounds): WebGLTexture {
    this.assertNotDisposed();
    const resolved = bounds ?? this.getFullBounds();
    const { gl } = this;
    const tex = createTexture(gl, resolved.width, resolved.height, undefined);
    this.bindFramebuffer(this.textures.front);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, resolved.x, resolved.y, resolved.width, resolved.height);
    return tex;
  }

  copyTextureRegion(texture: WebGLTexture, bounds: SurfaceBounds): void {
    this.assertNotDisposed();
    const { gl } = this;
    this.bindFramebuffer(this.textures.front);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, bounds.x, bounds.y, bounds.x, bounds.y, bounds.width, bounds.height);
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

  applyEffect(effect: LayerEffect): void {
    this.assertNotDisposed();
    this.runProgram(effect.fragmentSrc, effect.uniforms);
  }

  applyEffectResized(effect: LayerEffect, size: Size): void {
    this.assertNotDisposed();
    if (size.width <= 0 || size.height <= 0) throw new Error('Layer.applyEffectResized: width/height must be > 0');
    if (size.width === this.size.width && size.height === this.size.height) {
      this.runProgram(effect.fragmentSrc, effect.uniforms);
      return;
    }
    this.runProgramResized(effect.fragmentSrc, effect.uniforms, size);
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
    const src = layer.readPixels();
    this.writePixels(src);
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

  private runProgramResized(fragmentSrc: string, uniforms: Record<string, number | readonly number[]> | undefined, size: Size): void {
    const { gl } = this;
    const program = this.getOrCreateProgram(fragmentSrc, fragmentSrc);
    const prevFront = this.textures.front;
    const prevBack = this.textures.back;
    const nextFront = createTexture(gl, size.width, size.height, undefined);
    const nextBack = createTexture(gl, size.width, size.height, undefined);

    this.bindFramebuffer(nextBack);
    gl.viewport(0, 0, size.width, size.height);
    gl.disable(gl.BLEND);
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, prevFront);
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
          throw new Error(`Layer.runProgramResized: unsupported uniform length for ${name}`);
        }
      }
    }

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.useProgram(null);

    gl.deleteTexture(prevFront);
    gl.deleteTexture(prevBack);

    this.size = { width: size.width, height: size.height };
    this.textures = { front: nextBack, back: nextFront };
    this.emit({ type: 'resized', size: { width: size.width, height: size.height } });
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

  private emit(event: LayerEvent): void {
    const bucket = this.listeners.get(event.type);
    if (!bucket || bucket.size === 0) return;
    for (const listener of bucket) listener(event);
  }

  private getFullBounds(): SurfaceBounds {
    return { x: 0, y: 0, width: this.size.width, height: this.size.height };
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
