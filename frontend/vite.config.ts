import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({
      filename: 'dist/stats.html',
      open: false,
      gzipSize: true,
      brotliSize: true,
      template: 'treemap', // Interactive treemap visualization
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    // Rollup tree-shaking automatically removes:
    // - Code inside `if (import.meta.env.DEV)` blocks in production
    // - Dynamic imports that are never called in production
    // - Dead code from /mocks directory when not imported
    // This ensures mock authentication code is excluded from production bundles
    rollupOptions: {
      // Additional tree-shaking optimizations
      treeshake: {
        moduleSideEffects: false,
      },
      output: {
        // Manual vendor chunks for better caching
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'xstate-vendor': ['xstate', '@xstate/react'],
        },
      },
    },
  },
});
