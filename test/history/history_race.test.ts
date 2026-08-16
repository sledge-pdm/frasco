import { gzipInflate } from '@sledge-pdm/core';
import { describe, expect, it } from 'vitest';
import { TextureHistoryBackend } from '~/history';
import { Layer } from '~/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';

/**
 * packing a history stack is asynchronous, and nothing stops the user from drawing, undoing or opening
 * another project while a save is in the middle of it. these cover what happens when they do.
 *
 * every test here relies on the same timing: `exportHistoryPacked()` runs synchronously as far as the
 * fence wait, so whatever is called on the line after it lands inside the readback.
 */

function makePattern(width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (x + y * width) * 4;
      out[idx] = (x * 41) % 256;
      out[idx + 1] = (y * 59) % 256;
      out[idx + 2] = (x * y) % 256;
      out[idx + 3] = 255;
    }
  }
  return out;
}

function makeLayer(gl: WebGL2RenderingContext, size: number, maxItems = 16): Layer {
  const layer = new Layer(gl, { width: size, height: size });
  layer.setHistoryBackend(new TextureHistoryBackend(), maxItems);
  return layer;
}

describe('History (packing against concurrent edits)', () => {
  it('does not keep bytes for a snapshot an undo replaced mid-export', async () => {
    const gl = makeGL2Context(6, 6);
    const layer = makeLayer(gl, 6);

    layer.writePixels(makePattern(6, 6));
    const captured = layer.readPixels();
    layer.commitHistory();
    layer.clear([0, 0, 0, 0]);
    const cleared = layer.readPixels();

    const packing = layer.exportHistoryPacked();
    layer.undo();
    const packed = await packing;

    // what the snapshot held when the export started
    expectBufferEqual(gzipInflate(packed!.undoStack[0].deflated), captured);

    // the undo moved that snapshot onto the redo stack and swapped its texture. the next export has to
    // read the new pixels rather than hand back what the interrupted one had already deflated.
    const after = await layer.exportHistoryPacked();
    expect(after!.undoStack).toHaveLength(0);
    expectBufferEqual(gzipInflate(after!.redoStack[0].deflated), cleared);

    layer.dispose();
  });

  it('pairs the exported bytes with the bounds they were read at', async () => {
    const gl = makeGL2Context(6, 6);
    const layer = makeLayer(gl, 6);

    layer.writePixels(makePattern(6, 6));
    layer.commitHistory();
    // undoing this snapshot resizes the layer back up, which is what makes `apply` rewrite bounds and size
    layer.resizeClear(4, 4);

    const packing = layer.exportHistoryPacked();
    layer.undo();
    const packed = await packing;

    const entry = packed!.undoStack[0];
    expect(entry.size).toEqual({ width: 6, height: 6 });
    expect(gzipInflate(entry.deflated)).toHaveLength(6 * 6 * 4);

    // bytes and bounds from different moments cannot be inflated back - createTexture rejects the length
    const restored = makeLayer(gl, 6);
    expect(() => restored.importHistoryPacked(packed!.undoStack, packed!.redoStack)).not.toThrow();

    layer.dispose();
    restored.dispose();
  });

  it('keeps every entry when the stack shrinks mid-export', async () => {
    const gl = makeGL2Context(4, 4);
    const layer = makeLayer(gl, 4);

    // more entries than the packer runs at once, so it is still claiming indices after the first yield
    for (let i = 0; i < 6; i++) {
      layer.clear([20 + i * 30, 0, 0, 255]);
      layer.commitHistory();
    }

    const packing = layer.exportHistoryPacked();
    layer.undo();
    const packed = await packing;

    expect(packed!.undoStack).toHaveLength(6);
    // filter drops holes, so a short result here is a hole - and a hole reaches the file as null
    expect(packed!.undoStack.filter(Boolean)).toHaveLength(6);

    layer.dispose();
  });

  it('finishes an export whose snapshots are cleared underneath it', async () => {
    const gl = makeGL2Context(4, 4);
    const layer = makeLayer(gl, 4);

    const expected: Uint8Array[] = [];
    for (let i = 0; i < 6; i++) {
      layer.clear([20 + i * 30, 0, 0, 255]);
      expected.push(layer.readPixels());
      layer.commitHistory();
    }

    const packing = layer.exportHistoryPacked();
    // this is what opening another project does to a layer a save is still reading from
    layer.clearHistory();
    const packed = await packing;

    packed!.undoStack.forEach((entry, index) => {
      expectBufferEqual(gzipInflate(entry.deflated), expected[index]);
    });

    layer.dispose();
  });
});
