import { describe, it } from 'vitest';
import { SquareKernel } from '~/grip2';
import { Layer } from '~/layer';
import { expectBufferEqual } from '../../../../support/assert';
import { loadImageData } from '../../../../support/e2e';
import { makeGL2Context } from '../../../../support/gl';
import { makePoint } from '../../../kernel/point';
import { SegmentType } from '../../../kernel/segment';

const vertFrom: [number, number] = [2.0, 2.0];
const vertTo: [number, number] = [2.0, 5.0];
const horiFrom: [number, number] = [2.0, 2.0];
const horiTo: [number, number] = [5.0, 2.0];
const diaFrom: [number, number] = [2.0, 2.0];
const diaTo: [number, number] = [5.0, 5.0];

async function runStampTest(url: URL, type: SegmentType) {
  const expected = await loadImageData(url);

  const gl = makeGL2Context(expected.width, expected.height);
  const layer = new Layer(gl, { width: expected.width, height: expected.height });
  layer.clear();

  const kernel = new SquareKernel();
  switch (type) {
    case 'vert':
      kernel.drawSegment(layer, makePoint(...vertFrom, 4), makePoint(...vertTo, 4));
      break;
    case 'hori':
      kernel.drawSegment(layer, makePoint(...horiFrom, 4), makePoint(...horiTo, 4));
      break;
    case 'dia':
      kernel.drawSegment(layer, makePoint(...diaFrom, 4), makePoint(...diaTo, 4));
      break;
  }

  const out = layer.exportRaw();
  expectBufferEqual(out, expected.data);
  layer.dispose();
}

describe('SquareKernel stamp 4px', () => {
  const cases4px: Record<SegmentType, URL> = {
    vert: new URL('./7x7_black_4px_vert.png', import.meta.url),
    hori: new URL('./7x7_black_4px_hori.png', import.meta.url),
    dia: new URL('./7x7_black_4px_dia.png', import.meta.url),
  };

  for (const [type, url] of Object.entries(cases4px)) {
    it(`matches ${url.pathname.split('/').at(-1)}`, async () => {
      await runStampTest(url, type as SegmentType);
    });
  }
});
