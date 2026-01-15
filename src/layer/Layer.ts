import { RawPixelData } from '@sledge-pdm/core';
import { LayerHistory } from '../history/LayerHistory';
import type { HistoryBackend, HistoryRawSnapshot, HistoryTarget } from '../history/types';
import { MaskSurfaceImpl } from '../surface/MaskSurface';
import type { MaskSurface, SurfaceBounds } from '../surface/types';
import { LayerTile } from './LayerTile';
import type { LayerEvent, LayerEventListener, LayerEventType } from './events';
import { COPY_FRAG_300ES, FULLSCREEN_VERT_300ES } from './shaders';
import type { LayerEffect, LayerExportOptions, LayerInit, LayerTextureHandle, LayerTileInfo, Rgba8, Size, TileTextureSet } from './types';

const isTileTextureSet = (texture: LayerTextureHandle): texture is TileTextureSet =>
  typeof texture === 'object' && !!texture && 'kind' in texture && texture.kind === 'tiles';

export class Layer implements HistoryTarget {
  private readonly gl: WebGL2RenderingContext;
  private size: Size;
  private tileSize: Size;
  private tileCountX: number;
  private tileCountY: number;
  private tiles: LayerTile[];
  private readonly fbo: WebGLFramebuffer;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vbo: WebGLBuffer;
  private readonly programs: Map<string, WebGLProgram> = new Map();
  private history?: LayerHistory<unknown>;
  private disposed = false;
  private readonly listeners: Set<LayerEventListener> = new Set();
  private readonly listenersByType: Map<LayerEventType, Set<LayerEventListener>> = new Map();

  constructor(gl: WebGL2RenderingContext, init: LayerInit) {
    this.gl = gl;
    this.size = { width: init.width, height: init.height };
    const resolvedTileSize = Math.max(1, Math.floor(init.tileSize ?? Math.max(init.width, init.height)));
    this.tileSize = { width: resolvedTileSize, height: resolvedTileSize };
    this.tileCountX = Math.ceil(this.size.width / resolvedTileSize);
    this.tileCountY = Math.ceil(this.size.height / resolvedTileSize);
    this.tiles = [];

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
    this.tiles = this.createTiles(init.data);
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

  addListener(listener: LayerEventListener): void;
  addListener(type: LayerEventType, listener: LayerEventListener): void;
  addListener(typeOrListener: LayerEventType | LayerEventListener, listener?: LayerEventListener): void {
    if (typeof typeOrListener === 'function') {
      this.listeners.add(typeOrListener);
      return;
    }
    if (!listener) return;
    const set = this.listenersByType.get(typeOrListener) ?? new Set();
    set.add(listener);
    this.listenersByType.set(typeOrListener, set);
  }

  removeListener(listener: LayerEventListener): void;
  removeListener(type: LayerEventType, listener: LayerEventListener): void;
  removeListener(typeOrListener: LayerEventType | LayerEventListener, listener?: LayerEventListener): void {
    if (typeof typeOrListener === 'function') {
      this.listeners.delete(typeOrListener);
      for (const set of this.listenersByType.values()) {
        set.delete(typeOrListener);
      }
      return;
    }
    if (!listener) return;
    const set = this.listenersByType.get(typeOrListener);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) {
      this.listenersByType.delete(typeOrListener);
    }
  }

  getTiles(): LayerTileInfo[] {
    return this.tiles.map((tile) => tile.getInfo());
  }

  getTileTextureHandle(index: number): WebGLTexture {
    this.assertNotDisposed();
    const tile = this.tiles[index];
    if (!tile) {
      throw new Error(`Layer.getTileTextureHandle: tile not found for index: ${index}`);
    }
    return tile.getTextureHandle();
  }

  getTextureHandle(): WebGLTexture {
    this.assertNotDisposed();
    if (this.tiles.length !== 1) {
      throw new Error('Layer.getTextureHandle: tiled layer cannot return single texture');
    }
    return this.tiles[0].getTextureHandle();
  }

  createMaskSurface(size?: Size): MaskSurface {
    this.assertNotDisposed();
    const target = size ?? this.size;
    return new MaskSurfaceImpl(this.gl, target, { tileSize: this.tileSize.width });
  }

