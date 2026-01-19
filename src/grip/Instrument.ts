import type { GripPoint } from '~/grip';
import type { HistoryContextOptions, Layer } from '~/layer';
import type { GripKernel } from './Kernel';

/**
 * Interface that defines how a stroke is "used".
 * - Owns the policy (mask merge, direct draw, preview update, etc.).
 * - Kernel handles actual point/segment drawing, Instrument orchestrates the flow.
 */
export interface GripInstrument {
  /** Human-readable identifier. */
  readonly id: string;
  /**
   * Stroke start.
   * - Initialize mask/preview or prepare history.
   * @param layer Target layer to draw into.
   * @param kernel Kernel used for drawing/stamping.
   * @param point First stroke point.
   */
  start(layer: Layer, kernel: GripKernel, point: GripPoint, options?: HistoryContextOptions): void;
  /**
   * Stroke continuation.
   * - Complete the segment from prev -> point and optionally stamp the point.
   * @param layer Target layer to draw into.
   * @param kernel Kernel used for drawing/stamping.
   * @param point Current stroke point.
   * @param prev Previous stroke point.
   */
  addPoint(layer: Layer, kernel: GripKernel, point: GripPoint, prev: GripPoint, options?: HistoryContextOptions): void;
  /**
   * Stroke end.
   * - Final completion/draw and history commit.
   * @param layer Target layer to draw into.
   * @param kernel Kernel used for drawing/stamping.
   * @param point Current stroke point.
   * @param prev Previous stroke point.
   */
  end(layer: Layer, kernel: GripKernel, point: GripPoint, prev: GripPoint, options?: HistoryContextOptions): void;
}
