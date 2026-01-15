import { describe, it } from 'vitest';
import { CircleKernel, GripPoint, LinePreviewInstrument } from '../../../src/grip';
import { Layer } from '../../../src/layer';
import { expectBufferEqual } from '../../support/assert';
import { makeGL2Context } from '../../support/gl';

const COLOR_RED = [255, 0, 0, 255] as const;

function makePoint(x: number, y: number, size: number, opacity = 1): GripPoint {
  return {
    x,
    y,
    style: {
      color: COLOR_RED,
      size,
      opacity,
    },
  };
}

function makeLayer(width: number, height: number): Layer {
  const gl = makeGL2Context(width, height);
  const layer = new Layer(gl, { width, height });
  layer.clear();
  return layer;
}

function renderSegment(kernel: CircleKernel, from: GripPoint, to: GripPoint, width: number, height: number): Uint8Array {
  const layer = makeLayer(width, height);
  kernel.drawSegment(layer, from, to);
  const out = layer.readPixels();
  layer.dispose();
  return out;
}

describe('LinePreviewInstrument', () => {
  it('updates preview to latest segment', () => {
    const kernel = new CircleKernel();
    const instrument = new LinePreviewInstrument();
    const layer = makeLayer(9, 9);

    const start = makePoint(1.5, 1.5, 3, 1);
    const mid = makePoint(6.5, 1.5, 3, 1);
    const end = makePoint(6.5, 6.5, 3, 1);

    instrument.start(layer, kernel, start);
    instrument.addPoint(layer, kernel, mid);
    expectBufferEqual(layer.readPixels(), renderSegment(kernel, start, mid, 9, 9));

    instrument.addPoint(layer, kernel, end);
    expectBufferEqual(layer.readPixels(), renderSegment(kernel, start, end, 9, 9));

    instrument.end(layer, kernel, end);
    expectBufferEqual(layer.readPixels(), renderSegment(kernel, start, end, 9, 9));
    layer.dispose();
  });
});

