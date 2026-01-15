import { describe, it } from 'vitest';
import { CircleKernel, DirectStrokeInstrument, GripPoint } from '../../../src/grip';
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

function drawStrokeDirect(layer: Layer, kernel: CircleKernel, points: GripPoint[]): void {
  const first = points[0];
  if (!first) return;
  kernel.drawPoint(layer, first);
  for (let i = 1; i < points.length - 1; i++) {
    kernel.drawSegment(layer, points[i - 1], points[i]);
    kernel.drawPoint(layer, points[i]);
  }
  const last = points[points.length - 1] ?? first;
  const prev = points[points.length - 2] ?? first;
  kernel.drawSegment(layer, prev, last);
  kernel.drawPoint(layer, last);
}

function drawStrokeInstrument(layer: Layer, kernel: CircleKernel, points: GripPoint[]): void {
  const first = points[0];
  if (!first) return;
  const instrument = new DirectStrokeInstrument();
  instrument.start(layer, kernel, first);
  for (let i = 1; i < points.length - 1; i++) {
    instrument.addPoint(layer, kernel, points[i], points[i - 1]);
  }
  const last = points[points.length - 1] ?? first;
  const prev = points[points.length - 2] ?? first;
  instrument.end(layer, kernel, last, prev);
}

describe('DirectStrokeInstrument', () => {
  it('matches manual kernel drawing', () => {
    const kernel = new CircleKernel();
    const points = [makePoint(1.5, 1.5, 3), makePoint(6.5, 1.5, 3), makePoint(6.5, 6.5, 3)];

    const layerInstrument = makeLayer(9, 9);
    drawStrokeInstrument(layerInstrument, kernel, points);

    const layerManual = makeLayer(9, 9);
    drawStrokeDirect(layerManual, kernel, points);

    expectBufferEqual(layerInstrument.readPixels(), layerManual.readPixels());
    layerInstrument.dispose();
    layerManual.dispose();
  });
});

