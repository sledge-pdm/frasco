import { playwright } from '@vitest/browser-playwright';
import path from 'path';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasmPlugin from 'vite-plugin-wasm';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [wasmPlugin(), topLevelAwait()],
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: [path.resolve(__dirname, 'test/setup.ts')],
    browser: {
      provider: playwright(),
      enabled: true,
      headless: true,
      instances: [{ browser: 'chromium' }],
      screenshotFailures: false,
    },
    diff: {
      // truncate too long buffer diff
      truncateThreshold: 20,
    },
  },
});
