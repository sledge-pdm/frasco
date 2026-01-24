import type { HistoryContextOptions } from '~/layer';
import type { Effect } from '../types';
import { DITHERING_ORDERED_FRAG_300ES, DITHERING_RANDOM_FRAG_300ES } from './shaders';

type Options = HistoryContextOptions & {
  mode?: 'random' | 'ordered';
  levels?: number;
  strength?: number;
};

const MODE_TO_FRAGMENT: Record<NonNullable<Options['mode']>, string> = {
  random: DITHERING_RANDOM_FRAG_300ES,
  ordered: DITHERING_ORDERED_FRAG_300ES,
};

export const DitheringEffect: Effect<Options> = {
  apply(layer, options) {
    const mode = options?.mode ?? 'ordered';
    const fragmentSrc = MODE_TO_FRAGMENT[mode] ?? DITHERING_ORDERED_FRAG_300ES;
    const levels = clamp(Math.round(options?.levels ?? 4), 2, 32);
    const strength = clamp(options?.strength ?? 1, 0, 1);
    const size = layer.getSize();

    const snapshot = layer.captureHistory();
    layer.applyEffect({
      fragmentSrc,
      uniforms: {
        u_levels: levels,
        u_strength: strength,
        u_size: [size.width, size.height],
      },
    });
    if (snapshot) layer.pushHistory(snapshot, { context: options?.context });
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
