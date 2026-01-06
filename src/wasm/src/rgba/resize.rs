use crate::rgba::RgbaBuffer;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
impl RgbaBuffer {
    #[wasm_bindgen(js_name = resize)]
    pub fn resize(&mut self, new_width: u32, new_height: u32) {
        self.resize_with_origins(new_width, new_height, 0.0, 0.0, 0.0, 0.0);
    }

    #[wasm_bindgen(js_name = resizeWithOrigins)]
    pub fn resize_with_origins(
        &mut self,
        new_width: u32,
        new_height: u32,
        src_origin_x: f32,
        src_origin_y: f32,
        dest_origin_x: f32,
        dest_origin_y: f32,
    ) {
        let old_w = self.width as i32;
        let old_h = self.height as i32;
        let new_w = new_width as i32;
        let new_h = new_height as i32;
        if new_width == 0 || new_height == 0 {
            return;
        }

        let src_origin_x = src_origin_x.floor() as i32;
        let src_origin_y = src_origin_y.floor() as i32;
        let dest_origin_x = dest_origin_x.floor() as i32;
        let dest_origin_y = dest_origin_y.floor() as i32;

        if old_w == new_w
            && old_h == new_h
            && src_origin_x == 0
            && src_origin_y == 0
            && dest_origin_x == 0
            && dest_origin_y == 0
        {
            return;
        }

        let pixel_stride = 4usize;
        let valid_dx_min = dest_origin_x - src_origin_x;
        let valid_dx_max = dest_origin_x - src_origin_x + old_w;
        let valid_dy_min = dest_origin_y - src_origin_y;
        let valid_dy_max = dest_origin_y - src_origin_y + old_h;
        let copy_dst_left = 0.max(valid_dx_min);
        let copy_dst_top = 0.max(valid_dy_min);
        let copy_dst_right = new_w.min(valid_dx_max);
        let copy_dst_bottom = new_h.min(valid_dy_max);
        let needs_new_buffer = (new_w * new_h > old_w * old_h)
            || src_origin_x != dest_origin_x
            || src_origin_y != dest_origin_y;

        if needs_new_buffer {
            // grow, or offset move that requires zero-filling untouched area: allocate new buffer and copy overlapping rows
            let mut new_buf = vec![0u8; (new_w * new_h * 4) as usize];
            if copy_dst_left < copy_dst_right && copy_dst_top < copy_dst_bottom {
                let row_copy_width = (copy_dst_right - copy_dst_left) as usize;
                for dy in copy_dst_top..copy_dst_bottom {
                    let sy = dy - dest_origin_y + src_origin_y;
                    if sy < 0 || sy >= old_h {
                        continue;
                    }
                    let sx_first = copy_dst_left - dest_origin_x + src_origin_x;
                    if sx_first < 0 || sx_first + row_copy_width as i32 > old_w {
                        continue;
                    }
                    let src_index = (sy * old_w + sx_first) as usize * pixel_stride;
                    let dst_index = (dy * new_w + copy_dst_left) as usize * pixel_stride;
                    let byte_len = row_copy_width * pixel_stride;
                    new_buf[dst_index..dst_index + byte_len]
                        .copy_from_slice(&self.data[src_index..src_index + byte_len]);
                }
            }
            self.data = new_buf;
            self.width = new_width;
            self.height = new_height;
            return;
        }

        if copy_dst_left < copy_dst_right && copy_dst_top < copy_dst_bottom {
            // shrink/in-place: copy rows within existing buffer, guarding overlap
            let row_copy_width = (copy_dst_right - copy_dst_left) as usize;
            for dy in copy_dst_top..copy_dst_bottom {
                let sy = dy - dest_origin_y + src_origin_y;
                if sy < 0 || sy >= old_h {
                    continue;
                }
                let sx_first = copy_dst_left - dest_origin_x + src_origin_x;
                if sx_first < 0 || sx_first + row_copy_width as i32 > old_w {
                    continue;
                }
                let src_index = (sy * old_w + sx_first) as usize * pixel_stride;
                let dst_index = (dy * new_w + copy_dst_left) as usize * pixel_stride;
                let byte_len = row_copy_width * pixel_stride;
                if src_index != dst_index {
                    let mut tmp = vec![0u8; byte_len];
                    tmp.copy_from_slice(&self.data[src_index..src_index + byte_len]);
                    self.data[dst_index..dst_index + byte_len].copy_from_slice(&tmp);
                }
            }
        }

        let new_len = (new_w * new_h * 4) as usize;
        self.data.truncate(new_len);
        self.width = new_width;
        self.height = new_height;
    }
}
