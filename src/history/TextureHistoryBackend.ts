import type { Size } from '../layer/types';
import type { SurfaceBounds } from '../surface/types';
import type { HistoryBackend, HistoryRawSnapshot, HistoryTarget, TextureHistorySnapshot } from './types';

export class TextureHistoryBackend implements HistoryBackend<TextureHistorySnapshot> {
  capture(target: HistoryTarget, bounds?: SurfaceBounds): TextureHistorySnapshot {
    const size = target.getSize();
    const resolved = bounds ?? { x: 0, y: 0, width: size.width, height: size.height };
    const texture = target.copyTexture(resolved);
    return { bounds: resolved, size: { width: resolved.width, height: resolved.height }, texture };
  }

  apply(target: HistoryTarget, snapshot: TextureHistorySnapshot): void {
    const current = target.copyTexture(snapshot.bounds);
    target.drawTexture(snapshot.bounds, snapshot.texture);
    target.deleteTexture(snapshot.texture);
    snapshot.texture = current;
  }

  exportRaw(target: HistoryTarget, snapshot: TextureHistorySnapshot): HistoryRawSnapshot {
    const buffer = target.readTexturePixels(snapshot.texture, {
      x: 0,
      y: 0,
      width: snapshot.size.width,
      height: snapshot.size.height,
    });
    return { bounds: snapshot.bounds, size: snapshot.size, buffer };
  }

  importRaw(target: HistoryTarget, snapshot: HistoryRawSnapshot): TextureHistorySnapshot {
    const size: Size = { width: snapshot.bounds.width, height: snapshot.bounds.height };
    const texture = target.createTextureFromRaw(snapshot.buffer, size);
    return { bounds: snapshot.bounds, size, texture };
  }

  disposeSnapshot(target: HistoryTarget, snapshot: TextureHistorySnapshot): void {
    target.deleteTexture(snapshot.texture);
  }
}
