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

export type LayerHistoryAppliedEvent = {
  type: 'historyApplied';
  bounds: SurfaceBounds;
};

export type LayerEvent = LayerResizedEvent | LayerHistoryRegisteredEvent | LayerHistoryAppliedEvent;

export type LayerEventType = LayerEvent['type'];

export type LayerEventListener = (event: LayerEvent) => void;

export type LayerEventFor<T extends LayerEventType> = Extract<LayerEvent, { type: T }>;
