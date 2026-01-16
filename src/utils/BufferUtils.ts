export function flipPixelsYInPlace(buffer: Uint8Array, width: number, height: number): void {
  const rowBytes = width * 4;
  const tmp = new Uint8Array(rowBytes);
  const half = Math.floor(height / 2);
  for (let y = 0; y < half; y++) {
    const top = y * rowBytes;
    const bottom = (height - 1 - y) * rowBytes;
    tmp.set(buffer.subarray(top, top + rowBytes));
    buffer.copyWithin(top, bottom, bottom + rowBytes);
    buffer.set(tmp, bottom);
  }
}
