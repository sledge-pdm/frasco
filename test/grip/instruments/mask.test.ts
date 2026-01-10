import { describe, expect, it } from 'vitest';
import { GripPoint, MaskStrokeInstrument, SquareKernel } from '../../../src/grip2';
import { Layer } from '../../../src/layer';
import { expectBufferEqual } from '../../support/assert';
import { makeGL2Context } from '../../support/gl';

const COLOR_RED = [255, 0, 0, 255] as const;

function makePoint(x: number, y: number, size: number, opacity: number): GripPoint {
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

function drawStrokeInstrument(layer: Layer, kernel: SquareKernel, points: GripPoint[], instrument: MaskStrokeInstrument): void {
  const first = points[0];
  if (!first) return;
  instrument.start(layer, kernel, first);
  for (let i = 1; i < points.length - 1; i++) {
    instrument.addPoint(layer, kernel, points[i], points[i - 1]);
  }
  const last = points[points.length - 1] ?? first;
  const prev = points[points.length - 2] ?? first;
  instrument.end(layer, kernel, last, prev);
}

function drawStrokeDirect(layer: Layer, kernel: SquareKernel, points: GripPoint[]): void {
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

describe('MaskStrokeInstrument', () => {
  it('matches direct output when opacity is 1', () => {
    const kernel = new SquareKernel();
    const points = [makePoint(2.5, 2.5, 3, 1), makePoint(7.5, 2.5, 3, 1), makePoint(7.5, 7.5, 3, 1)];

    const layerMask = makeLayer(10, 10);
    drawStrokeInstrument(layerMask, kernel, points, new MaskStrokeInstrument());

    const layerDirect = makeLayer(10, 10);
    drawStrokeDirect(layerDirect, kernel, points);

    expectBufferEqual(layerMask.exportRaw(), layerDirect.exportRaw());
    layerMask.dispose();
    layerDirect.dispose();
  });

  it('prevents opacity accumulation on overlap', () => {
    const kernel = new SquareKernel();
    const points = [makePoint(2.5, 2.5, 3, 0.5), makePoint(7.5, 2.5, 3, 0.5), makePoint(2.5, 2.5, 3, 0.5)];

    const layerMask = makeLayer(10, 10);
    drawStrokeInstrument(layerMask, kernel, points, new MaskStrokeInstrument());

    const layerDirect = makeLayer(10, 10);
    drawStrokeDirect(layerDirect, kernel, points);

    const maskOut = layerMask.exportRaw();
    const directOut = layerDirect.exportRaw();

    let hasMask = false;
    let hasAccumulation = false;
    for (let i = 0; i < maskOut.length; i += 4) {
      const ma = maskOut[i + 3];
      const da = directOut[i + 3];
      if (ma > 0) hasMask = true;
      if (da > ma) {
        hasAccumulation = true;
        break;
      }
    }

    expect(hasMask).toBe(true);
    expect(hasAccumulation).toBe(true);
    layerMask.dispose();
    layerDirect.dispose();
  });
});
