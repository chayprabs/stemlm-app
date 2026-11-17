import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

// Runs scripts/guide-eval/eval.ts through the project's own module graph (happy-dom, `@` alias),
// so answers are scored by exactly the parser and figure compiler the extension ships.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': resolve(__dirname, '../..') } },
  test: {
    environment: 'happy-dom',
    include: ['scripts/guide-eval/eval.ts'],
    globals: true,
    testTimeout: 120_000,
  },
});
