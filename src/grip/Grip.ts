import type { HistoryContextOptions } from '~/layer';
import { Layer } from '~/layer';
import type { GripInstrument } from './Instrument';
import type { GripKernel } from './Kernel';
import type { GripPoint } from './types';

export type GripInputSpace = 'layer' | 'canvas';

export type GripOptions = {
  inputSpace?: GripInputSpace;
};

interface GripSession {
  layer: Layer;
  kernel: GripKernel;
  instrument: GripInstrument;
  lastPoint: GripPoint;
  context?: HistoryContextOptions['context'];
}

export class Grip {
  private session: GripSession | undefined;

  constructor(private readonly options: GripOptions = {}) {}

  isInStroke(): boolean {
    return this.session !== undefined;
  }

  start(layer: Layer, kernel: GripKernel, point: GripPoint, instrument: GripInstrument, options?: HistoryContextOptions): void {
    const next = this.toLayerPoint(layer, point);
    instrument.start(layer, kernel, next, options);
    this.session = { layer, kernel, instrument, lastPoint: next, context: options?.context };
  }

  addPoint(point: GripPoint): void {
    const session = this.assertSession('addPoint');
    const next = this.toLayerPoint(session.layer, point);
    session.instrument.addPoint(session.layer, session.kernel, next, { ...session.lastPoint }, { context: session.context });
    session.lastPoint = next;
  }

  end(point: GripPoint): void {
    const session = this.assertSession('end');
    const next = this.toLayerPoint(session.layer, point);
    session.instrument.end(session.layer, session.kernel, next, { ...session.lastPoint }, { context: session.context });
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
    const y = layer.getHeight() - point.y;
    return {
      ...point,
      x: point.x,
      y: y,
    };
  }
}
