use crate::{
    fill::{
        area_fill::fill_mask_area,
        flood_fill::{scanline_flood_fill, scanline_flood_fill_with_mask},
    },
    rgba::RgbaBuffer,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl RgbaBuffer {
    #[wasm_bindgen(js_name = fillAllCodes)]
    pub fn fill_all_codes(&mut self, fill_code: u8) -> bool {
        self.data.fill(fill_code);
        true
    }

    #[wasm_bindgen(js_name = fillAllPixels)]
    pub fn fill_all_pixels(
        &mut self,
        fill_color_r: u8,
        fill_color_g: u8,
        fill_color_b: u8,
        fill_color_a: u8,
    ) -> bool {
        let pixel_len = self.width * self.height;
        for i in 0..pixel_len {
            self.index_set(
                i * 4,
                fill_color_r,
                fill_color_g,
                fill_color_b,
                fill_color_a,
            );
        }
        true
    }
    #[wasm_bindgen(js_name = fillMaskArea)]
    pub fn fill_mask_area(
        &mut self,
        mask: &[u8],
        fill_color_r: u8,
        fill_color_g: u8,
        fill_color_b: u8,
        fill_color_a: u8,
    ) -> bool {
        fill_mask_area(
            &mut self.data,
            mask,
            fill_color_r,
            fill_color_g,
            fill_color_b,
            fill_color_a,
        )
    }

    #[wasm_bindgen(js_name = floodFill)]
    #[allow(clippy::too_many_arguments)]
    pub fn flood_fill(
        &mut self,
        start_x: u32,
        start_y: u32,
        fill_color_r: u8,
        fill_color_g: u8,
        fill_color_b: u8,
        fill_color_a: u8,
        threshold: u8,
    ) -> bool {
        scanline_flood_fill(
            &mut self.data,
            self.width,
            self.height,
            start_x,
            start_y,
            fill_color_r,
            fill_color_g,
            fill_color_b,
            fill_color_a,
            threshold,
        )
    }

    #[wasm_bindgen(js_name = floodFillWithMask)]
    #[allow(clippy::too_many_arguments)]
    pub fn flood_fill_with_mask(
        &mut self,
        start_x: u32,
        start_y: u32,
        fill_color_r: u8,
        fill_color_g: u8,
        fill_color_b: u8,
        fill_color_a: u8,
        threshold: u8,
        selection_mask: &[u8],
        limit_mode: &str,
    ) -> bool {
        scanline_flood_fill_with_mask(
            &mut self.data,
            self.width,
            self.height,
            start_x,
            start_y,
            fill_color_r,
            fill_color_g,
            fill_color_b,
            fill_color_a,
            threshold,
            selection_mask,
            limit_mode,
        )
    }
}
