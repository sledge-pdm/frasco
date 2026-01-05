# strategy

## Phases

### P1

- [x] create package template
- [x] determine/write minimum `layer` interfaces (*according to Anvil implementation*)
- [x] consider the ways to test glsl renderers
- [ ] write unit tests
- [ ] write e2e tests (if possible)

### P2

- [ ] write `grip` interfaces
- [ ] write minimum brush shape (solid circle, linear completion, & no pressure censoring)
- [ ] write unit tests
- [ ] write e2e tests

### P3

- [ ] write effects
- [ ] write history system
- [ ] write unit tests
- [ ] write e2e tests

### P4

- [ ] determine/write minimum `frasco` interfaces (*according to sledge implementation*)
- [ ] write `frasco` interfaces
- [ ] write unit tests
- [ ] write e2e tests

### P5

- [ ] write integrated tests
- [ ] integration to sledge


## Notices

### Coding

- Always refer the code in `sledge` and `anvil` to make integration easier, but this does not mean *always write the same function*. Editing/rendering code will be going more compact with frasco (hopefully.)

### Testing

- Unit test ~ GLSL test is going to be done with vitest.

### primitive and flexible

- Always use **primitive and flexible** way to implement texture handling package.
  
  #### what is primitive?

  - Use GLSL Shader for every operation and write simple and optimized shader code.
  - `layer` receive `Uint8Array` in the constructor of `layer` class, and immediately dispose it after WebGL texture created. Don't consider using JS Buffer for any kinds of operations (but returning it in export functions).
  - For the sake of Webkit/GTK support, basically avoid using shader code that only works in Chromium (especially if it does not matter to the performance).

  #### what is flexible?

  - For example, when you're breaking down the stroke process into `start`, `add_point`, `end`, **avoid hard coding the completion process (like `shape stamp` + `bresenham's line`) there**.
  - In the example above, the way of completion always should be determined by each shapes. It may complement the pressure changes between points in linear completion, or may not.