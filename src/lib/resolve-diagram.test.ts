import { describe, it, expect } from 'vitest';
import {
  compileDiagram,
  compileDiagramStrict,
  normalizeDiagramSource,
  presentCompiledDiagram,
  resolveDiagramSvg,
} from './resolve-diagram';

describe('normalizeDiagramSource', () => {
  it('strips markdown fences', () => {
    const raw = '```svg\n<svg viewBox="0 0 10 10"><circle r="1"/></svg>\n```';
    expect(normalizeDiagramSource(raw)).toContain('<svg');
    expect(normalizeDiagramSource(raw)).not.toContain('```');
  });

  it('decodes HTML-entity encoded svg', () => {
    const raw = '&lt;svg viewBox="0 0 10 10"&gt;&lt;circle r="1"/&gt;&lt;/svg&gt;';
    expect(normalizeDiagramSource(raw)).toBe('<svg viewBox="0 0 10 10"><circle r="1"/></svg>');
  });
});

describe('resolveDiagramSvg', () => {
  it('returns sanitized svg markup for inline svg diagrams', async () => {
    const svg = await resolveDiagramSvg(
      {
        type: 'svg',
        content: '<svg viewBox="0 0 40 20"><circle cx="20" cy="10" r="5"/><text x="1" y="10">probe-diagram</text></svg>',
      },
      'dark',
    );
    expect(svg).toContain('probe-diagram');
    expect(svg).toContain('<svg');
    expect(svg).toContain('width="40"');
    expect(svg).toContain('height="20"');
  });

  it('normalizes admittance triangle markers through the full resolve path', async () => {
    const svg = await resolveDiagramSvg(
      {
        type: 'svg',
        content:
          '<svg viewBox="0 0 320 220"><defs>' +
          '<marker id="arrow" markerUnits="userSpaceOnUse" markerWidth="10" markerHeight="10">' +
          '<polygon points="0,0 10,5 0,10 3,5" fill="black"/></marker></defs>' +
          '<line x1="40" y1="160" x2="200" y2="160" stroke="#3b82f6" stroke-width="2" marker-end="url(#arrow)"/>' +
          '<line x1="200" y1="160" x2="200" y2="60" stroke="#ffa500" stroke-width="2" marker-end="url(#arrow)"/>' +
          '<line x1="40" y1="160" x2="200" y2="60" stroke="#16a34a" stroke-width="2.5" marker-end="url(#arrow)"/>' +
          '</svg>',
      },
      'light',
      'step',
    );
    expect(svg).not.toContain('userSpaceOnUse');
    expect(svg).not.toContain('fill="black"');
    expect(svg).toContain('fill="#3b82f6"');
    expect(svg).toContain('fill="#ffa500"');
    expect(svg).toContain('fill="#16a34a"');
  });

  it('draws a Mermaid flowchart with the native graph engine and marks it corrected', async () => {
    const compiled = await compileDiagram({ type: 'mermaid', content: 'graph TD\n  A["Start"] --> B["End"]' });
    expect(compiled).toMatchObject({ ok: true, corrected: true });
    expect(compiled.svg).toContain('data-stemlm-family="graph"');
    expect(await resolveDiagramSvg({ type: 'mermaid', content: 'flowchart LR\n  A --> B' }, 'light')).toContain('<svg');
  });

  it('never runs Mermaid itself: a Mermaid diagram it cannot translate stays hidden', async () => {
    const strict = await compileDiagramStrict({ type: 'mermaid', content: 'graph TD\n  A --> B' });
    expect(strict).toMatchObject({ ok: false, svg: '', diagnostic: { family: 'mermaid', code: 'refused' } });
    const gantt = await compileDiagram({ type: 'mermaid', content: 'gitGraph\n  commit\n  branch dev\n  commit' });
    expect(gantt).toMatchObject({ ok: false, svg: '' });
  });

  it('translates a foreign notation into a native figure and marks it corrected', async () => {
    const foreign = [
      { type: 'mermaid', content: 'stateDiagram-v2\n  [*] --> Idle\n  Idle --> Busy : start\n  Busy --> [*]' },
      { type: 'mermaid', content: 'flowchart TD\n  A([Start]) --> B{x > 0?}\n  B -- yes --> C[Done]\n  B -. no .-> A' },
      { type: 'mermaid', content: 'classDiagram\n  Animal <|-- Dog' },
      { type: 'dot', content: 'digraph { rankdir=LR; s [shape=point]; s -> q0; q0 -> q1 [label="a"]; q1 [shape=doublecircle] }' },
      { type: 'graph', content: 'digraph G { a -> b; b -> c }' },
      { type: 'table', content: '| x | y |\n|---|---|\n| 1 | 2, 3 |' },
      { type: 'graph', content: 'Glucose -> Pyruvate\nPyruvate -> Acetyl CoA: link reaction' },
    ];
    for (const diagram of foreign) {
      expect((await compileDiagramStrict(diagram)).ok).toBe(false);
      expect(await compileDiagram(diagram)).toMatchObject({ ok: true, corrected: true });
    }
  });

  it('draws the translation, not a guess: shapes and markers of the source survive', async () => {
    const flowchart = await compileDiagram({ type: 'mermaid', content: 'graph TD\n  A([Start]) --> B{Even?}\n  B -->|yes| C[Halve]' });
    expect(flowchart.svg).toContain('data-stemlm-family="graph"');
    const sameNative = await compileDiagramStrict({
      type: 'graph',
      content: 'rankdir: TB\nnode: A Start\nnode: B Even?\nnode: C Halve\nedge: A B\nedge: B C yes\ndecision: B\nterminal: A',
    });
    expect(flowchart.svg).toBe(sameNative.svg);
    const table = await compileDiagram({ type: 'table', content: '| a | b |\n|---|---|\n| 1 | 2 |' });
    expect(table.svg).toContain('data-stemlm-family="table"');
  });

  it('keeps a foreign figure hidden when it has no faithful native form', async () => {
    const unfaithful = [
      { type: 'mermaid', content: 'graph TD\n  A --- B' },
      { type: 'mermaid', content: 'graph TD\n  A --o B' },
      { type: 'mermaid', content: 'erDiagram\n  CUSTOMER ||--o{ ORDER : places' },
      { type: 'mermaid', content: 'classDiagram\n  class A {\n    +x\n  }\n  A <|-- B' },
      { type: 'mermaid', content: 'stateDiagram-v2\n  [*] --> A\n  state A {\n    [*] --> B\n  }' },
      { type: 'dot', content: 'graph { a -- b; b -- c }' },
      { type: 'dot', content: 'digraph { n [shape=record, label="{a|b}"]; n -> m }' },
    ];
    for (const diagram of unfaithful) expect(await compileDiagram(diagram)).toMatchObject({ ok: false, svg: '' });
  });

  it('keeps a translated figure hidden while its native family does not exist, without throwing', async () => {
    const sequence = await compileDiagram({ type: 'mermaid', content: 'sequenceDiagram\n  A->>B: hi' });
    expect(typeof sequence.ok).toBe('boolean');
    if (!sequence.ok) expect(sequence).toMatchObject({ svg: '', diagnostic: { family: 'mermaid' } });
  });

  it('leaves a spec that already compiles untouched and unmarked', async () => {
    const compiled = await compileDiagram({ type: 'plot', content: 'fn: x^2\ndomain: -2 2' });
    expect(compiled.ok).toBe(true);
    expect(compiled.corrected).toBeUndefined();
  });

  it('draws a spec whose only fault is notation, and says it was corrected', async () => {
    const drifted = { type: 'plot', content: 'function: x^2\nrange: -3 to 3' };
    expect((await compileDiagramStrict(drifted)).ok).toBe(false);
    const compiled = await compileDiagram(drifted);
    expect(compiled).toMatchObject({ ok: true, corrected: true });
    expect(presentCompiledDiagram(compiled, 'dark')).toMatchObject({ ok: true, corrected: true });
  });

  it('keeps a figure hidden when repair would have to guess content', async () => {
    const compiled = await compileDiagram({ type: 'plot', content: 'fn: x^2\ndomain: -2 2\nmystery: 7' });
    expect(compiled.ok).toBe(false);
  });

  it('compiles type=plot through the real resolve path with graphic shapes', async () => {
    const svg = await resolveDiagramSvg(
      {
        type: 'plot',
        content: [
          'fn: 1.5*t^2 - 2*t',
          'var: t',
          'domain: 0 10',
          'xlabel: t (s)',
          'ylabel: alpha',
          'eq: \\alpha(t)=1.5t^{2}-2t',
        ].join('\n'),
      },
      'light',
      'step',
    );
    expect(svg).toContain('<svg');
    expect(svg).toMatch(/<(polyline|path|line)\b/i);
    expect(svg).toContain('t (s)');
  });

  it('uses print profile bounds for PDF export', async () => {
    const svg = await resolveDiagramSvg(
      {
        type: 'svg',
        content: '<svg viewBox="0 0 520 260"><circle cx="260" cy="130" r="50"/><text x="1" y="10">pdf-diagram</text></svg>',
      },
      'light',
      'print',
    );
    expect(svg).toContain('width="480"');
    expect(svg).toContain('height="240"');
  });

  it('compiles once without theme; presentCompiledDiagram recolors without compiling', async () => {
    const diagram = {
      type: 'svg' as const,
      content:
        '<svg viewBox="0 0 40 20"><line x1="0" y1="10" x2="40" y2="10" stroke="#333" stroke-width="2"/><text x="1" y="10">probe</text></svg>',
    };
    const compiled = await compileDiagram(diagram, 'step');
    expect(compiled.svg).toContain('<svg');
    expect(compiled.svg).not.toContain('data-stemlm-theme');

    const dark = presentCompiledDiagram(compiled, 'dark', 'step');
    const light = presentCompiledDiagram(compiled, 'light', 'step');
    expect(dark.svg).toContain('data-stemlm-theme="dark"');
    expect(light.svg).toContain('data-stemlm-theme="light"');
    expect(dark.svg).toContain('IBM Plex Sans');
    expect(light.svg).toContain('IBM Plex Sans');
  });
});

