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
