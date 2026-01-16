import type { Layer, LayerEventFor, LayerEventType } from '~/layer';
import type { SurfaceBounds } from '~/surface';
import { flipPixelsYInPlace } from '~/utils';

export type LayerThumbnailOptions = {
  scale?: number;
  updateOn?: LayerEventType[];
};

export class LayerThumbnail {
  private readonly layer: Layer;
  private readonly gl: WebGL2RenderingContext;
  private readonly scale: number;
  private readonly updateOn: Set<LayerEventType>;

  private previewTex: WebGLTexture;
  private previewWidth: number;
  private previewHeight: number;
  private readFbo: WebGLFramebuffer;
  private drawFbo: WebGLFramebuffer;

  private targetTex: WebGLTexture | null = null;
  private targetWidth = 0;
  private targetHeight = 0;
  private pixelBuffer: Uint8Array = new Uint8Array(0);
  private cachedImage: ImageData | null = null;
  private dirty = true;

  private readonly onHistory: (event: LayerEventFor<'historyRegistered'>) => void;
  private readonly onApplied: (event: LayerEventFor<'historyApplied'>) => void;
  private readonly onResize: (event: LayerEventFor<'resized'>) => void;

  constructor(layer: Layer, options?: LayerThumbnailOptions) {
    this.layer = layer;
    this.gl = layer.getGLContext();
    this.scale = Math.max(1, Math.floor(options?.scale ?? 8));
    const updateOn = options?.updateOn ?? ['historyRegistered', 'historyApplied', 'resized'];
    this.updateOn = new Set(updateOn);

    const size = layer.getSize();
    this.previewWidth = Math.max(1, Math.ceil(size.width / this.scale));
    this.previewHeight = Math.max(1, Math.ceil(size.height / this.scale));
    this.previewTex = this.createTexture(this.previewWidth, this.previewHeight);
    this.readFbo = this.createFramebuffer();
    this.drawFbo = this.createFramebuffer();

    this.onHistory = (event) => {
      if (!this.updateOn.has('historyRegistered')) return;
      this.updatePreviewByBounds(event.bounds);
    };
    this.onApplied = (event) => {
      if (!this.updateOn.has('historyApplied')) return;
      this.updatePreviewByBounds(event.bounds);
    };
    this.onResize = (event) => {
      if (!this.updateOn.has('resized')) return;
      this.resizePreview(event.size.width, event.size.height);
      this.updateAll();
    };

    this.layer.addListener('historyRegistered', this.onHistory);
    this.layer.addListener('historyApplied', this.onApplied);
    this.layer.addListener('resized', this.onResize);
    this.updateAll();
  }

  getImageData(width: number, height: number): ImageData {
    if (width <= 0 || height <= 0) {
      return new ImageData(1, 1);
    }

    this.ensureTarget(width, height);
    if (!this.dirty && this.cachedImage && this.targetWidth === width && this.targetHeight === height) {
      return this.cachedImage;
    }

    this.blitPreviewToTarget(width, height);
    this.readTargetPixels(width, height);

    const clamped = new Uint8ClampedArray(this.pixelBuffer.buffer.slice(0));
    this.cachedImage = new ImageData(clamped as Uint8ClampedArray<ArrayBuffer>, width, height);
    this.dirty = false;
    return this.cachedImage;
  }

  dispose(): void {
    this.layer.removeListener('historyRegistered', this.onHistory);
    this.layer.removeListener('historyApplied', this.onApplied);
    this.layer.removeListener('resized', this.onResize);

    const { gl } = this;
    gl.deleteTexture(this.previewTex);
    if (this.targetTex) gl.deleteTexture(this.targetTex);
    gl.deleteFramebuffer(this.readFbo);
    gl.deleteFramebuffer(this.drawFbo);
    this.targetTex = null;
    this.cachedImage = null;
  }

