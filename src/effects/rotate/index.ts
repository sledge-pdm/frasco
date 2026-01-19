import type { HistoryContextOptions } from '~/layer';
import type { Effect } from '../types';
import { ROTATE_90_FRAG_300ES } from './shaders';

type Options = HistoryContextOptions & {
  direction?: 'cw' | 'ccw';
  silentHistory?: boolean;
};

export const Rotate90Effect: Effect<Options> = {
  apply(layer, options) {
    const direction = options?.direction ?? 'cw';
    const dir = direction === 'ccw' ? -1 : 1;
    const size = layer.getSize();
    const nextSize = { width: size.height, height: size.width };

    const snapshot = layer.captureHistory();
    layer.applyEffectResized(
      {
        fragmentSrc: ROTATE_90_FRAG_300ES,
        uniforms: {
          u_dir: dir,
        },
      },
      nextSize
    );
    if (snapshot) layer.pushHistory(snapshot, { silent: options?.silentHistory, context: options?.context });
  },
};
