use wasm_bindgen::prelude::*;

mod base;
mod blit_crop;
mod effects;
mod export;
mod fill;
mod import;
mod rect;
mod resize;

#[wasm_bindgen]
pub struct RgbaBuffer {
    width: u32,
    height: u32,
    data: Vec<u8>,
}
