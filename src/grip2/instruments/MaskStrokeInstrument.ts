import type { GripPoint, GripStrokeStyle } from '../../grip/types';
import type { Layer } from '../../layer';
import type { Size } from '../../layer/types';
import type { MaskSurface, SurfaceBounds } from '../../surface/types';
import type { GripInstrument } from '../Instrument';
import type { GripKernel } from '../Kernel';
import { MASK_MERGE_300ES } from '../shaders/mask_merge';

/**
 * @description Instrument that uses a mask surface to preserve constant opacity.
 */
export class MaskStrokeInstrument implements GripInstrument {
  readonly id = 'mask-stroke';
  private mask: MaskSurface | undefined;
  private baseTexture: WebGLTexture | undefined;
  private baseSize: Size | undefined;
  private strokeBounds: SurfaceBounds | undefined;

  start(layer: Layer, kernel: GripKernel, point: GripPoint): void {
    this.beginStroke(layer);
    this.updateStrokeBounds(kernel.stampMaskPoint(this.mask as MaskSurface, layer, point));
    this.merge(layer, point.style);
  }

  addPoint(layer: Layer, kernel: GripKernel, point: GripPoint, prev: GripPoint): void {
    this.updateStrokeBounds(kernel.stampMaskSegment(this.mask as MaskSurface, layer, prev, point));
    this.updateStrokeBounds(kernel.stampMaskPoint(this.mask as MaskSurface, layer, point));
    this.merge(layer, point.style);
  }

  end(layer: Layer, kernel: GripKernel, point: GripPoint, prev: GripPoint): void {
    this.updateStrokeBounds(kernel.stampMaskSegment(this.mask as MaskSurface, layer, prev, point));
    this.updateStrokeBounds(kernel.stampMaskPoint(this.mask as MaskSurface, layer, point));
    this.merge(layer, point.style);
    if (this.baseTexture && this.strokeBounds) {
      layer.commitHistoryFromTexture(this.baseTexture, this.strokeBounds);
    }
    this.endStroke(layer);
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
        fragmentSrc: MASK_MERGE_300ES,
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

function normalizeColor(color: GripStrokeStyle['color']): [number, number, number, number] {
  const max = Math.max(color[0], color[1], color[2], color[3]);
  if (max > 1) {
    return [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
  }
  return [color[0], color[1], color[2], color[3]];
}
