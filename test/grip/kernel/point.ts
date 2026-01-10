import { RGBA } from '@sledge-pdm/core';
import { GripPoint } from '~/grip';

export const COLOR_BLACK: RGBA = [0, 0, 0, 255];

export function makePoint(x: number, y: number, size: number, color: RGBA = COLOR_BLACK): GripPoint {
  return {
    x,
    y,
    style: {
      color: color,
      size,
      opacity: 1,
    },
  };
}

export function maskToAlpha(mask: Uint8Array): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 4) {
    const alpha = mask[i] ? 255 : 0;
    out[i] = 0;
    out[i + 1] = 0;
    out[i + 2] = 0;
    out[i + 3] = alpha;
  }
  return out;
}
