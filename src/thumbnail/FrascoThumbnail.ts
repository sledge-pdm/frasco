import { Frasco } from '~/frasco/Frasco';
import type { CompositeLayer } from '~/frasco/types';
import type { RgbaFloat, Size } from '~/layer';
import { flipPixelsYInPlace } from '~/utils';

export type FrascoThumbnailOptions = {
  scale?: number;
  maxSize?: Size;
};

export class FrascoThumbnail {
  private readonly gl: WebGL2RenderingContext;
  private readonly frasco: Frasco;
  private readonly readFbo: WebGLFramebuffer;
  private readonly drawFbo: WebGLFramebuffer;
  private targetTex: WebGLTexture | null = null;
  private targetWidth = 0;
  private targetHeight = 0;
  private previewTex: WebGLTexture | null = null;
  private previewWidth = 0;
  private previewHeight = 0;
  private pixelBuffer: Uint8Array = new Uint8Array(0);
  private disposed = false;
  private readonly maxSize?: Size;
  private readonly scale: number;

  constructor(gl: WebGL2RenderingContext, options?: FrascoThumbnailOptions) {
    this.gl = gl;
    this.frasco = new Frasco(gl);
    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('FrascoThumbnail: failed to create framebuffer');
    this.readFbo = fbo;
    const drawFbo = gl.createFramebuffer();
    if (!drawFbo) throw new Error('FrascoThumbnail: failed to create framebuffer');
    this.drawFbo = drawFbo;
    this.maxSize = options?.maxSize;
    this.scale = Math.max(1, Math.floor(options?.scale ?? 1));
  }

  getImageData(layers: CompositeLayer[], sourceSize: Size, width: number, height: number, baseColor?: RgbaFloat): ImageData {
    if (width <= 0 || height <= 0) {
      return new ImageData(1, 1);
    }
    this.assertNotDisposed();

    const safeWidth = this.maxSize ? Math.min(width, this.maxSize.width) : width;
    const safeHeight = this.maxSize ? Math.min(height, this.maxSize.height) : height;

    this.ensurePreview(sourceSize);
    this.ensureTarget(safeWidth, safeHeight);

    const { gl } = this;
    const prevRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    const prevDraw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);
    const prevViewport = gl.getParameter(gl.VIEWPORT) as Int32Array;

    try {
      this.frasco.compose(layers, {
        size: { width: this.previewWidth, height: this.previewHeight },
        baseColor,
        target: this.previewTex ?? undefined,
      });

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.readFbo);
      gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.previewTex, 0);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.drawFbo);
      gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.targetTex, 0);
      gl.blitFramebuffer(0, 0, this.previewWidth, this.previewHeight, 0, 0, safeWidth, safeHeight, gl.COLOR_BUFFER_BIT, gl.NEAREST);

      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.readFbo);
      gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.targetTex, 0);
      gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
      gl.readPixels(0, 0, safeWidth, safeHeight, gl.RGBA, gl.UNSIGNED_BYTE, this.pixelBuffer);
    } finally {
      gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevRead);
      gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevDraw);
      gl.viewport(prevViewport[0], prevViewport[1], prevViewport[2], prevViewport[3]);
    }

    flipPixelsYInPlace(this.pixelBuffer, safeWidth, safeHeight);
    const clamped = new Uint8ClampedArray(this.pixelBuffer.buffer.slice(0));
    return new ImageData(clamped as Uint8ClampedArray<ArrayBuffer>, safeWidth, safeHeight);
  }

  dispose(): void {
    if (this.disposed) return;
    const { gl } = this;
    if (this.targetTex) {
      gl.deleteTexture(this.targetTex);
      this.targetTex = null;
    }
    if (this.previewTex) {
      gl.deleteTexture(this.previewTex);
      this.previewTex = null;
    }
    gl.deleteFramebuffer(this.readFbo);
    gl.deleteFramebuffer(this.drawFbo);
    this.frasco.dispose();
    this.disposed = true;
  }

  private ensurePreview(size: Size): void {
    const nextWidth = Math.max(1, Math.ceil(size.width / this.scale));
    const nextHeight = Math.max(1, Math.ceil(size.height / this.scale));
    if (this.previewTex && this.previewWidth === nextWidth && this.previewHeight === nextHeight) {
      return;
    }
    const { gl } = this;
    if (this.previewTex) {
      gl.deleteTexture(this.previewTex);
    }
    this.previewTex = this.createTexture(nextWidth, nextHeight);
    this.previewWidth = nextWidth;
    this.previewHeight = nextHeight;
  }

  private ensureTarget(width: number, height: number): void {
    if (this.targetTex && this.targetWidth === width && this.targetHeight === height) {
      return;
    }
    const { gl } = this;
    if (this.targetTex) {
      gl.deleteTexture(this.targetTex);
    }
    const tex = this.createTexture(width, height);

    this.targetTex = tex;
    this.targetWidth = width;
    this.targetHeight = height;
    this.pixelBuffer = new Uint8Array(width * height * 4);
  }

  private createTexture(width: number, height: number): WebGLTexture {
    const { gl } = this;
    const tex = gl.createTexture();
    if (!tex) throw new Error('FrascoThumbnail: failed to create texture');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return tex;
  }

  private assertNotDisposed(): void {
    if (this.disposed) throw new Error('FrascoThumbnail: disposed');
  }
}
