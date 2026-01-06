import { describe, expect, it } from 'vitest';
import { BlendMode, Frasco, Layer } from '../../index';
import { createTexture, makeGL2Context, readTexturePixels } from '../support/gl';

describe('Frasco.compose', () => {
  it('blends two layers with normal mode and opacity', () => {
    const gl = makeGL2Context(1, 1);
    const frasco = new Frasco(gl, { size: { width: 1, height: 1 } });

    const base = new Layer(gl, { width: 1, height: 1 });
    base.clear([255, 0, 0, 255]);
    const top = new Layer(gl, { width: 1, height: 1 });
    top.clear([0, 0, 255, 255]);

    const target = createTexture(gl, 1, 1);
    frasco.compose(
      [
        { texture: base.getTextureHandle(), opacity: 1, blendMode: BlendMode.normal },
        { texture: top.getTextureHandle(), opacity: 0.5, blendMode: BlendMode.normal },
      ],
      { target }
    );

    const pixels = readTexturePixels(gl, target, 1, 1);
    expectColor(pixels, [128, 0, 128, 255]);
  });

  it('skips disabled layers', () => {
    const gl = makeGL2Context(1, 1);
    const frasco = new Frasco(gl, { size: { width: 1, height: 1 } });

    const base = new Layer(gl, { width: 1, height: 1 });
    base.clear([0, 255, 0, 255]);
    const top = new Layer(gl, { width: 1, height: 1 });
    top.clear([255, 0, 0, 255]);

    const target = createTexture(gl, 1, 1);
    frasco.compose(
      [
        { texture: base.getTextureHandle(), opacity: 1, blendMode: BlendMode.normal },
        { texture: top.getTextureHandle(), opacity: 1, blendMode: BlendMode.normal, enabled: false },
      ],
      { target }
    );

    const pixels = readTexturePixels(gl, target, 1, 1);
    expectColor(pixels, [0, 255, 0, 255]);
  });

  it('applies multiply blend mode', () => {
    const gl = makeGL2Context(1, 1);
    const frasco = new Frasco(gl, { size: { width: 1, height: 1 } });

    const base = new Layer(gl, { width: 1, height: 1 });
    base.clear([128, 64, 32, 255]);
    const top = new Layer(gl, { width: 1, height: 1 });
    top.clear([128, 128, 128, 255]);

    const target = createTexture(gl, 1, 1);
    frasco.compose(
      [
        { texture: base.getTextureHandle(), opacity: 1, blendMode: BlendMode.normal },
        { texture: top.getTextureHandle(), opacity: 1, blendMode: BlendMode.multiply },
      ],
      { target }
    );

    const pixels = readTexturePixels(gl, target, 1, 1);
    expectColor(pixels, [64, 32, 16, 255]);
  });

  it('renders baseColor when layers are empty', () => {
    const gl = makeGL2Context(1, 1);
    const frasco = new Frasco(gl, { size: { width: 1, height: 1 } });
    const target = createTexture(gl, 1, 1);

    frasco.compose([], { target, baseColor: [1, 1, 1, 1] });

    const pixels = readTexturePixels(gl, target, 1, 1);
    expectColor(pixels, [255, 255, 255, 255]);
  });
});

function expectColor(pixels: Uint8Array, expected: [number, number, number, number]) {
  expectClose(pixels[0], expected[0]);
  expectClose(pixels[1], expected[1]);
  expectClose(pixels[2], expected[2]);
  expectClose(pixels[3], expected[3]);
}

function expectClose(value: number, expected: number, tolerance = 2) {
  expect(Math.abs(value - expected)).toBeLessThanOrEqual(tolerance);
}
