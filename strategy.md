# strategy

## Phases

### P1

- [x] create package template
- [x] determine/write minimum `layer` interfaces (_according to Anvil implementation_)
- [x] consider the ways to test glsl renderers
- [x] write unit tests
- [x] write e2e tests (if possible)

### P2

- [x] write `grip` interfaces
- [x] write minimum brush shape (solid circle, linear completion, & no pressure censoring)
- [x] write unit tests
- [ ] write e2e tests (! should write in every grip shapes but delayed bc of laziness. verify sets are much easier to make when came to integration with sledge...)

### P3

- [x] write effects
- [x] write history system
- [x] write unit tests
- [ ] write e2e tests (! too lazy)

### P4

- [ ] determine/write minimum `frasco` interfaces (_according to sledge implementation_)
- [ ] write `frasco` interfaces
- [ ] write unit tests
- [ ] write e2e tests

### P5

- [ ] write integrated tests
- [ ] integration to sledge

## Notices

### Coding

- Always refer the code in `sledge` and `anvil` to make integration easier, but this does not mean _always write the same function_. Editing/rendering code will be going more compact with frasco (hopefully.)
- Effects should prefer integer-domain behavior (OpenCV-like rounding) over pure floating-point semantics.

### Testing

- Unit test ~ GLSL test is going to be done with vitest.
- Use `it.fails` in the actual anti-case (e.g.: make sure pixel won't painted after painting wrong pixel).
- Don't use `it.fails` just to "make sure the bug is now happening". Test always should be positive to perfection.

### primitive and flexible

- Always use **primitive and flexible** way to implement texture handling package.

  #### what is primitive?
  - Use GLSL Shader for every operation and write simple and optimized shader code.
  - `layer` receive `Uint8Array` in the constructor of `layer` class, and immediately dispose it after WebGL texture created. Don't consider using JS Buffer for any kinds of operations (but returning it in export functions).
  - For the sake of Webkit/GTK support, basically avoid using shader code that only works in Chromium (especially if it does not matter to the performance).

  #### what is flexible?
  - For example, when you're breaking down the stroke process into `start`, `add_point`, `end`, **avoid hard coding the completion process (like `shape stamp` + `bresenham's line`) there**.
  - In the example above, the way of completion always should be determined by each shapes. e.g.:
    - The shape may use bresenham, or may not (other faster ways).
    - The shape may complement the pressure changes between points in linear completion, or may not.

### Coordinate system

- `layer` keeps GL coordinate system (origin at bottom-left) for internal operations on purpose.

  > **Note that this means layer always has Y flipped texture compared with original input buffer!**

- `frasco` is responsible for flipping to canvas coordinate system before output/rendering.

### Coordinate system (simple rules)

- Input pointer events are in canvas space (origin at top-left).
- `Grip` with `inputSpace: 'canvas'` flips Y once to map into `layer` (GL space).
- `layer` always stores textures in GL space (origin at bottom-left).
- `Frasco.compose` defaults to no flip (GL -> WebGL canvas is 1:1).
- If you need 2D canvas / image output, flip Y at output (`Layer.exportRaw({ flipY: true })` or `Frasco.compose({ flipY: true })`).
