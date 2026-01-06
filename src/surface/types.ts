import type { LayerEffectUniformValue, Size } from '../layer/types';

export type SurfaceBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type MaskSurfaceEffect = {
  fragmentSrc: string;
  uniforms?: Record<string, LayerEffectUniformValue>;
};

export type MaskSurfaceApplyOptions = {
  bounds?: SurfaceBounds;
};

export interface MaskSurface {
  getWidth(): number;
  getHeight(): number;
  getSize(): Size;
  getTextureHandle(): WebGLTexture;
  clear(value?: number): void;
  applyEffect(effect: MaskSurfaceEffect, options?: MaskSurfaceApplyOptions): void;
  dispose(): void;
}

export interface MaskSurfaceProvider {
  createMaskSurface(size: Size): MaskSurface;
}
