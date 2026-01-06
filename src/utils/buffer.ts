import { RawPixelData } from '../layer';
import { png_to_raw, raw_to_png, raw_to_webp, webp_to_raw } from '../wasm/pkg/anvil_wasm';

export function rawToWebp(buffer: RawPixelData, width: number, height: number): Uint8Array {
  const uint8Buffer = new Uint8Array(buffer.buffer);
  const webpBuffer = raw_to_webp(uint8Buffer, width, height);
  return new Uint8Array(webpBuffer.buffer);
}

export function webpToRaw(buffer: Uint8Array, width: number, height: number): Uint8Array {
  const rawBuffer = webp_to_raw(buffer, width, height);
  return new Uint8Array(rawBuffer.buffer);
}

export function rawToPng(buffer: Uint8Array, width: number, height: number): Uint8Array {
  const pngBuffer = raw_to_png(buffer, width, height);
  return new Uint8Array(pngBuffer.buffer);
}

export function pngToRaw(buffer: Uint8Array, width: number, height: number): Uint8Array {
  const rawBuffer = png_to_raw(buffer, width, height);
  return new Uint8Array(rawBuffer.buffer);
}
