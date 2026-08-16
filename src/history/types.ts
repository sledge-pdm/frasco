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
  /**
   * deflate of the pixels this snapshot holds, filled the first time it is exported.
   * a snapshot's texture does not change while it sits on a stack, so this stays valid
   * until `apply` swaps the texture out.
   */
  deflated?: Uint8Array;
  /**
   * bumped whenever `apply` swaps the texture out. exporting is asynchronous, so a read that
   * started before an undo has to be able to tell that its result no longer describes this snapshot.
   */
  revision?: number;
};

/** A snapshot whose pixels are carried as zlib-deflated bytes instead of GPU state. */
export type HistoryPackedSnapshot = {
  bounds: SurfaceBounds;
  size: Size;
  deflated: Uint8Array;
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
  /**
   * @description deflated bytes for this snapshot, reusing what the backend already holds.
   *   only reads back from the GPU when there is nothing to reuse, so exporting the same
   *   stack twice costs nothing the second time.
   */
  exportPacked(target: HistoryTarget, snapshot: TSnapshot): Promise<HistoryPackedSnapshot>;
  /** @description rebuild a snapshot from deflated bytes, keeping those bytes for the next export. */
  importPacked(target: HistoryTarget, snapshot: HistoryPackedSnapshot): TSnapshot;
  disposeSnapshot?(target: HistoryTarget, snapshot: TSnapshot): void;
}

export type DeflateHistoryBackendType = HistoryBackend<DeflateHistorySnapshot>;
export type TextureHistoryBackendType = HistoryBackend<TextureHistorySnapshot>;