  createTextureCopy(): LayerTextureHandle {
    this.assertNotDisposed();
    if (this.tiles.length === 1) {
      const tex = this.createTexture(this.size.width, this.size.height);
      this.tiles[0].copyToTexture(this.gl, this.fbo, tex);
      return tex;
    }

    const copy = this.createTileTextureSet();
    for (const tile of this.tiles) {
      const tex = copy.textures[tile.index];
      tile.copyToTexture(this.gl, this.fbo, tex);
    }
    return copy;
  }

  createEmptyTexture(): LayerTextureHandle {
    this.assertNotDisposed();
    if (this.tiles.length === 1) {
      return this.createTexture(this.size.width, this.size.height);
    }
    return this.createTileTextureSet();
  }

  deleteTexture(texture: LayerTextureHandle): void {
    this.assertNotDisposed();
    if (isTileTextureSet(texture)) {
      for (const tex of texture.textures) {
        this.gl.deleteTexture(tex);
      }
      return;
    }
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
    if (!this.history) return;
    this.history.push(snapshot);
    this.emitHistoryRegistered({ x: 0, y: 0, width: this.size.width, height: this.size.height });
  }

  commitHistory(bounds?: SurfaceBounds): unknown | undefined {
    const snapshot = this.history?.commit(bounds);
    if (snapshot) {
      this.emitHistoryRegistered(bounds ?? { x: 0, y: 0, width: this.size.width, height: this.size.height });
    }
    return snapshot;
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

  commitHistoryFromTexture(texture: LayerTextureHandle, bounds: SurfaceBounds): void {
    const history = this.history;
    if (!history) return;
    const buffer = this.readTexturePixelsFrom(texture, bounds);
    history.pushRaw({
      bounds,
      size: { width: bounds.width, height: bounds.height },
      buffer,
    });
    this.emitHistoryRegistered(bounds);
  }

  dispose(): void {
    if (this.disposed) return;
    const { gl } = this;

    this.history?.dispose();
    for (const program of this.programs.values()) {
      gl.deleteProgram(program);
    }
    this.programs.clear();

    for (const tile of this.tiles) {
      tile.dispose(gl);
    }
    gl.deleteFramebuffer(this.fbo);
    gl.deleteBuffer(this.vbo);
    gl.deleteVertexArray(this.vao);

    this.disposed = true;
  }

  clear(color: Rgba8 = [0, 0, 0, 0]): void {
    this.assertNotDisposed();
    const { gl } = this;
    gl.disable(gl.BLEND);
    for (const tile of this.tiles) {
      tile.clear(gl, this.fbo, color);
    }
    gl.flush();
  }

  resize(width: number, height: number): void {
    this.assertNotDisposed();
    if (width <= 0 || height <= 0) throw new Error('Layer.resize: width/height must be > 0');
    if (width === this.size.width && height === this.size.height) return;

    const { gl } = this;
    for (const tile of this.tiles) {
      tile.dispose(gl);
    }

    this.size = { width, height };
    this.tileCountX = Math.ceil(this.size.width / this.tileSize.width);
    this.tileCountY = Math.ceil(this.size.height / this.tileSize.height);
    this.tiles = this.createTiles();
    this.emit({
      type: 'resized',
      size: { ...this.size },
      tiles: this.getTiles(),
    });
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

    this.writePixels({ x: 0, y: 0, width: this.size.width, height: this.size.height }, new Uint8Array(buffer.buffer.slice(0)));
  }

  exportRaw(options?: LayerExportOptions): Uint8Array {
    this.assertNotDisposed();
    const out = this.readPixels({ x: 0, y: 0, width: this.size.width, height: this.size.height });

    if (options?.flipY) {
      flipPixelsYInPlace(out, this.size.width, this.size.height);
    }
    return out;
  }

  readPixels(bounds: SurfaceBounds): Uint8Array {
    this.assertNotDisposed();
    const out = new Uint8Array(bounds.width * bounds.height * 4);
    this.forEachTile(bounds, (tile, localBounds, globalBounds) => {
      const tilePixels = tile.readPixels(this.gl, this.fbo, localBounds);
      const destX = globalBounds.x - bounds.x;
      const destY = globalBounds.y - bounds.y;
      const rowBytes = localBounds.width * 4;
      for (let row = 0; row < localBounds.height; row++) {
        const srcIndex = row * rowBytes;
        const dstIndex = ((destY + row) * bounds.width + destX) * 4;
        out.set(tilePixels.subarray(srcIndex, srcIndex + rowBytes), dstIndex);
      }
    });
    return out;
  }

  writePixels(bounds: SurfaceBounds, buffer: Uint8Array): void {
    this.assertNotDisposed();
    const expected = bounds.width * bounds.height * 4;
    if (buffer.length !== expected) {
      throw new Error(`Layer.writePixels: buffer length ${buffer.length} !== expected ${expected}`);
    }
    const { gl } = this;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    this.forEachTile(bounds, (tile, localBounds, globalBounds) => {
      const rowBytes = localBounds.width * 4;
      const tileBuffer = new Uint8Array(localBounds.width * localBounds.height * 4);
      const srcX = globalBounds.x - bounds.x;
      const srcY = globalBounds.y - bounds.y;
      for (let row = 0; row < localBounds.height; row++) {
        const srcIndex = ((srcY + row) * bounds.width + srcX) * 4;
        const dstIndex = row * rowBytes;
        tileBuffer.set(buffer.subarray(srcIndex, srcIndex + rowBytes), dstIndex);
      }
      tile.writePixels(gl, localBounds, tileBuffer);
    });
  }

  copyTexture(bounds: SurfaceBounds): LayerTextureHandle {
    this.assertNotDisposed();
    const buffer = this.readPixels(bounds);
    return this.createTexture(bounds.width, bounds.height, buffer);
  }

  copyTextureRegion(texture: LayerTextureHandle, bounds: SurfaceBounds): void {
    this.assertNotDisposed();
    if (isTileTextureSet(texture)) {
      this.forEachTile(bounds, (tile, localBounds) => {
        const tex = texture.textures[tile.index];
        tile.copyBounds(this.gl, this.fbo, tile.getFrontTexture(), tex, localBounds);
      });
      return;
    }

    const { gl } = this;
    this.bindFramebufferToTextureSource(this.tiles[0].getFrontTexture());
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, bounds.x, bounds.y, bounds.x, bounds.y, bounds.width, bounds.height);
  }

