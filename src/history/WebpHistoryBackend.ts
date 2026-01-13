import { decodeWebp, encodeWebp, toUint8Array } from '@sledge-pdm/core';
import type { Size } from '../layer/types';
import type { SurfaceBounds } from '../surface/types';
import type { HistoryBackend, HistoryRawSnapshot, HistoryTarget, WebpHistorySnapshot } from './types';

/**
 * @deprecated Current webp conversion may induce memory leak
 */
export class WebpHistoryBackend implements HistoryBackend<WebpHistorySnapshot> {
  capture(target: HistoryTarget, bounds?: SurfaceBounds): WebpHistorySnapshot {
    const size = target.getSize();
    const resolved = bounds ?? { x: 0, y: 0, width: size.width, height: size.height };
    const raw = target.readPixels(resolved);
    const webp = encodeWebp(raw, resolved.width, resolved.height);
    return { bounds: resolved, size: { width: resolved.width, height: resolved.height }, webp };
  }

  apply(target: HistoryTarget, snapshot: WebpHistorySnapshot): void {
    const raw = decodeWebp(snapshot.webp, snapshot.size.width, snapshot.size.height);
    const current = target.readPixels(snapshot.bounds);
    target.writePixels(snapshot.bounds, toUint8Array(raw));
    snapshot.webp = encodeWebp(current, snapshot.size.width, snapshot.size.height);
  }

  exportRaw(_target: HistoryTarget, snapshot: WebpHistorySnapshot): HistoryRawSnapshot {
    const buffer = decodeWebp(snapshot.webp, snapshot.size.width, snapshot.size.height);
    return { bounds: snapshot.bounds, size: snapshot.size, buffer: toUint8Array(buffer) };
  }

  importRaw(_target: HistoryTarget, snapshot: HistoryRawSnapshot): WebpHistorySnapshot {
    const size: Size = { width: snapshot.bounds.width, height: snapshot.bounds.height };
    const webp = encodeWebp(snapshot.buffer, size.width, size.height);
    return { bounds: snapshot.bounds, size, webp };
  }
}
