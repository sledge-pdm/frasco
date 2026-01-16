# Frasco

<img src="./public/banner@x4.webp" style="image-rendering: pixelated;" alt="the banner of frasco."  />

Frasco is the WebGL Texture processing package for [sledge](https://github.com/sledge-pdm/sledge).

## concept

- Frasco is based on the concept of [anvil](https://github.com/sledge-pdm/anvil) (WASM Buffer operation package), but frasco uses **WebGL Texture + GLSL Shaders** instead of _Uint8Array & WASM_.
- In addition of handling of a layer texture, frasco includes **brush engine**, **history management(undo/redo)**, and **layers composition**.

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

## special thanks

### Fluid Paint (by David Li)

- https://github.com/dli/paint
- [This demo](https://david.li/paint/) gave me confident that I can rewrite layer operations with full WebGL features.
  Definitely should take a look at this (it's AMAZING)
