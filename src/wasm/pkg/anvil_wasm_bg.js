let wasm;
export function __wbg_set_wasm(val) {
  wasm = val;
}

let cachedUint8ArrayMemory0 = null;

function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return decodeText(ptr, len);
}

let WASM_VECTOR_LEN = 0;

function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
/**
 * @param {Uint8Array} buffer
 * @param {Uint8Array} mask
 * @param {number} fill_color_r
 * @param {number} fill_color_g
 * @param {number} fill_color_b
 * @param {number} fill_color_a
 * @returns {boolean}
 */
export function fill_mask_area(buffer, mask, fill_color_r, fill_color_g, fill_color_b, fill_color_a) {
  var ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  const ptr1 = passArray8ToWasm0(mask, wasm.__wbindgen_malloc);
  const len1 = WASM_VECTOR_LEN;
  const ret = wasm.fill_mask_area(ptr0, len0, buffer, ptr1, len1, fill_color_r, fill_color_g, fill_color_b, fill_color_a);
  return ret !== 0;
}

function _assertClass(instance, klass) {
  if (!(instance instanceof klass)) {
    throw new Error(`expected instance of ${klass.name}`);
  }
}
/**
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 */
export function invert(pixels, width, height) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  wasm.invert(ptr0, len0, pixels, width, height);
}

/**
 * Apply ordered dithering with simple parameters
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {number} levels
 */
export function dithering_ordered(pixels, width, height, levels) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  wasm.dithering_ordered(ptr0, len0, pixels, width, height, levels);
}

/**
 * Apply dithering effect to the image
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {DitheringOption} options
 */
export function dithering(pixels, width, height, options) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  _assertClass(options, DitheringOption);
  wasm.dithering(ptr0, len0, pixels, width, height, options.__wbg_ptr);
}

/**
 * Apply random dithering with simple parameters
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {number} levels
 */
export function dithering_random(pixels, width, height, levels) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  wasm.dithering_random(ptr0, len0, pixels, width, height, levels);
}

/**
 * Apply error diffusion dithering with simple parameters
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {number} levels
 */
export function dithering_error_diffusion(pixels, width, height, levels) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  wasm.dithering_error_diffusion(ptr0, len0, pixels, width, height, levels);
}

let cachedUint32ArrayMemory0 = null;

function getUint32ArrayMemory0() {
  if (cachedUint32ArrayMemory0 === null || cachedUint32ArrayMemory0.byteLength === 0) {
    cachedUint32ArrayMemory0 = new Uint32Array(wasm.memory.buffer);
  }
  return cachedUint32ArrayMemory0;
}

function passArray32ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 4, 4) >>> 0;
  getUint32ArrayMemory0().set(arg, ptr / 4);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}
/**
 * Remove small isolated pixel groups (dust removal)
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {DustRemovalOption} options
 */
export function dust_removal(pixels, width, height, options) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  _assertClass(options, DustRemovalOption);
  wasm.dust_removal(ptr0, len0, pixels, width, height, options.__wbg_ptr);
}

/**
 * Remove small isolated pixel groups with default settings
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {number} max_size
 */
export function dust_removal_simple(pixels, width, height, max_size) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  wasm.dust_removal_simple(ptr0, len0, pixels, width, height, max_size);
}

/**
 * Apply posterize effect to reduce the number of color levels
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {PosterizeOption} options
 */
export function posterize(pixels, width, height, options) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  _assertClass(options, PosterizeOption);
  wasm.posterize(ptr0, len0, pixels, width, height, options.__wbg_ptr);
}

/**
 * Apply posterize effect with simple level parameter
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {number} levels
 */
export function posterize_simple(pixels, width, height, levels) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  wasm.posterize_simple(ptr0, len0, pixels, width, height, levels);
}

/**
 * Apply brightness and contrast adjustments to the image
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {BrightnessContrastOption} options
 */
export function brightness_contrast(pixels, width, height, options) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  _assertClass(options, BrightnessContrastOption);
  wasm.brightness_contrast(ptr0, len0, pixels, width, height, options.__wbg_ptr);
}

/**
 * Apply only contrast adjustment to the image
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {number} contrast
 */
export function contrast(pixels, width, height, contrast) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  wasm.contrast(ptr0, len0, pixels, width, height, contrast);
}

/**
 * Apply only brightness adjustment to the image
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {number} brightness
 */
export function brightness(pixels, width, height, brightness) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  wasm.brightness(ptr0, len0, pixels, width, height, brightness);
}

/**
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 * @param {GaussianBlurOption} options
 */
export function gaussian_blur(pixels, width, height, options) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  _assertClass(options, GaussianBlurOption);
  wasm.gaussian_blur(ptr0, len0, pixels, width, height, options.__wbg_ptr);
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
  cachedTextEncoder.encodeInto = function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length,
    };
  };
}

