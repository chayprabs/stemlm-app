import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  define: {
    // Mirror the build-time GA constants so analytics.ts loads in tests (no-op).
    __GA_MEASUREMENT_ID__: '""',
    __GA_API_SECRET__: '""',
  },
  test: {
    environment: 'happy-dom',
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'],
    globals: true,
  },
});
