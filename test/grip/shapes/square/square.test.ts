import { describe, it } from 'vitest';
import { Grip, SquareShape } from '../../../../src/grip';
import { Layer } from '../../../../src/layer';
import { expectBufferEqual } from '../../../support/assert';
import { makeGL2Context } from '../../../support/gl';

const COLOR_RED = [255, 0, 0, 255] as const;

type Point = {
  x: number;
  y: number;
  style: {
    color: typeof COLOR_RED;
    size: number;
    opacity: number;
  };
};

function makePoint(x: number, y: number, size: number): Point {
  return {
    x,
    y,
    style: {
      color: COLOR_RED,
      size,
      opacity: 1,
    },
  };
}

function makeLayer(width: number, height: number): Layer {
  const gl = makeGL2Context(width, height);
  const layer = new Layer(gl, { width, height });
  layer.clear();
  return layer;
}

function setPixel(out: Uint8Array, width: number, x: number, y: number, rgba: readonly number[]) {
  const idx = (x + y * width) * 4;
  out[idx] = rgba[0] ?? 0;
  out[idx + 1] = rgba[1] ?? 0;
  out[idx + 2] = rgba[2] ?? 0;
  out[idx + 3] = rgba[3] ?? 0;
}

function setBlock(out: Uint8Array, width: number, x0: number, y0: number, x1: number, y1: number, rgba: readonly number[]) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      setPixel(out, width, x, y, rgba);
    }
  }
}

function drawPoint(layer: Layer, point: Point): void {
  const shape = new SquareShape();
  shape.start(layer, point);
  shape.end(layer, point, point);
}

describe('SquareShape', () => {
  it('draws a single pixel when size is 1', () => {
    const layer = makeLayer(6, 6);
    drawPoint(layer, makePoint(2, 2, 1));

    const expected = new Uint8Array(6 * 6 * 4);
    setPixel(expected, 6, 2, 2, COLOR_RED);

    expectBufferEqual(layer.exportRaw(), expected);
    layer.dispose();
  });

  it('draws a 2x2 square aligned to a grid point when size is 2', () => {
    const layer = makeLayer(6, 6);
    drawPoint(layer, makePoint(2, 2, 2));

    const expected = new Uint8Array(6 * 6 * 4);
    setBlock(expected, 6, 1, 1, 2, 2, COLOR_RED);

    expectBufferEqual(layer.exportRaw(), expected);
    layer.dispose();
  });

  it('draws a 3x3 square aligned to pixel centers when size is 3', () => {
    const layer = makeLayer(6, 6);
    drawPoint(layer, makePoint(2, 2, 3));

    const expected = new Uint8Array(6 * 6 * 4);
    setBlock(expected, 6, 1, 1, 3, 3, COLOR_RED);

    expectBufferEqual(layer.exportRaw(), expected);
    layer.dispose();
  });

  it('keeps fractional canvas coordinates when using Grip', () => {
    const layer = makeLayer(6, 6);
    const grip = new Grip({ inputSpace: 'canvas' });
    const shape = new SquareShape();
    const point = makePoint(2.25, 3, 2);

    grip.start(layer, shape, point);
    grip.end(point);

    const expected = new Uint8Array(6 * 6 * 4);
    setBlock(expected, 6, 2, 1, 2, 2, COLOR_RED);

    expectBufferEqual(layer.exportRaw(), expected);
    layer.dispose();
  });
});
