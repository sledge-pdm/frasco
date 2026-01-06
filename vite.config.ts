import { defineConfig } from 'vite';

export default defineConfig({
  root: 'dev',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },
});
