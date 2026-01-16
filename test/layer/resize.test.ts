import { describe, expect, it } from 'vitest';
import { Layer } from '~/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';
import { make2x2BottomLeftOriginPattern } from '../support/patterns';

describe('Layer.resizeClear', () => {
  it('updates size and output length', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });

    layer.resizeClear(3, 1);

    expect(layer.getWidth()).toBe(3);
    expect(layer.getHeight()).toBe(1);
    expect(layer.getSize()).toEqual({ width: 3, height: 1 });
    expect(layer.readPixels().length).toBe(3 * 1 * 4);

    layer.dispose();
  });

  it('throws on invalid size', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });

    expect(() => layer.resizeClear(0, 1)).toThrow('width/height');
    expect(() => layer.resizeClear(1, 0)).toThrow('width/height');

    layer.dispose();
  });

  it('preserves pixels when resizing larger', () => {
    const gl = makeGL2Context(2, 2);
    const input = make2x2BottomLeftOriginPattern();
    const layer = new Layer(gl, { width: 2, height: 2, data: input });

    layer.resizePreserve(3, 3);

    const out = layer.readPixels();
    const expected = new Uint8Array(3 * 3 * 4);
    expected.set(input.subarray(0, 2 * 4), 0);
    expected.set(input.subarray(2 * 4, 2 * 2 * 4), 3 * 4);
    expectBufferEqual(out, expected);

    layer.dispose();
  });

  it('preserves pixels with offset', () => {
    const gl = makeGL2Context(2, 2);
    const input = make2x2BottomLeftOriginPattern();
    const layer = new Layer(gl, { width: 2, height: 2, data: input });

    layer.resizePreserve(3, 3, { x: 0, y: 0 }, { x: 1, y: 1 });

    const out = layer.readPixels();
    const expected = new Uint8Array(3 * 3 * 4);
    const outRowBytes = 3 * 4;
    const inRowBytes = 2 * 4;
    expected.set(input.subarray(0, inRowBytes), outRowBytes + 4);
    expected.set(input.subarray(inRowBytes, inRowBytes * 2), outRowBytes * 2 + 4);
    expectBufferEqual(out, expected);

    layer.dispose();
  });
});
