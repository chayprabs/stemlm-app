import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DiagramRenderer } from './DiagramRenderer';
import { compileDiagramSpec } from '@/src/lib/figure/compile';
import type { Diagram } from '@/src/protocol/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Live Claude answer, 2026-09-28 (round 2 q05): the kernel laid the plot out at its 10-unit retry size, but
// the equation's KaTeX overlay kept the panel's text size, rendered ~20% wider than its placed box and ran
// into the x-axis title. SVG text scales with the figure; a math label must too, at the kernel's size.
const PLOT: Diagram = {
  type: 'plot',
  content: [
    'kind: function', 'domain: -15 15', 'var: y', 'fn: cos(0.698132*y)*cos(0.698132*y)',
    'xlabel: screen position y (mm)', 'ylabel: intensity I / I_0', 'eq: I=I_0\\cos^2\\left(\\pi y/\\beta\\right)',
    'point: 13.5,1', 'point_label: third bright fringe, y = 13.5 mm', 'drop: x',
  ].join('\n'),
};

async function settle(check: () => boolean): Promise<void> {
  for (let i = 0; i < 60 && !check(); i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  }
}

describe('figure math labels', () => {
  let host: HTMLElement | undefined;
  let root: Root | undefined;
  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
  });

  it('carry the font size the label kernel placed them at', async () => {
    const compiled = await compileDiagramSpec(PLOT);
    expect(compiled.ok, compiled.ok ? '' : compiled.reason).toBe(true);
    if (!compiled.ok) return;
    const eq = compiled.overlays.find((o) => o.id === 'eq');
    expect(eq?.fontSize).toBeGreaterThan(0);
    expect(eq!.height).toBeCloseTo(eq!.fontSize! * 1.35, 5);
  });

  it('render at that size in units of the figure frame, so they scale with the drawing', async () => {
    const compiled = await compileDiagramSpec(PLOT);
    if (!compiled.ok) throw new Error(compiled.reason);
    const fontSize = compiled.overlays.find((o) => o.id === 'eq')!.fontSize!;
    host = document.createElement('div');
    document.body.appendChild(host);
    await act(async () => {
      root = createRoot(host!);
      root.render(<DiagramRenderer diagram={PLOT} theme="light" section />);
    });
    await settle(() => Boolean(host!.querySelector('.slm-diagram-overlay')));
    const frame = host.querySelector<HTMLElement>('.slm-diagram-frame')!;
    expect(frame.getAttribute('style') ?? '').toMatch(/container-type:\s*inline-size/);
    const viewBoxWidth = Number(host.querySelector('.slm-diagram-svg svg')!.getAttribute('viewBox')!.split(/[\s,]+/)[2]);
    const overlay = host.querySelector<HTMLElement>('.slm-diagram-overlay[data-overlay-id="eq"]')!;
    const size = /--slm-math-size:\s*([\d.]+)cqw/.exec(overlay.getAttribute('style') ?? '');
    expect(size, overlay.getAttribute('style') ?? '').not.toBeNull();
    // KaTeX draws at 1.21em, so the overlay's own font is the kernel size divided by that.
    expect(Number(size![1])).toBeCloseTo((fontSize / 1.21) * (100 / viewBoxWidth), 3);
  });
});
