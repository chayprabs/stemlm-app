import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

// V-WAR-01: chat pages can fetch only what the content script loads into them: the bundled font faces (D4) and
// the study panel (PERF-03). Toolbar icons are set by the background through action.setIcon and need no access.

describe('web-accessible resources', () => {
  it('exposes only the fonts and the study panel to chat pages', () => {
    const lists = [...readFileSync('wxt.config.ts', 'utf8').matchAll(/\bresources:\s*\[([^\]]*)\]/g)]
      .map((match) => [...(match[1] ?? '').matchAll(/'([^']+)'/g)].map((entry) => entry[1]));
    expect(lists).toEqual([['fonts/katex/*.woff2', 'fonts/ibm-plex/*.woff2', 'study-panel.js']]);
  });
});
