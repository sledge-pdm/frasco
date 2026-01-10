import { describe, it } from 'vitest';
import { CircleKernel } from '../../../../src/grip2';
import { Layer } from '../../../../src/layer';
import { expectBufferEqual } from '../../../support/assert';
import { loadImageData } from '../../../support/e2e';
import { makeGL2Context, readTexturePixels } from '../../../support/gl';

const COLOR_BLACK = [0, 0, 0, 255] as const;

type Point = {
  x: number;
  y: number;
  style: {
    color: typeof COLOR_BLACK;
    size: number;
    opacity: number;
  };
};

function makePoint(x: number, y: number, size: number): Point {
  return {
    x,
    y,
    style: {
      color: COLOR_BLACK,
      size,
      opacity: 1,
    },
  };
}

function maskToAlpha(mask: Uint8Array): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let i = 0; i < mask.length; i += 4) {
    const alpha = mask[i] ? 255 : 0;
    out[i] = 0;
    out[i + 1] = 0;
    out[i + 2] = 0;
    out[i + 3] = alpha;
  }
  return out;
}

async function runMaskTest(url: URL) {
  const expected = await loadImageData(url);
  const size = expected.width - 2;
  const pos = expected.width / 2;

  const gl = makeGL2Context(expected.width, expected.height);
  const layer = new Layer(gl, { width: expected.width, height: expected.height });
  layer.clear();

  const kernel = new CircleKernel();
  const mask = layer.createMaskSurface({ width: expected.width, height: expected.height });
  mask.clear(0);
  kernel.stampMaskPoint(mask, layer, makePoint(pos, pos, size));

  const maskRaw = readTexturePixels(gl, mask.getTextureHandle(), expected.width, expected.height);
  const out = maskToAlpha(maskRaw);
  expectBufferEqual(out, expected.data);

  mask.dispose();
  layer.dispose();
}

describe('CircleKernel mask', () => {
  const cases = [
    new URL('./3x3_black_1px.png', import.meta.url),
    new URL('./4x4_black_2px.png', import.meta.url),
    new URL('./5x5_black_3px.png', import.meta.url),
    new URL('./6x6_black_4px.png', import.meta.url),
    new URL('./7x7_black_5px.png', import.meta.url),
    new URL('./8x8_black_6px.png', import.meta.url),
    new URL('./9x9_black_7px.png', import.meta.url),
  ];

  for (const url of cases) {
    it(`matches ${url.pathname.split('/').at(-1)}`, async () => {
      await runMaskTest(url);
    });
  }
});
