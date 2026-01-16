import { describe, expect, it } from 'vitest';
import { Layer } from '~/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';

describe('Layer.copyFrom', () => {
  it('copies pixels from another layer', () => {
    const gl = makeGL2Context(2, 2);
    const src = new Layer(gl, { width: 2, height: 2 });
    const dst = new Layer(gl, { width: 2, height: 2 });

    src.clear([0, 0, 255, 255]);
    dst.clear([255, 0, 0, 255]);

    dst.copyFrom(src);

    const out = dst.readPixels();
    expectBufferEqual(out, src.readPixels());

    src.dispose();
    dst.dispose();
  });

  it('throws on size mismatch', () => {
    const gl = makeGL2Context(2, 2);
    const src = new Layer(gl, { width: 2, height: 2 });
    const dst = new Layer(gl, { width: 3, height: 2 });

    expect(() => dst.copyFrom(src)).toThrow('size mismatch');

    src.dispose();
    dst.dispose();
  });
});
