import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { compileDiagramStrict as compileDiagram } from '@/src/lib/resolve-diagram';
import { MAX_SPEC_CHARS } from '../spec';
import { repairDiagram, type RepairCode } from './repair';
import { parseLoose, readItems } from './structure';
import { parseArrows, repairEdge, repairForce } from './records';
import { closestTarget, editDistance, foldKey, foldType } from './fuzzy';

const repair = (type: string, content: string) => repairDiagram({ type, content });
const codes = (type: string, content: string): RepairCode[] => repair(type, content).repairs.map((entry) => entry.code);

/** The `@diagram` specimens the guide teaches: each is a spec the strict compiler already reads. */
function guideSpecimens(): Array<{ type: string; content: string }> {
  const guide = readFileSync(resolve(__dirname, '../../../protocol/core-protocol.md'), 'utf8');
  return [...guide.matchAll(/^@diagram id=\S+ type=(\S+)\n([\s\S]*?)\n@enddiagram$/gm)]
    .map((match) => ({ type: match[1]!, content: match[2]! }))
    .filter((specimen) => !specimen.type.startsWith('<'));
}

describe('repairDiagram contract', () => {
  it('returns a strict spec unchanged, as the same object, with no repairs', async () => {
    const specimens = guideSpecimens();
    expect(specimens.length).toBeGreaterThan(20);
    for (const specimen of specimens) {
      expect((await compileDiagram(specimen)).ok, specimen.type).toBe(true);
      const result = repairDiagram(specimen);
      expect(result.repairs, `${specimen.type}\n${specimen.content}`).toEqual([]);
      expect(result.diagram).toBe(specimen);
    }
  });

  it('is deterministic and idempotent', () => {
    const source = { type: 'flowchart', content: '```\n- **nodes**: A, B\n- edges: A->B\ndirection = horizontal\n```' };
    const first = repairDiagram(source);
    expect(repairDiagram(source)).toEqual(first);
    expect(first.diagram).toEqual({ type: 'graph', content: 'node: A\nnode: B\nedge: A B\nrankdir: LR' });
    expect(repairDiagram(first.diagram)).toEqual({ diagram: first.diagram, repairs: [] });
  });

  it('reports machine-readable codes for what it normalised', () => {
    expect(codes('plot', 'function: x²\nrange: -3 to 3')).toEqual(['key.alias', 'value.expr', 'key.alias', 'value.range']);
    expect(codes('free-body-diagram', 'body: b\nforce: W down on b')).toEqual(['type.alias', 'kind.added']);
    expect(codes('svg', 'fn: x\ndomain: 0 1')).toEqual(['type.inferred']);
    expect(codes('plott', 'fn: x\ndomain: 0 1')).toEqual(['type.fuzzy']);
    expect(codes('table', 'kind: matrix\n| a | b |\n| 1 | 2 |')).toEqual(['structure.table']);
    expect(codes('graph', 'A -> B')).toEqual(['structure.arrows']);
    expect(codes('plot', '{"fn": "x", "domain": [0, 1]}')).toEqual(['structure.json']);
    expect(codes('plot', 'fn: 2t\ndomain: 0 1')).toEqual(['value.var']);
  });

  it('copies a repaired caption onto the diagram', () => {
    expect(repair('plot', 'title: Parabola\nfn: x^2\ndomain: -1 1').diagram.caption).toBe('Parabola');
  });

  it('never throws, whatever it is handed', () => {
    const hostile: unknown[] = [
      undefined, null, 42, {}, { type: 'plot' }, { type: 5, content: 'fn: x' }, { type: 'plot', content: 7 },
      { type: '__proto__', content: 'constructor: x\n__proto__: y' }, { type: 'plot', content: '\u0000\uffff\ud800' },
      { type: 'toString', content: 'hasOwnProperty: 1' }, { type: 'plot', content: '{"__proto__": {"fn": "x"}}' },
    ];
    for (const input of hostile) expect(() => repairDiagram(input as never)).not.toThrow();
    // A member named like an object internal is data: it is neither followed nor allowed to poison a lookup.
    expect(repairDiagram({ type: 'plot', content: '{"__proto__": {"fn": "x"}, "constructor": "y"}' }).repairs).toEqual([]);
    expect(repairDiagram({ type: 'plot', content: 'fn: constructor(x) + toString\ndomain: 0 1' }).repairs).toEqual([]);
  });

  it('leaves hatch SVG, oversize and over-budget specs alone', () => {
    const svg = { type: 'svg', content: '<svg viewBox="0 0 1 1"><path d="M0 0L1 1"/></svg>' };
    expect(repairDiagram(svg)).toEqual({ diagram: svg, repairs: [] });
    const huge = { type: 'plot', content: `function: x\n${'# pad\n'.repeat(MAX_SPEC_CHARS / 6)}` };
    expect(repairDiagram(huge)).toEqual({ diagram: huge, repairs: [] });
    const long = { type: 'plot', content: `function: ${'x+'.repeat(5000)}x` };
    expect(repairDiagram(long)).toEqual({ diagram: long, repairs: [] });
  });

  it('answers 60 KB of adversarial input well inside a second', () => {
    const fill = (unit: string) => unit.repeat(Math.ceil(60_000 / unit.length)).slice(0, 60_000);
    const inputs: Array<[string, string]> = [
      ['plot', fill('fn: \\frac{\\frac{x}{2}}{\\sqrt{x}}\n')],
      ['plot', fill('functoin = ((((((((x\n')],
      ['plot', fill('- **f(x)** = |||x|||²²²\n')],
      ['svg', fill('nodez: A, B, C\n')],
      ['svg', fill('k: v\n')],
      ['graph', fill('A --x--> B --y--> C -> D\n')],
      ['graph', fill('edges: A->B, (B,C), [C,D], {from: D, to: E}\n')],
      ['mermaid', `graph TD\n${fill('A[a] -->|b| C{d}\n')}`.slice(0, 60_000)],
      ['table', fill('| a | b | c |\n')],
      ['table', `{"rows": ${fill('[[[[[[[[[[')}`.slice(0, 60_000)],
      ['plot', `{"fn": [${fill('{"a": [1, 2, {"b": "c"}]},')}]}`.slice(0, 60_000)],
      ['circuit', fill('R1 a b 1k\nr2 = b, c, 2k\n')],
      ['scene', fill('forces: F 10 N up on b, G at 30° from the horizontal\n')],
      ['plot', fill('domain: x ∈ [−π, 2π] to to to ..\n')],
      ['plot', fill(' \t')],
      ['plot', fill('*')],
      ['plot', fill('a:\n  - b:\n    c: d\n')],
      ['unknown-type-token', fill('&amp;lt; &#x41; &nbsp;key\u200b: value,\n')],
    ];
    const started = performance.now();
    for (const [type, content] of inputs) {
      const before = performance.now();
      expect(() => repairDiagram({ type, content })).not.toThrow();
      expect(performance.now() - before, `${type}: ${content.slice(0, 30)}`).toBeLessThan(1000);
    }
    expect((performance.now() - started) / inputs.length).toBeLessThan(400);
  });

  it('does not touch the DOM', () => {
    const saved = globalThis.document;
    Object.defineProperty(globalThis, 'document', { configurable: true, get: () => { throw new Error('DOM access'); } });
    try {
      expect(repair('plot', 'function: x&sup2;\nrange: [-1, 1]\n&lt;b&gt;').repairs.length).toBeGreaterThan(0);
    } finally {
      Object.defineProperty(globalThis, 'document', { configurable: true, value: saved, writable: true });
    }
  });
});

