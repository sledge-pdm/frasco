import { describe, it } from 'vitest';
import { InvertEffect } from '~/effects';
import { Layer } from '~/layer';
import { expectBufferEqual } from '../support/assert';
import { loadImageData } from '../support/e2e';
import { makeGL2Context } from '../support/gl';
import { HISTORY_BACKENDS } from './utils';

describe('History (effects integration)', () => {
  const originalPath = new URL('../effects/e2e/original.png', import.meta.url);
  const invertPath = new URL('../effects/e2e/invert.png', import.meta.url);

  for (const backend of HISTORY_BACKENDS) {
    it(`undo/redo with ${backend.name} backend`, async () => {
      const original = await loadImageData(originalPath);
      const expected = await loadImageData(invertPath);

      const gl = makeGL2Context(original.width, original.height);
      const layer = new Layer(gl, {
        width: original.width,
        height: original.height,
        data: original.data,
      });
      layer.setHistoryBackend(backend.make());

      InvertEffect.apply(layer);

      expectBufferEqual(layer.readPixels(), expected.data);
      layer.undo();
      expectBufferEqual(layer.readPixels(), original.data);
      layer.redo();
      expectBufferEqual(layer.readPixels(), expected.data);

      layer.dispose();
    });
  }
});