  drawTexture(bounds: SurfaceBounds, texture: LayerTextureHandle): void {
    this.assertNotDisposed();
    if (isTileTextureSet(texture)) {
      this.forEachTile(bounds, (tile, localBounds) => {
        const src = texture.textures[tile.index];
        tile.copyBounds(this.gl, this.fbo, src, tile.getFrontTexture(), localBounds);
      });
      return;
    }

    if (this.tiles.length > 1) {
      const buffer = this.readTexturePixels(texture, { width: bounds.width, height: bounds.height });
      this.writePixels(bounds, buffer);
      return;
    }

    const { gl } = this;
    const program = this.getOrCreateProgram('__history_copy__', COPY_FRAG_300ES);
    const tile = this.tiles[0];

    tile.copyFrontToBack(gl, this.fbo);
    this.bindFramebuffer(tile.getBackTexture());
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

    tile.swapTextures();
  }

  createTextureFromRaw(buffer: Uint8Array, size: Size): LayerTextureHandle {
    this.assertNotDisposed();
    const expected = size.width * size.height * 4;
    if (buffer.length !== expected) {
      throw new Error(`Layer.createTextureFromRaw: buffer length ${buffer.length} !== expected ${expected}`);
    }
    if (this.tiles.length > 1 && size.width === this.size.width && size.height === this.size.height) {
      const textures = this.tiles.map((tile) => {
        const tileBuffer = this.extractTileBuffer(buffer, tile.originX, tile.originY, tile.width, tile.height);
        return this.createTexture(tile.width, tile.height, tileBuffer);
      });
      return {
        kind: 'tiles',
        textures,
        tileSize: { ...this.tileSize },
        tileCountX: this.tileCountX,
        tileCountY: this.tileCountY,
      };
    }
    return this.createTexture(size.width, size.height, buffer);
  }

