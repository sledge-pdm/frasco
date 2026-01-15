import type { SurfaceBounds } from '../surface/types';
import type { LayerTileInfo, Size } from './types';

export type LayerResizedEvent = {
  type: 'resized';
  size: Size;
  tiles: LayerTileInfo[];
};

export type LayerHistoryRegisteredEvent = {
  type: 'historyRegistered';
  bounds: SurfaceBounds;
};

export type LayerEvent = LayerResizedEvent | LayerHistoryRegisteredEvent;

export type LayerEventType = LayerEvent['type'];

export type LayerEventListener = (event: LayerEvent) => void;
