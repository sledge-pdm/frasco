import { describe, expect, it } from 'vitest';
import { SquareKernel } from '~/grip';
import { Layer } from '~/layer';
import { makeGL2Context, readTexturePixels } from '../../../../support/gl';
import { makePoint } from '../../point';

const SIZE = 32;

type Grid = boolean[][];

function toGrid(pixels: Uint8Array, channel: number): Grid {
  const grid: Grid = [];
  for (let y = 0; y < SIZE; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < SIZE; x++) {
      row.push(pixels[(y * SIZE + x) * 4 + channel] > 0);
    }
    grid.push(row);
  }
  return grid;
}

function drawSegment(from: [number, number], to: [number, number], size: number): Grid {
  const gl = makeGL2Context(SIZE, SIZE);
  const layer = new Layer(gl, { width: SIZE, height: SIZE });
  layer.clear();

  const kernel = new SquareKernel();
  kernel.drawSegment(layer, makePoint(from[0], from[1], size), makePoint(to[0], to[1], size));

  const grid = toGrid(layer.readPixels(), 3);
  layer.dispose();
  return grid;
}

function stampMaskSegment(from: [number, number], to: [number, number], size: number): Grid {
  const gl = makeGL2Context(SIZE, SIZE);
  const layer = new Layer(gl, { width: SIZE, height: SIZE });
  layer.clear();

  const kernel = new SquareKernel();
  const mask = layer.createMaskSurface({ width: SIZE, height: SIZE });
  mask.clear(0);
  kernel.stampMaskSegment(mask, layer, makePoint(from[0], from[1], size), makePoint(to[0], to[1], size));

  const raw = readTexturePixels(gl, mask.getTextureHandle(), { x: 0, y: 0, width: SIZE, height: SIZE });
  const grid = toGrid(raw, 0);
  mask.dispose();
  layer.dispose();
  return grid;
}

/**
 * Collects, for every step along the major axis, the indices painted on the minor axis.
 * A 1px stroke must paint exactly one pixel per major-axis step, and consecutive steps
 * must stay within one pixel of each other, otherwise the stroke has gaps.
 */
function minorIndicesPerMajorStep(grid: Grid, xMajor: boolean): number[][] {
  const steps: number[][] = [];
  for (let major = 0; major < SIZE; major++) {
    const painted: number[] = [];
    for (let minor = 0; minor < SIZE; minor++) {
      const filled = xMajor ? grid[minor][major] : grid[major][minor];
      if (filled) painted.push(minor);
    }
    if (painted.length > 0) steps.push(painted);
  }
  return steps;
}

const cases: Array<{ name: string; from: [number, number]; to: [number, number]; xMajor: boolean }> = [
  { name: 'horizontal', from: [2.5, 4.5], to: [29.5, 4.5], xMajor: true },
  { name: 'vertical', from: [4.5, 2.5], to: [4.5, 29.5], xMajor: false },
  { name: 'diagonal 45deg', from: [2.5, 2.5], to: [29.5, 29.5], xMajor: true },
  { name: 'slope 1/3', from: [1.5, 1.5], to: [28.5, 10.5], xMajor: true },
  { name: 'slope 1/2', from: [1.5, 1.5], to: [29.5, 15.5], xMajor: true },
  { name: 'slope 2/3', from: [1.5, 1.5], to: [28.5, 19.5], xMajor: true },
  { name: 'slope 3 (y major)', from: [1.5, 1.5], to: [10.5, 28.5], xMajor: false },
  { name: 'negative slope 1/3', from: [1.5, 10.5], to: [28.5, 1.5], xMajor: true },
  { name: 'reversed slope 1/3', from: [28.5, 10.5], to: [1.5, 1.5], xMajor: true },
];

function expectConnectedSingleTrack(grid: Grid, xMajor: boolean, expectedSteps: number) {
  const steps = minorIndicesPerMajorStep(grid, xMajor);
  expect(steps.length).toBe(expectedSteps);

  for (const painted of steps) {
    expect(painted).toHaveLength(1);
  }
  for (let i = 1; i < steps.length; i++) {
    expect(Math.abs(steps[i][0] - steps[i - 1][0])).toBeLessThanOrEqual(1);
  }
}

describe('SquareKernel 1px segment connectivity', () => {
  for (const { name, from, to, xMajor } of cases) {
    const expectedSteps = Math.abs(xMajor ? to[0] - from[0] : to[1] - from[1]) + 1;

    it(`drawSegment paints one connected pixel per step for ${name}`, () => {
      expectConnectedSingleTrack(drawSegment(from, to, 1), xMajor, expectedSteps);
    });

    it(`stampMaskSegment paints one connected pixel per step for ${name}`, () => {
      expectConnectedSingleTrack(stampMaskSegment(from, to, 1), xMajor, expectedSteps);
    });
  }
});
