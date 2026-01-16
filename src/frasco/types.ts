import type { RgbaFloat, Size } from '~/layer';

export enum BlendMode {
  normal = 'Normal',
  multiply = 'Multiply',
  screen = 'Screen',
  overlay = 'Overlay',
  softLight = 'Soft Light',
  hardLight = 'Hard Light',
  linearLight = 'Linear Light',
  vividLight = 'Vivid Light',
}

export const blendModeIds = {
  [BlendMode.normal]: 0,
  [BlendMode.multiply]: 1,
  [BlendMode.screen]: 2,
  [BlendMode.overlay]: 3,
  [BlendMode.softLight]: 4,
  [BlendMode.hardLight]: 5,
  [BlendMode.linearLight]: 6,
  [BlendMode.vividLight]: 7,
};

export const getBlendModeId = (mode: BlendMode): number => blendModeIds[mode];

export type CompositeLayer = {
  texture: WebGLTexture;
  opacity: number;
  blendMode: BlendMode;
  enabled?: boolean;
};

export type ComposeOptions = {
  size?: Size;
  target?: WebGLTexture;
  baseColor?: RgbaFloat;
  flipY?: boolean;
};

export type FrascoOptions = {
  size?: Size;
  baseColor?: RgbaFloat;
};
