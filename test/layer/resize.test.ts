import { describe, expect, it } from 'vitest';
import { Layer } from '../../src/layer';
import { makeGL2Context } from '../support/gl';

describe('Layer.resize', () => {
  it('updates size and output length', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });

    layer.resize(3, 1);

    expect(layer.getWidth()).toBe(3);
    expect(layer.getHeight()).toBe(1);
    expect(layer.getSize()).toEqual({ width: 3, height: 1 });
    expect(layer.exportRaw().length).toBe(3 * 1 * 4);

    layer.dispose();
  });

  it('throws on invalid size', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });

    expect(() => layer.resize(0, 1)).toThrow('width/height');
    expect(() => layer.resize(1, 0)).toThrow('width/height');

    layer.dispose();
  });
});
