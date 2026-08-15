import { describe, expect, it } from 'vitest';
import { Layer } from '~/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';
import { HISTORY_BACKENDS } from './utils';

function makePattern(width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (x + y * width) * 4;
      out[idx] = (x * 48) % 256;
      out[idx + 1] = (y * 48) % 256;
      out[idx + 2] = 32;
      out[idx + 3] = 255;
    }
  }
  return out;
}

/** a layer with one undo snapshot on it, plus the pixel states before and after that snapshot was taken. */
function makeLayerWithHistory(gl: WebGL2RenderingContext, make: () => any) {
  const layer = new Layer(gl, { width: 6, height: 6 });
  layer.setHistoryBackend(make());

  layer.writePixels(makePattern(6, 6));
  const before = layer.readPixels();

  const snapshot = layer.captureHistory();
  layer.clear([0, 0, 0, 0]);
  if (snapshot) layer.pushHistory(snapshot);

  return { layer, before, after: layer.readPixels() };
}

describe('History (packed IO)', () => {
  for (const backend of HISTORY_BACKENDS) {
    it(`export/import packed roundtrip with ${backend.name}`, async () => {
      const gl = makeGL2Context(6, 6);
      const { layer, before, after } = makeLayerWithHistory(gl, backend.make);

      const history = await layer.exportHistoryPacked();
      if (!history) throw new Error('history export missing');

      const gl2 = makeGL2Context(6, 6);
      const restored = new Layer(gl2, { width: 6, height: 6, data: after });
      restored.setHistoryBackend(backend.make());
      restored.importHistoryPacked(history.undoStack, history.redoStack);

      restored.undo();
      expectBufferEqual(restored.readPixels(), before);
      restored.redo();
      expectBufferEqual(restored.readPixels(), after);

      layer.dispose();
      restored.dispose();
    });

    it(`packs the same bytes when nothing changed with ${backend.name}`, async () => {
      const gl = makeGL2Context(6, 6);
      const { layer } = makeLayerWithHistory(gl, backend.make);

      const first = await layer.exportHistoryPacked();
      const second = await layer.exportHistoryPacked();
      if (!first || !second) throw new Error('history export missing');

      expect(second.undoStack.length).toBe(first.undoStack.length);
      expectBufferEqual(second.undoStack[0].deflated, first.undoStack[0].deflated);

      layer.dispose();
    });

    it(`re-packs after undo moved the pixels with ${backend.name}`, async () => {
      const gl = makeGL2Context(6, 6);
      const { layer, before, after } = makeLayerWithHistory(gl, backend.make);

      await layer.exportHistoryPacked();
      // undo swaps the snapshot's contents for what was on the layer, so anything cached now describes the wrong pixels.
      layer.undo();

      const packed = await layer.exportHistoryPacked();
      if (!packed) throw new Error('history export missing');

      const gl2 = makeGL2Context(6, 6);
      const restored = new Layer(gl2, { width: 6, height: 6, data: before });
      restored.setHistoryBackend(backend.make());
      restored.importHistoryPacked(packed.undoStack, packed.redoStack);

      restored.redo();
      expectBufferEqual(restored.readPixels(), after);

      layer.dispose();
      restored.dispose();
    });
  }

  it('keeps a texture snapshot reusable after it was packed', async () => {
    const gl = makeGL2Context(6, 6);
    const { layer, before, after } = makeLayerWithHistory(gl, HISTORY_BACKENDS[1].make);

    await layer.exportHistoryPacked();

    // packing must not consume the snapshot - undo/redo still run off the texture it holds.
    layer.undo();
    expectBufferEqual(layer.readPixels(), before);
    layer.redo();
    expectBufferEqual(layer.readPixels(), after);

    layer.dispose();
  });
});
