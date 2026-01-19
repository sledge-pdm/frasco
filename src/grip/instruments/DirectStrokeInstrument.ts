import type { HistoryContextOptions, Layer } from '~/layer';
import type { GripInstrument } from '../Instrument';
import type { GripKernel } from '../Kernel';
import type { GripPoint } from '../types';

/**
 * @description Instrument that directly draws points and segments onto the layer.
 */
export class DirectStrokeInstrument implements GripInstrument {
  readonly id = 'direct-stroke';

  start(layer: Layer, kernel: GripKernel, point: GripPoint, _options?: HistoryContextOptions): void {
    kernel.drawPoint(layer, point);
  }

  addPoint(layer: Layer, kernel: GripKernel, point: GripPoint, prev: GripPoint, _options?: HistoryContextOptions): void {
    kernel.drawSegment(layer, prev, point);
    kernel.drawPoint(layer, point);
  }

  end(layer: Layer, kernel: GripKernel, point: GripPoint, prev: GripPoint, _options?: HistoryContextOptions): void {
    kernel.drawSegment(layer, prev, point);
    kernel.drawPoint(layer, point);
  }
}
