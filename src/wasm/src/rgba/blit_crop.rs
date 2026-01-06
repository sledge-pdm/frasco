use crate::{
    patch::{patch_buffer_rgba_instant, AntialiasMode, PatchBufferRgbaOption},
    rgba::{
        base::{mask_is_valid, mask_pixel_count, pixel_byte_len},
        RgbaBuffer,
    },
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl RgbaBuffer {
    #[wasm_bindgen(js_name = blitFromRaw)]
    #[allow(clippy::too_many_arguments)]
    pub fn blit_from_raw(
        &mut self,
        source: &[u8],
        source_width: u32,
        source_height: u32,
        offset_x: f32,
        offset_y: f32,
        scale_x: f32,
        scale_y: f32,
        rotate_deg: f32,
        antialias_mode: AntialiasMode,
        flip_x: bool,
        flip_y: bool,
    ) {
        if pixel_byte_len(source_width, source_height) != source.len() {
            return;
        }
        let options = PatchBufferRgbaOption {
            antialias_mode,
            flip_x,
            flip_y,
        };
        patch_buffer_rgba_instant(
            &mut self.data,
            self.width,
            self.height,
            source,
            source_width,
            source_height,
            offset_x,
            offset_y,
            scale_x,
            scale_y,
            rotate_deg,
            &options,
        );
    }

    #[wasm_bindgen(js_name = blitFromBuffer)]
    #[allow(clippy::too_many_arguments)]
    pub fn blit_from_buffer(
        &mut self,
        source: &RgbaBuffer,
        offset_x: f32,
        offset_y: f32,
        scale_x: f32,
        scale_y: f32,
        rotate_deg: f32,
        antialias_mode: AntialiasMode,
        flip_x: bool,
        flip_y: bool,
    ) {
        self.blit_from_raw(
            &source.data,
            source.width,
            source.height,
            offset_x,
            offset_y,
            scale_x,
            scale_y,
            rotate_deg,
            antialias_mode,
            flip_x,
            flip_y,
        );
    }

    #[wasm_bindgen(js_name = sliceWithMask)]
    pub fn slice_with_mask(
        &self,
        mask: &[u8],
        mask_width: u32,
        mask_height: u32,
        mask_offset_x: f32,
        mask_offset_y: f32,
    ) -> Vec<u8> {
        let sw = self.width as i32;
        let sh = self.height as i32;
        let mw = mask_width as i32;
        let mh = mask_height as i32;
        if mw <= 0 || mh <= 0 || !mask_is_valid(mask_width, mask_height, mask) {
            return Vec::new();
        }

        let mask_bytes = mask_pixel_count(mask_width, mask_height) * 4;
        let mut result = vec![0u8; mask_bytes];
        let ox = mask_offset_x.round() as i32;
        let oy = mask_offset_y.round() as i32;

        for y in 0..mh {
            for x in 0..mw {
                let mi = (y * mw + x) as usize;
                if mi >= mask.len() || mask[mi] == 0 {
                    continue;
                }
                let sx = x + ox;
                let sy = y + oy;
                if sx < 0 || sy < 0 || sx >= sw || sy >= sh {
                    continue;
                }
                let src_index = (sy * sw + sx) as usize * 4;
                if src_index + 3 >= self.data.len() {
                    continue;
                }
                let dst_index = mi * 4;
                result[dst_index..dst_index + 4]
                    .copy_from_slice(&self.data[src_index..src_index + 4]);
            }
        }

        result
    }

    #[wasm_bindgen(js_name = cropWithMask)]
    pub fn crop_with_mask(
        &self,
        mask: &[u8],
        mask_width: u32,
        mask_height: u32,
        mask_offset_x: f32,
        mask_offset_y: f32,
    ) -> Vec<u8> {
        let sw = self.width as i32;
        let sh = self.height as i32;
        let mw = mask_width as i32;
        let mh = mask_height as i32;
        if sw <= 0 || sh <= 0 {
            return Vec::new();
        }

        let total_mask = mask_pixel_count(mask_width, mask_height);
        if total_mask > mask.len() {
            return Vec::new();
        }

        let mut result = vec![0u8; self.data.len()];
        let ox = mask_offset_x.round() as i32;
        let oy = mask_offset_y.round() as i32;

        for sy in 0..sh {
            for sx in 0..sw {
                let mx = sx - ox;
                let my = sy - oy;
                let mut covered = false;
                if mx >= 0 && mx < mw && my >= 0 && my < mh {
                    let midx = (my * mw + mx) as usize;
                    if midx < mask.len() {
                        covered = mask[midx] != 0;
                    }
                }
                if covered {
                    continue;
                }
                let idx = (sy * sw + sx) as usize * 4;
                if idx + 3 >= self.data.len() {
                    continue;
                }
                result[idx..idx + 4].copy_from_slice(&self.data[idx..idx + 4]);
            }
        }

        result
    }
}
