import { playwright } from '@vitest/browser-playwright';
import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/dist/**'],
    setupFiles: [path.resolve(import.meta.dirname, 'test/setup.ts')],
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
  resolve: {
    alias: {
      '~': path.join(import.meta.dirname, 'src'),
    },
  },
});