function passStringToWasm0(arg, malloc, realloc) {
  if (realloc === undefined) {
    const buf = cachedTextEncoder.encode(arg);
    const ptr = malloc(buf.length, 1) >>> 0;
    getUint8ArrayMemory0()
      .subarray(ptr, ptr + buf.length)
      .set(buf);
    WASM_VECTOR_LEN = buf.length;
    return ptr;
  }

  let len = arg.length;
  let ptr = malloc(len, 1) >>> 0;

  const mem = getUint8ArrayMemory0();

  let offset = 0;

  for (; offset < len; offset++) {
    const code = arg.charCodeAt(offset);
    if (code > 0x7f) break;
    mem[ptr + offset] = code;
  }

  if (offset !== len) {
    if (offset !== 0) {
      arg = arg.slice(offset);
    }
    ptr = realloc(ptr, len, (len = offset + arg.length * 3), 1) >>> 0;
    const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
    const ret = cachedTextEncoder.encodeInto(arg, view);

    offset += ret.written;
    ptr = realloc(ptr, len, offset, 1) >>> 0;
  }

  WASM_VECTOR_LEN = offset;
  return ptr;
}
/**
 * 選択範囲制限付きスキャンライン FloodFill
 * @param {Uint8Array} buffer
 * @param {number} width
 * @param {number} height
 * @param {number} start_x
 * @param {number} start_y
 * @param {number} fill_color_r
 * @param {number} fill_color_g
 * @param {number} fill_color_b
 * @param {number} fill_color_a
 * @param {number} threshold
 * @param {Uint8Array} selection_mask
 * @param {string} limit_mode
 * @returns {boolean}
 */
