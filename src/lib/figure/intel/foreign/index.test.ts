import { describe, expect, it } from 'vitest';
import type { Diagram } from '@/src/protocol/types';
import { diagramFromFence, explainForeignDiagram, isFigureFence, translateForeignDiagram } from './index';
import { cpuMs } from '../../../cpu-time';

describe('translateForeignDiagram', () => {
  it('translates a diagram declared as Mermaid, keeping its id and its own caption', () => {
    const result = translateForeignDiagram({ type: 'mermaid', content: 'graph LR\n  A --> B', id: 'f3', caption: 'Mine' });
    expect(result).toEqual({
      diagram: { type: 'graph', content: 'rankdir: LR\nnode: A\nnode: B\nedge: A B', caption: 'Mine', id: 'f3' },
      notation: 'mermaid',
      notes: [],
    });
  });

  it('carries a title the native spec has no key for as the diagram caption', () => {
    expect(translateForeignDiagram({ type: 'dot', content: 'digraph { label="Krebs"; a -> b }' })?.diagram.caption).toBe('Krebs');
    expect(translateForeignDiagram({ type: 'mermaid', content: '---\ntitle: Flow\n---\ngraph TD\n A --> B' })?.diagram.caption).toBe('Flow');
  });

  it('recognises a foreign notation by content under a native type name', () => {
    expect(translateForeignDiagram({ type: 'graph', content: 'flowchart TD\n  A --> B' })?.notation).toBe('mermaid');
    expect(translateForeignDiagram({ type: 'graph', content: 'digraph G { a -> b }' })?.notation).toBe('dot');
    expect(translateForeignDiagram({ type: 'flowchart', content: '```mermaid\ngraph TD\n  A --> B\n```' })?.diagram.type).toBe('graph');
    expect(translateForeignDiagram({ type: 'table', content: '| a | b |\n|---|---|\n| 1 | 2 |' })?.diagram).toEqual({
      type: 'table',
      content: 'kind: matrix\nheaders: a, b\nrow: 1, 2',
    });
  });

  it('reads bare arrow lines only under a graph-like type, and there without the fence-only strictness', () => {
    expect(translateForeignDiagram({ type: 'graph', content: 'A->B' })?.diagram.content).toBe('rankdir: LR\nnode: A\nnode: B\nedge: A B');
    expect(translateForeignDiagram({ type: 'plot', content: 'A -> B\nB -> C' })).toBeNull();
    expect(translateForeignDiagram({ type: 'graph', content: 'rankdir: LR\nA -> B' })).toBeNull();
  });

  it('leaves native specs and SVG alone', () => {
    expect(translateForeignDiagram({ type: 'graph', content: 'node: A start\nedge: A B\nrankdir: LR' })).toBeNull();
    expect(translateForeignDiagram({ type: 'table', content: 'kind: matrix\nheaders: a, b\nrow: 1, 2' })).toBeNull();
    expect(translateForeignDiagram({ type: 'plot', content: 'fn: x^2\ndomain: -2 2' })).toBeNull();
    expect(translateForeignDiagram({ type: 'svg', content: '<svg><text>graph TD</text></svg>' })).toBeNull();
    expect(translateForeignDiagram({ type: 'chart', content: 'kind: pie\nlabels: a, b\nvalues: 1, 2' })).toBeNull();
  });

  it('says why a recognised notation was refused', () => {
    expect(explainForeignDiagram({ type: 'mermaid', content: 'graph TD\n  A --- B' })).toEqual({
      result: null,
      refusal: { notation: 'mermaid', reason: 'undirected links cannot be drawn without inventing a direction' },
    });
    expect(explainForeignDiagram({ type: 'graph', content: 'node: A' })).toEqual({ result: null });
  });

  it('never throws on malformed input', () => {
    const hostile: unknown[] = [
      null, undefined, 7, {}, { type: 'mermaid' }, { type: 'mermaid', content: 42 }, { type: 5, content: 'graph TD\nA-->B' },
      { type: 'mermaid', content: '' }, { type: 'mermaid', content: '\u0000￿\uD800' }, { type: 'dot', content: '{{{{' },
      { type: 'mermaid', content: 'graph TD\n  A[\u0000] --> B' }, { type: 'table', content: '|||\n|-|\n|' },
    ];
    for (const diagram of hostile) expect(() => translateForeignDiagram(diagram as Diagram)).not.toThrow();
    expect(translateForeignDiagram({ type: 5, content: 'graph TD\nA-->B' } as unknown as Diagram)?.diagram.type).toBe('graph');
  });

  it('refuses a source over the spec budget', () => {
    const big = `graph TD\n${'A --> B\n'.repeat(9_000)}`;
    expect(big.length).toBeGreaterThan(64_000);
    expect(translateForeignDiagram({ type: 'mermaid', content: big })).toBeNull();
    expect(isFigureFence('mermaid', big)).toBe(false);
  });
});

