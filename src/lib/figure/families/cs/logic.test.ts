import { describe, expect, it } from 'vitest';
import { mulberry32, samplePathD, type Box } from '../../geom';
import type { SceneStroke } from '../../types';
import { parseBoolSystem } from './boolexpr';
import { LOGIC_MAX_FAN_IN, LOGIC_MAX_GATES, buildNetlist, type Net } from './logic';
import { boxOf, compile, draw, expectCleanLabels, reason, type Drawn } from './testing';

const netlist = (...exprs: string[]) => buildNetlist(parseBoolSystem(exprs));
const name = (net: Net): string => (net.type === 'input' ? net.name : `g${net.gate.id}`);
/** Gates as `op(inputs)@level`, in creation order. */
const gates = (...exprs: string[]) => netlist(...exprs).gates.map((gate) => `${gate.op}(${gate.inputs.map(name).join(',')})@${gate.level}`);

interface Segment { x1: number; y1: number; x2: number; y2: number }

function segments(stroke: SceneStroke): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i + 3 < stroke.points.length; i += 2) {
    out.push({ x1: stroke.points[i]!, y1: stroke.points[i + 1]!, x2: stroke.points[i + 2]!, y2: stroke.points[i + 3]! });
  }
  return out;
}

function gateBoxes(drawn: Drawn): Map<string, Box> {
  const boxes = new Map<string, Box>();
  for (const stroke of drawn.scene.strokes.filter((item) => item.id.startsWith('gate-'))) {
    const id = /^gate-\d+/.exec(stroke.id)![0];
    const box = stroke.d
      ? samplePathD(stroke.d).reduce<Box>((acc, s) => ({ x1: Math.min(acc.x1, s.x1, s.x2), y1: Math.min(acc.y1, s.y1, s.y2), x2: Math.max(acc.x2, s.x1, s.x2), y2: Math.max(acc.y2, s.y1, s.y2) }), { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity })
      : boxOf(stroke);
    const known = boxes.get(id);
    boxes.set(id, known ? { x1: Math.min(known.x1, box.x1), y1: Math.min(known.y1, box.y1), x2: Math.max(known.x2, box.x2), y2: Math.max(known.y2, box.y2) } : box);
  }
  return boxes;
}

const enters = (s: Segment, box: Box, inset = 0.5) =>
  Math.max(s.x1, s.x2) > box.x1 + inset && Math.min(s.x1, s.x2) < box.x2 - inset && Math.max(s.y1, s.y2) > box.y1 + inset && Math.min(s.y1, s.y2) < box.y2 - inset;

