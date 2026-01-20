import { RawPixelData } from '@sledge-pdm/core';
import type { ReadPixelsOptions, Size, WritePixelsOptions } from '~/layer';
import type { SurfaceBounds } from '~/surface';

export type HistoryRawSnapshot = {
  bounds: SurfaceBounds;
  size: Size;
  buffer: Uint8Array;
  fullLayer?: boolean;
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
  fullLayer?: boolean;
};

export interface HistoryTarget {
  getGLContext(): WebGL2RenderingContext;
  getSize(): Size;
  resizeClear(width: number, height: number): void;
  readPixels(options?: ReadPixelsOptions): Uint8Array;
  writePixels(buffer: RawPixelData, options?: WritePixelsOptions): void;
  copyTexture(bounds?: SurfaceBounds): WebGLTexture;
  drawTexture(bounds: SurfaceBounds, texture: WebGLTexture): void;
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
