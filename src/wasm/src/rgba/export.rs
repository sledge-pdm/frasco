use crate::{
    packing::{raw_to_png, raw_to_webp},
    rgba::RgbaBuffer,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl RgbaBuffer {
    #[wasm_bindgen(js_name = exportWebp)]
    pub fn export_webp(&self) -> Vec<u8> {
        raw_to_webp(&self.data, self.width, self.height)
    }

    #[wasm_bindgen(js_name = exportPng)]
    pub fn export_png(&self) -> Vec<u8> {
        raw_to_png(&self.data, self.width, self.height)
    }
}
