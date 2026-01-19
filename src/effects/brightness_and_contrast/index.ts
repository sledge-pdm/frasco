import type { HistoryContextOptions } from '~/layer';
import type { Effect } from '../types';
import { BRIGHTNESS_CONTRAST_FRAG_300ES } from './shaders';

type Options = HistoryContextOptions & {
  brightness: number;
  contrast: number;
};

export const BrightnessContrastEffect: Effect<Options> = {
  apply(layer, options) {
    const brightness = clamp(options?.brightness ?? 0, -100, 100);
    const contrast = clamp(options?.contrast ?? 0, -100, 100);

    const snapshot = layer.captureHistory();
    layer.applyEffect({
      fragmentSrc: BRIGHTNESS_CONTRAST_FRAG_300ES,
      uniforms: {
        u_brightness: brightness,
        u_contrast: contrast,
      },
    });
    if (snapshot) layer.pushHistory(snapshot, { context: options?.context });
  },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
