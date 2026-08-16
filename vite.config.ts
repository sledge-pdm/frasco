import path from 'path';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solid()],
  root: 'dev',
  publicDir: '../public',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  optimizeDeps: {
    exclude: ['@sledge-pdm/ui'],
  },
  resolve: {
    alias: {
      '~': path.join(import.meta.dirname, 'src'),
    },
  },
});
