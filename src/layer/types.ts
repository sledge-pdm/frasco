import { RawPixelData } from '@sledge-pdm/core';

export type Size = {
  width: number;
  height: number;
};

export type Rgba8 = readonly [number, number, number, number];

export type RgbaFloat = readonly [number, number, number, number];

export type LayerInit = Size & {
  data?: RawPixelData;
};

export type LayerExportOptions = {
  flipY?: boolean;
};

export type LayerEffectUniformValue = number | readonly number[];

export type LayerEffect = {
  fragmentSrc: string;
  uniforms?: Record<string, LayerEffectUniformValue>;
};
