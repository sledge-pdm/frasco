import type { HistoryContextOptions } from '~/layer';
import type { Effect } from '../types';
import { FLIP_FRAG_300ES } from './shaders';

type Options = HistoryContextOptions & {
  flipX?: boolean;
  flipY?: boolean;
};

export const FlipEffect: Effect<Options> = {
  apply(layer, options) {
    const flipX = options?.flipX ? 1 : 0;
    const flipY = options?.flipY ? 1 : 0;

    if (flipX === 0 && flipY === 0) return;

    const snapshot = layer.captureHistory();
    layer.applyEffect({
      fragmentSrc: FLIP_FRAG_300ES,
      uniforms: {
        u_flipX: flipX,
        u_flipY: flipY,
      },
    });
    if (snapshot) layer.pushHistory(snapshot, { context: options?.context });
  },
};
