import { RawPixelData } from '@sledge-pdm/core';
import { SurfaceBounds } from '~/surface';

export type Size = {
  width: number;
  height: number;
};

export type Rgba8 = readonly [number, number, number, number];

export type RgbaFloat = readonly [number, number, number, number];

export type LayerInit = Size & {
  data?: RawPixelData;
};

export type ReadPixelsOptions = {
  bounds?: SurfaceBounds;
  flipY?: boolean;
};

export type WritePixelsOptions = {
  bounds?: SurfaceBounds;
};

export type LayerEffectUniformValue = number | readonly number[];

export type LayerEffect = {
  fragmentSrc: string;
  uniforms?: Record<string, LayerEffectUniformValue>;
};