export function scanline_flood_fill_with_mask(
  buffer,
  width,
  height,
  start_x,
  start_y,
  fill_color_r,
  fill_color_g,
  fill_color_b,
  fill_color_a,
  threshold,
  selection_mask,
  limit_mode
) {
  var ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  const ptr1 = passArray8ToWasm0(selection_mask, wasm.__wbindgen_malloc);
  const len1 = WASM_VECTOR_LEN;
  const ptr2 = passStringToWasm0(limit_mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
  const len2 = WASM_VECTOR_LEN;
  const ret = wasm.scanline_flood_fill_with_mask(
    ptr0,
    len0,
    buffer,
    width,
    height,
    start_x,
    start_y,
    fill_color_r,
    fill_color_g,
    fill_color_b,
    fill_color_a,
    threshold,
    ptr1,
    len1,
    ptr2,
    len2
  );
  return ret !== 0;
}

/**
 * スキャンライン方式のFloodFill実装
 *
 * この実装は以下の特徴を持ちます：
 * - メモリ効率的なスキャンライン方式
 * - スタックオーバーフロー回避
 * - 高速な隣接色判定
 * - 選択範囲制限サポート
 * @param {Uint8Array} buffer
 * @param {number} width
 * @param {number} height
 * @param {number} start_x
 * @param {number} start_y
 * @param {number} fill_color_r
 * @param {number} fill_color_g
 * @param {number} fill_color_b
 * @param {number} fill_color_a
 * @param {number} threshold
 * @returns {boolean}
 */
export function scanline_flood_fill(buffer, width, height, start_x, start_y, fill_color_r, fill_color_g, fill_color_b, fill_color_a, threshold) {
  var ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  const ret = wasm.scanline_flood_fill(
    ptr0,
    len0,
    buffer,
    width,
    height,
    start_x,
    start_y,
    fill_color_r,
    fill_color_g,
    fill_color_b,
    fill_color_a,
    threshold
  );
  return ret !== 0;
}

function takeFromExternrefTable0(idx) {
  const value = wasm.__wbindgen_externrefs.get(idx);
  wasm.__externref_table_dealloc(idx);
  return value;
}
/**
 * @param {Uint8Array} pixels
 * @param {number} width
 * @param {number} height
 */
export function grayscale(pixels, width, height) {
  var ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  wasm.grayscale(ptr0, len0, pixels, width, height);
}

/**
 * @param {Uint8Array} target
 * @param {number} target_width
 * @param {number} target_height
 * @param {Uint8Array} patch
 * @param {number} patch_width
 * @param {number} patch_height
 * @param {number} offset_x
 * @param {number} offset_y
 * @param {PatchBufferRgbaOption} options
 * @returns {Uint8Array}
 */
export function patch_buffer_rgba(target, target_width, target_height, patch, patch_width, patch_height, offset_x, offset_y, options) {
  const ptr0 = passArray8ToWasm0(target, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ptr1 = passArray8ToWasm0(patch, wasm.__wbindgen_malloc);
  const len1 = WASM_VECTOR_LEN;
  _assertClass(options, PatchBufferRgbaOption);
  const ret = wasm.patch_buffer_rgba(
    ptr0,
    len0,
    target_width,
    target_height,
    ptr1,
    len1,
    patch_width,
    patch_height,
    offset_x,
    offset_y,
    options.__wbg_ptr
  );
  var v3 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v3;
}

/**
 * @param {Uint8Array} target
 * @param {number} target_width
 * @param {number} target_height
 * @param {Uint8Array} patch
 * @param {number} patch_width
 * @param {number} patch_height
 * @param {number} offset_x
 * @param {number} offset_y
 * @param {number} scale_x
 * @param {number} scale_y
 * @param {number} rotate_deg
 * @param {PatchBufferRgbaOption} options
 */
export function patch_buffer_rgba_instant(
  target,
  target_width,
  target_height,
  patch,
  patch_width,
  patch_height,
  offset_x,
  offset_y,
  scale_x,
  scale_y,
  rotate_deg,
  options
) {
  var ptr0 = passArray8ToWasm0(target, wasm.__wbindgen_malloc);
  var len0 = WASM_VECTOR_LEN;
  const ptr1 = passArray8ToWasm0(patch, wasm.__wbindgen_malloc);
  const len1 = WASM_VECTOR_LEN;
  _assertClass(options, PatchBufferRgbaOption);
  wasm.patch_buffer_rgba_instant(
    ptr0,
    len0,
    target,
    target_width,
    target_height,
    ptr1,
    len1,
    patch_width,
    patch_height,
    offset_x,
    offset_y,
    scale_x,
    scale_y,
    rotate_deg,
    options.__wbg_ptr
  );
}

/**
 * @param {Uint8Array} webp_buffer
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array}
 */
export function webp_to_raw(webp_buffer, width, height) {
  const ptr0 = passArray8ToWasm0(webp_buffer, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.webp_to_raw(ptr0, len0, width, height);
  var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v2;
}

/**
 * @param {Uint8Array} png_buffer
 * @param {number} _width
 * @param {number} _height
 * @returns {Uint8Array}
 */
export function png_to_raw(png_buffer, _width, _height) {
  const ptr0 = passArray8ToWasm0(png_buffer, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.png_to_raw(ptr0, len0, _width, _height);
  var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v2;
}

/**
 * @param {Uint8Array} buffer
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array}
 */
export function raw_to_webp(buffer, width, height) {
  const ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.raw_to_webp(ptr0, len0, width, height);
  var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v2;
}

/**
 * @param {Uint8Array} buffer
 * @param {number} width
 * @param {number} height
 * @returns {Uint8Array}
 */
export function raw_to_png(buffer, width, height) {
  const ptr0 = passArray8ToWasm0(buffer, wasm.__wbindgen_malloc);
  const len0 = WASM_VECTOR_LEN;
  const ret = wasm.raw_to_png(ptr0, len0, width, height);
  var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
  wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
  return v2;
}

/**
 * @enum {0 | 1}
 */
export const AlphaBlurMode = Object.freeze({
  /**
   * Skip alpha channel (preserve original alpha values)
   */
  Skip: 0,
  0: 'Skip',
  /**
   * Apply blur to alpha channel as well
   */
  Blur: 1,
  1: 'Blur',
});
/**
 * @enum {0 | 1 | 2}
 */
export const AntialiasMode = Object.freeze({
  Nearest: 0,
  0: 'Nearest',
  Bilinear: 1,
  1: 'Bilinear',
  Bicubic: 2,
  2: 'Bicubic',
});
/**
 * @enum {0 | 1 | 2}
 */
export const DitheringMode = Object.freeze({
  /**
   * Random dithering (white noise)
   */
  Random: 0,
  0: 'Random',
  /**
   * Floyd-Steinberg error diffusion
   */
  ErrorDiffusion: 1,
  1: 'ErrorDiffusion',
  /**
   * Ordered dithering using Bayer matrix
   */
  Ordered: 2,
  2: 'Ordered',
});

const BrightnessContrastOptionFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_brightnesscontrastoption_free(ptr >>> 0, 1));

export class BrightnessContrastOption {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    BrightnessContrastOptionFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_brightnesscontrastoption_free(ptr, 0);
  }
  /**
   * Brightness adjustment (-100.0 to 100.0, 0.0 = no change)
   * @returns {number}
   */
  get brightness() {
    const ret = wasm.__wbg_get_brightnesscontrastoption_brightness(this.__wbg_ptr);
    return ret;
  }
  /**
   * Brightness adjustment (-100.0 to 100.0, 0.0 = no change)
   * @param {number} arg0
   */
  set brightness(arg0) {
    wasm.__wbg_set_brightnesscontrastoption_brightness(this.__wbg_ptr, arg0);
  }
  /**
   * Contrast adjustment (-100.0 to 100.0, 0.0 = no change)
   * @returns {number}
   */
  get contrast() {
    const ret = wasm.__wbg_get_brightnesscontrastoption_contrast(this.__wbg_ptr);
    return ret;
  }
  /**
   * Contrast adjustment (-100.0 to 100.0, 0.0 = no change)
   * @param {number} arg0
   */
  set contrast(arg0) {
    wasm.__wbg_set_brightnesscontrastoption_contrast(this.__wbg_ptr, arg0);
  }
  /**
   * @param {number} brightness
   * @param {number} contrast
   */
  constructor(brightness, contrast) {
    const ret = wasm.brightnesscontrastoption_new(brightness, contrast);
    this.__wbg_ptr = ret >>> 0;
    BrightnessContrastOptionFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
}
if (Symbol.dispose) BrightnessContrastOption.prototype[Symbol.dispose] = BrightnessContrastOption.prototype.free;

const DitheringOptionFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_ditheringoption_free(ptr >>> 0, 1));

export class DitheringOption {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    DitheringOptionFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_ditheringoption_free(ptr, 0);
  }
  /**
   * @param {DitheringMode} mode
   * @param {number} levels
   * @param {number} strength
   */
  constructor(mode, levels, strength) {
    const ret = wasm.ditheringoption_new(mode, levels, strength);
    this.__wbg_ptr = ret >>> 0;
    DitheringOptionFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * Dithering mode to use
   * @returns {DitheringMode}
   */
  get mode() {
    const ret = wasm.__wbg_get_ditheringoption_mode(this.__wbg_ptr);
    return ret;
  }
  /**
   * Dithering mode to use
   * @param {DitheringMode} arg0
   */
  set mode(arg0) {
    wasm.__wbg_set_ditheringoption_mode(this.__wbg_ptr, arg0);
  }
  /**
   * Number of levels per channel (2-32, affects quantization)
   * @returns {number}
   */
  get levels() {
    const ret = wasm.__wbg_get_ditheringoption_levels(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * Number of levels per channel (2-32, affects quantization)
   * @param {number} arg0
   */
  set levels(arg0) {
    wasm.__wbg_set_ditheringoption_levels(this.__wbg_ptr, arg0);
  }
  /**
   * Strength of dithering effect (0.0-1.0)
   * @returns {number}
   */
  get strength() {
    const ret = wasm.__wbg_get_ditheringoption_strength(this.__wbg_ptr);
    return ret;
  }
  /**
   * Strength of dithering effect (0.0-1.0)
   * @param {number} arg0
   */
  set strength(arg0) {
    wasm.__wbg_set_ditheringoption_strength(this.__wbg_ptr, arg0);
  }
}
if (Symbol.dispose) DitheringOption.prototype[Symbol.dispose] = DitheringOption.prototype.free;

const DustRemovalOptionFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_dustremovaloption_free(ptr >>> 0, 1));

export class DustRemovalOption {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    DustRemovalOptionFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_dustremovaloption_free(ptr, 0);
  }
  /**
   * @param {number} max_size
   * @param {number} alpha_threshold
   */
  constructor(max_size, alpha_threshold) {
    const ret = wasm.dustremovaloption_new(max_size, alpha_threshold);
    this.__wbg_ptr = ret >>> 0;
    DustRemovalOptionFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * Maximum size of pixel groups to remove (1-100, groups with this many pixels or fewer will be removed)
   * @returns {number}
   */
  get max_size() {
    const ret = wasm.__wbg_get_dustremovaloption_max_size(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * Maximum size of pixel groups to remove (1-100, groups with this many pixels or fewer will be removed)
   * @param {number} arg0
   */
  set max_size(arg0) {
    wasm.__wbg_set_dustremovaloption_max_size(this.__wbg_ptr, arg0);
  }
  /**
   * Minimum alpha threshold to consider a pixel as non-transparent (0-255)
   * @returns {number}
   */
  get alpha_threshold() {
    const ret = wasm.__wbg_get_dustremovaloption_alpha_threshold(this.__wbg_ptr);
    return ret;
  }
  /**
   * Minimum alpha threshold to consider a pixel as non-transparent (0-255)
   * @param {number} arg0
   */
  set alpha_threshold(arg0) {
    wasm.__wbg_set_dustremovaloption_alpha_threshold(this.__wbg_ptr, arg0);
  }
}
if (Symbol.dispose) DustRemovalOption.prototype[Symbol.dispose] = DustRemovalOption.prototype.free;

const GaussianBlurOptionFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_gaussianbluroption_free(ptr >>> 0, 1));

export class GaussianBlurOption {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    GaussianBlurOptionFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_gaussianbluroption_free(ptr, 0);
  }
  /**
   * @param {number} radius
   * @param {AlphaBlurMode} alpha_mode
   */
  constructor(radius, alpha_mode) {
    const ret = wasm.gaussianbluroption_new(radius, alpha_mode);
    this.__wbg_ptr = ret >>> 0;
    GaussianBlurOptionFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * Blur radius (higher values create stronger blur effect)
   * @returns {number}
   */
  get radius() {
    const ret = wasm.__wbg_get_gaussianbluroption_radius(this.__wbg_ptr);
    return ret;
  }
  /**
   * Blur radius (higher values create stronger blur effect)
   * @param {number} arg0
   */
  set radius(arg0) {
    wasm.__wbg_set_gaussianbluroption_radius(this.__wbg_ptr, arg0);
  }
  /**
   * How to handle the alpha channel
   * @returns {AlphaBlurMode}
   */
  get alpha_mode() {
    const ret = wasm.__wbg_get_gaussianbluroption_alpha_mode(this.__wbg_ptr);
    return ret;
  }
  /**
   * How to handle the alpha channel
   * @param {AlphaBlurMode} arg0
   */
  set alpha_mode(arg0) {
    wasm.__wbg_set_gaussianbluroption_alpha_mode(this.__wbg_ptr, arg0);
  }
}
if (Symbol.dispose) GaussianBlurOption.prototype[Symbol.dispose] = GaussianBlurOption.prototype.free;

const PatchBufferRgbaOptionFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_patchbufferrgbaoption_free(ptr >>> 0, 1));

export class PatchBufferRgbaOption {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    PatchBufferRgbaOptionFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_patchbufferrgbaoption_free(ptr, 0);
  }
  /**
   * @returns {AntialiasMode}
   */
  get antialias_mode() {
    const ret = wasm.__wbg_get_patchbufferrgbaoption_antialias_mode(this.__wbg_ptr);
    return ret;
  }
  /**
   * @param {AntialiasMode} arg0
   */
  set antialias_mode(arg0) {
    wasm.__wbg_set_patchbufferrgbaoption_antialias_mode(this.__wbg_ptr, arg0);
  }
  /**
   * @returns {boolean}
   */
  get flip_x() {
    const ret = wasm.__wbg_get_patchbufferrgbaoption_flip_x(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * @param {boolean} arg0
   */
  set flip_x(arg0) {
    wasm.__wbg_set_patchbufferrgbaoption_flip_x(this.__wbg_ptr, arg0);
  }
  /**
   * @returns {boolean}
   */
  get flip_y() {
    const ret = wasm.__wbg_get_patchbufferrgbaoption_flip_y(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * @param {boolean} arg0
   */
  set flip_y(arg0) {
    wasm.__wbg_set_patchbufferrgbaoption_flip_y(this.__wbg_ptr, arg0);
  }
  /**
   * @param {AntialiasMode} antialias_mode
   * @param {boolean} flip_x
   * @param {boolean} flip_y
   */
  constructor(antialias_mode, flip_x, flip_y) {
    const ret = wasm.patchbufferrgbaoption_new(antialias_mode, flip_x, flip_y);
    this.__wbg_ptr = ret >>> 0;
    PatchBufferRgbaOptionFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
}
if (Symbol.dispose) PatchBufferRgbaOption.prototype[Symbol.dispose] = PatchBufferRgbaOption.prototype.free;

const PosterizeOptionFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_posterizeoption_free(ptr >>> 0, 1));

export class PosterizeOption {
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    PosterizeOptionFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_posterizeoption_free(ptr, 0);
  }
  /**
   * @param {number} levels
   */
  constructor(levels) {
    const ret = wasm.posterizeoption_new(levels);
    this.__wbg_ptr = ret >>> 0;
    PosterizeOptionFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * Number of levels per channel (1-32, higher values preserve more detail)
   * @returns {number}
   */
  get levels() {
    const ret = wasm.__wbg_get_dustremovaloption_max_size(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * Number of levels per channel (1-32, higher values preserve more detail)
   * @param {number} arg0
   */
  set levels(arg0) {
    wasm.__wbg_set_dustremovaloption_max_size(this.__wbg_ptr, arg0);
  }
}
if (Symbol.dispose) PosterizeOption.prototype[Symbol.dispose] = PosterizeOption.prototype.free;

const RgbaBufferFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_rgbabuffer_free(ptr >>> 0, 1));

export class RgbaBuffer {
  static __wrap(ptr) {
    ptr = ptr >>> 0;
    const obj = Object.create(RgbaBuffer.prototype);
    obj.__wbg_ptr = ptr;
    RgbaBufferFinalization.register(obj, obj.__wbg_ptr, obj);
    return obj;
  }

  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    RgbaBufferFinalization.unregister(this);
    return ptr;
  }

  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_rgbabuffer_free(ptr, 0);
  }
  /**
   * @param {number} max_size
   * @param {number} alpha_threshold
   */
  dustRemoval(max_size, alpha_threshold) {
    wasm.rgbabuffer_dustRemoval(this.__wbg_ptr, max_size, alpha_threshold);
  }
  /**
   * @param {number} radius
   * @param {AlphaBlurMode} alpha_mode
   */
  gaussianBlur(radius, alpha_mode) {
    wasm.rgbabuffer_gaussianBlur(this.__wbg_ptr, radius, alpha_mode);
  }
  /**
   * @param {number} brightness
   * @param {number} contrast
   */
  brightnessAndContrast(brightness, contrast) {
    wasm.rgbabuffer_brightnessAndContrast(this.__wbg_ptr, brightness, contrast);
  }
  invert() {
    wasm.rgbabuffer_invert(this.__wbg_ptr);
  }
  /**
   * @param {DitheringMode} mode
   * @param {number} levels
   * @param {number} strength
   */
  dithering(mode, levels, strength) {
    wasm.rgbabuffer_dithering(this.__wbg_ptr, mode, levels, strength);
  }
  grayscale() {
    wasm.rgbabuffer_grayscale(this.__wbg_ptr);
  }
  /**
   * @param {number} levels
   */
  posterize(levels) {
    wasm.rgbabuffer_posterize(this.__wbg_ptr, levels);
  }
  /**
   * @param {Uint8Array} source
   * @param {number} source_width
   * @param {number} source_height
   * @param {number} offset_x
   * @param {number} offset_y
   * @param {number} scale_x
   * @param {number} scale_y
   * @param {number} rotate_deg
   * @param {AntialiasMode} antialias_mode
   * @param {boolean} flip_x
   * @param {boolean} flip_y
   */
  blitFromRaw(source, source_width, source_height, offset_x, offset_y, scale_x, scale_y, rotate_deg, antialias_mode, flip_x, flip_y) {
    const ptr0 = passArray8ToWasm0(source, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    wasm.rgbabuffer_blitFromRaw(
      this.__wbg_ptr,
      ptr0,
      len0,
      source_width,
      source_height,
      offset_x,
      offset_y,
      scale_x,
      scale_y,
      rotate_deg,
      antialias_mode,
      flip_x,
      flip_y
    );
  }
  /**
   * @param {Uint8Array} mask
   * @param {number} mask_width
   * @param {number} mask_height
   * @param {number} mask_offset_x
   * @param {number} mask_offset_y
   * @returns {Uint8Array}
   */
  cropWithMask(mask, mask_width, mask_height, mask_offset_x, mask_offset_y) {
    const ptr0 = passArray8ToWasm0(mask, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_cropWithMask(this.__wbg_ptr, ptr0, len0, mask_width, mask_height, mask_offset_x, mask_offset_y);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
  }
  /**
   * @param {Uint8Array} mask
   * @param {number} mask_width
   * @param {number} mask_height
   * @param {number} mask_offset_x
   * @param {number} mask_offset_y
   * @returns {Uint8Array}
   */
  sliceWithMask(mask, mask_width, mask_height, mask_offset_x, mask_offset_y) {
    const ptr0 = passArray8ToWasm0(mask, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_sliceWithMask(this.__wbg_ptr, ptr0, len0, mask_width, mask_height, mask_offset_x, mask_offset_y);
    var v2 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v2;
  }
  /**
   * @param {RgbaBuffer} source
   * @param {number} offset_x
   * @param {number} offset_y
   * @param {number} scale_x
   * @param {number} scale_y
   * @param {number} rotate_deg
   * @param {AntialiasMode} antialias_mode
   * @param {boolean} flip_x
   * @param {boolean} flip_y
   */
  blitFromBuffer(source, offset_x, offset_y, scale_x, scale_y, rotate_deg, antialias_mode, flip_x, flip_y) {
    _assertClass(source, RgbaBuffer);
    wasm.rgbabuffer_blitFromBuffer(
      this.__wbg_ptr,
      source.__wbg_ptr,
      offset_x,
      offset_y,
      scale_x,
      scale_y,
      rotate_deg,
      antialias_mode,
      flip_x,
      flip_y
    );
  }
  /**
   * @param {number} rect_x
   * @param {number} rect_y
   * @param {number} rect_width
   * @param {number} rect_height
   * @param {Uint8Array} data
   * @returns {boolean}
   */
  writeRect(rect_x, rect_y, rect_width, rect_height, data) {
    const ptr0 = passArray8ToWasm0(data, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_writeRect(this.__wbg_ptr, rect_x, rect_y, rect_width, rect_height, ptr0, len0);
    return ret !== 0;
  }
  /**
   * @param {Uint32Array} coords
   * @param {Uint8Array} colors
   * @returns {boolean}
   */
  writePixels(coords, colors) {
    const ptr0 = passArray32ToWasm0(coords, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passArray8ToWasm0(colors, wasm.__wbindgen_malloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_writePixels(this.__wbg_ptr, ptr0, len0, ptr1, len1);
    return ret !== 0;
  }
  /**
   * @param {number} rect_x
   * @param {number} rect_y
   * @param {number} rect_width
   * @param {number} rect_height
   * @returns {Uint8Array}
   */
  readRect(rect_x, rect_y, rect_width, rect_height) {
    const ret = wasm.rgbabuffer_readRect(this.__wbg_ptr, rect_x, rect_y, rect_width, rect_height);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
  }
  /**
   * @returns {Uint8Array}
   */
  exportPng() {
    const ret = wasm.rgbabuffer_exportPng(this.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
  }
  /**
   * @returns {Uint8Array}
   */
  exportWebp() {
    const ret = wasm.rgbabuffer_exportWebp(this.__wbg_ptr);
    var v1 = getArrayU8FromWasm0(ret[0], ret[1]).slice();
    wasm.__wbindgen_free(ret[0], ret[1] * 1, 1);
    return v1;
  }
  /**
   * @param {number} new_width
   * @param {number} new_height
   * @param {number} src_origin_x
   * @param {number} src_origin_y
   * @param {number} dest_origin_x
   * @param {number} dest_origin_y
   */
  resizeWithOrigins(new_width, new_height, src_origin_x, src_origin_y, dest_origin_x, dest_origin_y) {
    wasm.rgbabuffer_resizeWithOrigins(this.__wbg_ptr, new_width, new_height, src_origin_x, src_origin_y, dest_origin_x, dest_origin_y);
  }
  /**
   * @param {number} new_width
   * @param {number} new_height
   */
  resize(new_width, new_height) {
    wasm.rgbabuffer_resize(this.__wbg_ptr, new_width, new_height);
  }
  /**
   * @param {Uint8Array} raw
   * @param {number} width
   * @param {number} height
   * @returns {boolean}
   */
  overwriteWith(raw, width, height) {
    const ptr0 = passArray8ToWasm0(raw, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_overwriteWith(this.__wbg_ptr, ptr0, len0, width, height);
    return ret !== 0;
  }
  /**
   * @param {number} x
   * @param {number} y
   * @returns {Array<any>}
   */
  get(x, y) {
    const ret = wasm.rgbabuffer_get(this.__wbg_ptr, x, y);
    return ret;
  }
  /**
   * @returns {number}
   */
  len() {
    const ret = wasm.rgbabuffer_len(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @param {number} width
   * @param {number} height
   */
  constructor(width, height) {
    const ret = wasm.rgbabuffer_new(width, height);
    this.__wbg_ptr = ret >>> 0;
    RgbaBufferFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }
  /**
   * @returns {number}
   */
  ptr() {
    const ret = wasm.rgbabuffer_ptr(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @param {number} x
   * @param {number} y
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @param {number} a
   * @returns {boolean}
   */
  set(x, y, r, g, b, a) {
    const ret = wasm.rgbabuffer_set(this.__wbg_ptr, x, y, r, g, b, a);
    return ret !== 0;
  }
  /**
   * @returns {RgbaBuffer}
   */
  clone() {
    const ret = wasm.rgbabuffer_clone(this.__wbg_ptr);
    return RgbaBuffer.__wrap(ret);
  }
  /**
   * @returns {number}
   */
  width() {
    const ret = wasm.rgbabuffer_width(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @returns {number}
   */
  height() {
    const ret = wasm.rgbabuffer_height(this.__wbg_ptr);
    return ret >>> 0;
  }
  /**
   * @param {number} width
   * @param {number} height
   * @param {Uint8Array} buf
   * @returns {RgbaBuffer}
   */
  static fromRaw(width, height, buf) {
    const ptr0 = passArray8ToWasm0(buf, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_fromRaw(width, height, ptr0, len0);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return RgbaBuffer.__wrap(ret[0]);
  }
  /**
   * @returns {boolean}
   */
  is_empty() {
    const ret = wasm.rgbabuffer_is_empty(this.__wbg_ptr);
    return ret !== 0;
  }
  /**
   * @returns {Uint8ClampedArray}
   */
  data() {
    const ret = wasm.rgbabuffer_data(this.__wbg_ptr);
    return ret;
  }
  /**
   * @param {number} width
   * @param {number} height
   * @param {Uint8Array} webp_buf
   * @returns {RgbaBuffer}
   */
  static fromWebp(width, height, webp_buf) {
    const ptr0 = passArray8ToWasm0(webp_buf, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_fromWebp(width, height, ptr0, len0);
    if (ret[2]) {
      throw takeFromExternrefTable0(ret[1]);
    }
    return RgbaBuffer.__wrap(ret[0]);
  }
  /**
   * @param {number} x
   * @param {number} y
   * @returns {boolean}
   */
  isInBounds(x, y) {
    const ret = wasm.rgbabuffer_isInBounds(this.__wbg_ptr, x, y);
    return ret !== 0;
  }
  /**
   * @param {number} idx
   * @returns {Array<any>}
   */
  indexGet(idx) {
    const ret = wasm.rgbabuffer_indexGet(this.__wbg_ptr, idx);
    return ret;
  }
  /**
   * @param {number} idx
   * @param {number} r
   * @param {number} g
   * @param {number} b
   * @param {number} a
   * @returns {boolean}
   */
  indexSet(idx, r, g, b, a) {
    const ret = wasm.rgbabuffer_indexSet(this.__wbg_ptr, idx, r, g, b, a);
    return ret !== 0;
  }
  /**
   * @param {number} start_x
   * @param {number} start_y
   * @param {number} fill_color_r
   * @param {number} fill_color_g
   * @param {number} fill_color_b
   * @param {number} fill_color_a
   * @param {number} threshold
   * @returns {boolean}
   */
  floodFill(start_x, start_y, fill_color_r, fill_color_g, fill_color_b, fill_color_a, threshold) {
    const ret = wasm.rgbabuffer_floodFill(this.__wbg_ptr, start_x, start_y, fill_color_r, fill_color_g, fill_color_b, fill_color_a, threshold);
    return ret !== 0;
  }
  /**
   * @param {number} fill_code
   * @returns {boolean}
   */
  fillAllCodes(fill_code) {
    const ret = wasm.rgbabuffer_fillAllCodes(this.__wbg_ptr, fill_code);
    return ret !== 0;
  }
  /**
   * @param {Uint8Array} mask
   * @param {number} fill_color_r
   * @param {number} fill_color_g
   * @param {number} fill_color_b
   * @param {number} fill_color_a
   * @returns {boolean}
   */
  fillMaskArea(mask, fill_color_r, fill_color_g, fill_color_b, fill_color_a) {
    const ptr0 = passArray8ToWasm0(mask, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_fillMaskArea(this.__wbg_ptr, ptr0, len0, fill_color_r, fill_color_g, fill_color_b, fill_color_a);
    return ret !== 0;
  }
  /**
   * @param {number} fill_color_r
   * @param {number} fill_color_g
   * @param {number} fill_color_b
   * @param {number} fill_color_a
   * @returns {boolean}
   */
  fillAllPixels(fill_color_r, fill_color_g, fill_color_b, fill_color_a) {
    const ret = wasm.rgbabuffer_fillAllPixels(this.__wbg_ptr, fill_color_r, fill_color_g, fill_color_b, fill_color_a);
    return ret !== 0;
  }
  /**
   * @param {number} start_x
   * @param {number} start_y
   * @param {number} fill_color_r
   * @param {number} fill_color_g
   * @param {number} fill_color_b
   * @param {number} fill_color_a
   * @param {number} threshold
   * @param {Uint8Array} selection_mask
   * @param {string} limit_mode
   * @returns {boolean}
   */
  floodFillWithMask(start_x, start_y, fill_color_r, fill_color_g, fill_color_b, fill_color_a, threshold, selection_mask, limit_mode) {
    const ptr0 = passArray8ToWasm0(selection_mask, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(limit_mode, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_floodFillWithMask(
      this.__wbg_ptr,
      start_x,
      start_y,
      fill_color_r,
      fill_color_g,
      fill_color_b,
      fill_color_a,
      threshold,
      ptr0,
      len0,
      ptr1,
      len1
    );
    return ret !== 0;
  }
  /**
   * @param {Uint8Array} png_buffer
   * @param {number} width
   * @param {number} height
   * @returns {boolean}
   */
  importPng(png_buffer, width, height) {
    const ptr0 = passArray8ToWasm0(png_buffer, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_importPng(this.__wbg_ptr, ptr0, len0, width, height);
    return ret !== 0;
  }
  /**
   * @param {Uint8Array} raw
   * @param {number} width
   * @param {number} height
   * @returns {boolean}
   */
  importRaw(raw, width, height) {
    const ptr0 = passArray8ToWasm0(raw, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_importRaw(this.__wbg_ptr, ptr0, len0, width, height);
    return ret !== 0;
  }
  /**
   * @param {Uint8Array} webp_buffer
   * @param {number} width
   * @param {number} height
   * @returns {boolean}
   */
  importWebp(webp_buffer, width, height) {
    const ptr0 = passArray8ToWasm0(webp_buffer, wasm.__wbindgen_malloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.rgbabuffer_importWebp(this.__wbg_ptr, ptr0, len0, width, height);
    return ret !== 0;
  }
}
if (Symbol.dispose) RgbaBuffer.prototype[Symbol.dispose] = RgbaBuffer.prototype.free;

export function __wbg___wbindgen_copy_to_typed_array_33fbd71146904370(arg0, arg1, arg2) {
  new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
}

export function __wbg___wbindgen_throw_b855445ff6a94295(arg0, arg1) {
  throw new Error(getStringFromWasm0(arg0, arg1));
}

export function __wbg_log_254dca554fed7a05(arg0, arg1) {
  console.log(getStringFromWasm0(arg0, arg1));
}

export function __wbg_new_with_length_31d2669cb75c5215(arg0) {
  const ret = new Array(arg0 >>> 0);
  return ret;
}

export function __wbg_set_c213c871859d6500(arg0, arg1, arg2) {
  arg0[arg1 >>> 0] = arg2;
}

export function __wbindgen_cast_2241b6af4c4b2941(arg0, arg1) {
  // Cast intrinsic for `Ref(String) -> Externref`.
  const ret = getStringFromWasm0(arg0, arg1);
  return ret;
}

export function __wbindgen_cast_77927a9dcb96442f(arg0, arg1) {
  // Cast intrinsic for `Ref(Slice(U8)) -> NamedExternref("Uint8ClampedArray")`.
  const ret = getArrayU8FromWasm0(arg0, arg1);
  return ret;
}

export function __wbindgen_cast_d6cd19b81560fd6e(arg0) {
  // Cast intrinsic for `F64 -> Externref`.
  const ret = arg0;
  return ret;
}

export function __wbindgen_init_externref_table() {
  const table = wasm.__wbindgen_externrefs;
  const offset = table.grow(4);
  table.set(0, undefined);
  table.set(offset + 0, undefined);
  table.set(offset + 1, null);
  table.set(offset + 2, true);
  table.set(offset + 3, false);
}
