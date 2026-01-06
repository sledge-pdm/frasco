import { Layer } from '../../../layer';
import type { Size } from '../../../layer/types';
import type { MaskSurface, SurfaceBounds } from '../../../surface/types';
import { GripShape } from '../../Shape';
import { GripColor, GripPoint, GripStrokeStyle } from '../../types';
import { SQUARE_MASK_COMPLETION_300ES } from './shaders/mask_completion';
import { SQUARE_MASK_POINT_300ES } from './shaders/mask_point';
import { SQUARE_MERGE_300ES } from './shaders/merge';

/**
 * @description Square shape with side length defined as size * 2.
 */
export class SquareShape extends GripShape {
  readonly id = 'square';
  private mask: MaskSurface | undefined;
  private baseTexture: WebGLTexture | undefined;
  private baseSize: Size | undefined;
  private strokeBounds: SurfaceBounds | undefined;

  start(layer: Layer, point: GripPoint): void {
    this.beginStroke(layer);
    this.drawPoint(layer, point.x, point.y, point.style);
    this.merge(layer, point.style);
  }

  addPoint(layer: Layer, point: GripPoint, prev: GripPoint): void {
    this.drawLine(layer, prev, point);
    this.drawPoint(layer, point.x, point.y, point.style);
    this.merge(layer, point.style);
  }

  end(layer: Layer, point: GripPoint, prev: GripPoint): void {
    this.drawLine(layer, prev, point);
    this.drawPoint(layer, point.x, point.y, point.style);
    this.merge(layer, point.style);
    if (this.baseTexture && this.strokeBounds) {
      layer.commitHistoryFromTexture(this.baseTexture, this.strokeBounds);
    }
    this.endStroke(layer);
  }

  private drawLine(layer: Layer, from: GripPoint, to: GripPoint): void {
    const style = to.style;
    const half = sizeToHalf(style.size);
    if (half <= 0) return;

    const mask = this.ensureMask(layer);
    const bounds = makeLineBounds(layer, from, to, half);
    this.updateStrokeBounds(bounds);
    mask.applyEffect(
      {
        fragmentSrc: SQUARE_MASK_COMPLETION_300ES,
        uniforms: {
          u_from: [from.x + 0.5, from.y + 0.5],
          u_to: [to.x + 0.5, to.y + 0.5],
          u_half: half,
        },
      },
      bounds ? { bounds } : undefined
    );
  }

  private drawPoint(layer: Layer, x: number, y: number, style: GripStrokeStyle): void {
    const half = sizeToHalf(style.size);
    if (half <= 0) return;

    const mask = this.ensureMask(layer);
    const bounds = makePointBounds(layer, x, y, half);
    this.updateStrokeBounds(bounds);
    mask.applyEffect(
      {
        fragmentSrc: SQUARE_MASK_POINT_300ES,
        uniforms: {
          u_center: [x + 0.5, y + 0.5],
          u_half: half,
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
    this.strokeBounds = undefined;

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
  }

  private merge(layer: Layer, style: GripStrokeStyle): void {
    if (!this.baseTexture || !this.mask || !this.strokeBounds) return;
    const color = normalizeColor(style.color);
    const opacity = style.opacity ?? 1;

    layer.applyEffectWithTextures(
      {
        fragmentSrc: SQUARE_MERGE_300ES,
        uniforms: {
          u_color: color,
          u_opacity: opacity,
        },
      },
      {
        u_base: this.baseTexture,
        u_mask: this.mask.getTextureHandle(),
      },
      this.strokeBounds
    );
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

  private updateStrokeBounds(bounds: SurfaceBounds | undefined): void {
    if (!bounds) return;
    if (!this.strokeBounds) {
      this.strokeBounds = { ...bounds };
      return;
    }
    const current = this.strokeBounds;
    const minX = Math.min(current.x, bounds.x);
    const minY = Math.min(current.y, bounds.y);
    const maxX = Math.max(current.x + current.width - 1, bounds.x + bounds.width - 1);
    const maxY = Math.max(current.y + current.height - 1, bounds.y + bounds.height - 1);
    this.strokeBounds = {
      x: minX,
      y: minY,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
    };
  }
}

function sizeToHalf(size: number): number {
  return Math.max(0, size);
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
