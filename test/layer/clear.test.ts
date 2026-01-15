import { describe, it } from 'vitest';
import { Layer } from '../../src/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';

describe('Layer.clear', () => {
  it('fills texture with the given color', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });

    layer.clear([255, 0, 0, 255]);

    const raw = layer.readPixels();
    const expected = new Uint8Array([255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255, 255, 0, 0, 255]);
    expectBufferEqual(raw, expected);

    layer.dispose();
  });
});

