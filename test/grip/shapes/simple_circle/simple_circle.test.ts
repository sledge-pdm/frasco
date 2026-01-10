import { describe, it } from 'vitest';
import { SimpleCircleShape } from '~/grip';
import { Layer } from '~/layer';
import { expectBufferEqual } from '../../../support/assert';
import { makeGL2Context } from '../../../support/gl';

const COLOR_RED = [255, 0, 0, 255] as const;

function makePoint(x: number, y: number) {
  return {
    x,
    y,
    style: {
      color: COLOR_RED,
      size: 1,
    },
  };
}

function setPixel(out: Uint8Array, width: number, x: number, y: number, rgba: readonly number[]) {
  const idx = (x + y * width) * 4;
  out[idx] = rgba[0] ?? 0;
  out[idx + 1] = rgba[1] ?? 0;
  out[idx + 2] = rgba[2] ?? 0;
  out[idx + 3] = rgba[3] ?? 0;
}

function makeLayer(width: number, height: number): Layer {
  const gl = makeGL2Context(width, height);
  const layer = new Layer(gl, { width, height });
  layer.clear();

  return layer;
}

describe('SimpleCircleShape', () => {
  it('draws a single pixel circle', () => {
    const layer = makeLayer(5, 5);

    const shape = new SimpleCircleShape();
    shape.start(layer, makePoint(2, 2));

    const out = layer.exportRaw();
    const expected = new Uint8Array(5 * 5 * 4);
    setPixel(expected, 5, 2, 2, COLOR_RED);

    expectBufferEqual(out, expected);
    layer.dispose();
  });

  // it.fails('draws a single pixel circle in wrong position', () => {
  //   const layer = makeLayer(5, 5);
  //   const shape = new SimpleCircleShape();
  //   shape.start(layer, makePoint(2, 1));

  //   const expected = new Uint8Array(5 * 5 * 4);
  //   setPixel(expected, 5, 2, 2, COLOR_RED);

  //   expectBufferEqual(layer.exportRaw(), expected);
  //   layer.dispose();
  // });

  it('fills gaps with linear completion', () => {
    const layer = makeLayer(5, 5);

    const shape = new SimpleCircleShape();

    shape.start(layer, makePoint(0, 0));
    shape.addPoint(layer, makePoint(4, 0), makePoint(0, 0));

    const expected = new Uint8Array(5 * 5 * 4);
    for (let x = 0; x < 5; x++) {
      setPixel(expected, 5, x, 0, COLOR_RED);
    }

    expectBufferEqual(layer.exportRaw(), expected);
    layer.dispose();
  });

  it('fills gaps with linear completion (diagonal)', () => {
    const layer = makeLayer(5, 5);

    const shape = new SimpleCircleShape();

    shape.start(layer, makePoint(0, 0));
    shape.addPoint(layer, makePoint(4, 4), makePoint(0, 0));

    const expected = new Uint8Array(5 * 5 * 4);
    for (let c = 0; c < 5; c++) {
      setPixel(expected, 5, c, c, COLOR_RED);
    }

    expectBufferEqual(layer.exportRaw(), expected);
    layer.dispose();
  });
});
