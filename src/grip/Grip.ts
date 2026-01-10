import { Layer } from '../layer';
import type { GripInstrument } from './Instrument';
import { MaskStrokeInstrument } from './instruments/MaskStrokeInstrument';
import type { GripKernel } from './Kernel';
import type { GripPoint } from './types';

export type GripInputSpace = 'layer' | 'canvas';

export type GripOptions = {
  inputSpace?: GripInputSpace;
  instrument?: GripInstrument;
};

type GripSession = {
  layer: Layer;
  kernel: GripKernel;
  instrument: GripInstrument;
  lastPoint: GripPoint;
};

export class Grip {
  private session: GripSession | undefined;
  private readonly defaultInstrument: GripInstrument;

  constructor(private readonly options: GripOptions = {}) {
    this.defaultInstrument = options.instrument ?? new MaskStrokeInstrument();
  }

  isInStroke(): boolean {
    return this.session !== undefined;
  }

  start(layer: Layer, kernel: GripKernel, point: GripPoint, instrument?: GripInstrument): void {
    // Currently replace session even if already defined
    // if (this.isInStroke()) {
    //   console.warn(`Grip.start: already in stroke. replacing.`);
    // }

    const next = this.toLayerPoint(layer, point);
    const activeInstrument = instrument ?? this.defaultInstrument;
    activeInstrument.start(layer, kernel, next);
    this.session = { layer, kernel, instrument: activeInstrument, lastPoint: next };
  }

  addPoint(point: GripPoint): void {
    const session = this.assertSession('addPoint');
    const next = this.toLayerPoint(session.layer, point);
    session.instrument.addPoint(session.layer, session.kernel, next, { ...session.lastPoint });
    session.lastPoint = next;
  }

  end(point: GripPoint): void {
    const session = this.assertSession('end');
    const next = this.toLayerPoint(session.layer, point);
    session.instrument.end(session.layer, session.kernel, next, { ...session.lastPoint });
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
