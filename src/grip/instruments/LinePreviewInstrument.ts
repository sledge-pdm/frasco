import type { GripPoint, GripStrokeStyle } from '../../grip/types';
import type { Layer } from '../../layer';
import type { Size } from '../../layer/types';
import type { MaskSurface, SurfaceBounds } from '../../surface/types';
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
  private startPoint: GripPoint | undefined;
  private lastBounds: SurfaceBounds | undefined;

  start(layer: Layer, kernel: GripKernel, point: GripPoint): void {
    this.startPoint = point;
    this.beginStroke(layer);
    const bounds = kernel.stampMaskSegment(this.mask as MaskSurface, layer, point, point);
    this.lastBounds = bounds;
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
