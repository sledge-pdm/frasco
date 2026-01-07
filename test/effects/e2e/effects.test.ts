import { describe, it } from 'vitest';
import { BrightnessContrastEffect, GrayscaleEffect, InvertEffect, PosterizeEffect } from '../../../src/effects';
import { Layer } from '../../../src/layer';
import { expectBufferEqual } from '../../support/assert';
import { E2EImage, loadImageData } from '../../support/e2e';
import { makeGL2Context } from '../../support/gl';

describe('Effects (e2e)', () => {
  const originalUrl = new URL('./original.png', import.meta.url);
  const invertUrl = new URL('./invert.png', import.meta.url);
  const grayscaleBt601Url = new URL('./grayscale_bt601.png', import.meta.url);
  const grayscaleBt709Url = new URL('./grayscale_bt709.png', import.meta.url);
  const brNContNeg50_0Url = new URL('./br_n_cont_-50_0.png', import.meta.url);
  const brNCont0_Neg50Url = new URL('./br_n_cont_0_-50.png', import.meta.url);
  const brNCont30_30Url = new URL('./br_n_cont_30_30.png', import.meta.url);
  const posterize4Url = new URL('./posterize_4.png', import.meta.url);
  const posterize8Url = new URL('./posterize_8.png', import.meta.url);
  const posterize32Url = new URL('./posterize_32.png', import.meta.url);

  async function setup(originalPath: URL, expectedPath: URL): Promise<{ layer: Layer; original: E2EImage; expected: E2EImage }> {
    const original = await loadImageData(originalPath);
    const expected = await loadImageData(expectedPath);

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
    const { layer, expected } = await setup(originalUrl, invertUrl);
    InvertEffect.apply(layer);
    verify(layer, expected);
  });

  it('applies grayscale (bt601)', async () => {
    const { layer, expected } = await setup(originalUrl, grayscaleBt601Url);
    GrayscaleEffect.apply(layer, { standard: 'bt601' });
    verify(layer, expected);
  });

  it('applies grayscale (bt709)', async () => {
    const { layer, expected } = await setup(originalUrl, grayscaleBt709Url);
    GrayscaleEffect.apply(layer, { standard: 'bt709' });
    verify(layer, expected);
  });

  it('applies brightness/contrast (-50, 0)', async () => {
    const { layer, expected } = await setup(originalUrl, brNContNeg50_0Url);
    BrightnessContrastEffect.apply(layer, { brightness: -50, contrast: 0 });
    verify(layer, expected);
  });

  it('applies brightness/contrast (0, -50)', async () => {
    const { layer, expected } = await setup(originalUrl, brNCont0_Neg50Url);
    BrightnessContrastEffect.apply(layer, { brightness: 0, contrast: -50 });
    verify(layer, expected);
  });

  it('applies brightness/contrast (30, 30)', async () => {
    const { layer, expected } = await setup(originalUrl, brNCont30_30Url);
    BrightnessContrastEffect.apply(layer, { brightness: 30, contrast: 30 });
    verify(layer, expected);
  });

  it('applies posterize (4)', async () => {
    const { layer, expected } = await setup(originalUrl, posterize4Url);
    PosterizeEffect.apply(layer, { levels: 4 });
    verify(layer, expected);
  });

  it('applies posterize (8)', async () => {
    const { layer, expected } = await setup(originalUrl, posterize8Url);
    PosterizeEffect.apply(layer, { levels: 8 });
    verify(layer, expected);
  });

  it('applies posterize (32)', async () => {
    const { layer, expected } = await setup(originalUrl, posterize32Url);
    PosterizeEffect.apply(layer, { levels: 32 });
    verify(layer, expected);
  });
});
