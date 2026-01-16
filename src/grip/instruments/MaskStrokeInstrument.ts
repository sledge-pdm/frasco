import type { Layer, Size } from '~/layer';
import type { MaskSurface, SurfaceBounds } from '~/surface/types';
import { deleteTexture } from '~/utils';
import type { GripInstrument } from '../Instrument';
import type { GripKernel } from '../Kernel';
import { MASK_MERGE_300ES } from '../shaders/mask_merge';
import type { GripPoint, GripStrokeStyle } from '../types';

/**
 * @description Instrument that uses a mask surface to preserve constant opacity.
 */
export class MaskStrokeInstrument implements GripInstrument {
  readonly id = 'mask-stroke';
  private mask: MaskSurface | undefined;
  private baseTexture: WebGLTexture | undefined;
  private baseSize: Size | undefined;
  private baseCopiedBounds: SurfaceBounds | undefined;
  private strokeBounds: SurfaceBounds | undefined;

  start(layer: Layer, kernel: GripKernel, point: GripPoint): void {
    this.beginStroke(layer);
    this.updateStrokeBounds(kernel.stampMaskPoint(this.mask as MaskSurface, layer, point));
    this.copyBaseIfNeeded(layer, this.strokeBounds);
    this.merge(layer, point.style);
  }

  addPoint(layer: Layer, kernel: GripKernel, point: GripPoint, prev: GripPoint): void {
    this.updateStrokeBounds(kernel.stampMaskSegment(this.mask as MaskSurface, layer, prev, point));
    this.updateStrokeBounds(kernel.stampMaskPoint(this.mask as MaskSurface, layer, point));
    this.copyBaseIfNeeded(layer, this.strokeBounds);
    this.merge(layer, point.style);
  }

  end(layer: Layer, kernel: GripKernel, point: GripPoint, prev: GripPoint): void {
    this.updateStrokeBounds(kernel.stampMaskSegment(this.mask as MaskSurface, layer, prev, point));
    this.updateStrokeBounds(kernel.stampMaskPoint(this.mask as MaskSurface, layer, point));
    this.copyBaseIfNeeded(layer, this.strokeBounds);
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
    this.baseCopiedBounds = undefined;

    if (this.baseTexture) {
      deleteTexture(layer.getGLContext(), this.baseTexture);
    }
    this.baseTexture = layer.createEmptyTexture();
  }

  private endStroke(layer: Layer): void {
    if (this.baseTexture) {
      deleteTexture(layer.getGLContext(), this.baseTexture);
      this.baseTexture = undefined;
    }
    if (this.mask) {
      this.mask.clear(0);
    }
    this.baseCopiedBounds = undefined;
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

  private copyBaseIfNeeded(layer: Layer, bounds: SurfaceBounds | undefined): void {
    if (!this.baseTexture || !bounds) return;
    if (!this.baseCopiedBounds) {
      layer.copyTextureRegion(this.baseTexture, bounds);
      this.baseCopiedBounds = { ...bounds };
      return;
    }

    const prev = this.baseCopiedBounds;
    const next = bounds;
    const nextX1 = next.x + next.width;
    const nextY1 = next.y + next.height;
    const prevX1 = prev.x + prev.width;
    const prevY1 = prev.y + prev.height;
    const containsPrev = next.x <= prev.x && next.y <= prev.y && nextX1 >= prevX1 && nextY1 >= prevY1;

    if (!containsPrev) {
      layer.copyTextureRegion(this.baseTexture, next);
      this.baseCopiedBounds = { ...next };
      return;
    }

    const regions: SurfaceBounds[] = [];

    if (next.y < prev.y) {
      regions.push({ x: next.x, y: next.y, width: next.width, height: prev.y - next.y });
    }
    if (nextY1 > prevY1) {
      regions.push({ x: next.x, y: prevY1, width: next.width, height: nextY1 - prevY1 });
    }

    const overlapY0 = Math.max(next.y, prev.y);
    const overlapY1 = Math.min(nextY1, prevY1);
    if (overlapY1 > overlapY0) {
      if (next.x < prev.x) {
        regions.push({ x: next.x, y: overlapY0, width: prev.x - next.x, height: overlapY1 - overlapY0 });
      }
      if (nextX1 > prevX1) {
        regions.push({ x: prevX1, y: overlapY0, width: nextX1 - prevX1, height: overlapY1 - overlapY0 });
      }
    }

    for (const region of regions) {
      if (region.width <= 0 || region.height <= 0) continue;
      layer.copyTextureRegion(this.baseTexture, region);
    }

    this.baseCopiedBounds = { ...next };
  }
}

function normalizeColor(color: GripStrokeStyle['color']): [number, number, number, number] {
  const max = Math.max(color[0], color[1], color[2], color[3]);
  if (max > 1) {
    return [color[0] / 255, color[1] / 255, color[2] / 255, color[3] / 255];
  }
  return [color[0], color[1], color[2], color[3]];
}
