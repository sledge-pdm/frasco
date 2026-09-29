# R2 dependency validation

Verified by Codex on 2026-09-29. R0 means the resolved version in the 2026-09-28 audit; R2 means that audit's candidate version. R1 is not used. Versions below are lockfile versions, not manifest lower bounds. Only direct dependencies are listed.

## Updates retained at R0

| Package | Retained R0 | R2 candidate | Reason |
|---|---|---|---|
| `@vitest/browser-playwright` | 4.1.10 | 5.0.2 | Vitest 5 is outside Storybook addon-vitest 10.6.0 peer support; retain the shared Vitest 4 family. |
| `vitest` | 4.1.10 | 5.0.2 | Vitest 5 is outside Storybook addon-vitest 10.6.0 peer support; retain the shared Vitest 4 family. |

## Unchanged because R0 already equals R2

These entries are not deferred upgrades.

| Package or crate | R0 | R2 target | Reason |
|---|---|---|---|
| `@sledge-pdm/core` | 1.2.7 | 1.2.7 | R0 already equals the R2 target; no version update was required. |
| `prettier-plugin-organize-imports` | 4.3.0 | 4.3.0 | Already at the R2 target; this version is the TypeScript 7 compatibility blocker. |
| `typescript` | 7.0.2 | 7.0.2 | Already TypeScript 7 at R0; retained as requested, including the existing import-organizer limitation. |
| `vite-plugin-solid` | 2.11.14 | 2.11.14 | R0 already equals the R2 target; no version update was required. |

## Validation

- Type checking, library build, development-page production build, and browser Vitest passed: 32 files, 142 tests.
- Local Core and UI were linked and installed. The development page rendered with WebGL2; drawing changed visible pixels, undo restored the original pixels, and redo restored the stroke for both Texture and Deflate history backends. Neither scenario emitted a browser exception or console error.
- The library output was then consumed by Sledge's linked tests and editor smoke checks.
- Linked UI and the consuming app must use one Solid runtime. `resolve.dedupe: ['solid-js']` was added to the development-page Vite configuration after the linked Sledge native build exposed duplicate Solid instances; rebuilding the development page preserves this resolution.
- The development-page build and library build both write to `dist`; the library build must run last before a linked consumer resolves `dist/index.js` and its declarations. This output-directory behavior exists in the repository configuration.
- There is no Cargo project in this repository. Validation used Windows, pnpm 11.5.2, Node 26.10.0 for build/test commands, and Chromium for page interaction. The default shell Node remains 22.14.0, below lint-staged 17.6.0's required version.
- TypeScript 7 was already present at R0; successful compilation does not resolve the import-organizer limitation listed above.
