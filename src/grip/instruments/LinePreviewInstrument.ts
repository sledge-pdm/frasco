import type { GripPoint, GripStrokeStyle } from '../../grip/types';
import type { Layer } from '../../layer';
import type { Size } from '../../layer/types';
import type { MaskSurface, SurfaceBounds } from '../../surface/types';
import { deleteTexture } from '../../utils';
import type { GripInstrument } from '../Instrument';
import type { GripKernel } from '../Kernel';
import { MASK_MERGE_300ES } from '../shaders/mask_merge';

/**
 * @description Instrument that redraws a single segment for live line preview updates.
 */
export class LinePreviewInstrument implements GripInstrument {
  readonly id = 'line-preview';
  private mask: MaskSurface | undefined;
  private baseTexture: WebGLTexture | undefined;
  private baseSize: Size | undefined;
  private baseCopiedBounds: SurfaceBounds | undefined;
  private startPoint: GripPoint | undefined;
  private lastBounds: SurfaceBounds | undefined;

  start(layer: Layer, kernel: GripKernel, point: GripPoint): void {
    this.startPoint = point;
    this.beginStroke(layer);
    const bounds = kernel.stampMaskSegment(this.mask as MaskSurface, layer, point, point);
    this.lastBounds = bounds;
    this.copyBaseIfNeeded(layer, bounds);
    this.merge(layer, point.style, bounds);
  }

  addPoint(layer: Layer, kernel: GripKernel, point: GripPoint): void {
    if (!this.startPoint) return;
    const nextBounds = kernel.getComputedSegmentBounds(layer, this.startPoint, point);
    const prevBounds = this.lastBounds;
    this.clearMask(nextBounds);
    const drawnBounds = kernel.stampMaskSegment(this.mask as MaskSurface, layer, this.startPoint, point);
    this.lastBounds = drawnBounds ?? nextBounds;
    const bounds = prevBounds && nextBounds ? mergeBounds(prevBounds, nextBounds) : nextBounds;
    this.copyBaseIfNeeded(layer, bounds);
    this.merge(layer, point.style, bounds);
  }

  end(layer: Layer, kernel: GripKernel, point: GripPoint): void {
    if (this.startPoint) {
      const nextBounds = kernel.getComputedSegmentBounds(layer, this.startPoint, point);
      const prevBounds = this.lastBounds;
      this.clearMask(nextBounds);
      const drawnBounds = kernel.stampMaskSegment(this.mask as MaskSurface, layer, this.startPoint, point);
      this.lastBounds = drawnBounds ?? nextBounds;
      const bounds = prevBounds && nextBounds ? mergeBounds(prevBounds, nextBounds) : nextBounds;
      this.copyBaseIfNeeded(layer, bounds);
      this.merge(layer, point.style, bounds);
    }
    if (this.baseTexture && this.lastBounds) {
      layer.commitHistoryFromTexture(this.baseTexture, this.lastBounds);
    }
    this.endStroke(layer);
    this.startPoint = undefined;
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
    this.lastBounds = undefined;
    this.baseCopiedBounds = undefined;
  }

  private merge(layer: Layer, style: GripStrokeStyle, bounds?: SurfaceBounds): void {
    if (!this.baseTexture || !this.mask || !bounds) return;
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

  private disposeMask(): void {
    if (this.mask) {
      this.mask.dispose();
      this.mask = undefined;
    }
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
