import { defineConfig } from 'vite';

export default defineConfig({
  base: '/cross-window-3d-sync/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  },
  server: {
    open: true,
    port: 3000
  }
});
