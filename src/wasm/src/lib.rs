use wasm_bindgen::prelude::*;

pub mod effects;
pub mod fill;
pub mod packing;
pub mod patch;
pub mod rgba;

#[wasm_bindgen]
extern "C" {
    pub fn alert(s: &str);
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[macro_export]
#[allow(clippy::crate_in_macro_def)]
macro_rules! console_log {
    ($($t:tt)*) => (crate::log(&format_args!($($t)*).to_string()))
}
