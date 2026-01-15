import { describe, it } from 'vitest';
import { TextureHistoryBackend } from '../../src/history';
import { Layer } from '../../src/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';

type Bounds = { x: number; y: number; width: number; height: number };

function makePattern(width: number, height: number, seed = 0): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (x + y * width) * 4;
      out[idx] = (x * 23 + seed) % 256;
      out[idx + 1] = (y * 19 + seed * 3) % 256;
      out[idx + 2] = (x + y * 7 + seed * 5) % 256;
      out[idx + 3] = 255;
    }
  }
  return out;
}

function writeBounds(target: Uint8Array, width: number, bounds: Bounds, buffer: Uint8Array): void {
  const rowBytes = bounds.width * 4;
  for (let row = 0; row < bounds.height; row++) {
    const dstIndex = ((bounds.y + row) * width + bounds.x) * 4;
    const srcIndex = row * rowBytes;
    target.set(buffer.subarray(srcIndex, srcIndex + rowBytes), dstIndex);
  }
}

describe('History (tiled)', () => {
  it('undo/redo restores tiled buffer across boundaries', () => {
    const gl = makeGL2Context(6, 4);
    const layer = new Layer(gl, { width: 6, height: 4, tileSize: 2 });
    layer.setHistoryBackend(new TextureHistoryBackend());

    const base = makePattern(6, 4, 1);
    layer.replaceBuffer(base);
    const bounds = { x: 1, y: 1, width: 4, height: 2 };
    const snapshot = layer.captureHistory(bounds);
    const patch = makePattern(bounds.width, bounds.height, 9);
    layer.writePixels(bounds, patch);
    if (snapshot) layer.pushHistory(snapshot);

    const expectedAfter = new Uint8Array(base);
    writeBounds(expectedAfter, 6, bounds, patch);
    expectBufferEqual(layer.exportRaw(), expectedAfter);

    layer.undo();
    expectBufferEqual(layer.exportRaw(), base);

    layer.redo();
    expectBufferEqual(layer.exportRaw(), expectedAfter);

    layer.dispose();
  });
});
