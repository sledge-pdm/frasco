import path from 'path';
import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasmPlugin from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [solid(), wasmPlugin(), topLevelAwait()],
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
      '~': path.join(__dirname, 'src'),
    },
  },
});
