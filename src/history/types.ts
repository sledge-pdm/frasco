import type { Size } from '../layer/types';
import type { SurfaceBounds } from '../surface/types';

export type HistoryRawSnapshot = {
  bounds: SurfaceBounds;
  size: Size;
  buffer: Uint8Array;
};

export type DeflateHistorySnapshot = {
  bounds: SurfaceBounds;
  size: Size;
  deflated: Uint8Array;
};

export type TextureHistorySnapshot = {
  bounds: SurfaceBounds;
  size: Size;
  texture: WebGLTexture;
};

/**
 * @deprecated Current webp conversion may induce memory leak
 */
export type WebpHistorySnapshot = {
  bounds: SurfaceBounds;
  size: Size;
  webp: Uint8Array;
};

export interface HistoryTarget {
  getSize(): Size;
  readPixels(bounds: SurfaceBounds): Uint8Array;
  writePixels(bounds: SurfaceBounds, buffer: Uint8Array): void;
  copyTexture(bounds: SurfaceBounds): WebGLTexture;
  drawTexture(bounds: SurfaceBounds, texture: WebGLTexture): void;
  createTextureFromRaw(buffer: Uint8Array, size: Size): WebGLTexture;
  readTexturePixels(texture: WebGLTexture, size: Size): Uint8Array;
  deleteTexture(texture: WebGLTexture): void;
}

export interface HistoryBackend<TSnapshot> {
  capture(target: HistoryTarget, bounds?: SurfaceBounds): TSnapshot;
  apply(target: HistoryTarget, snapshot: TSnapshot): void;
  exportRaw(target: HistoryTarget, snapshot: TSnapshot): HistoryRawSnapshot;
  importRaw(target: HistoryTarget, snapshot: HistoryRawSnapshot): TSnapshot;
  disposeSnapshot?(target: HistoryTarget, snapshot: TSnapshot): void;
}

export type DeflateHistoryBackendType = HistoryBackend<DeflateHistorySnapshot>;
export type TextureHistoryBackendType = HistoryBackend<TextureHistorySnapshot>;
export type WebpHistoryBackendType = HistoryBackend<WebpHistorySnapshot>;
