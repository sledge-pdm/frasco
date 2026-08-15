import type { SurfaceBounds } from '~/surface';
import type { HistoryBackend, HistoryPackedSnapshot, HistoryRawSnapshot, HistoryTarget } from './types';

/**
 * @description how many snapshots are packed at once.
 *   packing reads a snapshot back from the GPU before compressing it, and a stack can hold a hundred of them,
 *   so the raw buffers are kept to a handful at a time rather than all being live together.
 */
const PACK_CONCURRENCY = 4;

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

  /**
   * @description export both stacks as deflated bytes. snapshots untouched since the last call are handed
   *   back from the backend's cache, so repeated exports only pay for what actually changed.
   */
  async exportPacked(): Promise<{ undoStack: HistoryPackedSnapshot[]; redoStack: HistoryPackedSnapshot[] }> {
    return {
      undoStack: await this.packStack(this.undoStack),
      redoStack: await this.packStack(this.redoStack),
    };
  }

  importPacked(undoStack: HistoryPackedSnapshot[], redoStack: HistoryPackedSnapshot[]): void {
    this.clear();
    this.undoStack = undoStack.map((snapshot) => this.backend.importPacked(this.target, snapshot));
    this.redoStack = redoStack.map((snapshot) => this.backend.importPacked(this.target, snapshot));
  }

  dispose(): void {
    this.clear();
  }

  private async packStack(stack: TSnapshot[]): Promise<HistoryPackedSnapshot[]> {
    if (stack.length === 0) return [];

    const packed = new Array<HistoryPackedSnapshot>(stack.length);
    let nextIndex = 0;

    const runner = async () => {
      for (;;) {
        const index = nextIndex++;
        if (index >= stack.length) return;
        packed[index] = await this.backend.exportPacked(this.target, stack[index]);
      }
    };

    await Promise.all(Array.from({ length: Math.min(PACK_CONCURRENCY, stack.length) }, runner));
    return packed;
  }

  private clearRedo(): void {
    if (this.backend.disposeSnapshot) {
      for (const snapshot of this.redoStack) this.backend.disposeSnapshot(this.target, snapshot);
    }
    this.redoStack = [];
  }
}
