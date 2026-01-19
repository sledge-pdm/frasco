import { describe, expect, it } from 'vitest';
import { BrightnessContrastEffect, FlipEffect, GrayscaleEffect, InvertEffect, PosterizeEffect, Rotate90Effect } from '~/effects';
import { TextureHistoryBackend } from '~/history';
import { Layer } from '~/layer';
import { expectBufferEqual } from '../../support/assert';
import { E2EImage, loadImageData } from '../../support/e2e';
import { makeGL2Context } from '../../support/gl';

interface EffectCase {
  apply: (layer: Layer) => void;
  expectedUrl: URL;
  repeats?: number;
}

describe('Effects (e2e)', () => {
  const cases: Record<string, EffectCase> = {
    invert: {
      apply: (l) => InvertEffect.apply(l),
      expectedUrl: new URL('./invert.png', import.meta.url),
    },
    'grayscale (bt601)': {
      apply: (l) => GrayscaleEffect.apply(l, { standard: 'bt601' }),
      expectedUrl: new URL('./grayscale_bt601.png', import.meta.url),
    },
    'grayscale (bt709)': {
      apply: (l) => GrayscaleEffect.apply(l, { standard: 'bt709' }),
      expectedUrl: new URL('./grayscale_bt709.png', import.meta.url),
    },
    'brightness/contrast (-50, 0)': {
      apply: (l) => BrightnessContrastEffect.apply(l, { brightness: -50, contrast: 0 }),
      expectedUrl: new URL('./br_n_cont_-50_0.png', import.meta.url),
    },
    'brightness/contrast (0, -50)': {
      apply: (l) => BrightnessContrastEffect.apply(l, { brightness: 0, contrast: -50 }),
      expectedUrl: new URL('./br_n_cont_0_-50.png', import.meta.url),
    },
    'brightness/contrast (30, 30)': {
      apply: (l) => BrightnessContrastEffect.apply(l, { brightness: 30, contrast: 30 }),
      expectedUrl: new URL('./br_n_cont_30_30.png', import.meta.url),
    },
    'posterize (4)': {
      apply: (l) => PosterizeEffect.apply(l, { levels: 4 }),
      expectedUrl: new URL('./posterize_4.png', import.meta.url),
    },
    'posterize (8)': {
      apply: (l) => PosterizeEffect.apply(l, { levels: 8 }),
      expectedUrl: new URL('./posterize_8.png', import.meta.url),
    },
    'posterize (32)': {
      apply: (l) => PosterizeEffect.apply(l, { levels: 32 }),
      expectedUrl: new URL('./posterize_32.png', import.meta.url),
    },
    'flip (x)': {
      apply: (l) => FlipEffect.apply(l, { flipX: true }),
      expectedUrl: new URL('./flip_x.png', import.meta.url),
    },
    'flip (y)': {
      apply: (l) => FlipEffect.apply(l, { flipY: true }),
      expectedUrl: new URL('./flip_y.png', import.meta.url),
    },
    'flip (xy)': {
      apply: (l) => FlipEffect.apply(l, { flipX: true, flipY: true }),
      expectedUrl: new URL('./flip_xy.png', import.meta.url),
    },
    'rotate (90)': {
      apply: (l) => Rotate90Effect.apply(l, { direction: 'cw' }),
      expectedUrl: new URL('./rotate_90.png', import.meta.url),
    },
    'rotate (180)': {
      apply: (l) => Rotate90Effect.apply(l, { direction: 'cw' }),
      expectedUrl: new URL('./rotate_180.png', import.meta.url),
      repeats: 2,
    },
    'rotate (270)': {
      apply: (l) => Rotate90Effect.apply(l, { direction: 'ccw' }),
      expectedUrl: new URL('./rotate_270.png', import.meta.url),
    },
  };

  const originalUrl = new URL('./original.png', import.meta.url);

  async function setup(originalPath: URL, expectedPath: URL): Promise<{ layer: Layer; original: E2EImage; expected: E2EImage }> {
    const original = await loadImageData(originalPath);
    const expected = await loadImageData(expectedPath);

    const gl = makeGL2Context(original.width, original.height);
    const layer = new Layer(gl, {
      width: original.width,
      height: original.height,
      data: original.data,
    });
    layer.setHistoryBackend(new TextureHistoryBackend());

    return { layer, original, expected };
  }

  function verifyPixels(layer: Layer, expected: E2EImage) {
    const out = layer.readPixels();
    expectBufferEqual(out, expected.data);
  }

  function verifySize(layer: Layer, expected: E2EImage) {
    expect(layer.getSize()).toEqual({ width: expected.width, height: expected.height });
  }

  Object.entries(cases).forEach(([name, effectCase]) => {
    it(`applies ${name}`, async () => {
      const { layer, original, expected } = await setup(originalUrl, effectCase.expectedUrl);
      const rep = effectCase.repeats ?? 1;
      for (let i = 0; i < rep; i++) effectCase.apply(layer);
      verifyPixels(layer, expected);
      verifySize(layer, expected);

      for (let i = 0; i < rep; i++) layer.undo();
      verifyPixels(layer, original);
      verifySize(layer, original);

      for (let i = 0; i < rep; i++) layer.redo();
      verifyPixels(layer, expected);
      verifySize(layer, expected);

      layer.dispose();
    });
  });
});