describe('content-size scaling is panel-only', () => {
  const spec = {
    type: 'plot',
    content: 'kind: function\nfn: x\ndomain: 0 4\nxlabel: t (s)\nylabel: x (m)',
  } as const;

  function widthOf(svg: string): number {
    return Number(/\swidth="(\d+)"/.exec(svg)?.[1] ?? 0);
  }

  it('scales the panel profile but leaves the print profile fixed', async () => {
    const compiled = await compileDiagram(spec, 'step');
    const step = presentCompiledDiagram(compiled, 'light', 'step');
    const stepLarge = presentCompiledDiagram(compiled, 'light', 'step', 1.36);
    expect(widthOf(step.svg)).toBeGreaterThan(0);
    expect(widthOf(stepLarge.svg)).toBeGreaterThan(widthOf(step.svg));

    // The PDF path resolves its own 'print' profile with no scale argument, so
    // a reader's content-size choice can never reach exported output.
    const printCompiled = await compileDiagram(spec, 'print');
    const print = presentCompiledDiagram(printCompiled, 'light', 'print');
    const printAgain = presentCompiledDiagram(printCompiled, 'light', 'print');
    expect(widthOf(print.svg)).toBe(widthOf(printAgain.svg));
  });
});

describe('captions surfaced by a rewrite', () => {
  it('carries a title line that repair turned into the caption', async () => {
    const compiled = await compileDiagram({ type: 'graph', content: 'title: Shortest path\nnode: A\nnode: B\nedge: A B' });
    expect(compiled).toMatchObject({ ok: true, corrected: true, caption: 'Shortest path' });
    expect(presentCompiledDiagram(compiled, 'light')).toMatchObject({ ok: true, caption: 'Shortest path' });
  });

  it('carries the title of a translated Mermaid diagram', async () => {
    const compiled = await compileDiagram({ type: 'mermaid', content: '---\ntitle: Login flow\n---\nflowchart LR\n  A[Enter password] --> B[Signed in]' });
    expect(compiled).toMatchObject({ ok: true, corrected: true, caption: 'Login flow' });
  });

  it('reports no caption for a spec that compiled as written', async () => {
    const compiled = await compileDiagram({ type: 'plot', content: 'fn: x^2\ndomain: -2 2\ncaption: Parabola', caption: 'Parabola' });
    expect(compiled.ok).toBe(true);
    expect(compiled.caption).toBeUndefined();
  });
});
