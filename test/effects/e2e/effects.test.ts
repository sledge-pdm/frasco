import { describe, it } from 'vitest';
import { BrightnessContrastEffect, GrayscaleEffect, InvertEffect, PosterizeEffect } from '../../../src/effects';
import { Layer } from '../../../src/layer';
import { expectBufferEqual } from '../../support/assert';
import { E2EImage, loadImageData } from '../../support/e2e';
import { makeGL2Context } from '../../support/gl';

describe('Effects (e2e)', () => {
  async function setup(originalPath: string, expectedPath: string): Promise<{ layer: Layer; original: E2EImage; expected: E2EImage }> {
    const original = await loadImageData(new URL(originalPath, import.meta.url));
    const expected = await loadImageData(new URL(expectedPath, import.meta.url));

    const gl = makeGL2Context(original.width, original.height);
    const layer = new Layer(gl, {
      width: original.width,
      height: original.height,
      data: original.data,
    });

    return { layer, original, expected };
  }

  function verify(layer: Layer, expected: E2EImage) {
    const out = layer.exportRaw();
    expectBufferEqual(out, expected.data);

    layer.dispose();
  }

  it('applies invert', async () => {
    const { layer, expected } = await setup('./original.png', './invert.png');
    InvertEffect.apply(layer);
    verify(layer, expected);
  });

  it('applies grayscale (bt601)', async () => {
    const { layer, expected } = await setup('./original.png', './grayscale_bt601.png');
    GrayscaleEffect.apply(layer, { standard: 'bt601' });
    verify(layer, expected);
  });

  it('applies grayscale (bt709)', async () => {
    const { layer, expected } = await setup('./original.png', './grayscale_bt709.png');
    GrayscaleEffect.apply(layer, { standard: 'bt709' });
    verify(layer, expected);
  });

  it('applies brightness/contrast (-50, 0)', async () => {
    const { layer, expected } = await setup('./original.png', './br_n_cont_-50_0.png');
    BrightnessContrastEffect.apply(layer, { brightness: -50, contrast: 0 });
    verify(layer, expected);
  });

  it('applies brightness/contrast (0, -50)', async () => {
    const { layer, expected } = await setup('./original.png', './br_n_cont_0_-50.png');
    BrightnessContrastEffect.apply(layer, { brightness: 0, contrast: -50 });
    verify(layer, expected);
  });

  it('applies brightness/contrast (30, 30)', async () => {
    const { layer, expected } = await setup('./original.png', './br_n_cont_30_30.png');
    BrightnessContrastEffect.apply(layer, { brightness: 30, contrast: 30 });
    verify(layer, expected);
  });

  it('applies posterize (4)', async () => {
    const { layer, expected } = await setup('./original.png', './posterize_4.png');
    PosterizeEffect.apply(layer, { levels: 4 });
    verify(layer, expected);
  });

  it('applies posterize (8)', async () => {
    const { layer, expected } = await setup('./original.png', './posterize_8.png');
    PosterizeEffect.apply(layer, { levels: 8 });
    verify(layer, expected);
  });

  it('applies posterize (32)', async () => {
    const { layer, expected } = await setup('./original.png', './posterize_32.png');
    PosterizeEffect.apply(layer, { levels: 32 });
    verify(layer, expected);
  });
});
