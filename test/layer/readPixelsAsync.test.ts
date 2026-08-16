import { describe, expect, it } from 'vitest';
import { Layer } from '~/layer';
import { readTexturePixelsAsync } from '~/utils';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';

function makePattern(width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (x + y * width) * 4;
      out[idx] = (x * 37) % 256;
      out[idx + 1] = (y * 53) % 256;
      out[idx + 2] = (x + y) % 256;
      out[idx + 3] = 255;
    }
  }
  return out;
}

describe('Layer.readPixelsAsync', () => {
  it('returns what the synchronous read returns', async () => {
    const gl = makeGL2Context(8, 8);
    const layer = new Layer(gl, { width: 8, height: 8, data: makePattern(8, 8) });

    expectBufferEqual(await layer.readPixelsAsync(), layer.readPixels());

    layer.dispose();
  });

  it('matches the synchronous read when flipping', async () => {
    const gl = makeGL2Context(8, 8);
    const layer = new Layer(gl, { width: 8, height: 8, data: makePattern(8, 8) });

    // the flip happens on the GPU here and on the CPU there; the bytes have to come out the same
    expectBufferEqual(await layer.readPixelsAsync({ flipY: true }), layer.readPixels({ flipY: true }));

    layer.dispose();
  });

  it('matches the synchronous read for a sub-region', async () => {
    const gl = makeGL2Context(8, 8);
    const layer = new Layer(gl, { width: 8, height: 8, data: makePattern(8, 8) });
    const bounds = { x: 2, y: 3, width: 4, height: 4 };

    expectBufferEqual(await layer.readPixelsAsync({ bounds }), layer.readPixels({ bounds }));
    expectBufferEqual(await layer.readPixelsAsync({ bounds, flipY: true }), layer.readPixels({ bounds, flipY: true }));

    layer.dispose();
  });

  it('sees writes queued before it', async () => {
    const gl = makeGL2Context(8, 8);
    const layer = new Layer(gl, { width: 8, height: 8 });
    const pattern = makePattern(8, 8);
    layer.writePixels(pattern);

    expectBufferEqual(await layer.readPixelsAsync(), pattern);

    layer.dispose();
  });

  it('captures the pixels as they were when the read was queued', async () => {
    const gl = makeGL2Context(8, 8);
    const layer = new Layer(gl, { width: 8, height: 8, data: makePattern(8, 8) });
    const before = layer.readPixels();

    // the read is queued first, so what lands after it must not leak into the result
    const pending = layer.readPixelsAsync();
    layer.clear([255, 0, 0, 255]);

    expectBufferEqual(await pending, before);

    layer.dispose();
  });

  it('runs several reads at once without mixing them up', async () => {
    const gl = makeGL2Context(8, 8);
    const a = new Layer(gl, { width: 8, height: 8, data: makePattern(8, 8) });
    const b = new Layer(gl, { width: 8, height: 8 });
    b.clear([1, 2, 3, 4]);

    const [readA, readB] = await Promise.all([a.readPixelsAsync(), b.readPixelsAsync()]);

    expectBufferEqual(readA, a.readPixels());
    expectBufferEqual(readB, b.readPixels());

    a.dispose();
    b.dispose();
  });

  it('leaves the bound framebuffer alone', async () => {
    const gl = makeGL2Context(8, 8);
    const layer = new Layer(gl, { width: 8, height: 8, data: makePattern(8, 8) });
    const fbo = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    await layer.readPixelsAsync({ flipY: true });

    expect(gl.getParameter(gl.FRAMEBUFFER_BINDING)).toBe(fbo);
    expect(gl.getParameter(gl.PIXEL_PACK_BUFFER_BINDING)).toBe(null);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.deleteFramebuffer(fbo);
    layer.dispose();
  });
});

describe('readTexturePixelsAsync', () => {
  it('reads a standalone texture', async () => {
    const gl = makeGL2Context(8, 8);
    const layer = new Layer(gl, { width: 8, height: 8, data: makePattern(8, 8) });
    const texture = layer.copyTexture();

    const out = await readTexturePixelsAsync(gl, texture, { x: 0, y: 0, width: 8, height: 8 });
    expectBufferEqual(out, layer.readPixels());

    gl.deleteTexture(texture);
    layer.dispose();
  });
});
