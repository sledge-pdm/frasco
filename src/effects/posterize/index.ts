import type { Effect } from '../types';
import { POSTERIZE_FRAG_300ES } from './shaders';

type Options = {
  levels: number;
};

export const PosterizeEffect: Effect<Options> = {
  apply(layer, options) {
    const levels = clamp(Math.round(options?.levels ?? 4), 1, 32);

    const snapshot = layer.captureHistory();
    layer.applyEffect({
      fragmentSrc: POSTERIZE_FRAG_300ES,
      uniforms: {
        u_levels: levels,
      },
    });
    if (snapshot) layer.pushHistory(snapshot);
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
