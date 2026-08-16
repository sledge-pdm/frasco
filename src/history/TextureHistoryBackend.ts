import { gzipDeflateAsync, gzipInflate } from '@sledge-pdm/core';
import type { Size } from '~/layer';
import type { SurfaceBounds } from '~/surface';
import { createTexture, deleteTexture, readTexturePixels, readTexturePixelsAsync } from '~/utils';
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
    snapshot.revision = (snapshot.revision ?? 0) + 1;
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
    // everything the result is built from is read up front: `apply` can replace the texture, the bounds and
    // the size while we are awaiting below, and a packed snapshot whose bytes and bounds come from different
    // moments cannot be inflated back into a texture.
    const revision = snapshot.revision ?? 0;
    const { bounds, size, fullLayer } = snapshot;
    if (snapshot.deflated) return { bounds, size, deflated: snapshot.deflated, fullLayer };

    // deflating here rather than in capture keeps the readback out of the drawing path, and the async
    // readback keeps the main thread free while the GPU hands the pixels over. the copy is queued before
    // the first yield, so an `apply` that deletes this texture afterwards cannot spoil it.
    const buffer = await readTexturePixelsAsync(target.getGLContext(), snapshot.texture, {
      x: 0,
      y: 0,
      width: size.width,
      height: size.height,
    });
    const deflated = await gzipDeflateAsync(buffer);
    // keeping these bytes is only valid if the snapshot still holds the texture they came from.
    if ((snapshot.revision ?? 0) === revision) snapshot.deflated = deflated;
    return { bounds, size, deflated, fullLayer };
  }

  importPacked(target: HistoryTarget, snapshot: HistoryPackedSnapshot): TextureHistorySnapshot {
    // the exporter wrote the size the bytes were deflated from; deriving it from bounds again only works
    // while the two agree.
    const size: Size = snapshot.size;
    const texture = createTexture(target.getGLContext(), size.width, size.height, gzipInflate(snapshot.deflated));
    // the bytes we were handed already describe this texture, so the next export can skip the readback entirely.
    return { bounds: snapshot.bounds, size, texture, fullLayer: snapshot.fullLayer, deflated: snapshot.deflated };
  }

  disposeSnapshot(target: HistoryTarget, snapshot: TextureHistorySnapshot): void {
    deleteTexture(target.getGLContext(), snapshot.texture);
  }
}
