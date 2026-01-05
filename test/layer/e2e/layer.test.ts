import { describe, it } from 'vitest';
import { Layer } from '../../../src/layer';
import { expectBufferEqual } from '../../support/assert';
import { loadImageData } from '../../support/e2e';
import { makeGL2Context } from '../../support/gl';

describe('Layer (e2e)', () => {
  it('compares exportRaw() with original image', async () => {
    const original = await loadImageData(new URL('./original.webp', import.meta.url));

    const gl = makeGL2Context(original.width, original.height);
    const layer = new Layer(gl, {
      width: original.width,
      height: original.height,
      data: original.data,
    });

    const out = layer.exportRaw();
    expectBufferEqual(out, original.data);

    layer.dispose();
  });

  it('compares exportRaw({ flipY: true }) with yFlipped image', async () => {
    const original = await loadImageData(new URL('./original.webp', import.meta.url));
    const yFlipped = await loadImageData(new URL('./yFlipped.webp', import.meta.url));

    const gl = makeGL2Context(original.width, original.height);
    const layer = new Layer(gl, {
      width: original.width,
      height: original.height,
      data: original.data,
    });

    const out = layer.exportRaw({ flipY: true });
    expectBufferEqual(out, yFlipped.data);

    layer.dispose();
  });
});
