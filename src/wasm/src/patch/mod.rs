use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub enum AntialiasMode {
    Nearest = 0,
    Bilinear = 1,
    Bicubic = 2,
}

#[wasm_bindgen]
#[derive(Clone, Copy)]
pub struct PatchBufferRgbaOption {
    pub antialias_mode: AntialiasMode,
    pub flip_x: bool,
    pub flip_y: bool,
}

#[wasm_bindgen]
impl PatchBufferRgbaOption {
    #[wasm_bindgen(constructor)]
    pub fn new(antialias_mode: AntialiasMode, flip_x: bool, flip_y: bool) -> PatchBufferRgbaOption {
        PatchBufferRgbaOption {
            antialias_mode,
            flip_x,
            flip_y,
        }
    }
}

#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn patch_buffer_rgba(
    // target
    target: &[u8],
    target_width: u32,
    target_height: u32,
    // patch
    patch: &[u8],
    patch_width: u32,
    patch_height: u32,
    offset_x: f32,
    offset_y: f32,
    options: &PatchBufferRgbaOption,
) -> Vec<u8> {
    let mut result = target.to_vec();
    patch_buffer_rgba_instant(
        &mut result,
        target_width,
        target_height,
        patch,
        patch_width,
        patch_height,
        offset_x,
        offset_y,
        1.0,
        1.0,
        0.0,
        options,
    );
    result
}

// Sample pixel with bounds checking
fn sample_pixel(patch: &[u8], x: i32, y: i32, src_w: i32, src_h: i32) -> (f32, f32, f32, f32) {
    if x < 0 || x >= src_w || y < 0 || y >= src_h {
        return (0.0, 0.0, 0.0, 0.0);
    }
    let idx = (y * src_w + x) as usize * 4;
    let r = patch[idx] as f32;
    let g = patch[idx + 1] as f32;
    let b = patch[idx + 2] as f32;
    let a = patch[idx + 3] as f32;

    // Convert to premultiplied alpha for proper interpolation
    let alpha_norm = a / 255.0;
    (r * alpha_norm, g * alpha_norm, b * alpha_norm, a)
}

// Nearest neighbor sampling
fn sample_nearest(
    patch: &[u8],
    src_x: f32,
    src_y: f32,
    src_w: i32,
    src_h: i32,
) -> (f32, f32, f32, f32) {
    let mut x = src_x.floor() as i32;
    let mut y = src_y.floor() as i32;
    x = x.clamp(0, src_w - 1);
    y = y.clamp(0, src_h - 1);
    sample_pixel(patch, x, y, src_w, src_h)
}

// Bilinear interpolation sampling
fn sample_bilinear(
    patch: &[u8],
    src_x: f32,
    src_y: f32,
    src_w: i32,
    src_h: i32,
) -> (f32, f32, f32, f32) {
    let sx0 = src_x.floor() as i32;
    let sy0 = src_y.floor() as i32;
    let sx1 = (sx0 + 1).min(src_w - 1);
    let sy1 = (sy0 + 1).min(src_h - 1);

    let fx = src_x - sx0 as f32;
    let fy = src_y - sy0 as f32;

    let (pr00, pg00, pb00, a00) = sample_pixel(patch, sx0, sy0, src_w, src_h);
    let (pr10, pg10, pb10, a10) = sample_pixel(patch, sx1, sy0, src_w, src_h);
    let (pr01, pg01, pb01, a01) = sample_pixel(patch, sx0, sy1, src_w, src_h);
    let (pr11, pg11, pb11, a11) = sample_pixel(patch, sx1, sy1, src_w, src_h);

    // Interpolate premultiplied values
    let pr0 = pr00 * (1.0 - fx) + pr10 * fx;
    let pg0 = pg00 * (1.0 - fx) + pg10 * fx;
    let pb0 = pb00 * (1.0 - fx) + pb10 * fx;
    let a0 = a00 * (1.0 - fx) + a10 * fx;

    let pr1 = pr01 * (1.0 - fx) + pr11 * fx;
    let pg1 = pg01 * (1.0 - fx) + pg11 * fx;
    let pb1 = pb01 * (1.0 - fx) + pb11 * fx;
    let a1 = a01 * (1.0 - fx) + a11 * fx;

    let src_pr = pr0 * (1.0 - fy) + pr1 * fy;
    let src_pg = pg0 * (1.0 - fy) + pg1 * fy;
    let src_pb = pb0 * (1.0 - fy) + pb1 * fy;
    let src_a = a0 * (1.0 - fy) + a1 * fy;

    (src_pr, src_pg, src_pb, src_a)
}

// Bicubic interpolation sampling
fn sample_bicubic(
    patch: &[u8],
    src_x: f32,
    src_y: f32,
    src_w: i32,
    src_h: i32,
) -> (f32, f32, f32, f32) {
    let cx = src_x.floor() as i32;
    let cy = src_y.floor() as i32;
    let fx = src_x - cx as f32;
    let fy = src_y - cy as f32;

    // Bicubic kernel function
    let bicubic_weight = |t: f32| -> f32 {
        let t = t.abs();
        if t <= 1.0 {
            1.5 * t * t * t - 2.5 * t * t + 1.0
        } else if t <= 2.0 {
            -0.5 * t * t * t + 2.5 * t * t - 4.0 * t + 2.0
        } else {
            0.0
        }
    };

    let mut total_r = 0.0;
    let mut total_g = 0.0;
    let mut total_b = 0.0;
    let mut total_a = 0.0;
    let mut weight_sum = 0.0;

    for dy in -1..=2 {
        for dx in -1..=2 {
            let sx = cx + dx;
            let sy = cy + dy;

            let weight_x = bicubic_weight(fx - dx as f32);
            let weight_y = bicubic_weight(fy - dy as f32);
            let weight = weight_x * weight_y;

            if weight.abs() < 0.001 {
                continue;
            }

            let (pr, pg, pb, a) = sample_pixel(patch, sx, sy, src_w, src_h);

            total_r += pr * weight;
            total_g += pg * weight;
            total_b += pb * weight;
            total_a += a * weight;
            weight_sum += weight;
        }
    }

    if weight_sum.abs() < 0.001 {
        return (0.0, 0.0, 0.0, 0.0);
    }

    (
        total_r / weight_sum,
        total_g / weight_sum,
        total_b / weight_sum,
        total_a / weight_sum,
    )
}

