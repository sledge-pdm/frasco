import { describe, it } from 'vitest';
import { CircleKernel } from '../../../../../src/grip';
import { Layer } from '../../../../../src/layer';
import { expectBufferEqual } from '../../../../support/assert';
import { loadImageData } from '../../../../support/e2e';
import { makeGL2Context } from '../../../../support/gl';
import { makePoint } from '../../point';
import { SegmentType } from '../../segment';

const vertFrom: [number, number] = [1.5, 1.5];
const vertTo: [number, number] = [1.5, 5.5];
const horiFrom: [number, number] = [1.5, 1.5];
const horiTo: [number, number] = [5.5, 1.5];
const diaFrom: [number, number] = [1.5, 1.5];
const diaTo: [number, number] = [5.5, 5.5];

async function runStampTest(url: URL, type: SegmentType) {
  const expected = await loadImageData(url);

  const gl = makeGL2Context(expected.width, expected.height);
  const layer = new Layer(gl, { width: expected.width, height: expected.height });
  layer.clear();

  const kernel = new CircleKernel();
  switch (type) {
    case 'vert':
      kernel.drawSegment(layer, makePoint(...vertFrom, 1), makePoint(...vertTo, 1));
      break;
    case 'hori':
      kernel.drawSegment(layer, makePoint(...horiFrom, 1), makePoint(...horiTo, 1));
      break;
    case 'dia':
      kernel.drawSegment(layer, makePoint(...diaFrom, 1), makePoint(...diaTo, 1));
      break;
  }

  const out = layer.readPixels();
  expectBufferEqual(out, expected.data);
  layer.dispose();
}

describe('CircleKernel stamp 1px', () => {
  const cases1px: Record<SegmentType, URL> = {
    vert: new URL('./7x7_black_1px_vert.png', import.meta.url),
    hori: new URL('./7x7_black_1px_hori.png', import.meta.url),
    dia: new URL('./7x7_black_1px_dia.png', import.meta.url),
  };

  for (const [type, url] of Object.entries(cases1px)) {
    it(`matches ${url.pathname.split('/').at(-1)}`, async () => {
      await runStampTest(url, type as SegmentType);
    });
  }
});

