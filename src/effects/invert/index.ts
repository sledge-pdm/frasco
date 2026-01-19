import type { HistoryContextOptions } from '~/layer';
import type { Effect } from '../types';
import { INVERT_FRAG_300ES } from './shaders';

type Options = HistoryContextOptions;

export const InvertEffect: Effect<Options> = {
  apply(layer, options) {
    const snapshot = layer.captureHistory();
    layer.applyEffect({ fragmentSrc: INVERT_FRAG_300ES });
    if (snapshot) layer.pushHistory(snapshot, { context: options?.context });
  },
};
