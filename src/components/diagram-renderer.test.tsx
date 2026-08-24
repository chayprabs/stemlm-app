import { describe, it, expect, afterEach, vi } from 'vitest';
import * as resolveDiagramMod from '@/src/lib/resolve-diagram';
import { act, type ReactNode } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DiagramRenderer } from './DiagramRenderer';
import { parseCapsule } from '@/src/protocol/parser';
import { MECHANICAL_AXIAL_STRESS_BAR } from '@/src/protocol/__fixtures-visual-subjects';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function flushDiagram(): Promise<void> {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

async function flushUntil(check: () => boolean, tries = 40): Promise<void> {
  for (let i = 0; i < tries; i++) {
    await flushDiagram();
    if (check()) return;
  }
}

function mountInShadow(ui: ReactNode): { host: HTMLElement; shadow: ShadowRoot; root: Root } {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const shadow = host.attachShadow({ mode: 'open' });
  const mount = document.createElement('div');
  shadow.appendChild(mount);
  let root!: Root;
  act(() => {
    root = createRoot(mount);
    root.render(ui);
  });
  return { host, shadow, root };
}

describe('DiagramRenderer in shadow DOM', () => {
  let host: HTMLElement | undefined;
  let root: Root | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    host = undefined;
    root = undefined;
  });

  it('renders fixture SVG inside the step diagram box (dark theme)', async () => {
    const parsed = parseCapsule(MECHANICAL_AXIAL_STRESS_BAR);
    const diagram = parsed.capsule!.steps[0]!.diagram!;
    const mounted = mountInShadow(
      <div className="slm-step-diagram">
        <DiagramRenderer diagram={diagram} theme="dark" />
      </div>,
    );
    host = mounted.host;
    root = mounted.root;

    await flushDiagram();

    const svg = mounted.shadow.querySelector('.slm-diagram-svg svg');
    expect(svg).toBeTruthy();
    expect(mounted.shadow.querySelector('.slm-diagram-skeleton')).toBeNull();
    expect(mounted.shadow.textContent).toContain('state');
  });

  it('renders admittance triangle with colored arrowheads in shadow DOM', async () => {
    const diagram = {
      type: 'svg' as const,
      content:
        '<svg viewBox="0 0 320 220"><defs>' +
        '<marker id="arrow" markerUnits="userSpaceOnUse" markerWidth="12" markerHeight="12">' +
        '<path d="M0,0 L12,6 L0,12 L4,6 Z" fill="#000"/></marker></defs>' +
        '<line x1="40" y1="160" x2="200" y2="160" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow)"/>' +
        '<text x="100" y="150" fill="#3b82f6">G = 0.05</text>' +
        '<line x1="40" y1="160" x2="200" y2="60" stroke="#16a34a" stroke-width="2.5" marker-end="url(#arrow)"/>' +
        '<text x="90" y="100" fill="#16a34a">Y_total</text>' +
        '</svg>',
    };
    const mounted = mountInShadow(<DiagramRenderer diagram={diagram} theme="light" />);
    host = mounted.host;
    root = mounted.root;

    await flushDiagram();

    const svgHtml = mounted.shadow.querySelector('.slm-diagram-svg')?.innerHTML ?? '';
    expect(svgHtml).toContain('G = 0.05');
    expect(svgHtml).toContain('Y_total');
    expect(svgHtml).not.toContain('userSpaceOnUse');
    expect(svgHtml).not.toContain('fill="#000"');
    expect(svgHtml).toContain('fill="#3b82f6"');
    expect(svgHtml).toContain('fill="#16a34a"');
    expect(svgHtml).not.toContain('<path ');
  });

  it('renders impedance Thevenin diagram with wires and normalized arrowheads', async () => {
    const diagram = {
      type: 'svg' as const,
      content:
        '<svg viewBox="0 0 300 150">' +
        '<circle cx="250" cy="40" r="4" fill="white" stroke="black" stroke-width="2"/>' +
        '<text x="260" y="45" font-size="14">Port 2 (+)</text>' +
        '<line x1="80" y1="120" x2="250" y2="120" stroke="black" stroke-width="2"/>' +
        '<rect x="160" y="30" width="40" height="20" fill="white" stroke="black" stroke-width="2"/>' +
        '<text x="170" y="45" font-size="12">Z_3</text>' +
        '<defs><marker id="arrow" markerUnits="userSpaceOnUse" markerWidth="20" markerHeight="20">' +
        '<path d="M0,0 L20,10 L0,20 L5,10 Z" fill="blue"/></marker></defs>' +
        '<line x1="250" y1="80" x2="280" y2="80" stroke="blue" stroke-width="2" marker-end="url(#arrow)"/>' +
        '<text x="285" y="85" fill="blue">Z_th</text>' +
        '</svg>',
    };
    const mounted = mountInShadow(
      <div className="slm-step-diagram">
        <DiagramRenderer diagram={diagram} theme="dark" size="step" />
      </div>,
    );
    host = mounted.host;
    root = mounted.root;

    await flushDiagram();

    expect(mounted.shadow.querySelector('.slm-diagram--failed')).toBeNull();
    const svgHtml = mounted.shadow.querySelector('.slm-diagram-svg')?.innerHTML ?? '';
    expect(svgHtml).toContain('<line');
    expect(svgHtml).toContain('<rect');
    expect(svgHtml).toContain('Port 2 (+)');
    expect(svgHtml).toContain('Z_th');
    expect(svgHtml).not.toContain('userSpaceOnUse');
    expect(svgHtml).not.toContain('<path d="M0,0 L20,10');
  });

  it('falls back when the diagram is labels only (no drawable shapes)', async () => {
    const diagram = {
      type: 'svg' as const,
      content:
        '<svg viewBox="0 0 300 40"><text x="1" y="12">Port 2 (+) Port 2 (-) Z_3 Z_2 Z_1 + Z_s Z_th</text></svg>',
    };
    const mounted = mountInShadow(<DiagramRenderer diagram={diagram} theme="dark" />);
    host = mounted.host;
    root = mounted.root;

    await flushDiagram();

    expect(mounted.shadow.querySelector('.slm-diagram--failed')).toBeTruthy();
    expect(mounted.shadow.querySelector('.slm-diagram-fallback')?.textContent).toContain('Port 2');
  });

  it('mounts a compiled plot spec with SVG and overlay siblings', async () => {
    const diagram = {
      type: 'plot',
      content: [
        'fn: 1.5*t^2 - 2*t',
        'var: t',
        'domain: 0 10',
        'xlabel: t (s)',
        'ylabel: alpha',
        'eq: \\alpha(t)=1.5t^{2}-2t',
        'eq_slot: NE',
      ].join('\n'),
    };
    const mounted = mountInShadow(<DiagramRenderer diagram={diagram} theme="light" />);
    host = mounted.host;
    root = mounted.root;
    await flushUntil(() => Boolean(mounted.shadow.querySelector('figure.slm-diagram svg')));
    expect(mounted.shadow.querySelector('.slm-diagram--failed')).toBeNull();
    expect(mounted.shadow.querySelector('figure.slm-diagram svg')).toBeTruthy();
    const overlay = mounted.shadow.querySelector('.slm-diagram-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay?.innerHTML).toMatch(/katex|math|alpha|α/i);
  });

  it('mounts a compiled solenoid field spec as graphic SVG, not fallback', async () => {
    const diagram = {
      type: 'field',
      content: ['catalog: solenoid', 'core: mu_r=400', 'B: 1.0 T', 'H: ?'].join('\n'),
    };
    const mounted = mountInShadow(<DiagramRenderer diagram={diagram} theme="light" />);
    host = mounted.host;
    root = mounted.root;
    await flushUntil(() => Boolean(mounted.shadow.querySelector('figure.slm-diagram svg')));
    expect(mounted.shadow.querySelector('.slm-diagram--failed')).toBeNull();
    const svg = mounted.shadow.querySelector('figure.slm-diagram svg');
    expect(svg).toBeTruthy();
    const html = mounted.shadow.querySelector('.slm-diagram-svg')?.innerHTML ?? '';
    expect(html).toMatch(/<(rect|ellipse|line|path|polyline)\b/i);
    expect(html).toMatch(/id="[^"]*core"/);
  });

  it('mounts a compiled divider circuit spec as graphic SVG, not fallback', async () => {
    const diagram = {
      type: 'circuit',
      content: [
        'std: ieee',
        'V1: n_in 0 DC 12',
        'R1: n_in n_a 4k',
        'R2: n_a 0 6k',
        'RL: n_a 0 10k',
        'highlight: R2',
      ].join('\n'),
    };
    const mounted = mountInShadow(<DiagramRenderer diagram={diagram} theme="dark" />);
    host = mounted.host;
    root = mounted.root;
    await flushUntil(() => Boolean(mounted.shadow.querySelector('figure.slm-diagram svg')));
    expect(mounted.shadow.querySelector('.slm-diagram--failed')).toBeNull();
    const html = mounted.shadow.querySelector('.slm-diagram-svg')?.innerHTML ?? '';
    expect(html).toMatch(/<(line|polyline|rect|circle|path)\b/i);
    expect(html).toContain('V1');
    expect(html).toContain('R1');
    expect(html).toContain('R2');
    expect(html).toContain('RL');
  });

  it('prose-only field body falls back to pre, not a fake figure', async () => {
    const diagram = {
      type: 'field',
      content:
        'SPEC: A cross-section of a solenoid coil wrapped around a solid cylindrical core.\n- The core is shaded.',
    };
    const mounted = mountInShadow(<DiagramRenderer diagram={diagram} theme="dark" />);
    host = mounted.host;
    root = mounted.root;
    await flushUntil(() => Boolean(mounted.shadow.querySelector('.slm-diagram--failed')));
    expect(mounted.shadow.querySelector('.slm-diagram--failed')).toBeTruthy();
    expect(mounted.shadow.querySelector('.slm-diagram-fallback')?.textContent).toContain('SPEC:');
    expect(mounted.shadow.querySelector('figure.slm-diagram svg')).toBeNull();
  });

  it('failed compile shows slm-diagram--failed + spec source', async () => {
    const diagram = { type: 'plot', content: 'xlabel: t' };
    const mounted = mountInShadow(<DiagramRenderer diagram={diagram} theme="dark" />);
    host = mounted.host;
    root = mounted.root;
    await flushUntil(() => Boolean(mounted.shadow.querySelector('.slm-diagram--failed')));
    expect(mounted.shadow.querySelector('.slm-diagram--failed')).toBeTruthy();
    expect(mounted.shadow.querySelector('.slm-diagram-fallback')?.textContent).toContain('xlabel: t');
  });

  it('does not leave an eternal skeleton for SVG diagrams', async () => {
    const parsed = parseCapsule(MECHANICAL_AXIAL_STRESS_BAR);
    const diagram = parsed.capsule!.steps[1]!.diagram!;
    const mounted = mountInShadow(<DiagramRenderer diagram={diagram} theme="dark" />);
    host = mounted.host;
    root = mounted.root;

    await flushDiagram();

    expect(mounted.shadow.querySelector('[data-empty="true"]')).toBeNull();
    expect(mounted.shadow.querySelector('.slm-diagram-skeleton')).toBeNull();
    expect(mounted.shadow.querySelector('.slm-diagram--failed')).toBeNull();
    expect(mounted.shadow.querySelector('svg')).toBeTruthy();
  });

  it('does not recompile when only the panel theme changes', async () => {
    const spy = vi.spyOn(resolveDiagramMod, 'compileDiagram');
    const diagram = {
      type: 'svg' as const,
      content:
        '<svg viewBox="0 0 40 20"><rect width="40" height="20" fill="#333"/><text x="1" y="12">state</text></svg>',
    };
    const mounted = mountInShadow(<DiagramRenderer diagram={diagram} theme="light" />);
    host = mounted.host;
    root = mounted.root;

    await flushUntil(() => Boolean(mounted.shadow.querySelector('figure.slm-diagram svg')));
    const calls = spy.mock.calls.length;
    expect(calls).toBeGreaterThan(0);

    act(() => {
      mounted.root.render(<DiagramRenderer diagram={diagram} theme="dark" />);
    });
    await flushDiagram();

    expect(spy.mock.calls.length).toBe(calls);
    expect(mounted.shadow.querySelector('svg')?.getAttribute('data-stemlm-theme')).toBe('dark');
    spy.mockRestore();
  });
});
