import { describe, expect, it } from 'vitest';
import { Refusal } from './native';
import { looksLikeArrows, translateArrows } from './arrows';

const spec = (source: string, strict = false) => translateArrows(source, strict).content;
const reason = (source: string, strict = false): string => {
  try {
    translateArrows(source, strict);
  } catch (error) {
    if (error instanceof Refusal) return error.reason;
    throw error;
  }
  return 'translated';
};

describe('looksLikeArrows', () => {
  it('needs an arrow on every non-blank line', () => {
    expect(looksLikeArrows('A -> B\n\nB → C')).toBe(true);
    expect(looksLikeArrows('A -> B\nnote')).toBe(false);
    expect(looksLikeArrows('node: A\nedge: A B')).toBe(false);
    expect(looksLikeArrows('')).toBe(false);
  });
});

describe('arrow lists', () => {
  it('reads every arrow form as a directed edge', () => {
    for (const arrow of ['->', '-->', '--->', '=>', '==>', '→', '⟶', '⇒']) {
      expect(spec(`A ${arrow} B`)).toBe('rankdir: LR\nnode: A\nnode: B\nedge: A B');
    }
    for (const arrow of ['<-', '<--', '←', '⇐']) expect(spec(`A ${arrow} B`)).toBe('rankdir: LR\nnode: A\nnode: B\nedge: B A');
    for (const arrow of ['<->', '<-->', '<=>', '↔']) expect(spec(`A ${arrow} B`)).toBe('rankdir: LR\nnode: A\nnode: B\nedge: A B\nedge: B A');
  });

  it('reads the three label forms and gives a two-way label to both arrows', () => {
    const expected = 'rankdir: LR\nnode: A\nnode: B\nedge: A B 5';
    for (const line of ['A --5--> B', 'A -- 5 --> B', 'A -5-> B', 'A ==5==> B', 'A -> B: 5', 'A -> B : 5']) expect(spec(line)).toBe(expected);
    expect(spec('A <-> B: sync')).toBe('rankdir: LR\nnode: A\nnode: B\nedge: A B sync\nedge: B A sync');
  });

  it('keeps node names whole: spaces, hyphens, parentheses', () => {
    expect(spec('NADH (reduced) -> Complex I\nComplex I -> co-enzyme Q')).toBe(
      'rankdir: LR\nnode: n1 NADH (reduced)\nnode: n2 Complex I\nnode: n3 co-enzyme Q\nedge: n1 n2\nedge: n2 n3',
    );
  });

  it('refuses a line with two readings', () => {
    expect(reason('A -> B -> C: label')).toBe('a trailing label on a chain is ambiguous');
    expect(reason('A --5--> B: also')).toBe('a trailing label on a chain is ambiguous');
    expect(reason('Step 1: a -> b')).toBe('a colon in a source name is ambiguous');
    expect(reason('A--5-->B')).toBe('a node name holds arrow characters');
    expect(reason('A -> ')).toBe('an arrow has no node on one side');
    expect(reason('A -- B')).toBe('a line is not an arrow');
  });

  it('holds unlabelled fences to a stricter standard than declared graphs', () => {
    expect(spec('A->B')).toBe('rankdir: LR\nnode: A\nnode: B\nedge: A B');
    expect(reason('A->B\nB->C', true)).toBe('an arrow is not set off by spaces');
    expect(reason('A -> B', true)).toBe('unconnected arrows are not a diagram');
    expect(reason('A -> B\nC -> D', true)).toBe('unconnected arrows are not a diagram');
    expect(reason('x = 1 -> y = 2\ny = 2 -> z', true)).toBe('the lines read as code, not as a diagram');
    expect(spec('A→B→C', true)).toBe('rankdir: LR\nnode: A\nnode: B\nnode: C\nedge: A B\nedge: B C');
  });
});
