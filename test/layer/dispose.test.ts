import { describe, expect, it } from 'vitest';
import { Layer } from '~/layer';
import { makeGL2Context } from '../support/gl';

describe('Layer.dispose', () => {
  it('throws when using the layer after dispose', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });

    layer.dispose();

    expect(() => layer.clear([0, 0, 0, 0])).toThrow('disposed');
    expect(() => layer.getTextureHandle()).toThrow('disposed');
  });
});
