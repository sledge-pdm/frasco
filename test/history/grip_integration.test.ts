import { initWebp } from '@sledge-pdm/core';
import { beforeAll, describe, it } from 'vitest';
import { CircleKernel, Grip, MaskStrokeInstrument } from '../../src/grip';
import { Layer } from '../../src/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';
import { HISTORY_BACKENDS } from './utils';

describe('History (grip integration)', () => {
  beforeAll(async () => {
    await initWebp();
  });

  for (const backend of HISTORY_BACKENDS) {
    it(`undo/redo with ${backend.name} backend`, () => {
      const gl = makeGL2Context(64, 64);
      const layer = new Layer(gl, { width: 64, height: 64 });
      layer.clear([0, 0, 0, 0]);
      layer.setHistoryBackend(backend.make());

      const grip = new Grip({ inputSpace: 'layer' });
      const kernel = new CircleKernel();
      const instrument = new MaskStrokeInstrument();

      const before = layer.exportRaw();
      const style = { color: [255, 0, 0, 255] as const, size: 12, opacity: 1 };
      grip.start(layer, kernel, { x: 10, y: 10, style }, instrument);
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
