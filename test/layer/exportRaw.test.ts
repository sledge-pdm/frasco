import { describe, it } from 'vitest';
import { Layer } from '../../src/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';
import { make2x2BottomLeftOriginPattern, make2x2TopLeftOriginPattern } from '../support/patterns';

describe('Layer.exportRaw', () => {
  it('returns bottom-left-origin pixels without flipY', () => {
    const gl = makeGL2Context(2, 2);
    const input = make2x2BottomLeftOriginPattern();
    const layer = new Layer(gl, { width: 2, height: 2, data: input });

    const out = layer.exportRaw();

    expectBufferEqual(out, input);
    layer.dispose();
  });

  it('returns top-left-origin pixels with flipY', () => {
    const gl = makeGL2Context(2, 2);
    const input = make2x2BottomLeftOriginPattern();
    const layer = new Layer(gl, { width: 2, height: 2, data: input });

    const out = layer.exportRaw({ flipY: true });

    const expected = make2x2TopLeftOriginPattern();
    expectBufferEqual(out, expected);
    layer.dispose();
  });
});