/** The invariants of every drawn circuit: orthogonal wires that never cross a gate, inside the frame, clean labels. */
function expectCleanCircuit(drawn: Drawn, label: string): void {
  const boxes = [...gateBoxes(drawn).values()];
  const wires = drawn.scene.strokes.filter((stroke) => stroke.id.startsWith('wire-') && stroke.kind !== 'circle');
  expect(wires.length, label).toBeGreaterThan(0);
  const runs: Array<Segment & { net: string }> = [];
  for (const wire of wires) {
    const net = /^wire-(.+)-(?:source|trunk|\d+)$/.exec(wire.id)![1]!;
    const parts = segments(wire);
    parts.forEach((s, i) => {
      expect(s.x1 === s.x2 || s.y1 === s.y2, `${label}: ${wire.id} is not orthogonal`).toBe(true);
      expect(Math.min(s.x1, s.x2, s.y1, s.y2), `${label}: ${wire.id} leaves the frame`).toBeGreaterThanOrEqual(0);
      expect(Math.max(s.x1, s.x2), `${label}: ${wire.id} leaves the frame`).toBeLessThanOrEqual(drawn.scene.width);
      expect(Math.max(s.y1, s.y2), `${label}: ${wire.id} leaves the frame`).toBeLessThanOrEqual(drawn.scene.height);
      const last = wire.kind === 'polyline' && i === parts.length - 1;
      for (const box of boxes) {
        if (!enters(s, box)) continue;
        // Only the last stretch of a connection may enter a gate: from the left, ending on that gate's input side.
        expect(last, `${label}: ${wire.id} crosses a gate`).toBe(true);
        expect(s.y1, `${label}: ${wire.id} crosses a gate`).toBe(s.y2);
        expect(Math.min(s.x1, s.x2), `${label}: ${wire.id} crosses a gate`).toBeLessThanOrEqual(box.x1 + 0.5);
        expect(Math.max(s.x1, s.x2), `${label}: ${wire.id} runs through a gate`).toBeLessThan(box.x1 + 0.45 * (box.x2 - box.x1));
      }
      runs.push({ ...s, net });
    });
  }
  // Wires of different nets may cross but never lie on top of each other.
  for (let i = 0; i < runs.length; i++) {
    for (let j = i + 1; j < runs.length; j++) {
      const [a, b] = [runs[i]!, runs[j]!];
      if (a.net === b.net) continue;
      const vertical = a.x1 === a.x2 && b.x1 === b.x2 && Math.abs(a.x1 - b.x1) < 1;
      const horizontal = a.y1 === a.y2 && b.y1 === b.y2 && Math.abs(a.y1 - b.y1) < 1;
      const along = vertical ? Math.min(Math.max(a.y1, a.y2), Math.max(b.y1, b.y2)) - Math.max(Math.min(a.y1, a.y2), Math.min(b.y1, b.y2))
        : horizontal ? Math.min(Math.max(a.x1, a.x2), Math.max(b.x1, b.x2)) - Math.max(Math.min(a.x1, a.x2), Math.min(b.x1, b.x2)) : -1;
      expect(along, `${label}: nets ${a.net} and ${b.net} overlap`).toBeLessThanOrEqual(0.5);
    }
  }
  // Gates never overlap each other.
  boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => {
    expect(a.x1 < b.x2 && b.x1 < a.x2 && a.y1 < b.y2 && b.y1 < a.y2, `${label}: two gates overlap`).toBe(false);
  }));
  expectCleanLabels(drawn);
}

describe('logic: the gate network is the expression', () => {
  it('derives one gate per operator in columns by depth', () => {
    expect(gates('F = (A AND B) OR NOT C')).toEqual(['and(A,B)@1', 'not(C)@1', 'or(g0,g1)@2']);
    expect(netlist('F = (A AND B) OR NOT C').inputs).toEqual(['A', 'B', 'C']);
    expect(gates("F = ((A + B)·C)'·D")).toEqual(['or(A,B)@1', 'nand(g0,C)@2', 'and(g1,D)@3']);
  });

  it('keeps a chain as one multi-input gate and parentheses as separate gates', () => {
    expect(gates('A·B·C')).toEqual(['and(A,B,C)@1']);
    expect(gates('(A·B)·C')).toEqual(['and(A,B)@1', 'and(g0,C)@2']);
    expect(gates('A + B + C + D')).toEqual(['or(A,B,C,D)@1']);
  });

  it('draws a complemented AND, OR or XOR as that gate with a bubble, and only those', () => {
    expect(gates("(A·B)'")).toEqual(['nand(A,B)@1']);
    expect(gates('A NAND B')).toEqual(['nand(A,B)@1']);
    expect(gates('NOT (A OR B)')).toEqual(['nor(A,B)@1']);
    expect(gates('!(A ^ B)')).toEqual(['xnor(A,B)@1']);
    expect(gates("(A NAND B)'")).toEqual(['nand(A,B)@1', 'not(g0)@2']);
    expect(gates("A''")).toEqual(['not(A)@1', 'not(g0)@2']);
  });

  it('shares textually identical sub-expressions and nothing else', () => {
    expect(gates("F = A'B + A'C")).toEqual(['not(A)@1', 'and(g0,B)@2', 'and(g0,C)@2', 'or(g1,g2)@3']);
    expect(gates('S = (A ⊕ B) ⊕ Cin', 'Cout = A·B + Cin·(A ⊕ B)')).toEqual(['xor(A,B)@1', 'xor(g0,Cin)@2', 'and(A,B)@1', 'and(Cin,g0)@2', 'or(g2,g3)@3']);
    // A·B and B·A are different text: two gates. The same text in two notations is one.
    expect(gates('F = A·B + B·A')).toHaveLength(3);
    expect(gates('F = A·B', 'G = A AND B')).toHaveLength(1);
  });
});