  readTexturePixels(texture: LayerTextureHandle, size: Size): Uint8Array {
    this.assertNotDisposed();
    if (isTileTextureSet(texture)) {
      const out = new Uint8Array(size.width * size.height * 4);
      for (const tile of this.tiles) {
        const tilePixels = this.readTexturePixelsFrom(texture.textures[tile.index], {
          x: 0,
          y: 0,
          width: tile.width,
          height: tile.height,
        });
        const destX = tile.originX;
        const destY = tile.originY;
        const rowBytes = tile.width * 4;
        for (let row = 0; row < tile.height; row++) {
          const srcIndex = row * rowBytes;
          const dstIndex = ((destY + row) * size.width + destX) * 4;
          out.set(tilePixels.subarray(srcIndex, srcIndex + rowBytes), dstIndex);
        }
      }
      return out;
    }

    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    const out = new Uint8Array(size.width * size.height * 4);
    gl.readPixels(0, 0, size.width, size.height, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return out;
  }

  readTexturePixelsFrom(texture: LayerTextureHandle, bounds: SurfaceBounds): Uint8Array {
    this.assertNotDisposed();
    if (isTileTextureSet(texture)) {
      const out = new Uint8Array(bounds.width * bounds.height * 4);
      this.forEachTile(bounds, (tile, localBounds, globalBounds) => {
        const tilePixels = this.readTexturePixelsFrom(texture.textures[tile.index], localBounds);
        const destX = globalBounds.x - bounds.x;
        const destY = globalBounds.y - bounds.y;
        const rowBytes = localBounds.width * 4;
        for (let row = 0; row < localBounds.height; row++) {
          const srcIndex = row * rowBytes;
          const dstIndex = ((destY + row) * bounds.width + destX) * 4;
          out.set(tilePixels.subarray(srcIndex, srcIndex + rowBytes), dstIndex);
        }
      });
      return out;
    }

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
    this.forEachTile(undefined, (tile) => {
      this.runProgram(tile, effect.fragmentSrc, effect.uniforms);
    });
  }

  applyEffectWithTextures(effect: LayerEffect, textures: Record<string, LayerTextureHandle>, bounds?: SurfaceBounds): void {
    this.assertNotDisposed();
    this.forEachTile(bounds, (tile, localBounds) => {
      this.runProgramWithTextures(tile, effect.fragmentSrc, effect.uniforms, textures, localBounds);
    });
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

  private runProgram(tile: LayerTile, fragmentSrc: string, uniforms?: Record<string, number | readonly number[]>): void {
    const { gl } = this;
    const program = this.getOrCreateProgram(fragmentSrc, fragmentSrc);

    this.bindFramebuffer(tile.getBackTexture());
    gl.viewport(0, 0, tile.width, tile.height);
    gl.disable(gl.BLEND);
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tile.getFrontTexture());
    const srcLoc = gl.getUniformLocation(program, 'u_src');
    if (srcLoc) gl.uniform1i(srcLoc, 0);

    this.applyUniforms(program, {
      ...uniforms,
      u_origin: [tile.originX, tile.originY],
      u_tile_size: [tile.width, tile.height],
    });

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.useProgram(null);

    tile.swapTextures();
  }

  private runProgramWithTextures(
    tile: LayerTile,
    fragmentSrc: string,
    uniforms: Record<string, number | readonly number[]> | undefined,
    textures: Record<string, LayerTextureHandle>,
    bounds?: SurfaceBounds
  ): void {
    const { gl } = this;
    const program = this.getOrCreateProgram(fragmentSrc, fragmentSrc);

    if (bounds) {
      tile.copyBounds(gl, this.fbo, tile.getFrontTexture(), tile.getBackTexture(), bounds);
    }
    this.bindFramebuffer(tile.getBackTexture());
    gl.viewport(0, 0, tile.width, tile.height);
    if (bounds) {
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(bounds.x, bounds.y, bounds.width, bounds.height);
    } else {
      gl.disable(gl.SCISSOR_TEST);
    }
    gl.disable(gl.BLEND);
    gl.useProgram(program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tile.getFrontTexture());
    const srcLoc = gl.getUniformLocation(program, 'u_src');
    if (srcLoc) gl.uniform1i(srcLoc, 0);

    let unit = 1;
    for (const [name, texture] of Object.entries(textures)) {
      const resolved = this.resolveTextureForTile(texture, tile.index);
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, resolved);
      const loc = gl.getUniformLocation(program, name);
      if (loc) gl.uniform1i(loc, unit);
      unit += 1;
    }

    this.applyUniforms(program, {
      ...uniforms,
      u_origin: [tile.originX, tile.originY],
      u_tile_size: [tile.width, tile.height],
    });

    gl.bindVertexArray(this.vao);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    gl.bindVertexArray(null);
    gl.useProgram(null);
    if (bounds) {
      gl.disable(gl.SCISSOR_TEST);
      tile.copyBounds(gl, this.fbo, tile.getBackTexture(), tile.getFrontTexture(), bounds);
      return;
    }

    tile.swapTextures();
  }

