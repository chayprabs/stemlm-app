/**
 * PERF-03: the content script runs on every chat page load, used or not. The
 * study panel loads as study-panel.js on first open, against the content
 * script's own module instances (scripts/panel-split.ts).
 */
import { describe, it, expect } from 'vitest';
import {
  CONTENT_ENTRY, PANEL_ENTRY, PANEL_LOADER, importGraph, sharedPanelModules,
} from '@/scripts/panel-split';

const ROOT = process.cwd();
const PANEL_STACK = /^(katex|react-markdown|rehype-katex|remark-gfm|remark-math|smiles-drawer|@dagrejs\/dagre|framer-motion)(\/|$)/;

describe('lazy study panel (PERF-03)', () => {
  const boot = importGraph(ROOT, CONTENT_ENTRY, new Set([PANEL_LOADER]));

  it('keeps the panel stack out of the content script', () => {
    expect([...boot.packages].filter((name) => PANEL_STACK.test(name))).toEqual([]);
    expect([...boot.files].filter((file) =>
      /^src\/components\/(Panel|MathMarkdown|DiagramRenderer|StepList)\.tsx$|^src\/lib\/figure\/engines\//.test(file))).toEqual([]);
    expect(boot.files).toContain(PANEL_LOADER);
  });

  it('builds the panel from its own entry', () => {
    const panel = importGraph(ROOT, PANEL_ENTRY);
    expect(panel.files).toContain('src/components/Panel.tsx');
    expect(panel.packages).toContain('katex');
    expect(panel.packages).toContain('framer-motion');
  });

  it('shares one React and every module the content script already runs', () => {
    const shared = sharedPanelModules(ROOT);
    for (const key of ['react', 'react/jsx-runtime', 'react-dom', 'src/state/store.ts', 'src/content/controller.ts', 'src/lib/settings.ts']) {
      expect(shared).toContain(key);
    }
    const panel = importGraph(ROOT, PANEL_ENTRY);
    for (const key of shared.filter((k) => k.startsWith('src/'))) {
      expect(boot.files.has(key) && panel.files.has(key)).toBe(true);
    }
    expect(shared.filter((key) => PANEL_STACK.test(key) || key === 'src/components/Panel.tsx')).toEqual([]);
  });
});
