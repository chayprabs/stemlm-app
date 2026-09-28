import { describe, it, expect, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DiagramRenderer } from './DiagramRenderer';
import { diagramKey } from './Report';
import { buildReportDocument } from '@/src/lib/pdf';
import { resolveDiagramSvg } from '@/src/lib/resolve-diagram';
import { compileDiagramSpec } from '@/src/lib/figure/compile';
import type { Diagram, Session } from '@/src/protocol/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

// Live Claude answers, 2026-09-28: a table drew "Concentrations in M" inside the figure AND again as the
// caption line under it; a plot with a long caption was hidden ("no collision-free slot for label caption").
const TABLE: Diagram = { type: 'table', content: 'kind: ice\nspecies: N2, H2, NH3\ni: 0.50, 1.50, 0\nc: -x, -3x, +2x\ne: 0.50 - x, 1.50 - 3x, 2x\ncaption: Concentrations in M', caption: 'Concentrations in M' };
const LONG = 'Eigenvector lines of A: A only stretches vectors along these two lines';
const PLOT: Diagram = { type: 'plot', content: `kind: function\ndomain: -3 3\nfn: x\nfn2: -2*x\neq: y=x\neq: y=-2x\ncaption: ${LONG}`, caption: LONG };

async function settle(check: () => boolean): Promise<void> {
  for (let i = 0; i < 60 && !check(); i++) {
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
  }
}

describe('figure captions', () => {
  let host: HTMLElement | undefined;
  let root: Root | undefined;
  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
  });

  async function mount(diagram: Diagram) {
    host = document.createElement('div');
    document.body.appendChild(host);
    await act(async () => {
      root = createRoot(host!);
      root.render(<DiagramRenderer diagram={diagram} theme="light" section />);
    });
    await settle(() => Boolean(host!.querySelector('.slm-diagram-svg svg')));
    return host!;
  }

  it('shows a caption the figure already draws only to screen readers', async () => {
    const el = await mount(TABLE);
    expect(el.querySelector('.slm-diagram-svg svg')?.textContent).toContain('Concentrations in M');
    const caption = el.querySelector('figcaption')!;
    expect(caption.textContent).toBe('Concentrations in M');
    expect(caption.classList.contains('slm-sr-only')).toBe(true);
    expect(el.querySelector('figure')?.getAttribute('aria-labelledby')).toBe(caption.id);
  });

  it('keeps a long plot caption as the visible caption under the figure instead of hiding the plot', async () => {
    const compiled = await compileDiagramSpec(PLOT);
    expect(compiled.ok, compiled.ok ? '' : compiled.reason).toBe(true);
    const el = await mount(PLOT);
    expect(el.querySelector('.slm-diagram-svg svg')?.textContent).not.toContain('Eigenvector lines');
    const caption = el.querySelector('figcaption')!;
    expect(caption.textContent).toBe(LONG);
    expect(caption.classList.contains('slm-sr-only')).toBe(false);
  });

  it('prints a caption the figure does not draw under it in the report, and only once', async () => {
    const session = (diagram: Diagram): Session => ({
      id: 'cap', createdAt: 0, updatedAt: 0, platform: 'claude', question: 'q', raw: '',
      capsule: { meta: { version: 2, subject: 'Math', topic: 't' }, steps: [{ id: 's1', index: 1, title: 'Draw it', body: '', diagram }], solution: '', solutionDiagrams: [] },
    });
    const plotDoc = buildReportDocument(session(PLOT), { [diagramKey('step', 1)]: await resolveDiagramSvg(PLOT, 'light', 'print') });
    expect(plotDoc).toContain('slm-report-diagram');
    expect(plotDoc.split(LONG).length - 1).toBe(1);
    const tableDoc = buildReportDocument(session(TABLE), { [diagramKey('step', 1)]: await resolveDiagramSvg(TABLE, 'light', 'print') });
    expect(tableDoc.split('Concentrations in M').length - 1).toBe(1);
  });
});
