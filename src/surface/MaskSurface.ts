import { FULLSCREEN_VERT_300ES } from '../layer/shaders';
import type { LayerEffectUniformValue, LayerTextureHandle, Size } from '../layer/types';
import type { MaskSurface, MaskSurfaceApplyOptions, MaskSurfaceEffect, SurfaceBounds } from './types';

type TexturePair = {
  front: WebGLTexture;
  back: WebGLTexture;
};

type TileState = {
  index: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  textures: TexturePair;
};

export class MaskSurfaceImpl implements MaskSurface {
  private readonly gl: WebGL2RenderingContext;
  private readonly size: Size;
  private readonly tileSize: Size;
  private readonly tileCountX: number;
  private readonly tileCountY: number;
  private tiles: TileState[];
  private readonly fbo: WebGLFramebuffer;
  private readonly vao: WebGLVertexArrayObject;
  private readonly vbo: WebGLBuffer;
  private readonly programs: Map<string, WebGLProgram> = new Map();
  private disposed = false;

  constructor(gl: WebGL2RenderingContext, size: Size, options?: { tileSize?: number }) {
    this.gl = gl;
    this.size = { width: size.width, height: size.height };
    const resolvedTileSize = Math.max(1, Math.floor(options?.tileSize ?? Math.max(size.width, size.height)));
    this.tileSize = { width: resolvedTileSize, height: resolvedTileSize };
    this.tileCountX = Math.ceil(this.size.width / resolvedTileSize);
    this.tileCountY = Math.ceil(this.size.height / resolvedTileSize);
    this.tiles = [];

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

    this.tiles = this.createTiles();
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

  getTextureHandle(): LayerTextureHandle {
    this.assertNotDisposed();
    if (this.tiles.length === 1) {
      return this.tiles[0].textures.front;
    }
    return {
      kind: 'tiles',
      textures: this.tiles.map((tile) => tile.textures.front),
      tileSize: { ...this.tileSize },
      tileCountX: this.tileCountX,
      tileCountY: this.tileCountY,
    };
  }

  clear(value = 0): void {
    this.assertNotDisposed();
    const { gl } = this;
    gl.disable(gl.BLEND);
    gl.clearColor(value, 0, 0, 0);
    for (const tile of this.tiles) {
      this.bindFramebuffer(tile.textures.front);
      gl.viewport(0, 0, tile.width, tile.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
  }

  replaceBuffer(buffer: Uint8Array | Uint8ClampedArray): void {
    this.assertNotDisposed();
    const expected = this.size.width * this.size.height;
    if (buffer.length !== expected) {
      throw new Error(`MaskSurface.replaceBuffer: buffer length ${buffer.length} !== expected ${expected}`);
    }
    const { gl } = this;
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    this.forEachTile(undefined, (tile, localBounds, globalBounds) => {
      const rowBytes = localBounds.width;
      const tileBuffer = new Uint8Array(localBounds.width * localBounds.height);
      const srcX = globalBounds.x;
      const srcY = globalBounds.y;
      for (let row = 0; row < localBounds.height; row++) {
        const srcIndex = (srcY + row) * this.size.width + srcX;
        const dstIndex = row * rowBytes;
        tileBuffer.set(buffer.subarray(srcIndex, srcIndex + rowBytes), dstIndex);
      }
      gl.bindTexture(gl.TEXTURE_2D, tile.textures.front);
      gl.texSubImage2D(gl.TEXTURE_2D, 0, localBounds.x, localBounds.y, localBounds.width, localBounds.height, gl.RED, gl.UNSIGNED_BYTE, tileBuffer);
    });
  }

  readPixels(): Uint8Array {
    this.assertNotDisposed();
    const out = new Uint8Array(this.size.width * this.size.height);
    this.forEachTile(undefined, (tile, localBounds, globalBounds) => {
      const tilePixels = this.readTilePixels(tile, localBounds);
      const rowBytes = localBounds.width;
      for (let row = 0; row < localBounds.height; row++) {
        const srcIndex = row * rowBytes;
        const dstIndex = (globalBounds.y + row) * this.size.width + globalBounds.x;
        out.set(tilePixels.subarray(srcIndex, srcIndex + rowBytes), dstIndex);
      }
    });
    return out;
  }

  applyEffect(effect: MaskSurfaceEffect, options?: MaskSurfaceApplyOptions): void {
    this.assertNotDisposed();
    this.forEachTile(options?.bounds, (tile, localBounds) => {
      this.runProgram(tile, effect.fragmentSrc, effect.uniforms, localBounds);
    });
  }

  dispose(): void {
    if (this.disposed) return;
    const { gl } = this;

    for (const program of this.programs.values()) {
      gl.deleteProgram(program);
    }
    this.programs.clear();

    for (const tile of this.tiles) {
      gl.deleteTexture(tile.textures.front);
      gl.deleteTexture(tile.textures.back);
    }
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

  private runProgram(tile: TileState, fragmentSrc: string, uniforms?: Record<string, LayerEffectUniformValue>, bounds?: SurfaceBounds): void {
    const { gl } = this;
    const program = this.getOrCreateProgram(fragmentSrc, fragmentSrc);

    if (bounds) {
      this.copyTextureBounds(tile.textures.front, tile.textures.back, bounds);
    }
    this.bindFramebuffer(tile.textures.back);
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
    gl.bindTexture(gl.TEXTURE_2D, tile.textures.front);
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
    if (bounds) {
      gl.disable(gl.SCISSOR_TEST);
      this.copyTextureBounds(tile.textures.back, tile.textures.front, bounds);
      return;
    }

    this.swapTextures(tile);
  }

  private swapTextures(tile: TileState): void {
    const tmp = tile.textures.front;
    tile.textures.front = tile.textures.back;
    tile.textures.back = tmp;
  }

  private bindFramebuffer(tex: WebGLTexture): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
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

  private createTiles(): TileState[] {
    const tiles: TileState[] = [];
    let index = 0;
    for (let ty = 0; ty < this.tileCountY; ty++) {
      for (let tx = 0; tx < this.tileCountX; tx++) {
        const originX = tx * this.tileSize.width;
        const originY = ty * this.tileSize.height;
        const width = Math.min(this.tileSize.width, this.size.width - originX);
        const height = Math.min(this.tileSize.height, this.size.height - originY);
        tiles.push({
          index,
          originX,
          originY,
          width,
          height,
          textures: {
            front: this.createTexture(width, height),
            back: this.createTexture(width, height),
          },
        });
        index += 1;
      }
    }
    return tiles;
  }

  private forEachTile(
    bounds: SurfaceBounds | undefined,
    callback: (tile: TileState, localBounds: SurfaceBounds, globalBounds: SurfaceBounds) => void
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

  private applyUniforms(program: WebGLProgram, uniforms?: Record<string, LayerEffectUniformValue>): void {
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
        throw new Error(`MaskSurface.applyUniforms: unsupported uniform length for ${name}`);
      }
    }
  }

  private readTilePixels(tile: TileState, bounds: SurfaceBounds): Uint8Array {
    const { gl } = this;
    this.bindFramebuffer(tile.textures.front);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    const out = new Uint8Array(bounds.width * bounds.height);
    gl.readPixels(bounds.x, bounds.y, bounds.width, bounds.height, gl.RED, gl.UNSIGNED_BYTE, out);
    return out;
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
