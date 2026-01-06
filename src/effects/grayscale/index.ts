import type { Effect } from '../types';
import { GRAYSCALE_BT601_FRAG_300ES, GRAYSCALE_BT709_FRAG_300ES } from './shaders';

type Options = {
  standard?: 'bt601' | 'bt709';
};

const STANDARD_TO_FRAGMENT: Record<NonNullable<Options['standard']>, string> = {
  bt601: GRAYSCALE_BT601_FRAG_300ES,
  bt709: GRAYSCALE_BT709_FRAG_300ES,
};

export const GrayscaleEffect: Effect<Options> = {
  apply(layer, options) {
    const standard = options?.standard ?? 'bt709';
    const fragmentSrc = STANDARD_TO_FRAGMENT[standard] ?? GRAYSCALE_BT709_FRAG_300ES;
    const snapshot = layer.captureHistory();
    layer.applyEffect({ fragmentSrc });
    if (snapshot) layer.pushHistory(snapshot);
  },
};
