import { gzipDeflateAsync, gzipInflate } from '@sledge-pdm/core';
import type { Size } from '~/layer';
import type { SurfaceBounds } from '~/surface';
import { createTexture, deleteTexture, readTexturePixels } from '~/utils';
import type { HistoryBackend, HistoryPackedSnapshot, HistoryRawSnapshot, HistoryTarget, TextureHistorySnapshot } from './types';

export class TextureHistoryBackend implements HistoryBackend<TextureHistorySnapshot> {
  capture(target: HistoryTarget, bounds?: SurfaceBounds): TextureHistorySnapshot {
    const size = target.getSize();
    const resolved = bounds ?? { x: 0, y: 0, width: size.width, height: size.height };
    const texture = target.copyTexture(resolved);
    return { bounds: resolved, size: { width: resolved.width, height: resolved.height }, texture, fullLayer: bounds == null };
  }

  apply(target: HistoryTarget, snapshot: TextureHistorySnapshot): void {
    const currentSize = target.getSize();
    const fullLayer = snapshot.fullLayer ?? false;
    const currentBounds = fullLayer ? { x: 0, y: 0, width: currentSize.width, height: currentSize.height } : snapshot.bounds;
    const current = target.copyTexture(currentBounds);

    if (fullLayer && (snapshot.size.width !== currentSize.width || snapshot.size.height !== currentSize.height)) {
      target.resizeClear(snapshot.size.width, snapshot.size.height);
    }
    target.drawTexture(snapshot.bounds, snapshot.texture);
    deleteTexture(target.getGLContext(), snapshot.texture);
    snapshot.bounds = currentBounds;
    snapshot.size = { width: currentBounds.width, height: currentBounds.height };
    snapshot.texture = current;
    snapshot.fullLayer = fullLayer;
    // the snapshot now carries what used to be on the layer, so anything deflated earlier describes the wrong pixels.
    snapshot.deflated = undefined;
  }

  exportRaw(target: HistoryTarget, snapshot: TextureHistorySnapshot): HistoryRawSnapshot {
    const buffer = readTexturePixels(target.getGLContext(), snapshot.texture, {
      x: 0,
      y: 0,
      width: snapshot.size.width,
      height: snapshot.size.height,
    });
    return { bounds: snapshot.bounds, size: snapshot.size, buffer, fullLayer: snapshot.fullLayer };
  }

  importRaw(target: HistoryTarget, snapshot: HistoryRawSnapshot): TextureHistorySnapshot {
    const size: Size = { width: snapshot.bounds.width, height: snapshot.bounds.height };
    const texture = createTexture(target.getGLContext(), size.width, size.height, snapshot.buffer);
    return { bounds: snapshot.bounds, size, texture, fullLayer: snapshot.fullLayer };
  }

  async exportPacked(target: HistoryTarget, snapshot: TextureHistorySnapshot): Promise<HistoryPackedSnapshot> {
    if (!snapshot.deflated) {
      // deflating here rather than in capture keeps the readback - which stalls the GPU - out of the drawing path.
      const buffer = readTexturePixels(target.getGLContext(), snapshot.texture, {
        x: 0,
        y: 0,
        width: snapshot.size.width,
        height: snapshot.size.height,
      });
      snapshot.deflated = await gzipDeflateAsync(buffer);
    }
    return { bounds: snapshot.bounds, size: snapshot.size, deflated: snapshot.deflated, fullLayer: snapshot.fullLayer };
  }

  importPacked(target: HistoryTarget, snapshot: HistoryPackedSnapshot): TextureHistorySnapshot {
    const size: Size = { width: snapshot.bounds.width, height: snapshot.bounds.height };
    const texture = createTexture(target.getGLContext(), size.width, size.height, gzipInflate(snapshot.deflated));
    // the bytes we were handed already describe this texture, so the next export can skip the readback entirely.
    return { bounds: snapshot.bounds, size, texture, fullLayer: snapshot.fullLayer, deflated: snapshot.deflated };
  }

  disposeSnapshot(target: HistoryTarget, snapshot: TextureHistorySnapshot): void {
    deleteTexture(target.getGLContext(), snapshot.texture);
  }
}
