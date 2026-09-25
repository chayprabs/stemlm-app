import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiagramRenderer } from './DiagramRenderer';
import { StepCard } from './StepCard';
import { SolutionView } from './SolutionView';
import { FollowupAnswerBody } from './FollowupCard';
import { Report, MergedReport } from './Report';
import * as compiler from '@/src/lib/figure/compile';
import * as resolver from '@/src/lib/resolve-diagram';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import type { Session } from '@/src/protocol/types';

vi.mock('wxt/browser', () => ({ browser: { runtime: { getURL: (path: string) => path } } }));
vi.mock('@/src/content/controller', () => ({ getController: () => null }));
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const session: Session = {
  id: 'visibility', createdAt: 0, updatedAt: 0, platform: 'gemini', question: 'Explain the plotted quantity.', raw: '',
  capsule: {
    meta: { version: 2, subject: 'Math', topic: 'Graph' },
    steps: [{ id: 's1', index: 1, title: 'Draw the graph', body: 'Keep this explanation.', formula: 'y=x', takeaway: 'Keep this conclusion.', diagram: { type: 'plot', content: 'xlabel: broken-spec-source', caption: 'Broken figure caption' } }],
    solution: 'Keep the final answer.', solutionDiagrams: [],
  },
};
let root: Root | undefined;
let host: HTMLDivElement | undefined;
function mount(content: React.ReactNode) {
  host = document.createElement('div'); document.body.append(host);
  act(() => { root = createRoot(host!); root.render(content); });
  return host;
}
async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 40)); });
}
function expectHidden(container: ParentNode) {
  expect(container.querySelector('.slm-step-diagram')).toBeNull();
  expect(container.querySelector('.slm-diagram')).toBeNull();
  expect(container.querySelector('.slm-diagram-fallback, .slm-report-diagram-fallback')).toBeNull();
  expect(container.textContent).not.toContain('Fix this figure');
  expect(container.textContent).not.toContain('broken-spec-source');
  expect(container.textContent).not.toContain('Broken figure caption');
}

describe('figure failure is absent from the entire reading surface', () => {
  afterEach(() => { act(() => root?.unmount()); host?.remove(); root = undefined; host = undefined; vi.restoreAllMocks(); useStore.setState({ settings: DEFAULT_SETTINGS }); });

  it.each(['step', 'solution', 'followup'] as const)('hides the complete failed section in %s and preserves the answer', async (surface) => {
    const content = surface === 'step' ? <StepCard session={session} index={0} theme="light" />
      : surface === 'solution' ? <SolutionView session={session} theme="dark" />
      : <FollowupAnswerBody capsule={session.capsule} theme="light" />;
    const container = mount(content);
    await settle();
    expectHidden(container);
    expect(container.textContent).toContain('Keep this explanation.');
    expect(container.querySelector('.slm-formula')).not.toBeNull();
  });

  it('does not expose a source, caption, box, or skeleton while validation is pending', () => {
    vi.spyOn(compiler, 'compileDiagramSpec').mockImplementation(() => new Promise(() => {}));
    const container = mount(<StepCard session={session} index={0} theme="light" />);
    expectHidden(container);
    expect(container.querySelector('.slm-diagram-skeleton')).toBeNull();
  });

  it('retains one compiler failure internally instead of retrying it', async () => {
    const compile = vi.spyOn(compiler, 'compileDiagramSpec').mockResolvedValue({ ok: false, code: 'malformed', reason: 'missing series' });
    const failure = vi.fn();
    const container = mount(<DiagramRenderer diagram={session.capsule.steps[0]!.diagram!} theme="light" onCompileFailure={failure} />);
    await settle();
    expectHidden(container);
    expect(compile).toHaveBeenCalledTimes(1);
    expect(failure).toHaveBeenCalledWith(expect.objectContaining({ code: 'malformed', reason: 'missing series' }));
  });

  it('does not offer a repair for an intentionally omitted figure', async () => {
    const omitted: Session = { ...session, capsule: { ...session.capsule, steps: [{ ...session.capsule.steps[0]!, diagram: undefined }] } };
    const container = mount(<StepCard session={omitted} index={0} theme="light" />);
    await settle();
    expectHidden(container);
  });

  it('hides failures in individual and merged reports without mutating saved source', () => {
    const snapshot = JSON.stringify(session);
    for (const content of [<Report session={session} diagramSvg={{}} />, <MergedReport sessions={[session, { ...session, id: 'second' }]} diagramSvg={{}} />]) {
      const container = document.createElement('div');
      container.innerHTML = renderToStaticMarkup(content);
      expectHidden(container);
      expect(container.textContent).toContain('Keep this explanation.');
    }
    expect(JSON.stringify(session)).toBe(snapshot);
  });

  it('ignores a late successful compilation for a previous diagram', async () => {
    let finish!: (value: Awaited<ReturnType<typeof resolver.compileDiagram>>) => void;
    const compile = vi.spyOn(resolver, 'compileDiagram');
    compile.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const container = mount(<DiagramRenderer diagram={{ type: 'plot', content: 'fn: x' }} theme="light" section />);
    act(() => root!.render(<DiagramRenderer diagram={session.capsule.steps[0]!.diagram!} theme="light" section />));
    await settle();
    await act(async () => finish({ ok: true, svg: '<svg viewBox="0 0 80 40"><line x2="80" y2="40"/></svg>', overlays: [] }));
    expectHidden(container);
    expect(compile).toHaveBeenCalledTimes(2);
  });

  it('anchors math labels to the figure at every content size without recompiling', async () => {
    const compile = vi.spyOn(resolver, 'compileDiagram').mockResolvedValue({
      ok: true, svg: '<svg viewBox="0 0 300 165"><line x1="10" y1="10" x2="290" y2="150"/></svg>',
      overlays: [{ id: 'eq', kind: 'katex', source: 'y=x', x: 150, y: 82.5, width: 40, height: 14, anchor: 'middle', baseline: 'middle' }],
    });
    const container = mount(<DiagramRenderer diagram={{ type: 'plot', content: 'fn: x' }} theme="light" section />);
    await settle();
    for (const scale of [1, 2, 3, 4, 5] as const) {
      act(() => useStore.setState({ settings: { ...DEFAULT_SETTINGS, contentScale: scale } }));
      const label = container.querySelector<HTMLElement>('[data-overlay-id="eq"]')!;
      expect(label.style.left).toBe('50%');
      expect(label.style.top).toBe('50%');
    }
    expect(compile).toHaveBeenCalledTimes(1);
  });
});
