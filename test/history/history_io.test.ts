import { describe, it } from 'vitest';
import { Layer } from '../../src/layer';
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

describe('History (raw IO)', () => {
  for (const backend of HISTORY_BACKENDS) {
    it(`export/import raw roundtrip with ${backend.name}`, () => {
      const gl = makeGL2Context(6, 6);
      const layer = new Layer(gl, { width: 6, height: 6 });
      layer.setHistoryBackend(backend.make());

      const pattern = makePattern(6, 6);
      layer.replaceBuffer(pattern);
      const before = layer.exportRaw();

      const snapshot = layer.captureHistory();
      layer.clear([0, 0, 0, 0]);
      if (snapshot) layer.pushHistory(snapshot);
      const after = layer.exportRaw();

      const history = layer.exportHistoryRaw();
      if (!history) throw new Error('history export missing');

      const gl2 = makeGL2Context(6, 6);
      const restored = new Layer(gl2, { width: 6, height: 6, data: after });
      restored.setHistoryBackend(backend.make());
      restored.importHistoryRaw(history.undoStack, history.redoStack);

      restored.undo();
      expectBufferEqual(restored.exportRaw(), before);
      restored.redo();
      expectBufferEqual(restored.exportRaw(), after);

      layer.dispose();
      restored.dispose();
    });
  }
});
