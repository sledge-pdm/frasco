import { describe, it } from 'vitest';
import { TextureHistoryBackend } from '../../src/history';
import { Layer } from '../../src/layer';
import { LayerThumbnail } from '../../src/thumbnail';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';
import { make2x2BottomLeftOriginPattern, make2x2TopLeftOriginPattern } from '../support/patterns';

function makeBlockPattern4x4(): Uint8Array {
  const width = 4;
  const height = 4;
  const out = new Uint8Array(width * height * 4);
  const colors: Record<string, [number, number, number, number]> = {
    red: [255, 0, 0, 255],
    green: [0, 255, 0, 255],
    blue: [0, 0, 255, 255],
    white: [255, 255, 255, 255],
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (x + y * width) * 4;
      const blockX = x < 2 ? 0 : 1;
      const blockY = y < 2 ? 0 : 1;
      let color: [number, number, number, number];
      if (blockX === 0 && blockY === 0) color = colors.red;
      else if (blockX === 1 && blockY === 0) color = colors.green;
      else if (blockX === 0 && blockY === 1) color = colors.blue;
      else color = colors.white;
      out[idx] = color[0];
      out[idx + 1] = color[1];
      out[idx + 2] = color[2];
      out[idx + 3] = color[3];
    }
  }
  return out;
}

function makeExpected2x2TopLeft(): Uint8Array {
  // row0 (top): blue, white
  // row1 (bottom): red, green
  return new Uint8Array([0, 0, 255, 255, 255, 255, 255, 255, 255, 0, 0, 255, 0, 255, 0, 255]);
}

describe('LayerThumbnail', () => {
  it('downscales non-tiled layer with nearest sampling', () => {
    const gl = makeGL2Context(2, 2);
    const input = make2x2BottomLeftOriginPattern();
    const layer = new Layer(gl, { width: 2, height: 2, data: input });
    const thumbnail = new LayerThumbnail(layer, { scale: 1 });

    const image = thumbnail.getImageData(2, 2);
    const out = new Uint8Array(image.data.buffer.slice(0));

    expectBufferEqual(out, make2x2TopLeftOriginPattern());
    thumbnail.dispose();
    layer.dispose();
  });

  it('downscales layer with nearest sampling', () => {
    const gl = makeGL2Context(4, 4);
    const input = makeBlockPattern4x4();
    const layer = new Layer(gl, { width: 4, height: 4, data: input });
    const thumbnail = new LayerThumbnail(layer, { scale: 2 });

    const image = thumbnail.getImageData(2, 2);
    const out = new Uint8Array(image.data.buffer.slice(0));

    expectBufferEqual(out, makeExpected2x2TopLeft());
    thumbnail.dispose();
    layer.dispose();
  });

  it('does not update when updateOn excludes history events', () => {
    const gl = makeGL2Context(2, 2);
    const input = make2x2BottomLeftOriginPattern();
    const layer = new Layer(gl, { width: 2, height: 2, data: input });
    const thumbnail = new LayerThumbnail(layer, { updateOn: [], scale: 1 });

    const image = thumbnail.getImageData(2, 2);
    const out = new Uint8Array(image.data.buffer.slice(0));

    layer.writePixels(new Uint8Array(2 * 2 * 4), { x: 0, y: 0, width: 2, height: 2 });
    const after = thumbnail.getImageData(2, 2);
    const outAfter = new Uint8Array(after.data.buffer.slice(0));

    expectBufferEqual(outAfter, out);
    thumbnail.dispose();
    layer.dispose();
  });

  it('updates after historyRegistered when configured', () => {
    const gl = makeGL2Context(2, 2);
    const input = make2x2BottomLeftOriginPattern();
    const layer = new Layer(gl, { width: 2, height: 2, data: input });
    layer.setHistoryBackend(new TextureHistoryBackend());
    const thumbnail = new LayerThumbnail(layer, { updateOn: ['historyRegistered'], scale: 1 });

    const image = thumbnail.getImageData(2, 2);
    const out = new Uint8Array(image.data.buffer.slice(0));
    expectBufferEqual(out, make2x2TopLeftOriginPattern());

    const patch = new Uint8Array(2 * 2 * 4);
    patch.fill(200);
    layer.writePixels(patch, { x: 0, y: 0, width: 2, height: 2 });
    layer.commitHistory({ x: 0, y: 0, width: 2, height: 2 });

    const updated = thumbnail.getImageData(2, 2);
    const updatedOut = new Uint8Array(updated.data.buffer.slice(0));
    expectBufferEqual(updatedOut, patch);

    thumbnail.dispose();
    layer.dispose();
  });
});