  private resizePreview(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.ceil(width / this.scale));
    const nextHeight = Math.max(1, Math.ceil(height / this.scale));
    if (nextWidth === this.previewWidth && nextHeight === this.previewHeight) return;
    const { gl } = this;
    gl.deleteTexture(this.previewTex);
    this.previewWidth = nextWidth;
    this.previewHeight = nextHeight;
    this.previewTex = this.createTexture(this.previewWidth, this.previewHeight);
    this.dirty = true;
  }

  private ensureTarget(width: number, height: number): void {
    if (this.targetTex && this.targetWidth === width && this.targetHeight === height) {
      return;
    }
    const { gl } = this;
    if (this.targetTex) {
      gl.deleteTexture(this.targetTex);
    }
    this.targetTex = this.createTexture(width, height);
    this.targetWidth = width;
    this.targetHeight = height;
    this.pixelBuffer = new Uint8Array(width * height * 4);
    this.cachedImage = null;
    this.dirty = true;
  }

  private updateAll(): void {
    const size = this.layer.getSize();
    this.updatePreviewByBounds({ x: 0, y: 0, width: size.width, height: size.height });
  }

  private updatePreviewByBounds(bounds: SurfaceBounds): void {
    const size = this.layer.getSize();
    const srcX0 = Math.max(0, Math.floor(bounds.x));
    const srcY0 = Math.max(0, Math.floor(bounds.y));
    const srcX1 = Math.min(size.width, Math.ceil(bounds.x + bounds.width));
    const srcY1 = Math.min(size.height, Math.ceil(bounds.y + bounds.height));
    if (srcX1 <= srcX0 || srcY1 <= srcY0) return;

    const dstX0 = Math.max(0, Math.floor(srcX0 / this.scale));
    const dstY0 = Math.max(0, Math.floor(srcY0 / this.scale));
    const dstX1 = Math.min(this.previewWidth, Math.ceil(srcX1 / this.scale));
    const dstY1 = Math.min(this.previewHeight, Math.ceil(srcY1 / this.scale));
    if (dstX1 <= dstX0 || dstY1 <= dstY0) return;

    const { gl } = this;
    const tex = this.layer.getTextureHandle();
    const prevRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    const prevDraw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.readFbo);
    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.drawFbo);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.previewTex, 0);
    gl.blitFramebuffer(srcX0, srcY0, srcX1, srcY1, dstX0, dstY0, dstX1, dstY1, gl.COLOR_BUFFER_BIT, gl.NEAREST);

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevRead);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevDraw);
    this.dirty = true;
  }

  private blitPreviewToTarget(width: number, height: number): void {
    const { gl } = this;
    const prevRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    const prevDraw = gl.getParameter(gl.DRAW_FRAMEBUFFER_BINDING);

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.readFbo);
    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.previewTex, 0);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.drawFbo);
    gl.framebufferTexture2D(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.targetTex, 0);
    gl.blitFramebuffer(0, 0, this.previewWidth, this.previewHeight, 0, 0, width, height, gl.COLOR_BUFFER_BIT, gl.NEAREST);

    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevRead);
    gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, prevDraw);
  }

  private readTargetPixels(width: number, height: number): void {
    const { gl } = this;
    const prevRead = gl.getParameter(gl.READ_FRAMEBUFFER_BINDING);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.readFbo);
    gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.targetTex, 0);
    gl.pixelStorei(gl.PACK_ALIGNMENT, 1);
    gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, this.pixelBuffer);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, prevRead);
    flipPixelsYInPlace(this.pixelBuffer, width, height);
  }

  private createTexture(width: number, height: number): WebGLTexture {
    const { gl } = this;
    const tex = gl.createTexture();
    if (!tex) throw new Error('LayerThumbnail: failed to create texture');
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    return tex;
  }

  private createFramebuffer(): WebGLFramebuffer {
    const { gl } = this;
    const fbo = gl.createFramebuffer();
    if (!fbo) throw new Error('LayerThumbnail: failed to create framebuffer');
    return fbo;
  }
}
