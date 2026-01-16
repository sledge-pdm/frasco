import path from 'path';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasmPlugin from 'vite-plugin-wasm';

export default defineConfig({
  plugins: [wasmPlugin(), topLevelAwait()],
  root: 'dev',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '~': path.join(__dirname, 'src'),
    },
  },
});
