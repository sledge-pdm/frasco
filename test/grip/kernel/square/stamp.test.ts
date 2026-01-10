import { describe, it } from 'vitest';
import { SquareKernel } from '~/grip';
import { Layer } from '~/layer';
import { expectBufferEqual } from '../../../support/assert';
import { loadImageData } from '../../../support/e2e';
import { makeGL2Context } from '../../../support/gl';
import { makePoint } from '../../kernel/point';

async function runStampTest(url: URL) {
  const expected = await loadImageData(url);
  const size = expected.width - 2;
  const pos = expected.width / 2;

  const gl = makeGL2Context(expected.width, expected.height);
  const layer = new Layer(gl, { width: expected.width, height: expected.height });
  layer.clear();

  const kernel = new SquareKernel();
  kernel.drawPoint(layer, makePoint(pos, pos, size));

  const out = layer.exportRaw();
  expectBufferEqual(out, expected.data);
  layer.dispose();
}

describe('SquareKernel stamp', () => {
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
      await runStampTest(url);
    });
  }
});
