import type { Size } from '../layer/types';
import type { SurfaceBounds } from '../surface/types';
import { rawToWebp, webpToRaw } from '../utils/buffer';
import type { HistoryBackend, HistoryRawSnapshot, HistoryTarget, WebpHistorySnapshot } from './types';

export class WebpHistoryBackend implements HistoryBackend<WebpHistorySnapshot> {
  capture(target: HistoryTarget, bounds?: SurfaceBounds): WebpHistorySnapshot {
    const size = target.getSize();
    const resolved = bounds ?? { x: 0, y: 0, width: size.width, height: size.height };
    const raw = target.readPixels(resolved);
    const webp = rawToWebp(raw, resolved.width, resolved.height);
    return { bounds: resolved, size: { width: resolved.width, height: resolved.height }, webp };
  }

  apply(target: HistoryTarget, snapshot: WebpHistorySnapshot): void {
    const raw = webpToRaw(snapshot.webp, snapshot.size.width, snapshot.size.height);
    const current = target.readPixels(snapshot.bounds);
    target.writePixels(snapshot.bounds, raw);
    snapshot.webp = rawToWebp(current, snapshot.size.width, snapshot.size.height);
  }

  exportRaw(_target: HistoryTarget, snapshot: WebpHistorySnapshot): HistoryRawSnapshot {
    const buffer = webpToRaw(snapshot.webp, snapshot.size.width, snapshot.size.height);
    return { bounds: snapshot.bounds, size: snapshot.size, buffer };
  }

  importRaw(_target: HistoryTarget, snapshot: HistoryRawSnapshot): WebpHistorySnapshot {
    const size: Size = { width: snapshot.bounds.width, height: snapshot.bounds.height };
    const webp = rawToWebp(snapshot.buffer, size.width, size.height);
    return { bounds: snapshot.bounds, size, webp };
  }
}
