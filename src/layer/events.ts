import type { SurfaceBounds } from '~/surface';
import type { Size } from './types';

export type ContextOptions = {
  context?: any;
};

export type LayerResizedEvent = {
  type: 'resized';
  size: Size;
};

export type LayerHistoryRegisteredEvent = {
  type: 'historyRegistered';
  bounds: SurfaceBounds;
  context?: any;
};

export type LayerHistoryAppliedEvent = {
  type: 'historyApplied';
  bounds: SurfaceBounds;
};

export type LayerUpdateEvent = {
  type: 'update';
  bounds: SurfaceBounds;
};

export type LayerEvent = LayerResizedEvent | LayerHistoryRegisteredEvent | LayerHistoryAppliedEvent | LayerUpdateEvent;

export type LayerEventType = LayerEvent['type'];

export type LayerEventFor<T extends LayerEventType> = Extract<LayerEvent, { type: T }>;