describe('hard limits', () => {
  it('never adds content: values, labels and defaults come only from the source', () => {
    for (const [type, content] of [
      ['plot', 'function: x^2\nrange: -3 to 3'],
      ['graph', 'nodes: A, B\nedges: A->B: 4'],
      ['scene', 'body: b\nforces: W 5 N down on b'],
      ['circuit', 'r1 = a, b, 1k\nv1: a b 5V'],
      ['table', '| x | y |\n|---|---|\n| 1 | 2 |'],
    ] as const) {
      const result = repair(type, content);
      // Every token of the repaired spec is a canonical key, a grammar word, or text of the source.
      const allowed = new Set(['fn', 'domain', 'node', 'edge', 'kind', 'fbd', 'force', 'matrix', 'headers', 'row', ...content.split(/[^A-Za-z0-9.^+-]+/)]);
      for (const token of result.diagram.content.split(/[^A-Za-z0-9.^+-]+/).filter(Boolean)) {
        expect(allowed.has(token) || allowed.has(token.toLowerCase()) || allowed.has(token[0]!.toLowerCase() + token.slice(1)), `${type}: invented "${token}"`).toBe(true);
      }
    }
  });

  it('drops a line only when it restates the family, repeats a scalar, or styles the drawing', () => {
    expect(repair('plot', 'type: plot\nfn: x\nfn: x\ndomain: 0 1\ndomain: 0 1\ncolor: red').diagram.content).toBe('fn: x\nfn: x\ndomain: 0 1');
    expect(repair('table', 'kind: matrix\nrow: 1,2\nrow: 1,2\ntitle: T').diagram.content).toBe('kind: matrix\nrow: 1,2\nrow: 1,2\ncaption: T');
    expect(repair('plot', 'type: scatter\ndata: 0,0; 1,1\ndomain: 0 1').diagram.content).toBe('kind: discrete\ndata: 0,0; 1,1\ndomain: 0 1');
    // A type line naming another family is a contradiction, not decoration.
    expect(repair('plot', 'type: circuit\nfn: x\ndomian: 0 1').diagram.content).toContain('type: circuit');
  });

  it('never moves a spec to another family', async () => {
    for (const type of ['graph', 'table', 'circuit', 'scene', 'timing']) {
      const result = repair(type, 'function: x^2\nrange: -3 to 3');
      expect(result.diagram.type).toBe(type);
      expect((await compileDiagram(result.diagram)).ok).toBe(false);
    }
    // An unknown token that merely resembles a plot never borrows plot keys it does not declare.
    expect(repair('bar-chart', 'categories: A, B\nvalues: 3, 5').repairs).toEqual([]);
  });

  it('treats two equally close targets as no target', () => {
    const spellings = new Map([['rows', 'rows'], ['row', 'row'], ['cols', 'cols']]);
    expect(closestTarget('rowz', spellings)).toBeUndefined();
    expect(closestTarget('rwos', spellings)).toBe('rows');
    expect(closestTarget('ro', spellings)).toBeUndefined();
    expect(repair('table', 'kind: matrix\nrowz: 1, 2').repairs).toEqual([]);
    // A type token between two families resolves by the declared keys, and to nothing when they tie.
    expect(repair('ice', 'species: A, B\ni: 1, 0\nc: -x, +x\ne: 1-x, x').diagram.type).toBe('table');
    expect(repair('svg', 'cells: a, b, c').repairs).toEqual([]);
  });

  it('never guesses across axis letters, digits, or real words', () => {
    const plot = new Map([['xlim', 'domain'], ['xlabel', 'xlabel'], ['fn2', 'fn2'], ['node', 'node']]);
    expect(closestTarget('ylim', plot)).toBeUndefined();
    expect(closestTarget('ylabel', plot)).toBeUndefined();
    expect(closestTarget('fn3', plot)).toBeUndefined();
    expect(closestTarget('note', plot)).toBeUndefined();
    expect(closestTarget('noed', plot)).toBe('node');
    expect(closestTarget('xlabl', plot)).toBe('xlabel');
  });

  it('keeps circuit designators exactly as written', () => {
    // `Wire2` and `Probe1` are one edit from control keys, yet they are (unsupported) designators: untouched.
    const result = repair('circuit', 'std: US\nRload: a 0 1k\nR_load2: a 0 2k\nVsrc: a 0 5\nWire2: a 0\nLabl: a 0 1m\nprobee: x=a');
    expect(result.diagram.content).toBe('std: ieee\nRload: a 0 1k\nR_load2: a 0 2k\nVsrc: a 0 5\nWire2: a 0\nLabl: a 0 1m\nprobe: x=a');
  });
});

