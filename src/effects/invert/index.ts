import type { Effect } from '../types';
import { INVERT_FRAG_300ES } from './shaders';

type Options = void;

export const InvertEffect: Effect<Options> = {
  apply(layer) {
    const snapshot = layer.captureHistory();
    layer.applyEffect({ fragmentSrc: INVERT_FRAG_300ES });
    if (snapshot) layer.pushHistory(snapshot);
  },
};
