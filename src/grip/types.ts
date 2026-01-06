import type { Rgba8, RgbaFloat } from '../layer';

export type GripColor = Rgba8 | RgbaFloat;

export type GripStrokeStyle = {
  color: GripColor;
  size: number;
  opacity?: number;
};

export type GripPoint = {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
  style: GripStrokeStyle;
};
