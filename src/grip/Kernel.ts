import type { GripPoint, GripStrokeStyle } from '../grip/types';
import type { Layer } from '../layer';
import type { MaskSurface, SurfaceBounds } from '../surface/types';

/**
 * Definition of a shape "kernel" (basic stamp + two-point completion).
 * - Responsible for point/segment drawing and mask stamping.
 * - Provides bounds computation for instruments.
 */
export interface GripKernel {
  /** Human-readable identifier. */
  readonly id: string;

  /**
   * Define position transform before passing to GL shaders.
   * @param position target position input
   */
  prePositionTransform(point: GripPoint): {
    x: number;
    y: number;
  };

  /**
   * Direct point drawing.
   * @param layer Target layer to draw into.
   * @param point Current stroke point (style included).
   */
  drawPoint(layer: Layer, point: GripPoint): void;
  /**
   * Direct segment drawing (completion).
   * @param layer Target layer to draw into.
   * @param from Previous point.
   * @param to Current point.
   */
  drawSegment(layer: Layer, from: GripPoint, to: GripPoint): void;

  /**
   * Stamp a point into a mask and return affected bounds.
   * @param mask Destination mask surface.
   * @param layer Layer for size/bounds reference.
   * @param point Current stroke point (style included).
   */
  stampMaskPoint(mask: MaskSurface, layer: Layer, point: GripPoint): SurfaceBounds | undefined;
  /**
   * Stamp a segment into a mask and return affected bounds.
   * @param mask Destination mask surface.
   * @param layer Layer for size/bounds reference.
   * @param from Previous point.
   * @param to Current point.
   */
  stampMaskSegment(mask: MaskSurface, layer: Layer, from: GripPoint, to: GripPoint): SurfaceBounds | undefined;

  /**
   * Get bounds for a point stamp (no clip).
   * @param style Stroke style.
   */
  getPointBounds(style: GripStrokeStyle): SurfaceBounds;

  /**
   * Compute bounds for a point stamp (clamped by layer bounds).
   * @param layer Layer for size/bounds reference.
   * @param point Current stroke point (style included).
   */
  getComputedPointBounds(layer: Layer, point: GripPoint): SurfaceBounds | undefined;
  /**
   * Compute bounds for a segment stamp (clamped by layer bounds).
   * @param layer Layer for size/bounds reference.
   * @param from Previous point.
   * @param to Current point.
   */
  getComputedSegmentBounds(layer: Layer, from: GripPoint, to: GripPoint): SurfaceBounds | undefined;
}
