import { Layer } from '../../../layer';
import type { Size } from '../../../layer/types';
import type { MaskSurface, SurfaceBounds } from '../../../surface/types';
import { GripShape } from '../../Shape';
import { GripColor, GripPoint, GripStrokeStyle } from '../../types';
import { CIRCLE_MASK_COMPLETION_300ES } from '../circle/shaders/mask_completion';
import { CIRCLE_MERGE_300ES } from '../circle/shaders/merge';

/**
 * @description Circle line preview shape that redraws a single line segment per update.
 */
export class CircleLineShape extends GripShape {
  readonly id = 'circle-line';
  private mask: MaskSurface | undefined;
  private baseTexture: WebGLTexture | undefined;
  private baseSize: Size | undefined;
  private startPoint: GripPoint | undefined;
  private lastBounds: SurfaceBounds | undefined;

  start(layer: Layer, point: GripPoint): void {
    this.startPoint = point;
    this.beginStroke(layer);
    this.drawLine(layer, point, point);
    this.merge(layer, point.style);
  }

  addPoint(layer: Layer, point: GripPoint, _prev: GripPoint): void {
    if (!this.startPoint) return;
    const nextBounds = makeLineBounds(layer, this.startPoint, point, point.style.size / 2);
    const prevBounds = this.lastBounds;
    this.clearMask(nextBounds);
    this.drawLine(layer, this.startPoint, point);
    this.lastBounds = nextBounds;
    const bounds: SurfaceBounds | undefined = prevBounds && nextBounds ? mergeBounds(prevBounds, nextBounds) : nextBounds;
    this.merge(layer, point.style, bounds);
    return;
  }

  end(layer: Layer, point: GripPoint, _prev: GripPoint): void {
    if (this.startPoint) {
      const nextBounds = makeLineBounds(layer, this.startPoint, point, point.style.size / 2);
      const prevBounds = this.lastBounds;
      this.clearMask(nextBounds);
      this.drawLine(layer, this.startPoint, point);
      this.lastBounds = nextBounds;
      const bounds: SurfaceBounds | undefined = prevBounds && nextBounds ? mergeBounds(prevBounds, nextBounds) : nextBounds;
      this.merge(layer, point.style, bounds);
    }
    if (this.baseTexture && this.lastBounds) {
      layer.commitHistoryFromTexture(this.baseTexture, this.lastBounds);
    }
    this.endStroke(layer);
    this.startPoint = undefined;
  }

  private drawLine(layer: Layer, from: GripPoint, to: GripPoint): void {
    const style = to.style;
    const radius = style.size / 2;
    if (radius <= 0) return;

    const mask = this.ensureMask(layer);
    const bounds = makeLineBounds(layer, from, to, radius);
    mask.applyEffect(
      {
        fragmentSrc: CIRCLE_MASK_COMPLETION_300ES,
        uniforms: {
          u_from: [from.x + 0.5, from.y + 0.5],
          u_to: [to.x + 0.5, to.y + 0.5],
          u_radius: radius,
        },
      },
      bounds ? { bounds } : undefined
    );
  }

  private beginStroke(layer: Layer): void {
    const size = layer.getSize();
    if (!this.baseSize || this.baseSize.width !== size.width || this.baseSize.height !== size.height) {
      this.disposeMask();
      this.baseSize = { ...size };
    }

    this.mask = this.mask ?? layer.createMaskSurface(size);
    this.mask.clear(0);
    this.lastBounds = undefined;

    if (this.baseTexture) {
      layer.deleteTexture(this.baseTexture);
    }
    this.baseTexture = layer.createTextureCopy();
  }

  private endStroke(layer: Layer): void {
    if (this.baseTexture) {
      layer.deleteTexture(this.baseTexture);
      this.baseTexture = undefined;
    }
    if (this.mask) {
      this.mask.clear(0);
    }
    this.lastBounds = undefined;
  }

  private merge(layer: Layer, style: GripStrokeStyle, bounds?: SurfaceBounds): void {
    if (!this.baseTexture || !this.mask) return;
    const color = normalizeColor(style.color);
    const opacity = style.opacity ?? 1;

    if (!bounds) return;

    layer.applyEffectWithTextures(
      {
        fragmentSrc: CIRCLE_MERGE_300ES,
        uniforms: {
          u_color: color,
          u_opacity: opacity,
        },
      },
      {
        u_base: this.baseTexture,
        u_mask: this.mask.getTextureHandle(),
      },
      bounds
    );
  }

  private clearMask(nextBounds?: SurfaceBounds): void {
    if (!this.mask) return;
    if (!this.lastBounds) {
      this.mask.clear(0);
      return;
    }
    const bounds = nextBounds ? mergeBounds(this.lastBounds, nextBounds) : this.lastBounds;
    this.mask.applyEffect({ fragmentSrc: CLEAR_MASK_300ES, uniforms: { u_value: 0 } }, bounds ? { bounds } : undefined);
  }

  private ensureMask(layer: Layer): MaskSurface {
    const size = layer.getSize();
    if (!this.mask || !this.baseSize || this.baseSize.width !== size.width || this.baseSize.height !== size.height) {
      this.disposeMask();
      this.baseSize = { ...size };
      this.mask = layer.createMaskSurface(size);
    }
    return this.mask;
  }

  private disposeMask(): void {
    if (this.mask) {
      this.mask.dispose();
      this.mask = undefined;
    }
  }
}

function normalizeColor(color: GripColor): [number, number, number, number] {
  const max = Math.max(color[0], color[1], color[2], color[3]);
  if (max > 1) {
    return [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
  }
  return [color[0], color[1], color[2], color[3]];
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

function mergeBounds(a: SurfaceBounds, b: SurfaceBounds): SurfaceBounds {
  const minX = Math.min(a.x, b.x);
  const minY = Math.min(a.y, b.y);
  const maxX = Math.max(a.x + a.width - 1, b.x + b.width - 1);
  const maxY = Math.max(a.y + a.height - 1, b.y + b.height - 1);
  return {
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

const CLEAR_MASK_300ES = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 outColor;

uniform sampler2D u_src;
uniform float u_value;

void main() {
  outColor = vec4(u_value, 0.0, 0.0, 1.0);
}
`;
