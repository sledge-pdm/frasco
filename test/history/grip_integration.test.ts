import { describe, it } from 'vitest';
import { CircleShape, Grip } from '../../src/grip';
import { HistoryBackend, TextureHistoryBackend, WebpHistoryBackend } from '../../src/history';
import { Layer } from '../../src/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';

const BACKENDS: {
  name: string;
  make: () => HistoryBackend<any>;
}[] = [
  { name: 'webp', make: () => new WebpHistoryBackend() },
  { name: 'texture', make: () => new TextureHistoryBackend() },
];

describe('History (grip integration)', () => {
  for (const backend of BACKENDS) {
    it(`undo/redo with ${backend.name} backend`, () => {
      const gl = makeGL2Context(64, 64);
      const layer = new Layer(gl, { width: 64, height: 64 });
      layer.clear([0, 0, 0, 0]);
      layer.setHistoryBackend(backend.make());

      const grip = new Grip({ inputSpace: 'layer' });
      const shape = new CircleShape();

      const before = layer.exportRaw();
      const style = { color: [255, 0, 0, 255] as const, size: 12, opacity: 1 };
      grip.start(layer, shape, { x: 10, y: 10, style });
      grip.addPoint({ x: 20, y: 10, style });
      grip.end({ x: 20, y: 10, style });

      const after = layer.exportRaw();
      layer.undo();
      expectBufferEqual(layer.exportRaw(), before);
      layer.redo();
      expectBufferEqual(layer.exportRaw(), after);

      layer.dispose();
    });
  }
});