// Apply alpha blending
fn apply_alpha_blend(
    target: &mut [u8],
    tgt_start: usize,
    src_pr: f32,
    src_pg: f32,
    src_pb: f32,
    src_a: f32,
) {
    // Skip nearly transparent pixels
    if src_a < 0.5 {
        return;
    }

    // Convert back from premultiplied alpha
    let alpha_norm = src_a / 255.0;
    let src_r = if alpha_norm > 0.001 {
        src_pr / alpha_norm
    } else {
        0.0
    };
    let src_g = if alpha_norm > 0.001 {
        src_pg / alpha_norm
    } else {
        0.0
    };
    let src_b = if alpha_norm > 0.001 {
        src_pb / alpha_norm
    } else {
        0.0
    };

    // Alpha blend (source over)
    let dst_r = target[tgt_start] as f32;
    let dst_g = target[tgt_start + 1] as f32;
    let dst_b = target[tgt_start + 2] as f32;
    let dst_a = target[tgt_start + 3] as f32;

    let src_a_norm = src_a / 255.0;
    let dst_a_norm = dst_a / 255.0;

    let out_r = (src_r * src_a_norm + dst_r * (1.0 - src_a_norm))
        .round()
        .clamp(0.0, 255.0) as u8;
    let out_g = (src_g * src_a_norm + dst_g * (1.0 - src_a_norm))
        .round()
        .clamp(0.0, 255.0) as u8;
    let out_b = (src_b * src_a_norm + dst_b * (1.0 - src_a_norm))
        .round()
        .clamp(0.0, 255.0) as u8;
    let out_a = ((src_a_norm + dst_a_norm * (1.0 - src_a_norm)) * 255.0)
        .round()
        .clamp(0.0, 255.0) as u8;

    target[tgt_start] = out_r;
    target[tgt_start + 1] = out_g;
    target[tgt_start + 2] = out_b;
    target[tgt_start + 3] = out_a;
}

#[wasm_bindgen]
#[allow(clippy::too_many_arguments)]
pub fn patch_buffer_rgba_instant(
    // target (mutable)
    target: &mut [u8],
    target_width: u32,
    target_height: u32,
    // patch
    patch: &[u8],
    patch_width: u32,
    patch_height: u32,
    offset_x: f32,
    offset_y: f32,
    scale_x: f32,
    scale_y: f32,
    rotate_deg: f32,
    options: &PatchBufferRgbaOption,
) {
    let target_w = target_width as i32;
    let target_h = target_height as i32;
    let src_w = patch_width as i32;
    let src_h = patch_height as i32;

    if src_w <= 0 || src_h <= 0 {
        return;
    }
    if (src_w as usize) * (src_h as usize) * 4 != patch.len() {
        return;
    }
    if (target_w as usize) * (target_h as usize) * 4 != target.len() {
        return;
    }

    // Convert rotation from degrees to radians
    let rotate_rad = rotate_deg * std::f32::consts::PI / 180.0;
    let cos_r = rotate_rad.cos();
    let sin_r = rotate_rad.sin();

    // Source image center after scaling
    let src_center_x = (src_w as f32 * scale_x) / 2.0;
    let src_center_y = (src_h as f32 * scale_y) / 2.0;

    // For each pixel in the target buffer
    for ty in 0..target_h {
        for tx in 0..target_w {
            let tgt_idx = (ty * target_w + tx) as usize;
            let tgt_start = tgt_idx * 4;

            // Convert target coordinates to source coordinates
            // First, apply offset
            let rel_x = tx as f32 - offset_x;
            let rel_y = ty as f32 - offset_y;

            // Apply inverse rotation around the center
            let centered_x = rel_x - src_center_x;
            let centered_y = rel_y - src_center_y;

            let rotated_x = centered_x * cos_r + centered_y * sin_r + src_center_x;
            let rotated_y = -centered_x * sin_r + centered_y * cos_r + src_center_y;

            // Apply inverse scaling
            let mut src_x = rotated_x / scale_x;
            let mut src_y = rotated_y / scale_y;

            if options.flip_x {
                src_x = (src_w as f32 - 1.0) - src_x;
            }

            if options.flip_y {
                src_y = (src_h as f32 - 1.0) - src_y;
            }

            // Check bounds
            if src_x < 0.0 || src_y < 0.0 || src_x >= src_w as f32 || src_y >= src_h as f32 {
                continue;
            }

            // Sample based on antialias mode
            let (src_pr, src_pg, src_pb, src_a) = match options.antialias_mode {
                AntialiasMode::Nearest => sample_nearest(patch, src_x, src_y, src_w, src_h),
                AntialiasMode::Bilinear => sample_bilinear(patch, src_x, src_y, src_w, src_h),
                AntialiasMode::Bicubic => sample_bicubic(patch, src_x, src_y, src_w, src_h),
            };

            apply_alpha_blend(target, tgt_start, src_pr, src_pg, src_pb, src_a);
        }
    }
}
