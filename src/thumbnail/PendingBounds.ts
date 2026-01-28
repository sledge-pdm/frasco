import { SurfaceBounds } from '~/surface';

export class PendingBounds {
  pendingBounds: SurfaceBounds | undefined;

  add(bounds: SurfaceBounds) {
    if (!this.pendingBounds) {
      this.pendingBounds = { ...bounds };
    } else {
      const left = Math.min(this.pendingBounds.x, bounds.x);
      const top = Math.min(this.pendingBounds.y, bounds.y);
      const right = Math.max(this.pendingBounds.x + this.pendingBounds.width, bounds.x + bounds.width);
      const bottom = Math.max(this.pendingBounds.y + this.pendingBounds.height, bounds.y + bounds.height);
      this.pendingBounds = { x: left, y: top, width: right - left, height: bottom - top };
    }
  }

  getBounds(): SurfaceBounds | undefined {
    return this.pendingBounds;
  }

  reset() {
    this.pendingBounds = undefined;
  }
}
