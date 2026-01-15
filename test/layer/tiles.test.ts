import { describe, it } from 'vitest';
import { Layer } from '../../src/layer';
import { expectBufferEqual } from '../support/assert';
import { makeGL2Context } from '../support/gl';

type Bounds = { x: number; y: number; width: number; height: number };

function makePattern(width: number, height: number): Uint8Array {
  const out = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (x + y * width) * 4;
      out[idx] = (x * 31) % 256;
      out[idx + 1] = (y * 47) % 256;
      out[idx + 2] = (x + y * 13) % 256;
      out[idx + 3] = 255;
    }
  }
  return out;
}

function extractBounds(source: Uint8Array, width: number, bounds: Bounds): Uint8Array {
  const out = new Uint8Array(bounds.width * bounds.height * 4);
  const rowBytes = bounds.width * 4;
  for (let row = 0; row < bounds.height; row++) {
    const srcIndex = ((bounds.y + row) * width + bounds.x) * 4;
    const dstIndex = row * rowBytes;
    out.set(source.subarray(srcIndex, srcIndex + rowBytes), dstIndex);
  }
  return out;
}

function writeBounds(target: Uint8Array, width: number, bounds: Bounds, buffer: Uint8Array): void {
  const rowBytes = bounds.width * 4;
  for (let row = 0; row < bounds.height; row++) {
    const dstIndex = ((bounds.y + row) * width + bounds.x) * 4;
    const srcIndex = row * rowBytes;
    target.set(buffer.subarray(srcIndex, srcIndex + rowBytes), dstIndex);
  }
}

describe('Layer tiling', () => {
  it('exportRaw matches input buffer when tiled', () => {
    const gl = makeGL2Context(5, 3);
    const input = makePattern(5, 3);
    const layer = new Layer(gl, { width: 5, height: 3, data: input, tileSize: 2 });

    const out = layer.exportRaw();

    expectBufferEqual(out, input);
    layer.dispose();
  });

  it('readPixels across tile boundaries matches source', () => {
    const gl = makeGL2Context(6, 4);
    const input = makePattern(6, 4);
    const layer = new Layer(gl, { width: 6, height: 4, data: input, tileSize: 2 });
    const bounds = { x: 1, y: 1, width: 4, height: 2 };

    const out = layer.readPixels(bounds);
    const expected = extractBounds(input, 6, bounds);

    expectBufferEqual(out, expected);
    layer.dispose();
  });

  it('writePixels across tile boundaries updates expected region', () => {
    const gl = makeGL2Context(6, 4);
    const base = new Uint8Array(6 * 4 * 4);
    const layer = new Layer(gl, { width: 6, height: 4, data: base, tileSize: 2 });
    const bounds = { x: 2, y: 1, width: 3, height: 2 };
    const patch = makePattern(bounds.width, bounds.height);

    layer.writePixels(bounds, patch);
    const out = layer.readPixels(bounds);

    expectBufferEqual(out, patch);

    const expected = new Uint8Array(base);
    writeBounds(expected, 6, bounds, patch);
    expectBufferEqual(layer.exportRaw(), expected);
    layer.dispose();
  });

  it('copyTextureRegion updates tiled texture set for bounds across tiles', () => {
    const gl = makeGL2Context(6, 4);
    const input = makePattern(6, 4);
    const layer = new Layer(gl, { width: 6, height: 4, data: input, tileSize: 2 });
    const bounds = { x: 1, y: 1, width: 4, height: 2 };

    const empty = new Uint8Array(6 * 4 * 4);
    const texture = layer.createTextureFromRaw(empty, { width: 6, height: 4 });
    layer.copyTextureRegion(texture, bounds);

    const out = layer.readTexturePixels(texture, { width: 6, height: 4 });
    const expected = new Uint8Array(6 * 4 * 4);
    writeBounds(expected, 6, bounds, extractBounds(input, 6, bounds));
    expectBufferEqual(out, expected);

    layer.deleteTexture(texture);
    layer.dispose();
  });

  it('drawTexture writes bounds across tiles from a non-tiled texture', () => {
    const gl = makeGL2Context(6, 4);
    const base = new Uint8Array(6 * 4 * 4);
    const layer = new Layer(gl, { width: 6, height: 4, data: base, tileSize: 2 });
    const bounds = { x: 2, y: 1, width: 3, height: 2 };
    const patch = makePattern(bounds.width, bounds.height);
    const texture = layer.createTextureFromRaw(patch, { width: bounds.width, height: bounds.height });

    layer.drawTexture(bounds, texture);
    expectBufferEqual(layer.readPixels(bounds), patch);

    const expected = new Uint8Array(base);
    writeBounds(expected, 6, bounds, patch);
    expectBufferEqual(layer.exportRaw(), expected);

    layer.deleteTexture(texture);
    layer.dispose();
  });
});
