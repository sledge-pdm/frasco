import { Layer } from '../layer';
import { GripShape } from './Shape';
import type { GripPoint } from './types';

export type GripInputSpace = 'layer' | 'canvas';

export type GripOptions = {
  inputSpace?: GripInputSpace;
};

type GripSession = {
  layer: Layer;
  shape: GripShape;
  lastPoint: GripPoint;
};

export class Grip {
  private session: GripSession | undefined;

  constructor(private readonly options: GripOptions = {}) {}

  isInStroke(): boolean {
    return this.session !== undefined;
  }

  start(layer: Layer, shape: GripShape, point: GripPoint): void {
    if (this.isInStroke()) {
      console.warn(`Grip.start: already in stroke. replacing.`);
    }

    const next = this.toLayerPoint(layer, point);
    shape.start(layer, next);
    this.session = { layer, shape, lastPoint: next };
  }

  addPoint(point: GripPoint): void {
    const session = this.assertSession('addPoint');
    const next = this.toLayerPoint(session.layer, point);
    session.shape.addPoint(session.layer, next, { ...session.lastPoint });
    session.lastPoint = next;
  }

  end(point: GripPoint): void {
    const session = this.assertSession('end');
    const next = this.toLayerPoint(session.layer, point);
    session.shape.end(session.layer, next, { ...session.lastPoint });
    this.session = undefined;
  }

  cancel(): void {
    this.session = undefined;
  }

  private assertSession(method: 'addPoint' | 'end'): GripSession {
    if (!this.session) {
      throw new Error(`Grip.${method}: not in stroke`);
    }
    return this.session;
  }

  private toLayerPoint(layer: Layer, point: GripPoint): GripPoint {
    if (this.options.inputSpace !== 'canvas') return point;
    const y = layer.getHeight() - 1 - point.y;
    return {
      ...point,
      x: Math.floor(point.x),
      y: Math.floor(y),
    };
  }
}
