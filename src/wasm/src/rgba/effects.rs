use crate::{
    effects::{
        brightness_contrast::{brightness_contrast, BrightnessContrastOption},
        dithering::{dithering, DitheringMode, DitheringOption},
        dust_removal::{dust_removal, DustRemovalOption},
        gaussian_blur::{gaussian_blur, AlphaBlurMode, GaussianBlurOption},
        grayscale::grayscale,
        invert::invert,
        posterize::{posterize, PosterizeOption},
    },
    rgba::RgbaBuffer,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl RgbaBuffer {
    #[wasm_bindgen(js_name = brightnessAndContrast)]
    pub fn brightness_contrast(&mut self, brightness: f32, contrast: f32) {
        brightness_contrast(
            &mut self.data,
            self.width,
            self.height,
            &BrightnessContrastOption::new(brightness, contrast),
        );
    }

    #[wasm_bindgen(js_name = invert)]
    pub fn invert(&mut self) {
        invert(&mut self.data, self.width, self.height);
    }

    #[wasm_bindgen(js_name = grayscale)]
    pub fn grayscale(&mut self) {
        grayscale(&mut self.data, self.width, self.height);
    }

    #[wasm_bindgen(js_name = gaussianBlur)]
    pub fn gaussian_blur(&mut self, radius: f32, alpha_mode: AlphaBlurMode) {
        let options = GaussianBlurOption::new(radius, alpha_mode);
        gaussian_blur(&mut self.data, self.width, self.height, &options);
    }

    #[wasm_bindgen(js_name = posterize)]
    pub fn posterize(&mut self, levels: u32) {
        let options = PosterizeOption::new(levels);
        posterize(&mut self.data, self.width, self.height, &options);
    }

    #[wasm_bindgen(js_name = dustRemoval)]
    pub fn dust_removal(&mut self, max_size: u32, alpha_threshold: u8) {
        let options = DustRemovalOption::new(max_size, alpha_threshold);
        dust_removal(&mut self.data, self.width, self.height, &options);
    }

    #[wasm_bindgen(js_name = dithering)]
    pub fn dithering(&mut self, mode: DitheringMode, levels: u32, strength: f32) {
        let options = DitheringOption::new(mode, levels, strength);
        dithering(&mut self.data, self.width, self.height, &options);
    }
}
