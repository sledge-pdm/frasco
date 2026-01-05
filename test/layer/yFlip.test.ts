import { describe, expect, it } from 'vitest';
import { Layer } from '../../src/layer';

function make2x2TopLeftOriginPattern(): Uint8Array {
  // row0 (top):    R, G
  // row1 (bottom): B, W
  return new Uint8Array([
    255, 0, 0, 255, 0, 255, 0, 255,
    0, 0, 255, 255, 255, 255, 255, 255,
  ]);
}

function rgbaAtTopLeftOrigin(buf: Uint8Array, width: number, x: number, y: number): [number, number, number, number] {
  const i = (y * width + x) * 4;
  return [buf[i]!, buf[i + 1]!, buf[i + 2]!, buf[i + 3]!];
}

describe('Layer (WebGL2) - Y axis convention', () => {
  it('replaceBuffer() + exportRaw() roundtrips top-left-origin buffers', () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;

    const gl = canvas.getContext('webgl2', { premultipliedAlpha: false });
    if (!gl) throw new Error('WebGL2 not available in test browser');

    const input = make2x2TopLeftOriginPattern();
    const layer = new Layer(gl, { width: 2, height: 2, data: input });

    const out = layer.exportRaw();

    expect(Array.from(out)).toEqual(Array.from(input));
    expect(rgbaAtTopLeftOrigin(out, 2, 0, 0)).toEqual([255, 0, 0, 255]);
    expect(rgbaAtTopLeftOrigin(out, 2, 1, 0)).toEqual([0, 255, 0, 255]);
    expect(rgbaAtTopLeftOrigin(out, 2, 0, 1)).toEqual([0, 0, 255, 255]);
    expect(rgbaAtTopLeftOrigin(out, 2, 1, 1)).toEqual([255, 255, 255, 255]);

    layer.dispose();
  });
});
