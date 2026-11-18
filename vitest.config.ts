import { configDefaults, defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

const TESTS = ['src/**/*.test.ts', 'src/**/*.test.tsx', 'tests/**/*.test.ts'];

/**
 * Mostly pure logic. These run in plain Node, which skips loading happy-dom and building its
 * window for every file: that, not the tests, was most of the suite's time.
 */
const NODE_TESTS = ['src/*.test.ts', 'src/ingest/**/*.test.ts', 'src/lib/**/*.test.ts', 'src/protocol/**/*.test.{ts,tsx}'];

/**
 * ...except these, which reach document, window, DOMParser or XMLSerializer (themselves or through
 * the code they test) or take a different branch without them. Each one was checked: run under
 * Node, it fails or executes different source branches. A new test in NODE_TESTS that needs a
 * DOM fails with "document is not defined"; list it here.
 */
const NEEDS_DOM = [
  'src/ingest/dom-to-markdown.test.ts',
  'src/ingest/roundtrip.test.ts',
  'src/lib/background-onboarding.test.ts',
  'src/lib/background-saved-sessions.test.ts',
  'src/lib/background-update.test.ts',
  'src/lib/background-workspace.test.ts',
  'src/lib/composer-anchor.test.ts',
  'src/lib/diagram-result.test.ts',
  'src/lib/figure-label-xss.test.ts',
  'src/lib/figure/engines.test.ts',
  'src/lib/figure/families/all-packs.test.ts',
  'src/lib/figure/families/cs/pack.test.ts',
  'src/lib/figure/families/geometry/pack.test.ts',
  'src/lib/figure/families/science/pack.test.ts',
  'src/lib/figure/families/stats/chart.test.ts',
  'src/lib/figure/families/stats/pack.test.ts',
  'src/lib/figure/field-circuit.test.ts',
  'src/lib/figure/figure-legibility.test.ts',
  'src/lib/figure/fill-semantic.test.ts',
  'src/lib/figure/graph-layout.test.ts',
  'src/lib/figure/graph-role-words.test.ts',
  'src/lib/figure/intel/corpus.test.ts',
  'src/lib/figure/intel/foreign/foreign.test.ts',
  'src/lib/figure/intel/repair.test.ts',
  'src/lib/figure/l1-scene.test.ts',
  'src/lib/figure/label-format.test.ts',
  'src/lib/figure/launch.test.ts',
  'src/lib/figure/leftovers.test.ts',
  'src/lib/figure/marker-direction.test.ts',
  'src/lib/figure/plot-axes.test.ts',
  'src/lib/figure/ray-fidelity.test.ts',
  'src/lib/figure/sfd-layout.test.ts',
  'src/lib/figure/smiles-skeletal.test.ts',
  'src/lib/figure/table-caption-wrap.test.ts',
  'src/lib/figure/table-layout.test.ts',
  'src/lib/file-download.test.ts',
  'src/lib/file-inject-confirmation.test.ts',
  'src/lib/file-inject-latency.test.ts',
  'src/lib/file-inject-own-busy.test.ts',
  'src/lib/file-inject-slow-upload.test.ts',
  'src/lib/file-inject.test.ts',
  'src/lib/followup-selection.test.ts',
  'src/lib/fonts.test.ts',
  'src/lib/live-settings.test.ts',
  'src/lib/math-content-promote.test.ts',
  'src/lib/math-content-render.test.ts',
  'src/lib/mount-svg.test.ts',
  'src/lib/panel-remote.test.ts',
  'src/lib/pdf-download.test.ts',
  'src/lib/pdf-figure-labels.test.ts',
  'src/lib/pdf-figure-trim.test.ts',
  'src/lib/pdf-paginate.test.ts',
  'src/lib/pdf-resilience.test.ts',
  'src/lib/resolve-diagram.test.ts',
  'src/lib/sanitize.test.ts',
  'src/lib/saved-pdf-page.test.ts',
  'src/lib/saved-sessions.test.ts',
  'src/lib/settings.test.ts',
  'src/lib/sfd-admission.test.ts',
  'src/lib/split-ratio.test.ts',
  'src/lib/split-screen.test.ts',
  'src/lib/svg-present.test.ts',
  'src/lib/theme.test.ts',
  'src/protocol/builder.test.ts',
  'src/protocol/capsule-boundary.test.ts',
  'src/protocol/capsule-verify.test.tsx',
  'src/protocol/diagram-quality.test.ts',
  'src/protocol/guide.test.ts',
  'src/protocol/long-steps.test.tsx',
  'src/protocol/parser.test.ts',
  'src/protocol/step-quality.test.ts',
  'src/protocol/visual-subjects.test.tsx',
];

export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: {
    alias: {
      '@': resolve(__dirname, '.'),
    },
  },
  test: {
    environment: 'happy-dom',
    globals: true,
    // Only catches a hang: a busy machine stretches wall-clock time; CPU budgets hold speed.
    testTimeout: 30_000,
    projects: [
      {
        extends: true,
        test: { name: 'node', environment: 'node', include: NODE_TESTS, exclude: [...configDefaults.exclude, ...NEEDS_DOM] },
      },
      { extends: true, test: { name: 'dom', include: TESTS, exclude: [...configDefaults.exclude, ...NODE_TESTS] } },
      { extends: true, test: { name: 'dom-listed', include: NEEDS_DOM } },
    ],
  },
});
