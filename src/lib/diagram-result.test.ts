import { afterEach, describe, expect, it, vi } from 'vitest';
import { compileDiagram, presentCompiledDiagram, resolveDiagram, DIAGRAM_COMPILE_TIMEOUT_MS } from './resolve-diagram';
import * as compiler from './figure/compile';

describe('diagram results preserve one validation decision', () => {
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); });

  it('retains the actual compiler reason without a diagnostic recompile', async () => {
    const compile = vi.spyOn(compiler, 'compileDiagramSpec').mockResolvedValue({ ok: false, code: 'unsatisfiable', reason: 'required label has no free slot' });
    const result = await compileDiagram({ type: 'plot', content: 'fn: x' });
    expect(result).toMatchObject({ ok: false, svg: '', overlays: [], diagnostic: { family: 'plot', stage: 'compile', code: 'unsatisfiable', reason: 'required label has no free slot' } });
    expect(compile).toHaveBeenCalledTimes(1);
  });

  it('contains thrown compiler errors', async () => {
    vi.spyOn(compiler, 'compileDiagramSpec').mockRejectedValue(new Error('engine failure'));
    expect(await compileDiagram({ type: 'plot', content: 'fn: x' })).toMatchObject({ ok: false, diagnostic: { code: 'throw', reason: 'engine failure' } });
  });

  it('records a timeout and never resolves it into late success', async () => {
    vi.useFakeTimers();
    vi.spyOn(compiler, 'compileDiagramSpec').mockImplementation(() => new Promise(() => {}));
    const pending = compileDiagram({ type: 'graph', content: 'node: a A\nedge: a b' });
    await vi.advanceTimersByTimeAsync(DIAGRAM_COMPILE_TIMEOUT_MS);
    expect(await pending).toMatchObject({ ok: false, diagnostic: { code: 'timeout' } });
    expect(vi.getTimerCount()).toBe(0);
  });

  it.each([
    '<svg viewBox="0 0 -1 1"><line x2="1" y2="1"/></svg>',
    '<svg viewBox="0 0 100 40"><text x="0" y="20">labels only</text></svg>',
    '<svg viewBox="0 0 100 40"><script>alert(1)</script></svg>',
    '<svg viewBox="0 0 100 40"><defs><path id="unused" d="M0 0 L80 20"/></defs><text>no figure</text></svg>',
    '<svg viewBox="0 0 100 40"><rect width="0" height="20"/></svg>',
    '<svg viewBox="0 0 100 40"><path d="M10 10"/></svg>',
  ])('hides unusable sanitized SVG in both display and print: %s', async (content) => {
    for (const profile of ['step', 'print'] as const) {
      expect(await resolveDiagram({ type: 'svg', content }, 'light', profile)).toMatchObject({ ok: false, svg: '', overlays: [] });
    }
  });

  it('validates overlay geometry and math before admitting the figure', async () => {
    vi.spyOn(compiler, 'compileDiagramSpec').mockResolvedValue({
      ok: true, svg: '<svg viewBox="0 0 100 50"><line x1="0" y1="0" x2="80" y2="40"/></svg>',
      scene: { family: 'plot', width: 100, height: 50, nodes: [], strokes: [], labels: [], highlights: [] },
      overlays: [{ id: 'eq', kind: 'katex', source: '\\notARealMathCommand', x: 20, y: 20, width: 10, height: 10, anchor: 'middle', baseline: 'middle' }],
    });
    expect(await compileDiagram({ type: 'plot', content: 'fn: x' })).toMatchObject({ ok: false, diagnostic: { stage: 'presentation', code: 'malformed' } });
  });

  it('recolors a successful result without losing its admission state', async () => {
    const result = await compileDiagram({ type: 'svg', content: '<svg viewBox="0 0 80 40"><line x1="5" y1="5" x2="75" y2="35" stroke="#333"/></svg>' });
    expect(result).toMatchObject({ ok: true });
    for (const theme of ['light', 'dark'] as const) {
      expect(presentCompiledDiagram(result, theme)).toMatchObject({ ok: true });
      expect(presentCompiledDiagram(result, theme).svg).toContain(`data-stemlm-theme="${theme}"`);
    }
  });
});
