import type { HistoryContextOptions } from '~/layer';
import type { Effect } from '../types';
import { GAUSSIAN_BLUR_FRAG_300ES } from './shaders';

type Options = HistoryContextOptions & {
  radius?: number;
  alphaMode?: 'skip' | 'blur';
};

export const GaussianBlurEffect: Effect<Options> = {
  apply(layer, options) {
    const radius = options?.radius ?? 1;
    if (radius <= 0) return;
    const alphaMode = options?.alphaMode ?? 'skip';
    const size = layer.getSize();

    const snapshot = layer.captureHistory();
    layer.applyEffect({
      fragmentSrc: GAUSSIAN_BLUR_FRAG_300ES,
      uniforms: {
        u_texel: [1 / size.width, 1 / size.height],
        u_alphaMode: alphaMode === 'blur' ? 1 : 0,
      },
    });
    if (snapshot) layer.pushHistory(snapshot, { context: options?.context });
  },
};
