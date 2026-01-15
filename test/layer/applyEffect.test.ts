import { describe, expect, it } from 'vitest';
import { COPY_FRAG_300ES, Layer, SOLID_FRAG_300ES } from '../../src/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';
import { make2x2BottomLeftOriginPattern } from '../support/patterns';

describe('Layer.applyEffect', () => {
  it('copies pixels with COPY shader', () => {
    const gl = makeGL2Context(2, 2);
    const input = make2x2BottomLeftOriginPattern();
    const layer = new Layer(gl, { width: 2, height: 2, data: input });

    layer.applyEffect({ fragmentSrc: COPY_FRAG_300ES });

    const out = layer.readPixels();
    expectBufferEqual(out, input);
    layer.dispose();
  });

  it('applies uniform values', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });

    layer.applyEffect({
      fragmentSrc: SOLID_FRAG_300ES,
      uniforms: { u_color: [0, 1, 0, 1] },
    });

    const out = layer.readPixels();
    const expected = new Uint8Array([0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255, 0, 255]);
    expectBufferEqual(out, expected);

    layer.dispose();
  });

  it('throws on unsupported uniform length', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });

    expect(() => {
      layer.applyEffect({
        fragmentSrc: SOLID_FRAG_300ES,
        uniforms: { u_color: [1, 2, 3, 4, 5] },
      });
    }).toThrow('unsupported uniform length');

    layer.dispose();
  });
});

