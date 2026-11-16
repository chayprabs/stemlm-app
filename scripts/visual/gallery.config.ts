import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Runs scripts/visual/figure-gallery.ts through the project's own module graph (happy-dom, `@` alias)
// so the gallery compiles figures with exactly the code the extension ships.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': resolve(__dirname, '../..') } },
  test: {
    environment: 'happy-dom',
    include: ['scripts/visual/figure-gallery.ts'],
    globals: true,
    testTimeout: 120_000,
  },
});
