import { describe, expect, it } from 'vitest';
import { Layer } from '../../src/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';
import { make2x2BottomLeftOriginPattern } from '../support/patterns';

describe('Layer.writePixels', () => {
  it('replaces texture contents with the given buffer', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });

    const input = make2x2BottomLeftOriginPattern();
    layer.writePixels(input);

    const out = layer.readPixels();
    expectBufferEqual(out, input);
    layer.dispose();
  });

  it('throws on size mismatch', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });

    const bad = new Uint8Array(3);
    expect(() => layer.writePixels(bad)).toThrow('buffer length');

    layer.dispose();
  });
});


