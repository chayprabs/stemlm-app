import { describe, expect, it } from 'vitest';
import { overlayPrintStyleAttr, overlayStyleAttr } from './overlay';
import type { Overlay } from './types';

const overlay: Overlay = {
  id: 'eq',
  kind: 'katex',
  source: '\\alpha(t)',
  x: 240,
  y: 55,
  anchor: 'middle',
  baseline: 'middle',
  width: 80,
  height: 18,
};

describe('overlay print positioning', () => {
  it('uses percent of the viewBox so CSS-scaled SVGs keep labels on the plot', () => {
    const css = overlayPrintStyleAttr(overlay, '0 0 480 275');
    expect(css).toContain('left:50%');
    expect(css).toContain('top:20%');
    expect(css).toMatch(/left:\s*[\d.]+%/);
    expect(css).not.toMatch(/left:\s*[\d.]+px/);
    expect(css).toContain('translate(-50%, -50%)');
  });

  it('panel overlay styles stay in pixels', () => {
    const css = overlayStyleAttr(overlay, '0 0 480 275', 'print');
    expect(css).toMatch(/left:\s*[\d.]+px/);
    expect(css).not.toMatch(/left:\s*[\d.]+%/);
  });
});