describe('tolerant readers', () => {
  it('parses JSON as models write it and nothing else', () => {
    expect(parseLoose("{fn: 'x^2', domain: [-3, 3,], on: true, }")).toEqual({ fn: 'x^2', domain: [-3, 3], on: true });
    expect(parseLoose('{"a": "\\frac{1}{x}", "b": "q\\"r"}')).toEqual({ a: '\\frac{1}{x}', b: 'q"r' });
    expect(parseLoose('{"edge": "A B", "edge": "B C"}')).toEqual({ edge: ['A B', 'B C'] });
    expect(parseLoose('(1, 2)')).toEqual([1, 2]);
    for (const broken of ['{', '{"a": }', '[1, 2', '{"a": 1} trailing', '', '{a b}', '['.repeat(40)]) expect(parseLoose(broken), broken).toBeUndefined();
    expect(Object.getPrototypeOf(parseLoose('{"__proto__": {"x": 1}}'))).toBe(Object.prototype);
  });

  it('classifies lines without losing any', () => {
    const text = '- **fn**: x\ndomain = 0 1\nnot a declaration at all!\nrows:\n- a\n- b\n\n# note';
    const items = readItems(text);
    expect(items.flatMap((item) => item.raw).join('\n')).toBe(text);
    expect(items.map((item) => item.key)).toEqual(['fn', 'domain', 'not', 'rows', undefined, undefined]);
    expect(items[2]!.tentative).toBe(true);
    expect(items[3]!.value).toEqual(['a', 'b']);
  });

  it('reads arrow notation and refuses undirected or two-way links', () => {
    expect(parseArrows('A -- yes --> B')).toEqual({ nodes: [], edges: [{ from: 'A', to: 'B', label: 'yes' }] });
    expect(parseArrows('B <- A')).toEqual({ nodes: [], edges: [{ from: 'A', to: 'B', label: undefined }] });
    expect(parseArrows('node-1 -> node-2')).toBeNull();
    expect(parseArrows('A -- B')).toBeNull();
    expect(parseArrows('A <-> B')).toBeNull();
    expect(repairEdge('A -> B -> C: x')).toBeNull();
    expect(repairEdge({ source: 'a', target: 'b', weight: 3 })).toEqual(['a b 3']);
    expect(repairForce('F: 12N, to the right')).toBe('F 12 N right');
    expect(repairForce('F 12 N sideways')).toBeNull();
  });

  it('folds spellings and bounds edit distance', () => {
    expect(['x_label', 'x-label', 'xLabel', 'X Label', 'f(x)'].map(foldKey)).toEqual(['xlabel', 'xlabel', 'xlabel', 'xlabel', 'f']);
    expect(['Truth Table', 'free_body_diagram', 'FlowChart'].map(foldType)).toEqual(['truth-table', 'free-body-diagram', 'flow-chart']);
    expect(editDistance('domian', 'domain', 2)).toBe(1);
    expect(editDistance('kitten', 'sitting', 2)).toBe(3);
    expect(editDistance('a'.repeat(200), 'b'.repeat(200), 3)).toBe(4);
  });
});
