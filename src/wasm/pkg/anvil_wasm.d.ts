/* tslint:disable */
/* eslint-disable */
export function fill_mask_area(
  buffer: Uint8Array,
  mask: Uint8Array,
  fill_color_r: number,
  fill_color_g: number,
  fill_color_b: number,
  fill_color_a: number
): boolean;
export function invert(pixels: Uint8Array, width: number, height: number): void;
/**
 * Apply ordered dithering with simple parameters
 */
export function dithering_ordered(pixels: Uint8Array, width: number, height: number, levels: number): void;
/**
 * Apply dithering effect to the image
 */
export function dithering(pixels: Uint8Array, width: number, height: number, options: DitheringOption): void;
/**
 * Apply random dithering with simple parameters
 */
export function dithering_random(pixels: Uint8Array, width: number, height: number, levels: number): void;
/**
 * Apply error diffusion dithering with simple parameters
 */
export function dithering_error_diffusion(pixels: Uint8Array, width: number, height: number, levels: number): void;
/**
 * Remove small isolated pixel groups (dust removal)
 */
export function dust_removal(pixels: Uint8Array, width: number, height: number, options: DustRemovalOption): void;
/**
 * Remove small isolated pixel groups with default settings
 */
export function dust_removal_simple(pixels: Uint8Array, width: number, height: number, max_size: number): void;
/**
 * Apply posterize effect to reduce the number of color levels
 */
export function posterize(pixels: Uint8Array, width: number, height: number, options: PosterizeOption): void;
/**
 * Apply posterize effect with simple level parameter
 */
export function posterize_simple(pixels: Uint8Array, width: number, height: number, levels: number): void;
/**
 * Apply brightness and contrast adjustments to the image
 */
export function brightness_contrast(pixels: Uint8Array, width: number, height: number, options: BrightnessContrastOption): void;
/**
 * Apply only contrast adjustment to the image
 */
export function contrast(pixels: Uint8Array, width: number, height: number, contrast: number): void;
/**
 * Apply only brightness adjustment to the image
 */
export function brightness(pixels: Uint8Array, width: number, height: number, brightness: number): void;
export function gaussian_blur(pixels: Uint8Array, width: number, height: number, options: GaussianBlurOption): void;
/**
 * 選択範囲制限付きスキャンライン FloodFill
 */
export function scanline_flood_fill_with_mask(
  buffer: Uint8Array,
  width: number,
  height: number,
  start_x: number,
  start_y: number,
  fill_color_r: number,
  fill_color_g: number,
  fill_color_b: number,
  fill_color_a: number,
  threshold: number,
  selection_mask: Uint8Array,
  limit_mode: string
): boolean;
/**
 * スキャンライン方式のFloodFill実装
 *
 * この実装は以下の特徴を持ちます：
 * - メモリ効率的なスキャンライン方式
 * - スタックオーバーフロー回避
 * - 高速な隣接色判定
 * - 選択範囲制限サポート
 */
