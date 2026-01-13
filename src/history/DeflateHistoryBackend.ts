import { gzipDeflate, gzipInflate } from '@sledge-pdm/core';
import type { Size } from '../layer/types';
import type { SurfaceBounds } from '../surface/types';
import type { DeflateHistorySnapshot, HistoryBackend, HistoryRawSnapshot, HistoryTarget } from './types';

export class DeflateHistoryBackend implements HistoryBackend<DeflateHistorySnapshot> {
  capture(target: HistoryTarget, bounds?: SurfaceBounds): DeflateHistorySnapshot {
    const size = target.getSize();
    const resolved = bounds ?? { x: 0, y: 0, width: size.width, height: size.height };
    const raw = target.readPixels(resolved);
    const deflated = gzipDeflate(raw);
    return { bounds: resolved, size: { width: resolved.width, height: resolved.height }, deflated };
  }

  apply(target: HistoryTarget, snapshot: DeflateHistorySnapshot): void {
    const raw = gzipInflate(snapshot.deflated);
    const current = target.readPixels(snapshot.bounds);
    target.writePixels(snapshot.bounds, raw);
    snapshot.deflated = gzipDeflate(current);
  }

  exportRaw(_target: HistoryTarget, snapshot: DeflateHistorySnapshot): HistoryRawSnapshot {
    const buffer = gzipInflate(snapshot.deflated);
    return { bounds: snapshot.bounds, size: snapshot.size, buffer: buffer };
  }

  importRaw(_target: HistoryTarget, snapshot: HistoryRawSnapshot): DeflateHistorySnapshot {
    const size: Size = { width: snapshot.bounds.width, height: snapshot.bounds.height };
    const deflated = gzipDeflate(snapshot.buffer);
    return { bounds: snapshot.bounds, size, deflated };
  }
}