describe('diagramFromFence and isFigureFence', () => {
  it('reads the language from the fence info string', () => {
    for (const info of ['mermaid', 'Mermaid', ' mermaid title="x"', '{.mermaid}', 'mmd']) {
      expect(diagramFromFence(info, 'graph TD\n  A --> B')?.notation).toBe('mermaid');
    }
    for (const info of ['dot', 'graphviz', 'gv', 'DOT']) expect(diagramFromFence(info, 'digraph { a -> b }')?.notation).toBe('dot');
  });

  it('sniffs unlabelled and plain-text fences, and ignores fences in a programming language', () => {
    expect(diagramFromFence('', 'stateDiagram-v2\n  [*] --> A\n  A --> [*]')?.diagram.content).toBe('rankdir: TB\nnode: A\nstart: A\naccept: A');
    expect(diagramFromFence('text', 'A -> B\nB -> C')?.notation).toBe('arrows');
    expect(diagramFromFence('python', 'graph TD\n  A --> B')).toBeNull();
    expect(diagramFromFence('js', 'a => b\nb => c')).toBeNull();
    expect(isFigureFence('python', 'A -> B\nB -> C')).toBe(false);
  });

  it('does not mistake Graphviz or prose for Mermaid', () => {
    expect(diagramFromFence('', 'graph G {\n  a -- b\n}')).toBeNull();
    expect(diagramFromFence('', 'graph\n{\n a -> b\n}')?.notation).toBe('dot');
    expect(isFigureFence('', 'pie is my favourite dessert')).toBe(false);
    expect(isFigureFence('', 'timeline of events:\n1990 start')).toBe(false);
    expect(isFigureFence('text', 'gantt charts are useful')).toBe(false);
    expect(isFigureFence('', 'x = 1\ny = 2')).toBe(false);
  });

  it('counts a Mermaid or DOT fence as a figure candidate even when it cannot be translated', () => {
    expect(isFigureFence('mermaid', 'erDiagram\n  A ||--o{ B : has')).toBe(true);
    expect(diagramFromFence('mermaid', 'erDiagram\n  A ||--o{ B : has')).toBeNull();
    expect(isFigureFence('dot', 'graph { a -- b }')).toBe(true);
    expect(isFigureFence('markdown', 'Just a paragraph.')).toBe(false);
    expect(isFigureFence('markdown', '| a | b |\n|---|---|\n| 1 | 2 |')).toBe(true);
  });

  it('never throws on hostile arguments', () => {
    const args: unknown[][] = [[null, null], [undefined, 'graph TD\nA-->B'], [{}, []], ['mermaid', null], ['mermaid', '\u0000'], [5, 5]];
    for (const [lang, code] of args) {
      expect(() => diagramFromFence(lang as string, code as string)).not.toThrow();
      expect(() => isFigureFence(lang as string, code as string)).not.toThrow();
    }
  });
});

describe('bounded work on adversarial input', () => {
  const size = 60_000;
  const fill = (unit: string) => unit.repeat(Math.ceil(size / unit.length)).slice(0, size);
  const cases: Array<[string, string, string]> = [
    ['mermaid', 'a chain on one line', `graph TD;${fill('A-->B;')}`],
    ['mermaid', 'an endless arrow chain', `graph TD\n${fill('A-->')}`],
    ['mermaid', 'nested open brackets', `graph TD\nA[${fill('[')}`],
    ['mermaid', 'unclosed quotes', `graph TD\n${fill('A["x --> ')}`],
    ['mermaid', 'a run of dashes', `graph TD\nA --${fill('-')}`],
    ['mermaid', 'a run of spaces', `graph TD\nA${fill(' ')}B`],
    ['mermaid', 'an unclosed tag with spaces', `graph TD\nA["<b${fill(' ')}"] --> B`],
    ['mermaid', 'many styles on one line', `graph TD;${fill('style A fill:#f00;')}`],
    ['mermaid', 'many dotted text links', `graph TD;${fill('A -. x .-> B;')}`],
    ['mermaid', 'many directives', fill('%%{init: {}}%%')],
    ['mermaid', 'unclosed directives', fill('%%{')],
    ['mermaid', 'deep subgraphs', `graph TD\n${fill('subgraph a\n')}`],
    ['mermaid', 'state transitions on one line', `stateDiagram-v2\n${fill('a --> ')}`],
    ['mermaid', 'state alias with spaces', `stateDiagram-v2\nstate "x"${fill(' ')}as y`],
    ['mermaid', 'sequence dashes', `sequenceDiagram\n${fill('A-')}`],
    ['mermaid', 'participant with spaces', `sequenceDiagram\nparticipant a${fill(' ')}b`],
    ['mermaid', 'pie label with spaces', `pie\na${fill(' ')}b`],
    ['mermaid', 'class names', `classDiagram\n${fill('o')}`],
    ['mermaid', 'deep mind map', `mindmap\n${Array.from({ length: 340 }, (_, depth) => `${' '.repeat(depth)}n`).join('\n')}`],
    ['mermaid', 'emphasis markers', `graph TD\nA["\`${fill('**a ')}\`"] --> B`],
    ['dot', 'an endless edge chain', `digraph {${fill('a->')}b}`],
    ['dot', 'open braces', `digraph {${fill('{')}`],
    ['dot', 'open angle brackets', `digraph { a [label=<${fill('<')}`],
    ['dot', 'an unclosed string of escapes', `digraph { a [label="${fill('\\')}`],
    ['dot', 'a product of subgraphs', `digraph { {${fill('a b c d ')}} -> {${fill('e f g h ').slice(0, 2_000)}} }`],
    ['markdown', 'only pipes', fill('|')],
    ['markdown', 'dollar signs', `| a | b |\n|---|---|\n|${fill(' $x')}|`],
    ['markdown', 'emphasis in a cell', `| a | b |\n|---|---|\n| ${fill('**a ')} | 1 |`],
    ['markdown', 'many rows', fill('| a | b |\n')],
    ['', 'an arrow chain', fill('a -> ')],
    ['', 'a labelled arrow that never closes', `A --${fill('x')}--> B`],
    ['text', 'dashes', `${fill('-')}>`],
    ['', 'quoted names', `"${fill('" ')} -> b\nb -> c`],
  ];

  it.each(cases)('%s: %s', (lang, _name, code) => {
    const started = cpuMs();
    expect(() => diagramFromFence(lang, code)).not.toThrow();
    expect(() => isFigureFence(lang, code)).not.toThrow();
    expect(() => translateForeignDiagram({ type: 'graph', content: code })).not.toThrow();
    expect(cpuMs() - started).toBeLessThan(1_500);
  });
});
