import { describe, it, expect, afterEach } from 'vitest';
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
    expect(mounted.shadow.textContent).toContain('P=5 kN');
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
});
