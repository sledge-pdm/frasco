# instructions

- Read `README.md` and other documents before initializing environments.
- Follow the rules below. If you notice something to be documentated, tell user that fact.

## Rendering rules

None of these are enforced by the type system or the test suite. Violating them still passes CI, so they have to be kept by hand.

- **Every operation goes through a GLSL shader.** `layer` receives `Uint8Array` in its constructor, uploads it to a WebGL texture, and keeps no reference to it afterwards. Never round-trip pixels through JS (`readPixels` -> loop -> `writePixels`) for something a shader can do. Returning buffers from export functions is the one exception.
- **No Chromium-only shader code.** Frasco has to run on Webkit/GTK, but the test suite only runs Chromium — a Chromium-only feature passes CI silently. Avoid it unless it genuinely matters to the performance.
- **Effects work in the integer domain** (OpenCV-like rounding, `floor(x * 255.0 + 0.5)`) rather than pure floating-point semantics. Existing effects are pinned by exact-match e2e comparisons, but a new effect written in float would pass against its own generated reference image — match the existing shaders by hand.

## Coordinate system

- Input pointer events are in canvas space (origin at top-left).
- `Grip` with `inputSpace: 'canvas'` flips Y once to map into `layer` (GL space).
- `layer` keeps GL coordinate system (origin at bottom-left) for internal operations on purpose.

  > **Note that this means layer always has Y flipped texture compared with original input buffer!**

- `Frasco.compose` defaults to no flip (GL -> WebGL canvas is 1:1).
- If you need 2D canvas / image output, flip Y at output (`Layer.readPixels({ flipY: true })` or `Frasco.compose({ flipY: true })`).

## FORBIDDEN SYNTAX (PowerShell)

- **NO Linux Redirection:** DO NOT use `< < EOF` or `<< 'PY'`. These are Linux-specific and cause syntax errors in PowerShell.
- **NO `sed`/`grep` in `pwsh`:** Unless explicitly calling `wsl sed ...`, do not use these commands directly in PowerShell. Use native PowerShell cmdlets (e.g., `Select-String`, `b replace`).