  private bindFramebuffer(tex: WebGLTexture): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  }

  private bindFramebufferToTextureSource(tex: WebGLTexture): void {
    this.bindFramebuffer(tex);
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

  private createTiles(data?: RawPixelData): LayerTile[] {
    const tiles: LayerTile[] = [];
    let index = 0;
    for (let ty = 0; ty < this.tileCountY; ty++) {
      for (let tx = 0; tx < this.tileCountX; tx++) {
        const originX = tx * this.tileSize.width;
        const originY = ty * this.tileSize.height;
        const width = Math.min(this.tileSize.width, this.size.width - originX);
        const height = Math.min(this.tileSize.height, this.size.height - originY);
        const tileData = data ? this.extractTileBuffer(data, originX, originY, width, height) : undefined;
        tiles.push(
          new LayerTile({
            index,
            originX,
            originY,
            width,
            height,
            data: tileData,
            createTexture: (w, h, buffer) => this.createTexture(w, h, buffer),
          })
        );
        index += 1;
      }
    }
    return tiles;
  }

  private extractTileBuffer(data: RawPixelData, originX: number, originY: number, width: number, height: number): Uint8Array {
    const source = data instanceof Uint8Array ? data : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const out = new Uint8Array(width * height * 4);
    const rowBytes = width * 4;
    for (let row = 0; row < height; row++) {
      const srcIndex = ((originY + row) * this.size.width + originX) * 4;
      const dstIndex = row * rowBytes;
      out.set(source.subarray(srcIndex, srcIndex + rowBytes), dstIndex);
    }
    return out;
  }

  private forEachTile(
    bounds: SurfaceBounds | undefined,
    callback: (tile: LayerTile, localBounds: SurfaceBounds, globalBounds: SurfaceBounds) => void
  ): void {
    if (!bounds) {
      for (const tile of this.tiles) {
        callback(
          tile,
          { x: 0, y: 0, width: tile.width, height: tile.height },
          { x: tile.originX, y: tile.originY, width: tile.width, height: tile.height }
        );
      }
      return;
    }

    const boundsX1 = bounds.x + bounds.width;
    const boundsY1 = bounds.y + bounds.height;
    for (const tile of this.tiles) {
      const tileX1 = tile.originX + tile.width;
      const tileY1 = tile.originY + tile.height;
      const x0 = Math.max(bounds.x, tile.originX);
      const y0 = Math.max(bounds.y, tile.originY);
      const x1 = Math.min(boundsX1, tileX1);
      const y1 = Math.min(boundsY1, tileY1);
      if (x1 <= x0 || y1 <= y0) continue;
      callback(
        tile,
        { x: x0 - tile.originX, y: y0 - tile.originY, width: x1 - x0, height: y1 - y0 },
        { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }
      );
    }
  }

  private resolveTextureForTile(texture: LayerTextureHandle, tileIndex: number): WebGLTexture {
    if (isTileTextureSet(texture)) {
      const resolved = texture.textures[tileIndex];
      if (!resolved) {
        throw new Error(`Layer.resolveTextureForTile: texture missing for tile index ${tileIndex}`);
      }
      return resolved;
    }
    return texture;
  }

  private emit(event: LayerEvent): void {
    const typed = this.listenersByType.get(event.type);
    if (typed) {
      for (const listener of typed) {
        listener(event);
      }
    }
    if (this.listeners.size === 0) return;
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private emitHistoryRegistered(bounds: SurfaceBounds): void {
    this.emit({ type: 'historyRegistered', bounds });
  }

  private applyUniforms(program: WebGLProgram, uniforms?: Record<string, number | readonly number[]>): void {
    if (!uniforms) return;
    const { gl } = this;
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
        throw new Error(`Layer.applyUniforms: unsupported uniform length for ${name}`);
      }
    }
  }

  private createTileTextureSet(): TileTextureSet {
    return {
      kind: 'tiles',
      textures: this.tiles.map((tile) => this.createTexture(tile.width, tile.height)),
      tileSize: { ...this.tileSize },
      tileCountX: this.tileCountX,
      tileCountY: this.tileCountY,
    };
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
