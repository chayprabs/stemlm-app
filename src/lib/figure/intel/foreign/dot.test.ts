import { describe, expect, it } from 'vitest';
import { Refusal } from './native';
import { isDot, translateDot } from './dot';

const spec = (source: string) => translateDot(source).content;
const reason = (source: string): string => {
  try {
    translateDot(source);
  } catch (error) {
    if (error instanceof Refusal) return error.reason;
    throw error;
  }
  return 'translated';
};

describe('isDot', () => {
  it('recognises the graph header and nothing else', () => {
    for (const source of ['digraph { a -> b }', 'strict digraph G {\n}', '// c\ngraph G\n{ a }', '```dot\ndigraph G { a -> b }\n```', 'DIGRAPH x {']) {
      expect(isDot(source)).toBe(true);
    }
    for (const source of ['graph TD\n A --> B', 'graph LR; A --> B', 'digraph', 'a -> b', 'subgraph x {']) expect(isDot(source)).toBe(false);
  });
});

describe('DOT grammar', () => {
  it('parses without semicolons, with keywords in any case and comments anywhere', () => {
    expect(spec('DiGraph G {\n  a -> b /* c */ b -> c // d\n  # e\n  c -> a\n}')).toBe('rankdir: TB\nnode: a\nnode: b\nnode: c\nedge: a b\nedge: b c\nedge: c a');
  });

  it('scopes default attributes to the subgraph that sets them', () => {
    expect(spec('digraph { subgraph s { node [shape=diamond]; d } node [shape=box]; p; d -> p }')).toBe('rankdir: TB\nnode: d\nnode: p\nedge: d p\ndecision: d');
  });

  it('connects a subgraph endpoint to every node inside it', () => {
    expect(spec('digraph { {a b} -> {c d} }')).toBe('rankdir: TB\nnode: a\nnode: b\nnode: c\nnode: d\nedge: a c\nedge: a d\nedge: b c\nedge: b d');
  });

  it('reads the automaton idioms: invisible start node, double circle, peripheries', () => {
    const expected = 'rankdir: TB\nnode: q0\nnode: q1\nedge: q0 q1 a\nstart: q0\naccept: q1';
    expect(spec('digraph { init [style=invis]; init -> q0; q0 -> q1 [label=a]; q1 [shape=doublecircle] }')).toBe(expected);
    expect(spec('digraph { s [shape=plaintext, label=""]; s -> q0; q0 -> q1 [label="a"]; q1 [shape=circle, peripheries=2] }')).toBe(expected);
  });

  it('keeps labels verbatim, including quotes and backslashes', () => {
    expect(spec('digraph { a [label="say \\"hi\\""]; b [label="C:\\\\tmp"]; c [label="\\\\alpha \\x"]; a -> b -> c }')).toBe(
      'rankdir: TB\nnode: a say "hi"\nnode: b C:\\tmp\nnode: c \\alpha \\x\nedge: a b\nedge: b c',
    );
  });

  it('treats weight as layout, not as a label', () => {
    expect(spec('digraph { a -> b [weight=5] }')).toBe('rankdir: TB\nnode: a\nnode: b\nedge: a b');
  });

  it('refuses meaning it cannot draw', () => {
    expect(reason('digraph { a -> b [dir=none] }')).toBe('undirected links cannot be drawn without inventing a direction');
    expect(reason('digraph { a -> b [arrowhead=none] }')).toBe('undirected links cannot be drawn without inventing a direction');
    expect(reason('digraph { a -> b [arrowhead=odot] }')).toBe('special arrowheads carry a meaning the graph cannot draw');
    expect(reason('digraph { a [label=""]; a -> b }')).toBe('a node has no label');
    expect(reason('digraph { p [shape=point]; p -> a [label="go"] }')).toBe('a labelled arrow from an invisible node has no native form');
    expect(reason('digraph { a [xlabel="x"]; a -> b }')).toBe('external labels and images have no native form');
    expect(reason('digraph { compound=true; a -> b [lhead=cluster_0] }')).toBe('edge end labels and cluster edges have no native form');
  });

  it('refuses malformed sources', () => {
    expect(reason('digraph { a -> }')).toBe('the DOT source has a statement the grammar does not allow');
    expect(reason('digraph { a [label="x] }')).toBe('a string is not closed');
    expect(reason('digraph { a -> b } trailing')).toBe('text follows the closing brace');
    expect(reason('digraph { a [shape] }')).toBe('the DOT source is missing =');
    expect(reason('digraph { a @ b }')).toBe('the DOT source has a character the grammar does not allow');
    expect(reason(`digraph { ${'{'.repeat(40)} a ${'}'.repeat(40)} }`)).toBe('subgraphs are nested too deeply');
    expect(reason('hello')).toBe('the source is not a DOT graph');
  });
});