export function scanline_flood_fill(
  buffer: Uint8Array,
  width: number,
  height: number,
  start_x: number,
  start_y: number,
  fill_color_r: number,
  fill_color_g: number,
  fill_color_b: number,
  fill_color_a: number,
  threshold: number
): boolean;
export function grayscale(pixels: Uint8Array, width: number, height: number): void;
export function patch_buffer_rgba(
  target: Uint8Array,
  target_width: number,
  target_height: number,
  patch: Uint8Array,
  patch_width: number,
  patch_height: number,
  offset_x: number,
  offset_y: number,
  options: PatchBufferRgbaOption
): Uint8Array;
export function patch_buffer_rgba_instant(
  target: Uint8Array,
  target_width: number,
  target_height: number,
  patch: Uint8Array,
  patch_width: number,
  patch_height: number,
  offset_x: number,
  offset_y: number,
  scale_x: number,
  scale_y: number,
  rotate_deg: number,
  options: PatchBufferRgbaOption
): void;
export function webp_to_raw(webp_buffer: Uint8Array, width: number, height: number): Uint8Array;
export function png_to_raw(png_buffer: Uint8Array, _width: number, _height: number): Uint8Array;
export function raw_to_webp(buffer: Uint8Array, width: number, height: number): Uint8Array;
export function raw_to_png(buffer: Uint8Array, width: number, height: number): Uint8Array;
export enum AlphaBlurMode {
  /**
   * Skip alpha channel (preserve original alpha values)
   */
  Skip = 0,
  /**
   * Apply blur to alpha channel as well
   */
  Blur = 1,
}
export enum AntialiasMode {
  Nearest = 0,
  Bilinear = 1,
  Bicubic = 2,
}
export enum DitheringMode {
  /**
   * Random dithering (white noise)
   */
  Random = 0,
  /**
   * Floyd-Steinberg error diffusion
   */
  ErrorDiffusion = 1,
  /**
   * Ordered dithering using Bayer matrix
   */
  Ordered = 2,
}
export class BrightnessContrastOption {
  free(): void;
  [Symbol.dispose](): void;
  constructor(brightness: number, contrast: number);
  /**
   * Brightness adjustment (-100.0 to 100.0, 0.0 = no change)
   */
  brightness: number;
  /**
   * Contrast adjustment (-100.0 to 100.0, 0.0 = no change)
   */
  contrast: number;
}
export class DitheringOption {
  free(): void;
  [Symbol.dispose](): void;
  constructor(mode: DitheringMode, levels: number, strength: number);
  /**
   * Dithering mode to use
   */
  mode: DitheringMode;
  /**
   * Number of levels per channel (2-32, affects quantization)
   */
  levels: number;
  /**
   * Strength of dithering effect (0.0-1.0)
   */
  strength: number;
}
export class DustRemovalOption {
  free(): void;
  [Symbol.dispose](): void;
  constructor(max_size: number, alpha_threshold: number);
  /**
   * Maximum size of pixel groups to remove (1-100, groups with this many pixels or fewer will be removed)
   */
  max_size: number;
  /**
   * Minimum alpha threshold to consider a pixel as non-transparent (0-255)
   */
  alpha_threshold: number;
}
export class GaussianBlurOption {
  free(): void;
  [Symbol.dispose](): void;
  constructor(radius: number, alpha_mode: AlphaBlurMode);
  /**
   * Blur radius (higher values create stronger blur effect)
   */
  radius: number;
  /**
   * How to handle the alpha channel
   */
  alpha_mode: AlphaBlurMode;
}
export class PatchBufferRgbaOption {
  free(): void;
  [Symbol.dispose](): void;
  constructor(antialias_mode: AntialiasMode, flip_x: boolean, flip_y: boolean);
  antialias_mode: AntialiasMode;
  flip_x: boolean;
  flip_y: boolean;
}
export class PosterizeOption {
  free(): void;
  [Symbol.dispose](): void;
  constructor(levels: number);
  /**
   * Number of levels per channel (1-32, higher values preserve more detail)
   */
  levels: number;
}
export class RgbaBuffer {
  free(): void;
  [Symbol.dispose](): void;
  dustRemoval(max_size: number, alpha_threshold: number): void;
  gaussianBlur(radius: number, alpha_mode: AlphaBlurMode): void;
  brightnessAndContrast(brightness: number, contrast: number): void;
  invert(): void;
  dithering(mode: DitheringMode, levels: number, strength: number): void;
  grayscale(): void;
  posterize(levels: number): void;
  blitFromRaw(
    source: Uint8Array,
    source_width: number,
    source_height: number,
    offset_x: number,
    offset_y: number,
    scale_x: number,
    scale_y: number,
    rotate_deg: number,
    antialias_mode: AntialiasMode,
    flip_x: boolean,
    flip_y: boolean
  ): void;
  cropWithMask(mask: Uint8Array, mask_width: number, mask_height: number, mask_offset_x: number, mask_offset_y: number): Uint8Array;
  sliceWithMask(mask: Uint8Array, mask_width: number, mask_height: number, mask_offset_x: number, mask_offset_y: number): Uint8Array;
  blitFromBuffer(
    source: RgbaBuffer,
    offset_x: number,
    offset_y: number,
    scale_x: number,
    scale_y: number,
    rotate_deg: number,
    antialias_mode: AntialiasMode,
    flip_x: boolean,
    flip_y: boolean
  ): void;
  writeRect(rect_x: number, rect_y: number, rect_width: number, rect_height: number, data: Uint8Array): boolean;
  writePixels(coords: Uint32Array, colors: Uint8Array): boolean;
  readRect(rect_x: number, rect_y: number, rect_width: number, rect_height: number): Uint8Array;
  exportPng(): Uint8Array;
  exportWebp(): Uint8Array;
  resizeWithOrigins(
    new_width: number,
    new_height: number,
    src_origin_x: number,
    src_origin_y: number,
    dest_origin_x: number,
    dest_origin_y: number
  ): void;
  resize(new_width: number, new_height: number): void;
  overwriteWith(raw: Uint8Array, width: number, height: number): boolean;
  get(x: number, y: number): Array<any>;
  len(): number;
  constructor(width: number, height: number);
  ptr(): number;
  set(x: number, y: number, r: number, g: number, b: number, a: number): boolean;
  clone(): RgbaBuffer;
  width(): number;
  height(): number;
  static fromRaw(width: number, height: number, buf: Uint8Array): RgbaBuffer;
  is_empty(): boolean;
  data(): Uint8ClampedArray;
  static fromWebp(width: number, height: number, webp_buf: Uint8Array): RgbaBuffer;
  isInBounds(x: number, y: number): boolean;
  indexGet(idx: number): Array<any>;
  indexSet(idx: number, r: number, g: number, b: number, a: number): boolean;
  floodFill(
    start_x: number,
    start_y: number,
    fill_color_r: number,
    fill_color_g: number,
    fill_color_b: number,
    fill_color_a: number,
    threshold: number
  ): boolean;
  fillAllCodes(fill_code: number): boolean;
  fillMaskArea(mask: Uint8Array, fill_color_r: number, fill_color_g: number, fill_color_b: number, fill_color_a: number): boolean;
  fillAllPixels(fill_color_r: number, fill_color_g: number, fill_color_b: number, fill_color_a: number): boolean;
  floodFillWithMask(
    start_x: number,
    start_y: number,
    fill_color_r: number,
    fill_color_g: number,
    fill_color_b: number,
    fill_color_a: number,
    threshold: number,
    selection_mask: Uint8Array,
    limit_mode: string
  ): boolean;
  importPng(png_buffer: Uint8Array, width: number, height: number): boolean;
  importRaw(raw: Uint8Array, width: number, height: number): boolean;
  importWebp(webp_buffer: Uint8Array, width: number, height: number): boolean;
}
