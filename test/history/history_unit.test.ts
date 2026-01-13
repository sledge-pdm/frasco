import { describe, it } from 'vitest';
import { InvertEffect } from '../../src/effects';
import { Layer } from '../../src/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';
import { HISTORY_BACKENDS } from './utils';

function makePattern(width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (x + y * width) * 4;
      out[idx] = (x * 32) % 256;
      out[idx + 1] = (y * 32) % 256;
      out[idx + 2] = 16;
      out[idx + 3] = 255;
    }
  }
  return out;
}

describe('History (unit)', () => {
  for (const backend of HISTORY_BACKENDS) {
    it(`undo/redo swaps snapshot with ${backend.name}`, () => {
      const gl = makeGL2Context(4, 4);
      const layer = new Layer(gl, { width: 4, height: 4 });
      layer.setHistoryBackend(backend.make());

      const pattern = makePattern(4, 4);
      layer.replaceBuffer(pattern);
      const before = layer.exportRaw();

      const snapshot = layer.captureHistory();
      layer.clear([0, 0, 0, 0]);
      if (snapshot) layer.pushHistory(snapshot);

      const after = layer.exportRaw();
      layer.undo();
      expectBufferEqual(layer.exportRaw(), before);
      layer.redo();
      expectBufferEqual(layer.exportRaw(), after);

      layer.dispose();
    });

    it(`stress undo/redo stays consistent with ${backend.name}`, () => {
      const gl = makeGL2Context(8, 8);
      const layer = new Layer(gl, { width: 8, height: 8 });
      layer.setHistoryBackend(backend.make());

      const pattern = makePattern(8, 8);
      layer.replaceBuffer(pattern);
      const initial = layer.exportRaw();

      for (let i = 0; i < 30; i++) {
        InvertEffect.apply(layer);
      }

      while (layer.canUndo()) layer.undo();
      expectBufferEqual(layer.exportRaw(), initial);

      while (layer.canRedo()) layer.redo();
      layer.dispose();
    });
  }
});
