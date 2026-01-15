import type { Layer, Size } from '../../layer';
import type { MaskSurface } from '../../surface';
import type { GripKernel } from '../Kernel';
import type { GripStrokeStyle } from '../types';

export type BitmaskShape = {
  mask: Uint8Array;
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;

  prePositionTransform: (position: { x: number; y: number }) => {
    x: number;
    y: number;
  };
};

export class BitmaskFactory {
  private layer: Layer;
  private mask?: MaskSurface;
  private size?: Size;

  constructor(layer: Layer) {
    this.layer = layer;
  }

  setLayer(layer: Layer) {
    if (this.layer === layer) return;
    this.disposeMask();
    this.layer = layer;
    this.size = undefined;
  }

  createPointMask(kernel: GripKernel, style: GripStrokeStyle): BitmaskShape {
    const bounds = kernel.getPointBounds(style);
    const width = Math.max(1, Math.floor(bounds.width));
    const height = Math.max(1, Math.floor(bounds.height));
    const centerX = width / 2;
    const centerY = height / 2;

    this.ensureSize({ width, height });

    if (!this.mask) {
      this.mask = this.layer.createMaskSurface({ width, height });
    }

    this.mask.clear(0);
    kernel.stampMaskPoint(this.mask, this.layer, {
      x: centerX,
      y: centerY,
      style,
    });

    const raw = this.mask.readPixels();
    const mask = new Uint8Array(width * height);
    for (let i = 0; i < raw.length; i++) {
      mask[i] = raw[i] ? 1 : 0;
    }

    return {
      mask,
      width,
      height,
      offsetX: -centerX,
      offsetY: -centerY,

      prePositionTransform: (position) => {
        return kernel.prePositionTransform({
          x: position.x,
          y: position.y,
          style,
        });
      },
    };
  }

  dispose() {
    this.disposeMask();
  }

  private ensureSize(size: Size) {
    if (!this.size || this.size.width !== size.width || this.size.height !== size.height) {
      this.size = { ...size };
      this.layer.resizeClear(size.width, size.height);
      this.disposeMask();
    }
  }

  private disposeMask() {
    if (this.mask) {
      this.mask.dispose();
      this.mask = undefined;
    }
  }
}
