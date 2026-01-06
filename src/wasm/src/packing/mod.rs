use image::{codecs::png::PngEncoder, ExtendedColorType, ImageEncoder};
use image_webp::{WebPDecoder, WebPEncoder};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn raw_to_webp(buffer: &[u8], width: u32, height: u32) -> Vec<u8> {
    let mut output = Vec::new();

    let encoder = WebPEncoder::new(&mut output);
    encoder
        .encode(buffer, width, height, image_webp::ColorType::Rgba8)
        .unwrap_or_default();

    output
}

#[wasm_bindgen]
pub fn webp_to_raw(webp_buffer: &[u8], width: u32, height: u32) -> Vec<u8> {
    let w = width as usize;
    let h = height as usize;
    let mut output = vec![0u8; w * h * 4];

    let mut cursor = std::io::Cursor::new(webp_buffer);
    let mut decoder = match WebPDecoder::new(&mut cursor) {
        Ok(decoder) => decoder,
        Err(_) => return output,
    };
    let _ = decoder.read_image(&mut output);

    output
}

#[wasm_bindgen]
pub fn raw_to_png(buffer: &[u8], width: u32, height: u32) -> Vec<u8> {
    let mut output = Vec::new();

    let encoder = PngEncoder::new(&mut output);
    let _ = encoder.write_image(buffer, width, height, ExtendedColorType::Rgba8);

    output
}

#[wasm_bindgen]
pub fn png_to_raw(png_buffer: &[u8], _width: u32, _height: u32) -> Vec<u8> {
    // Use image crate's load_from_memory for simplicity
    match image::load_from_memory(png_buffer) {
        Ok(img) => {
            let rgba_img = img.to_rgba8();
            rgba_img.into_raw()
        }
        Err(_) => {
            // Return empty buffer on error
            vec![0u8; (_width * _height * 4) as usize]
        }
    }
}
