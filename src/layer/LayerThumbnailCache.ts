import type { LayerTileInfo, Size } from './types';

export type LayerThumbnailUpdate = {
  tileIndices: number[];
};

export interface LayerThumbnailCache {
  onLayerResized(size: Size, tiles: LayerTileInfo[]): void;
  onTilesUpdated(update: LayerThumbnailUpdate): void;
  invalidateAll(): void;
  dispose(): void;
}

export class NoopLayerThumbnailCache implements LayerThumbnailCache {
  onLayerResized(_size: Size, _tiles: LayerTileInfo[]): void {}
  onTilesUpdated(_update: LayerThumbnailUpdate): void {}
  invalidateAll(): void {}
  dispose(): void {}
}
