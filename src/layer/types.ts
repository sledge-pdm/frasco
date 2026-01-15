import { RawPixelData } from '@sledge-pdm/core';

export type Size = {
  width: number;
  height: number;
};

export type Rgba8 = readonly [number, number, number, number];

export type RgbaFloat = readonly [number, number, number, number];

export type LayerInit = Size & {
  data?: RawPixelData;
  tileSize?: number;
};

export type LayerExportOptions = {
  flipY?: boolean;
};

export type LayerEffectUniformValue = number | readonly number[];

export type LayerEffect = {
  fragmentSrc: string;
  uniforms?: Record<string, LayerEffectUniformValue>;
};

export type LayerTileInfo = {
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type TileTextureSet = {
  kind: 'tiles';
  textures: WebGLTexture[];
  tileSize: Size;
  tileCountX: number;
  tileCountY: number;
};

export type LayerTextureHandle = WebGLTexture | TileTextureSet;
