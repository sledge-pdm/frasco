import { describe, expect, it } from 'vitest';
import { Layer } from '~/layer';
import type { LayerEventType } from '~/layer/events';
import { makeGL2Context } from '../support/gl';

function recordEvents(layer: Layer): LayerEventType[] {
  const seen: LayerEventType[] = [];
  layer.addListener('update', () => seen.push('update'));
  layer.addListener('resized', () => seen.push('resized'));
  return seen;
}

describe('Layer resize events', () => {
  it('emits update before resized on resizeClear', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });
    const seen = recordEvents(layer);

    layer.resizeClear(3, 1);

    // listeners that only watch 'update' must hear about the replaced buffer, and must hear about it first
    // so a debounced refresh is dropped by the eager one on 'resized' rather than repeating it.
    expect(seen).toEqual(['update', 'resized']);

    layer.dispose();
  });

  it('emits update before resized on resizePreserve', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });
    const seen = recordEvents(layer);

    layer.resizePreserve(3, 3);

    expect(seen).toEqual(['update', 'resized']);

    layer.dispose();
  });

  it('reports the new size in the update bounds', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });
    let bounds: { width: number; height: number } | undefined;
    layer.addListener('update', (e) => {
      bounds = { width: e.bounds.width, height: e.bounds.height };
    });

    layer.resizeClear(3, 1);

    expect(bounds).toEqual({ width: 3, height: 1 });

    layer.dispose();
  });

  it('stays quiet when resizeClear is a no-op', () => {
    const gl = makeGL2Context(2, 2);
    const layer = new Layer(gl, { width: 2, height: 2 });
    const seen = recordEvents(layer);

    layer.resizeClear(2, 2);

    expect(seen).toEqual([]);

    layer.dispose();
  });
});
