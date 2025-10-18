import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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
    },
  },
});
