import type { RawPixelData } from '@sledge-pdm/core';
import type { LayerTileInfo, Rgba8 } from './types';

type TexturePair = {
  front: WebGLTexture;
  back: WebGLTexture;
};

export type LayerTileInit = {
  index: number;
  originX: number;
  originY: number;
  width: number;
  height: number;
  data?: RawPixelData;
  createTexture: (width: number, height: number, data?: RawPixelData) => WebGLTexture;
};

export class LayerTile {
  readonly index: number;
  readonly originX: number;
  readonly originY: number;
  readonly width: number;
  readonly height: number;
  private textures: TexturePair;

  constructor(init: LayerTileInit) {
    this.index = init.index;
    this.originX = init.originX;
    this.originY = init.originY;
    this.width = init.width;
    this.height = init.height;
    this.textures = {
      front: init.createTexture(init.width, init.height, init.data),
      back: init.createTexture(init.width, init.height),
    };
  }

  getInfo(): LayerTileInfo {
    return {
      index: this.index,
      x: this.originX,
      y: this.originY,
      width: this.width,
      height: this.height,
    };
  }

  getFrontTexture(): WebGLTexture {
    return this.textures.front;
  }

  getBackTexture(): WebGLTexture {
    return this.textures.back;
  }

  getTextureHandle(): WebGLTexture {
    return this.textures.front;
  }

  swapTextures(): void {
    const tmp = this.textures.front;
    this.textures.front = this.textures.back;
    this.textures.back = tmp;
  }

  clear(gl: WebGL2RenderingContext, fbo: WebGLFramebuffer, color: Rgba8): void {
    this.bindFramebuffer(gl, fbo, this.textures.front);
    gl.viewport(0, 0, this.width, this.height);
    gl.clearColor(color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255);
    gl.clear(gl.COLOR_BUFFER_BIT);
  }

  readPixels(gl: WebGL2RenderingContext, fbo: WebGLFramebuffer, bounds: SurfaceBounds): Uint8Array {
    this.bindFramebuffer(gl, fbo, this.textures.front);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    const out = new Uint8Array(bounds.width * bounds.height * 4);
    gl.readPixels(bounds.x, bounds.y, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, out);
    return out;
  }

  writePixels(gl: WebGL2RenderingContext, bounds: SurfaceBounds, buffer: Uint8Array): void {
    gl.bindTexture(gl.TEXTURE_2D, this.textures.front);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, bounds.x, bounds.y, bounds.width, bounds.height, gl.RGBA, gl.UNSIGNED_BYTE, buffer);
  }

  copyFrontToBack(gl: WebGL2RenderingContext, fbo: WebGLFramebuffer): void {
    this.bindFramebuffer(gl, fbo, this.textures.front);
    gl.bindTexture(gl.TEXTURE_2D, this.textures.back);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.width, this.height);
  }

  copyToTexture(gl: WebGL2RenderingContext, fbo: WebGLFramebuffer, dst: WebGLTexture): void {
    this.bindFramebuffer(gl, fbo, this.textures.front);
    gl.bindTexture(gl.TEXTURE_2D, dst);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, this.width, this.height);
  }

  copyBounds(gl: WebGL2RenderingContext, fbo: WebGLFramebuffer, src: WebGLTexture, dst: WebGLTexture, bounds: SurfaceBounds): void {
    this.bindFramebuffer(gl, fbo, src);
    gl.bindTexture(gl.TEXTURE_2D, dst);
    gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, bounds.x, bounds.y, bounds.x, bounds.y, bounds.width, bounds.height);
  }

  dispose(gl: WebGL2RenderingContext): void {
    gl.deleteTexture(this.textures.front);
    gl.deleteTexture(this.textures.back);
  }

  private bindFramebuffer(gl: WebGL2RenderingContext, fbo: WebGLFramebuffer, tex: WebGLTexture): void {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  }
}

type SurfaceBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};
