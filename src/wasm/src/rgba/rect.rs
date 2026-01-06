use crate::rgba::{
    base::{pixel_byte_len, positive_area},
    RgbaBuffer,
};
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl RgbaBuffer {
    #[wasm_bindgen(js_name = readRect)]
    pub fn read_rect(
        &self,
        rect_x: i32,
        rect_y: i32,
        rect_width: u32,
        rect_height: u32,
    ) -> Vec<u8> {
        let width = rect_width as i32;
        let height = rect_height as i32;
        if !positive_area(width, height) {
            return Vec::new();
        }

        let src_w = self.width as i32;
        let src_h = self.height as i32;

        let mut result = vec![0u8; pixel_byte_len(rect_width, rect_height)];
        for row in 0..height {
            let sy = rect_y + row;
            if sy < 0 || sy >= src_h {
                continue;
            }

            let dst_row_offset = (row as usize) * (rect_width as usize) * 4;
            let mut start_col = 0;
            let mut end_col = width;

            if rect_x < 0 {
                start_col = -rect_x;
            }
            if rect_x + end_col > src_w {
                end_col = src_w - rect_x;
            }

            if start_col >= end_col {
                continue;
            }

            let copy_w = (end_col - start_col) as usize;
            let dst_offset = dst_row_offset + (start_col as usize) * 4;
            let src_offset = ((sy * src_w + rect_x + start_col) as usize) * 4;

            result[dst_offset..dst_offset + copy_w * 4]
                .copy_from_slice(&self.data[src_offset..src_offset + copy_w * 4]);
        }

        result
    }

    #[wasm_bindgen(js_name = writeRect)]
    pub fn write_rect(
        &mut self,
        rect_x: i32,
        rect_y: i32,
        rect_width: u32,
        rect_height: u32,
        data: &[u8],
    ) -> bool {
        let width = rect_width as i32;
        let height = rect_height as i32;
        if !positive_area(width, height) {
            return false;
        }

        let expected = pixel_byte_len(rect_width, rect_height);
        if data.len() != expected {
            return false;
        }

        let dst_w = self.width as i32;
        let dst_h = self.height as i32;

        for row in 0..height {
            let sy = rect_y + row;
            if sy < 0 || sy >= dst_h {
                continue;
            }

            let src_row_offset = (row as usize) * (rect_width as usize) * 4;
            let mut start_col = 0;
            let mut end_col = width;

            if rect_x < 0 {
                start_col = -rect_x;
            }
            if rect_x + end_col > dst_w {
                end_col = dst_w - rect_x;
            }

            if start_col >= end_col {
                continue;
            }

            let copy_w = (end_col - start_col) as usize;
            let dst_offset = ((sy * dst_w + rect_x + start_col) as usize) * 4;
            let src_offset = src_row_offset + (start_col as usize) * 4;

            self.data[dst_offset..dst_offset + copy_w * 4]
                .copy_from_slice(&data[src_offset..src_offset + copy_w * 4]);
        }

        true
    }

    #[wasm_bindgen(js_name = writePixels)]
    pub fn write_pixels(&mut self, coords: &[u32], colors: &[u8]) -> bool {
        if !coords.len().is_multiple_of(2) || !colors.len().is_multiple_of(4) {
            return false;
        }
        let pixels = coords.len() / 2;
        if colors.len() / 4 != pixels {
            return false;
        }

        let width = self.width as usize;
        let height = self.height as usize;

        for i in 0..pixels {
            let x = coords[i * 2] as usize;
            let y = coords[i * 2 + 1] as usize;
            if x >= width || y >= height {
                continue;
            }

            let dst_index = (y * width + x) * 4;
            let color_index = i * 4;
            self.data[dst_index..dst_index + 4]
                .copy_from_slice(&colors[color_index..color_index + 4]);
        }

        true
    }
}
