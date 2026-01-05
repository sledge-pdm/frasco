# Frasco

<img src="./public/banner@x4.webp" style="image-rendering: pixelated;" alt="the banner of frasco."  />

Frasco is the WebGL Texture processing package for [sledge](https://github.com/sledge-pdm/sledge).

## concept

- Frasco is based on the concept of [anvil](https://github.com/sledge-pdm/anvil) (WASM Buffer operation package), but frasco uses **WebGL Texture + GLSL Shaders** instead of _Uint8Array & WASM_.
- In addition of handling of a layer texture, frasco includes **brush engine**, **history management(undo/redo)**, and **layers composition**.

## core features

### layer

- Equivalent to anvil's `Anvil` class which provides the basic features for layer (like `clear`) and effects (`grayscale`, `brightness and contrast`, etc)

  > Note that **_fine_** operations such as `setPixel` should not be included as it may ruin the performance in concurrency.\
  > Instead, write more **_coarse_** operations such as `transfer(buffer: Uint8Array, options)`.

- layer includes history management system which saves operations' snapshots as the array of partial textures, and transfer them to layer texture as the `undo`/`redo` called.

### grip

- The brush engine works as an extension of `layer`.
- Handles strokes (`start`/`add point`/`end`) and paint brush shape according to GLSL Shaders.

### frasco

- The layer composition engine.
- Details are TBD

## development

### clone

```bash
git clone https://github.com/sledge-pdm/fresco
cd fresco
pnpm install
```

### testing

```bash
# install chromium if not installed
pnpm playwright install chromium
pnpm test
```
