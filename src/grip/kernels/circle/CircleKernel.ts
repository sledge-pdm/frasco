import type { GripColor, GripPoint, GripStrokeStyle } from '../../../grip/types';
import type { Layer } from '../../../layer';
import type { MaskSurface, SurfaceBounds } from '../../../surface/types';
import type { GripKernel } from '../../Kernel';
import { CIRCLE_COMPLETION_300ES } from './shaders/completion';
import { CIRCLE_MASK_COMPLETION_300ES } from './shaders/mask_completion';
import { CIRCLE_MASK_POINT_300ES } from './shaders/mask_point';
import { CIRCLE_POINT_300ES } from './shaders/point';

/**
 * @description Kernel that draws a solid circle with radius size/2.
 */
export class CircleKernel implements GripKernel {
  readonly id = 'circle';

  prePositionTransform(point: GripPoint) {
    if (point.style.size % 2 === 0) {
      return {
        x: Math.round(point.x),
        y: Math.round(point.y),
      };
    } else {
      return {
        x: Math.round(point.x - 0.5) + 0.5,
        y: Math.round(point.y - 0.5) + 0.5,
      };
    }
  }

  drawPoint(layer: Layer, point: GripPoint): void {
    const radius = point.style.size / 2;
    if (radius <= 0) return;
    const { x: centerX, y: centerY } = this.prePositionTransform(point);
    const color = normalizeColor(point.style.color);
    const opacity = point.style.opacity ?? 1;
    layer.applyEffect({
      fragmentSrc: CIRCLE_POINT_300ES,
      uniforms: {
        u_center: [centerX, centerY],
        u_radius: radius,
        u_color: color,
        u_opacity: opacity,
      },
    });
  }

  drawSegment(layer: Layer, from: GripPoint, to: GripPoint): void {
    const radius = to.style.size / 2;
    if (radius <= 0) return;
    const toStyledFrom: GripPoint = {
      ...from,
      style: to.style,
    };
    const { x: fromX, y: fromY } = this.prePositionTransform(toStyledFrom);
    const { x: toX, y: toY } = this.prePositionTransform(to);
    const color = normalizeColor(to.style.color);
    const opacity = to.style.opacity ?? 1;
    layer.applyEffect({
      fragmentSrc: CIRCLE_COMPLETION_300ES,
      uniforms: {
        u_from: [fromX, fromY],
        u_to: [toX, toY],
        u_radius: radius,
        u_color: color,
        u_opacity: opacity,
      },
    });
  }

  stampMaskPoint(mask: MaskSurface, layer: Layer, point: GripPoint): SurfaceBounds | undefined {
    const radius = point.style.size / 2;
    if (radius <= 0) return;
    const { x: centerX, y: centerY } = this.prePositionTransform(point);
    const bounds = makePointBounds(layer, centerX, centerY, radius);
    mask.applyEffect(
      {
        fragmentSrc: CIRCLE_MASK_POINT_300ES,
        uniforms: {
          u_center: [centerX, centerY],
          u_radius: radius,
        },
      },
      bounds ? { bounds } : undefined
    );
    return bounds;
  }

  stampMaskSegment(mask: MaskSurface, layer: Layer, from: GripPoint, to: GripPoint): SurfaceBounds | undefined {
    const radius = to.style.size / 2;
    if (radius <= 0) return;
    const toStyledFrom: GripPoint = {
      ...from,
      style: to.style,
    };
    const { x: fromX, y: fromY } = this.prePositionTransform(toStyledFrom);
    const { x: toX, y: toY } = this.prePositionTransform(to);
    const bounds = makeLineBounds(layer, { ...from, x: fromX, y: fromY }, { ...to, x: toX, y: toY }, radius);
    mask.applyEffect(
      {
        fragmentSrc: CIRCLE_MASK_COMPLETION_300ES,
        uniforms: {
          u_from: [fromX, fromY],
          u_to: [toX, toY],
          u_radius: radius,
        },
      },
      bounds ? { bounds } : undefined
    );
    return bounds;
  }

  getPointBounds(style: GripStrokeStyle): SurfaceBounds {
    const size = style.size;
    const width = size + 2;
    const height = size + 2;
    return { x: 0, y: 0, width, height };
  }

  getComputedPointBounds(layer: Layer, point: GripPoint): SurfaceBounds | undefined {
    const radius = point.style.size / 2;
    if (radius <= 0) return;
    const { x: centerX, y: centerY } = this.prePositionTransform(point);
    return makePointBounds(layer, centerX, centerY, radius);
  }

  getComputedSegmentBounds(layer: Layer, from: GripPoint, to: GripPoint): SurfaceBounds | undefined {
    const radius = to.style.size / 2;
    if (radius <= 0) return;
    const toStyledFrom: GripPoint = {
      ...from,
      style: to.style,
    };
    const { x: fromX, y: fromY } = this.prePositionTransform(toStyledFrom);
    const { x: toX, y: toY } = this.prePositionTransform(to);
    return makeLineBounds(layer, { ...from, x: fromX, y: fromY }, { ...to, x: toX, y: toY }, radius);
  }
}

function normalizeColor(color: GripColor): [number, number, number, number] {
  const max = Math.max(color[0], color[1], color[2], color[3]);
  if (max > 1) {
    return [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
  }
  return [color[0], color[1], color[2], color[3]];
}

function makePointBounds(layer: Layer, x: number, y: number, radius: number): SurfaceBounds | undefined {
  return makeBounds(layer, x - radius, y - radius, x + radius, y + radius);
}

function makeLineBounds(layer: Layer, from: GripPoint, to: GripPoint, radius: number): SurfaceBounds | undefined {
  const minX = Math.min(from.x, to.x) - radius;
  const minY = Math.min(from.y, to.y) - radius;
  const maxX = Math.max(from.x, to.x) + radius;
  const maxY = Math.max(from.y, to.y) + radius;
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