describe('logic: the drawing', () => {
  it('puts inputs on the left, gates in columns by depth, the output on the right', async () => {
    const drawn = await draw('logic', 'expr: F = (A AND B) OR NOT C');
    const boxes = gateBoxes(drawn);
    const [and, not, or] = ['gate-0', 'gate-1', 'gate-2'].map((id) => boxes.get(id)!);
    expect(and!.x1).toBeCloseTo(not!.x1, 5);
    expect(or!.x1).toBeGreaterThan(and!.x2);
    const label = (id: string) => drawn.placed.find((item) => item.label.id === id)!;
    for (const id of ['in-A', 'in-B', 'in-C']) expect(label(id).box.x2).toBeLessThan(and!.x1);
    expect(label('in-A').y).toBeLessThan(label('in-B').y);
    expect(label('in-B').y).toBeLessThan(label('in-C').y);
    expect(drawn.text('out-0')).toBe('F');
    expect(label('out-0').box.x1).toBeGreaterThan(or!.x2);
    // No fan-out here: no junction dots.
    expect(drawn.scene.strokes.filter((stroke) => /-dot-/.test(stroke.id))).toHaveLength(0);
    expectCleanCircuit(drawn, 'typical');
  });

  it('marks fan-out with a junction dot and a plain crossing with none', async () => {
    const drawn = await draw('logic', "expr: F = AB + A'C + BC");
    const dots = (net: string) => drawn.scene.strokes.filter((stroke) => stroke.id.startsWith(`wire-${net}-dot-`));
    // A, B and C each feed two gates: one branch point each.
    for (const net of ['A', 'B', 'C']) {
      expect(dots(net), net).toHaveLength(1);
      expect(dots(net)[0]!.fill).toBe('ink');
    }
    expectCleanCircuit(drawn, 'sop');
  });

  it('draws distinctive ANSI shapes by default and labelled IEC rectangles on request', async () => {
    const ansi = await draw('logic', 'expr: F = (A AND B) OR NOT C\nexpr: G = A XNOR B');
    expect(['gate-0', 'gate-1', 'gate-2', 'gate-3'].map((id) => ansi.stroke(id)!.kind)).toEqual(['path', 'polygon', 'path', 'path']);
    expect(ansi.stroke('gate-0')!.d).toMatch(/ A /);
    expect(ansi.stroke('gate-2')!.d).toMatch(/ C .* Q /);
    expect(ansi.stroke('gate-1-bubble')).toBeDefined();
    expect(ansi.stroke('gate-3-back')).toBeDefined();
    expect(ansi.stroke('gate-3-bubble')).toBeDefined();
    expect(ansi.stroke('gate-0-bubble')).toBeUndefined();

    const iec = await draw('logic', 'expr: F = (A AND B) OR NOT C\nexpr: G = A XNOR B\nstd: IEC');
    expect(['gate-0', 'gate-1', 'gate-2', 'gate-3'].map((id) => iec.stroke(id)!.kind)).toEqual(['rect', 'rect', 'rect', 'rect']);
    expect(['gate-0', 'gate-1', 'gate-2', 'gate-3'].map((id) => iec.text(`${id}-symbol`))).toEqual(['&', '1', '≥1', '=1']);
    expect(iec.stroke('gate-3-bubble')).toBeDefined();
    expectCleanCircuit(ansi, 'ansi');
    expectCleanCircuit(iec, 'iec');
  });

  it('orders the input terminals by first appearance, or as inputs: says', async () => {
    const ys = (drawn: Drawn, names: string[]) => names.map((id) => drawn.placed.find((item) => item.label.id === `in-${id}`)!.y);
    const natural = await draw('logic', "expr: F = C' + A·B");
    expect(ys(natural, ['C', 'A', 'B'])).toEqual([...ys(natural, ['C', 'A', 'B'])].sort((a, b) => a - b));
    const declared = await draw('logic', "expr: F = C' + A·B\ninputs: A, B, C, D");
    expect(ys(declared, ['A', 'B', 'C'])).toEqual([...ys(declared, ['A', 'B', 'C'])].sort((a, b) => a - b));
    // An input the expression never uses has no terminal.
    expect(declared.text('in-D')).toBeUndefined();
    expectCleanCircuit(natural, 'natural order');
    expectCleanCircuit(declared, 'declared order');
  });

  it('labels an unnamed output with its expression and accents a highlighted net', async () => {
    expect((await draw('gate', 'expr: A NAND B')).text('out-0')).toBe('(A·B)′');
    const drawn = await draw('logic', 'expr: F = A·B + A·C\nhighlight: A');
    const wires = drawn.scene.strokes.filter((stroke) => stroke.id.startsWith('wire-'));
    expect(wires.filter((stroke) => stroke.semanticColor === 'accent').every((stroke) => stroke.id.startsWith('wire-A-'))).toBe(true);
    expect(wires.filter((stroke) => stroke.id.startsWith('wire-A-')).every((stroke) => stroke.semanticColor === 'accent')).toBe(true);
  });

  const CORPUS = [
    'expr: A NAND B',
    'expr: F = A',
    "expr: F = A'",
    "expr: F = AB + A'C + BC",
    'expr: S = (A ⊕ B) ⊕ Cin\nexpr: Cout = A·B + Cin·(A ⊕ B)',
    'expr: S = A ⊕ B\nexpr: C = A·B',
    'expr: Y = A·B·C + (D NOR E) + (A XNOR D)',
    "expr: F = ((A + B)·C + D')·(A ⊕ D) + B·C",
    "expr: Y = S1'S0'D0 + S1'S0D1 + S1S0'D2 + S1S0D3",
    'expr: out = !(sel & a) | (~sel && b)',
    "expr: F = (A + B)(A' + C)(B + C')\nstd: iec",
    "expr: F = A·1 + B·0'",
    'expr: F = A·A + A',
    "expr: F = (A'·B')'·(C + D)''",
    'expr: F = A·B\nexpr: G = A·B\nexpr: H = B',
    "expr: Q = S' NOR Qn\nexpr: Qn = R' NOR Q",
    "expr: F = C' + B' + A·B·C\ninputs: A, B, C",
    'expr: F = A + B + C + D + E + G + H + J',
  ];
  it.each(CORPUS)('keeps %s orthogonal, clear of every gate and legible', async (content) => {
    expectCleanCircuit(await draw('logic', content), content);
  });

  it('holds the same invariants for random expressions', async () => {
    const random = mulberry32(20261117);
    const pick = <T,>(items: T[]) => items[Math.floor(random() * items.length)]!;
    const term = (depth: number): string => {
      if (depth <= 0 || random() < 0.3) return `${pick(['A', 'B', 'C', 'D', 'E'])}${random() < 0.25 ? "'" : ''}`;
      const op = pick(['·', ' + ', ' ⊕ ', ' NAND ', ' NOR ']);
      const body = Array.from({ length: op.trim().length > 1 ? 2 : pick([2, 2, 3]) }, () => term(depth - 1)).join(op);
      return `(${body})${random() < 0.15 ? "'" : ''}`;
    };
    let drawnCount = 0;
    for (let i = 0; i < 40; i++) {
      const content = Array.from({ length: pick([1, 1, 2]) }, (_, k) => `expr: F${k} = ${term(pick([1, 2, 3]))}`).join('\n');
      const result = await compile('logic', content);
      if (!result.ok) {
        expect(result.code, content).toBe('refused');
        continue;
      }
      drawnCount++;
      expectCleanCircuit(await draw('logic', content), content);
    }
    expect(drawnCount).toBeGreaterThan(30);
  });

  it('refuses what it cannot draw legibly or read, with the reason', async () => {
    expect(await reason('logic', `expr: F = ${Array.from({ length: LOGIC_MAX_FAN_IN + 1 }, (_, i) => `x${i}`).join('·')}`)).toBe(`logic draws gates of at most ${LOGIC_MAX_FAN_IN} inputs; one has ${LOGIC_MAX_FAN_IN + 1}`);
    const many = Array.from({ length: LOGIC_MAX_GATES + 1 }, (_, i) => `expr: F${i} = ${i % 2 ? 'A' : 'B'}${"'".repeat(i + 1)}`).join('\n');
    expect(await reason('logic', many)).toMatch(/at most 32 gates|too large to draw legibly/);
    expect(await reason('logic', 'expr: F = A + B\nstd: cmos')).toBe('logic std: cmos is not ansi or iec');
    expect(await reason('logic', 'expr: F = A + ')).toBe('logic: OR is missing its right operand');
    expect(await reason('logic', 'std: ansi')).toBe('missing expr');
    expect(await reason('logic', 'expr: A·B\nwire: A B')).toMatch(/unconsumed declaration: wire/);
  });
});
