import { describe, expect, it } from 'vitest';
import { Layer } from '../../src/layer';

function rgbaAt(buf: Uint8Array, width: number, x: number, y: number): [number, number, number, number] {
  const i = (y * width + x) * 4;
  return [buf[i]!, buf[i + 1]!, buf[i + 2]!, buf[i + 3]!];
}

describe('Layer (WebGL2)', () => {
  it('clear() fills texture', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;

    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 not available in test browser');

    const layer = new Layer(gl, { width: 2, height: 2 });
    layer.clear([255, 0, 0, 255]);

    const raw = layer.exportRaw({ flipY: true });
    expect(rgbaAt(raw, 2, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(rgbaAt(raw, 2, 1, 0)).toEqual([255, 0, 0, 255]);
    expect(rgbaAt(raw, 2, 0, 1)).toEqual([255, 0, 0, 255]);
    expect(rgbaAt(raw, 2, 1, 1)).toEqual([255, 0, 0, 255]);

    layer.dispose();
  });
});

