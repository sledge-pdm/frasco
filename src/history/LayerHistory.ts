import type { SurfaceBounds } from '~/surface';
import type { HistoryBackend, HistoryRawSnapshot, HistoryTarget } from './types';

export class LayerHistory<TSnapshot> {
  private undoStack: TSnapshot[] = [];
  private redoStack: TSnapshot[] = [];

  constructor(
    private readonly target: HistoryTarget,
    private readonly backend: HistoryBackend<TSnapshot>,
    private readonly maxItems: number
  ) {}

  capture(bounds?: SurfaceBounds): TSnapshot {
    return this.backend.capture(this.target, bounds);
  }

  push(snapshot: TSnapshot): void {
    if (this.undoStack.length >= this.maxItems) {
      const dropped = this.undoStack.shift();
      if (dropped && this.backend.disposeSnapshot) {
        this.backend.disposeSnapshot(this.target, dropped);
      }
    }
    this.undoStack.push(snapshot);
    this.clearRedo();
  }

  commit(bounds?: SurfaceBounds): TSnapshot {
    const snapshot = this.capture(bounds);
    this.push(snapshot);
    return snapshot;
  }

  pushRaw(snapshot: HistoryRawSnapshot): void {
    const packed = this.backend.importRaw(this.target, snapshot);
    this.push(packed);
  }

  undo(): void {
    const snapshot = this.undoStack.pop();
    if (!snapshot) return;
    this.backend.apply(this.target, snapshot);
    this.redoStack.push(snapshot);
  }

  redo(): void {
    const snapshot = this.redoStack.pop();
    if (!snapshot) return;
    this.backend.apply(this.target, snapshot);
    this.undoStack.push(snapshot);
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  clear(): void {
    if (this.backend.disposeSnapshot) {
      for (const snapshot of this.undoStack) this.backend.disposeSnapshot(this.target, snapshot);
      for (const snapshot of this.redoStack) this.backend.disposeSnapshot(this.target, snapshot);
    }
    this.undoStack = [];
    this.redoStack = [];
  }

  exportRaw(): { undoStack: HistoryRawSnapshot[]; redoStack: HistoryRawSnapshot[] } {
    return {
      undoStack: this.undoStack.map((snapshot) => this.backend.exportRaw(this.target, snapshot)),
      redoStack: this.redoStack.map((snapshot) => this.backend.exportRaw(this.target, snapshot)),
    };
  }

  importRaw(undoStack: HistoryRawSnapshot[], redoStack: HistoryRawSnapshot[]): void {
    this.clear();
    this.undoStack = undoStack.map((snapshot) => this.backend.importRaw(this.target, snapshot));
    this.redoStack = redoStack.map((snapshot) => this.backend.importRaw(this.target, snapshot));
  }

  dispose(): void {
    this.clear();
  }

  private clearRedo(): void {
    if (this.backend.disposeSnapshot) {
      for (const snapshot of this.redoStack) this.backend.disposeSnapshot(this.target, snapshot);
    }
    this.redoStack = [];
  }
}
