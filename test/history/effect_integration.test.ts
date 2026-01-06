import { describe, it } from 'vitest';
import { InvertEffect } from '../../src/effects';
import { HistoryBackend, TextureHistoryBackend, WebpHistoryBackend } from '../../src/history';
import { Layer } from '../../src/layer';
import { expectBufferEqual } from '../support/assert';
import { loadImageData } from '../support/e2e';
import { makeGL2Context } from '../support/gl';

const BACKENDS: {
  name: string;
  make: () => HistoryBackend<any>;
}[] = [
  { name: 'webp', make: () => new WebpHistoryBackend() },
  { name: 'texture', make: () => new TextureHistoryBackend() },
];

describe('History (effects integration)', () => {
  const originalPath = new URL('../effects/e2e/original.png', import.meta.url);
  const invertPath = new URL('../effects/e2e/invert.png', import.meta.url);

  for (const backend of BACKENDS) {
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

      expectBufferEqual(layer.exportRaw(), expected.data);
      layer.undo();
      expectBufferEqual(layer.exportRaw(), original.data);
      layer.redo();
      expectBufferEqual(layer.exportRaw(), expected.data);

      layer.dispose();
    });
  }
});
