/* tslint:disable */
/* eslint-disable */
export const memory: WebAssembly.Memory;
export const __wbg_ditheringoption_free: (a: number, b: number) => void;
export const __wbg_get_ditheringoption_levels: (a: number) => number;
export const __wbg_get_ditheringoption_mode: (a: number) => number;
export const __wbg_get_ditheringoption_strength: (a: number) => number;
export const __wbg_set_ditheringoption_levels: (a: number, b: number) => void;
export const __wbg_set_ditheringoption_mode: (a: number, b: number) => void;
export const __wbg_set_ditheringoption_strength: (a: number, b: number) => void;
export const dithering: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const dithering_error_diffusion: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const dithering_ordered: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const dithering_random: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const ditheringoption_new: (a: number, b: number, c: number) => number;
export const fill_mask_area: (a: number, b: number, c: any, d: number, e: number, f: number, g: number, h: number, i: number) => number;
export const invert: (a: number, b: number, c: any, d: number, e: number) => void;
export const rgbabuffer_blitFromBuffer: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number
) => void;
export const rgbabuffer_blitFromRaw: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number,
  k: number,
  l: number,
  m: number
) => void;
export const rgbabuffer_brightnessAndContrast: (a: number, b: number, c: number) => void;
export const rgbabuffer_cropWithMask: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
export const rgbabuffer_dithering: (a: number, b: number, c: number, d: number) => void;
export const rgbabuffer_dustRemoval: (a: number, b: number, c: number) => void;
export const rgbabuffer_gaussianBlur: (a: number, b: number, c: number) => void;
export const rgbabuffer_grayscale: (a: number) => void;
export const rgbabuffer_invert: (a: number) => void;
export const rgbabuffer_posterize: (a: number, b: number) => void;
export const rgbabuffer_sliceWithMask: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => [number, number];
export const __wbg_dustremovaloption_free: (a: number, b: number) => void;
export const __wbg_get_dustremovaloption_alpha_threshold: (a: number) => number;
export const __wbg_get_dustremovaloption_max_size: (a: number) => number;
export const __wbg_posterizeoption_free: (a: number, b: number) => void;
export const __wbg_set_dustremovaloption_alpha_threshold: (a: number, b: number) => void;
export const __wbg_set_dustremovaloption_max_size: (a: number, b: number) => void;
export const dust_removal: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const dust_removal_simple: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const dustremovaloption_new: (a: number, b: number) => number;
export const posterize: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const posterize_simple: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const posterizeoption_new: (a: number) => number;
export const rgbabuffer_exportPng: (a: number) => [number, number];
export const rgbabuffer_exportWebp: (a: number) => [number, number];
export const rgbabuffer_readRect: (a: number, b: number, c: number, d: number, e: number) => [number, number];
export const rgbabuffer_resize: (a: number, b: number, c: number) => void;
export const rgbabuffer_resizeWithOrigins: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => void;
export const rgbabuffer_writePixels: (a: number, b: number, c: number, d: number, e: number) => number;
export const rgbabuffer_writeRect: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
export const __wbg_set_posterizeoption_levels: (a: number, b: number) => void;
export const __wbg_get_posterizeoption_levels: (a: number) => number;
export const __wbg_brightnesscontrastoption_free: (a: number, b: number) => void;
export const __wbg_get_brightnesscontrastoption_brightness: (a: number) => number;
export const __wbg_get_brightnesscontrastoption_contrast: (a: number) => number;
export const __wbg_set_brightnesscontrastoption_brightness: (a: number, b: number) => void;
export const __wbg_set_brightnesscontrastoption_contrast: (a: number, b: number) => void;
export const brightness: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const brightness_contrast: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const brightnesscontrastoption_new: (a: number, b: number) => number;
export const contrast: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const __wbg_rgbabuffer_free: (a: number, b: number) => void;
export const __wbg_gaussianbluroption_free: (a: number, b: number) => void;
export const __wbg_get_gaussianbluroption_alpha_mode: (a: number) => number;
export const __wbg_get_gaussianbluroption_radius: (a: number) => number;
export const __wbg_set_gaussianbluroption_alpha_mode: (a: number, b: number) => void;
export const __wbg_set_gaussianbluroption_radius: (a: number, b: number) => void;
export const gaussian_blur: (a: number, b: number, c: any, d: number, e: number, f: number) => void;
export const gaussianbluroption_new: (a: number, b: number) => number;
export const grayscale: (a: number, b: number, c: any, d: number, e: number) => void;
export const rgbabuffer_clone: (a: number) => number;
export const rgbabuffer_data: (a: number) => any;
export const rgbabuffer_fillAllCodes: (a: number, b: number) => number;
export const rgbabuffer_fillAllPixels: (a: number, b: number, c: number, d: number, e: number) => number;
export const rgbabuffer_fillMaskArea: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
export const rgbabuffer_floodFill: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
export const rgbabuffer_floodFillWithMask: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number,
  k: number,
  l: number
) => number;
export const rgbabuffer_fromRaw: (a: number, b: number, c: number, d: number) => [number, number, number];
export const rgbabuffer_fromWebp: (a: number, b: number, c: number, d: number) => [number, number, number];
export const rgbabuffer_get: (a: number, b: number, c: number) => any;
export const rgbabuffer_height: (a: number) => number;
export const rgbabuffer_importPng: (a: number, b: number, c: number, d: number, e: number) => number;
export const rgbabuffer_importRaw: (a: number, b: number, c: number, d: number, e: number) => number;
export const rgbabuffer_importWebp: (a: number, b: number, c: number, d: number, e: number) => number;
export const rgbabuffer_indexGet: (a: number, b: number) => any;
export const rgbabuffer_indexSet: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
export const rgbabuffer_isInBounds: (a: number, b: number, c: number) => number;
export const rgbabuffer_is_empty: (a: number) => number;
export const rgbabuffer_len: (a: number) => number;
export const rgbabuffer_new: (a: number, b: number) => number;
export const rgbabuffer_overwriteWith: (a: number, b: number, c: number, d: number, e: number) => number;
export const rgbabuffer_ptr: (a: number) => number;
export const rgbabuffer_set: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
export const rgbabuffer_width: (a: number) => number;
export const scanline_flood_fill: (
  a: number,
  b: number,
  c: any,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number,
  k: number,
  l: number
) => number;
export const scanline_flood_fill_with_mask: (
  a: number,
  b: number,
  c: any,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number,
  k: number,
  l: number,
  m: number,
  n: number,
  o: number,
  p: number
) => number;
export const __wbg_get_patchbufferrgbaoption_antialias_mode: (a: number) => number;
export const __wbg_get_patchbufferrgbaoption_flip_x: (a: number) => number;
export const __wbg_get_patchbufferrgbaoption_flip_y: (a: number) => number;
export const __wbg_patchbufferrgbaoption_free: (a: number, b: number) => void;
export const __wbg_set_patchbufferrgbaoption_antialias_mode: (a: number, b: number) => void;
export const __wbg_set_patchbufferrgbaoption_flip_x: (a: number, b: number) => void;
export const __wbg_set_patchbufferrgbaoption_flip_y: (a: number, b: number) => void;
export const patch_buffer_rgba: (
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number,
  k: number
) => [number, number];
export const patch_buffer_rgba_instant: (
  a: number,
  b: number,
  c: any,
  d: number,
  e: number,
  f: number,
  g: number,
  h: number,
  i: number,
  j: number,
  k: number,
  l: number,
  m: number,
  n: number,
  o: number
) => void;
export const patchbufferrgbaoption_new: (a: number, b: number, c: number) => number;
export const png_to_raw: (a: number, b: number, c: number, d: number) => [number, number];
export const raw_to_png: (a: number, b: number, c: number, d: number) => [number, number];
export const raw_to_webp: (a: number, b: number, c: number, d: number) => [number, number];
export const webp_to_raw: (a: number, b: number, c: number, d: number) => [number, number];
export const __wbindgen_externrefs: WebAssembly.Table;
export const __wbindgen_malloc: (a: number, b: number) => number;
export const __wbindgen_free: (a: number, b: number, c: number) => void;
export const __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
export const __externref_table_dealloc: (a: number) => void;
export const __wbindgen_start: () => void;
