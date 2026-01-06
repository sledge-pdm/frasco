import { Layer } from '../../../layer';
import { GripShape } from '../../Shape';
import { GripColor, GripPoint, GripStrokeStyle } from '../../types';
import { SIMPLE_CIRCLE_COMPLETION_300ES } from './shaders/completion';
import { SIMPLE_CIRCLE_FRAG_300ES } from './shaders/point';

/**
 * @description Circle shape that blends points and completion lines without preserving opacity across overlaps.
 */
export class SimpleCircleShape extends GripShape {
  readonly id = 'simple-circle';

  start(layer: Layer, point: GripPoint): void {
    this.drawPoint(layer, point.x, point.y, point.style);
  }

  addPoint(layer: Layer, point: GripPoint, prev: GripPoint): void {
    this.drawLine(layer, prev, point);
    this.drawPoint(layer, point.x, point.y, point.style);
  }

  end(layer: Layer, point: GripPoint, prev: GripPoint): void {
    this.drawLine(layer, prev, point);
    this.drawPoint(layer, point.x, point.y, point.style);
  }

  private drawLine(layer: Layer, from: GripPoint, to: GripPoint): void {
    const style = to.style;
    const radius = style.size / 2;
    if (radius <= 0) return;

    const color = normalizeColor(style.color);
    const opacity = style.opacity ?? 1;

    layer.applyEffect({
      fragmentSrc: SIMPLE_CIRCLE_COMPLETION_300ES,
      uniforms: {
        u_from: [from.x + 0.5, from.y + 0.5],
        u_to: [to.x + 0.5, to.y + 0.5],
        u_radius: radius,
        u_color: color,
        u_opacity: opacity,
      },
    });
  }

  private drawPoint(layer: Layer, x: number, y: number, style: GripStrokeStyle): void {
    const radius = style.size / 2;
    if (radius <= 0) return;

    const color = normalizeColor(style.color);
    const opacity = style.opacity ?? 1;

    layer.applyEffect({
      fragmentSrc: SIMPLE_CIRCLE_FRAG_300ES,
      uniforms: {
        u_center: [x + 0.5, y + 0.5],
        u_radius: radius,
        u_color: color,
        u_opacity: opacity,
      },
    });
  }
}

function normalizeColor(color: GripColor): [number, number, number, number] {
  const max = Math.max(color[0], color[1], color[2], color[3]);
  if (max > 1) {
    return [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
  }
  return [color[0], color[1], color[2], color[3]];
}
