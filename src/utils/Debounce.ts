export class Debounce {
  private timer: number | null = null;

  constructor(private readonly delayMs: number) {}

  schedule(callback: () => void): void {
    if (this.delayMs <= 0) {
      callback();
      return;
    }
    if (this.timer != null) return;
    this.timer = window.setTimeout(() => {
      this.timer = null;
      callback();
    }, this.delayMs);
  }

  cancel(): void {
    if (this.timer == null) return;
    clearTimeout(this.timer);
    this.timer = null;
  }

  isPending(): boolean {
    return this.timer != null;
  }
}
