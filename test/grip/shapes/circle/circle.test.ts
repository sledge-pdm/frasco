import { describe, it } from 'vitest';
import { CircleShape, SimpleCircleShape } from '../../../../src/grip';
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

function makePoint(x: number, y: number, size = 12, opacity = 1): Point {
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

function drawStroke(layer: Layer, shape: CircleShape | SimpleCircleShape, points: Point[]): void {
  const first = points[0];
  if (!first) return;
  shape.start(layer, first);
  for (let i = 1; i < points.length; i++) {
    shape.addPoint(layer, points[i], points[i - 1]);
  }
  shape.end(layer, points[points.length - 1], points[points.length - 2] ?? points[0]);
}

describe('CircleShape', () => {
  it('matches SimpleCircle output at opacity 1', () => {
    const gl = makeGL2Context(256, 256);
    const layerCircle = new Layer(gl, { width: 256, height: 256 });
    const layerSimple = new Layer(gl, { width: 256, height: 256 });
    layerCircle.clear();
    layerSimple.clear();

    const points = [
      makePoint(20, 20),
      makePoint(200, 20),
      makePoint(200, 200),
      makePoint(20, 200),
      makePoint(20, 20),
      makePoint(128, 128),
      makePoint(220, 120),
      makePoint(40, 180),
    ];

    drawStroke(layerCircle, new CircleShape(), points);
    drawStroke(layerSimple, new SimpleCircleShape(), points);

    const outCircle = layerCircle.exportRaw();
    const outSimple = layerSimple.exportRaw();
    expectBufferEqual(outCircle, outSimple);

    layerCircle.dispose();
    layerSimple.dispose();
  });
});
