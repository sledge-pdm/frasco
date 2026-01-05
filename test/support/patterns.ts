export function make2x2TopLeftOriginPattern(): Uint8Array {
  // row0 (top):    R, G
  // row1 (bottom): B, W
  return new Uint8Array([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
}

export function make2x2BottomLeftOriginPattern(): Uint8Array {
  // row0 (bottom): B, W
  // row1 (top):    R, G
  return new Uint8Array([0, 0, 255, 255, 255, 255, 255, 255, 255, 0, 0, 255, 0, 255, 0, 255]);
}
