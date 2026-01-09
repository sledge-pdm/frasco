import type { Layer } from '../../../layer';
import type { MaskSurface, SurfaceBounds } from '../../../surface/types';
import type { GripPoint, GripColor } from '../../../grip/types';
import type { GripKernel } from '../../Kernel';
import { SQUARE_MASK_COMPLETION_300ES } from './shaders/mask_completion';
import { SQUARE_MASK_POINT_300ES } from './shaders/mask_point';
import { SQUARE_COMPLETION_300ES } from './shaders/completion';
import { SQUARE_POINT_300ES } from './shaders/point';

/**
 * @description Kernel that draws a solid square with side length size and center snapping.
 */
export class SquareKernel implements GripKernel {
  readonly id = 'square';

  drawPoint(layer: Layer, point: GripPoint): void {
    const half = squareHalf(point.style.size);
    if (half < 0) return;
    const centerX = snapSquareCenter(point.x, point.style.size);
    const centerY = snapSquareCenter(point.y, point.style.size);
    const color = normalizeColor(point.style.color);
    const opacity = point.style.opacity ?? 1;
    layer.applyEffect({
      fragmentSrc: SQUARE_POINT_300ES,
      uniforms: {
        u_center: [centerX, centerY],
        u_half: half,
        u_color: color,
        u_opacity: opacity,
      },
    });
  }

  drawSegment(layer: Layer, from: GripPoint, to: GripPoint): void {
    const half = squareHalf(to.style.size);
    if (half < 0) return;
    const fromX = snapSquareCenter(from.x, to.style.size);
    const fromY = snapSquareCenter(from.y, to.style.size);
    const toX = snapSquareCenter(to.x, to.style.size);
    const toY = snapSquareCenter(to.y, to.style.size);
    const color = normalizeColor(to.style.color);
    const opacity = to.style.opacity ?? 1;
    layer.applyEffect({
      fragmentSrc: SQUARE_COMPLETION_300ES,
      uniforms: {
        u_from: [fromX, fromY],
        u_to: [toX, toY],
        u_half: half,
        u_color: color,
        u_opacity: opacity,
      },
    });
  }

  stampMaskPoint(mask: MaskSurface, layer: Layer, point: GripPoint): SurfaceBounds | undefined {
    const half = squareHalf(point.style.size);
    if (half < 0) return;
    const centerX = snapSquareCenter(point.x, point.style.size);
    const centerY = snapSquareCenter(point.y, point.style.size);
    const bounds = makePointBounds(layer, centerX, centerY, half);
    mask.applyEffect(
      {
        fragmentSrc: SQUARE_MASK_POINT_300ES,
        uniforms: {
          u_center: [centerX, centerY],
          u_half: half,
        },
      },
      bounds ? { bounds } : undefined
    );
    return bounds;
  }

  stampMaskSegment(mask: MaskSurface, layer: Layer, from: GripPoint, to: GripPoint): SurfaceBounds | undefined {
    const half = squareHalf(to.style.size);
    if (half < 0) return;
    const fromX = snapSquareCenter(from.x, to.style.size);
    const fromY = snapSquareCenter(from.y, to.style.size);
    const toX = snapSquareCenter(to.x, to.style.size);
    const toY = snapSquareCenter(to.y, to.style.size);
    const bounds = makeLineBounds(layer, { ...from, x: fromX, y: fromY }, { ...to, x: toX, y: toY }, half);
    mask.applyEffect(
      {
        fragmentSrc: SQUARE_MASK_COMPLETION_300ES,
        uniforms: {
          u_from: [fromX, fromY],
          u_to: [toX, toY],
          u_half: half,
        },
      },
      bounds ? { bounds } : undefined
    );
    return bounds;
  }

  getPointBounds(layer: Layer, point: GripPoint): SurfaceBounds | undefined {
    const half = squareHalf(point.style.size);
    if (half < 0) return;
    const centerX = snapSquareCenter(point.x, point.style.size);
    const centerY = snapSquareCenter(point.y, point.style.size);
    return makePointBounds(layer, centerX, centerY, half);
  }

  getSegmentBounds(layer: Layer, from: GripPoint, to: GripPoint): SurfaceBounds | undefined {
    const half = squareHalf(to.style.size);
    if (half < 0) return;
    const fromX = snapSquareCenter(from.x, to.style.size);
    const fromY = snapSquareCenter(from.y, to.style.size);
    const toX = snapSquareCenter(to.x, to.style.size);
    const toY = snapSquareCenter(to.y, to.style.size);
    return makeLineBounds(layer, { ...from, x: fromX, y: fromY }, { ...to, x: toX, y: toY }, half);
  }
}

function squareHalf(size: number): number {
  return (size - 1) / 2;
}

function snapSquareCenter(value: number, size: number): number {
  if (size % 2 === 0) {
    return Math.round(value);
  }
  return Math.round(value - 0.5) + 0.5;
}

function normalizeColor(color: GripColor): [number, number, number, number] {
  const max = Math.max(color[0], color[1], color[2], color[3]);
  if (max > 1) {
    return [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
  }
  return [color[0], color[1], color[2], color[3]];
}

function makePointBounds(layer: Layer, x: number, y: number, half: number): SurfaceBounds | undefined {
  return makeBounds(layer, x - half, y - half, x + half, y + half);
}

function makeLineBounds(layer: Layer, from: GripPoint, to: GripPoint, half: number): SurfaceBounds | undefined {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  const pad = len > 0 ? half * ((Math.abs(dx) + Math.abs(dy)) / len) : half;
  const minX = Math.min(from.x, to.x) - pad;
  const minY = Math.min(from.y, to.y) - pad;
  const maxX = Math.max(from.x, to.x) + pad;
  const maxY = Math.max(from.y, to.y) + pad;
  return makeBounds(layer, minX, minY, maxX, maxY);
}

function makeBounds(layer: Layer, minX: number, minY: number, maxX: number, maxY: number): SurfaceBounds | undefined {
  const width = layer.getWidth();
  const height = layer.getHeight();
  const x0 = Math.max(0, Math.floor(minX));
  const y0 = Math.max(0, Math.floor(minY));
  const x1 = Math.min(width - 1, Math.ceil(maxX));
  const y1 = Math.min(height - 1, Math.ceil(maxY));
  if (x1 < 0 || y1 < 0 || x0 > width - 1 || y0 > height - 1) return undefined;
  if (x1 < x0 || y1 < y0) return undefined;
  return {
    x: x0,
    y: y0,
    width: x1 - x0 + 1,
    height: y1 - y0 + 1,
  };
}
