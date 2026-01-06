use crate::{
    packing::{png_to_raw, webp_to_raw},
    rgba::{base::pixel_byte_len, RgbaBuffer},
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl RgbaBuffer {
    #[wasm_bindgen(js_name = importRaw)]
    pub fn import_raw(&mut self, raw: &[u8], width: u32, height: u32) -> bool {
        let expected = pixel_byte_len(width, height);
        if raw.len() != expected {
            return false;
        }
        self.width = width;
        self.height = height;
        self.data.resize(expected, 0);
        self.data.copy_from_slice(raw);

        true
    }

    #[wasm_bindgen(js_name = importWebp)]
    pub fn import_webp(&mut self, webp_buffer: &[u8], width: u32, height: u32) -> bool {
        let decoded = webp_to_raw(webp_buffer, width, height);
        self.overwrite_with(decoded, width, height)
    }

    #[wasm_bindgen(js_name = importPng)]
    pub fn import_png(&mut self, png_buffer: &[u8], width: u32, height: u32) -> bool {
        let decoded = png_to_raw(png_buffer, width, height);
        self.overwrite_with(decoded, width, height)
    }
}
