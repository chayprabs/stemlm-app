import { describe, expect, it } from 'vitest';
import { BoolSyntaxError, evaluate, exprKey, formatExpr, parseBoolSystem, truthColumn, type BoolNode } from './boolexpr';

const one = (source: string, inputs?: string) => parseBoolSystem([source], inputs).outputs[0]!;
const key = (source: string, inputs?: string) => exprKey(one(source, inputs).expr);
const text = (source: string, inputs?: string) => formatExpr(one(source, inputs).expr);
const error = (sources: string | string[], inputs?: string): string => {
  try {
    parseBoolSystem(Array.isArray(sources) ? sources : [sources], inputs);
  } catch (caught) {
    expect(caught).toBeInstanceOf(BoolSyntaxError);
    return (caught as Error).message;
  }
  return 'parsed';
};

type Oracle = (v: Record<string, boolean>) => boolean;

/** Every assignment of the named variables, checked against a hand-written JavaScript predicate. */
function agrees(source: string, names: string[], oracle: Oracle, inputs?: string): void {
  const { expr } = one(source, inputs);
  for (let row = 0; row < 2 ** names.length; row++) {
    const values = Object.fromEntries(names.map((name, i) => [name, ((row >> (names.length - 1 - i)) & 1) === 1]));
    const got = evaluate(expr, (name) => {
      expect(names, `${source} reads an unexpected variable ${name}`).toContain(name);
      return values[name]!;
    });
    expect(got, `${source} at ${JSON.stringify(values)}`).toBe(oracle(values));
  }
}

describe('Boolean expression reader', () => {
  const ABC = ['A', 'B', 'C'];
  // One function, F = (A AND B) OR NOT C, in every notation.
  const SAME: string[] = [
    'F = (A AND B) OR NOT C',
    'f = (a and b) or not c'.toUpperCase(),
    '(A and B) or not C',
    "A·B + C'",
    "AB + C'",
    "A*B + C'",
    "A.B + C'",
    'A & B | ~C',
    'A && B || !C',
    'A ∧ B ∨ ¬C',
    'A \\cdot B + \\overline{C}',
    'A \\land B \\lor \\lnot C',
    '$A \\wedge B \\vee \\neg C$',
    'A B + \\bar{C}',
    'AB + C\u0305',
    "AB + C′",
    'OR(AND(A, B), NOT(C))',
    "[A·B] + {C}'",
    'assign F = (A & B) | ~C;',
    'F := A·B + C’.',
    'F(A, B, C) = AB + \\overline C',
    '\\text{F} = A \\text{ AND } B \\text{ OR NOT } C',
  ];
  it.each(SAME)('reads %s as (A AND B) OR NOT C', (source) => {
    agrees(source, ABC, (v) => (v.A! && v.B!) || !v.C!);
  });

  const CORPUS: Array<[string, string[], Oracle]> = [
    ['A + B·C', ABC, (v) => v.A! || (v.B! && v.C!)],
    ['A·B + C', ABC, (v) => (v.A! && v.B!) || v.C!],
    ['A + B ⊕ C', ABC, (v) => v.A! || (v.B! !== v.C!)],
    ['A ⊕ B·C', ABC, (v) => v.A! !== (v.B! && v.C!)],
    ['A ^ B + C', ABC, (v) => (v.A! !== v.B!) || v.C!],
    ['A OR B XOR C AND A', ABC, (v) => v.A! || (v.B! !== (v.C! && v.A!))],
    ['NOT A AND B', ['A', 'B'], (v) => !v.A! && v.B!],
    ['!A·B', ['A', 'B'], (v) => !v.A! && v.B!],
    ['NOT (A AND B)', ['A', 'B'], (v) => !(v.A! && v.B!)],
    ["(A + B)'", ['A', 'B'], (v) => !(v.A! || v.B!)],
    ["A'B' + AB", ['A', 'B'], (v) => (!v.A! && !v.B!) || (v.A! && v.B!)],
    ["AB'C + A'BC'", ABC, (v) => (v.A! && !v.B! && v.C!) || (!v.A! && v.B! && !v.C!)],
    ["A''", ['A'], (v) => v.A!],
    ["!A'", ['A'], (v) => v.A!],
    ['~~A', ['A'], (v) => v.A!],
    ['A NAND B', ['A', 'B'], (v) => !(v.A! && v.B!)],
    ['A NOR B', ['A', 'B'], (v) => !(v.A! || v.B!)],
    ['A XNOR B', ['A', 'B'], (v) => v.A! === v.B!],
    ['A == B', ['A', 'B'], (v) => v.A! === v.B!],
    ['A != B', ['A', 'B'], (v) => v.A! !== v.B!],
    ['A ⊙ B', ['A', 'B'], (v) => v.A! === v.B!],
    ['A nand B nand C', ABC, (v) => !(!(v.A! && v.B!) && v.C!)],
    ['A NOR (B·C)', ABC, (v) => !(v.A! || (v.B! && v.C!))],
    ['A AND (B OR C) XOR (A)', ABC, (v) => (v.A! && (v.B! || v.C!)) !== v.A!],
    ['NAND(A, B, C)', ABC, (v) => !(v.A! && v.B! && v.C!)],
    ['NOR(A, B, C)', ABC, (v) => !(v.A! || v.B! || v.C!)],
    ['XOR(A, B, C)', ABC, (v) => [v.A, v.B, v.C].filter(Boolean).length % 2 === 1],
    ['XNOR(A, B, C)', ABC, (v) => [v.A, v.B, v.C].filter(Boolean).length % 2 === 0],
    ['A ⊕ B ⊕ C', ABC, (v) => [v.A, v.B, v.C].filter(Boolean).length % 2 === 1],
    ['A(B + C)', ABC, (v) => v.A! && (v.B! || v.C!)],
    ['(A + B)(A + C)', ABC, (v) => (v.A! || v.B!) && (v.A! || v.C!)],
    ["(A + B')C", ABC, (v) => (v.A! || !v.B!) && v.C!],
    ['A·1 + 0', ['A'], (v) => v.A!],
    ["A + 1'", ['A'], (v) => v.A!],
    ['x1 x2 + x3', ['x1', 'x2', 'x3'], (v) => (v.x1! && v.x2!) || v.x3!],
    ["S1'S0'D0 + S1'S0D1", ['S1', 'S0', 'D0', 'D1'], (v) => (!v.S1! && !v.S0! && v.D0!) || (!v.S1! && v.S0! && v.D1!)],
    ['x_1 \\oplus x_{2}', ['x_1', 'x_2'], (v) => v.x_1! !== v.x_2!],
    ["xy + x'z", ['x', 'y', 'z'], (v) => (v.x! && v.y!) || (!v.x! && v.z!)],
    ['AB + Cin(A XOR B)', ['A', 'B', 'Cin'], (v) => (v.A! && v.B!) || (v.Cin! && (v.A! !== v.B!))],
    ['AB + BCin + ACin', ['A', 'B', 'Cin'], (v) => (v.A! && v.B!) || (v.B! && v.Cin!) || (v.A! && v.Cin!)],
    ['EN·D + CLK', ['EN', 'D', 'CLK'], (v) => (v.EN! && v.D!) || v.CLK!],
    ['door AND NOT key OR window', ['door', 'key', 'window'], (v) => (v.door! && !v.key!) || v.window!],
    ['sel & a | ~sel & b', ['sel', 'a', 'b'], (v) => (v.sel! && v.a!) || (!v.sel! && v.b!)],
    ['\u0100·B + A·B\u0304', ['A', 'B'], (v) => v.A! !== v.B!],
    ['α + β·γ', ['α', 'β', 'γ'], (v) => v.α! || (v.β! && v.γ!)],
  ];
  it.each(CORPUS)('%s agrees with a brute-force evaluation', (source, names, oracle) => {
    agrees(source, names, oracle);
  });

  it('ranks NOT over AND over XOR over OR, left to right', () => {
    expect(key('A + B·C ⊕ D')).toBe('or(v:A,xor(and(v:B,v:C),v:D))');
    expect(key('NOT A·B')).toBe('and(not(v:A),v:B)');
    expect(key("A·B'")).toBe('and(v:A,not(v:B))');
    expect(key('A NAND B NAND C')).toBe('nand(nand(v:A,v:B),v:C)');
    expect(key('A NOR B OR C')).toBe('or(nor(v:A,v:B),v:C)');
  });

  it('keeps a chain as one multi-input gate and parentheses as separate gates', () => {
    expect(key('A·B·C')).toBe('and(v:A,v:B,v:C)');
    expect(key('ABC + D')).toBe('or(and(v:A,v:B,v:C),v:D)');
    expect(key('(A·B)·C')).toBe('and(and(v:A,v:B),v:C)');
    expect(key('A·(B·C)')).toBe('and(v:A,and(v:B,v:C))');
    expect(key('A + B + C + D')).toBe('or(v:A,v:B,v:C,v:D)');
    expect(key('(A + B) + C')).toBe('or(or(v:A,v:B),v:C)');
    expect(key('A ⊕ B ⊕ C')).toBe('xor(v:A,v:B,v:C)');
    expect(key('AND(A, B)·C')).toBe('and(and(v:A,v:B),v:C)');
  });

  it('gives textually identical sub-expressions the same key in any notation', () => {
    expect(key('A AND B')).toBe(key('A·B'));
    expect(key("A'")).toBe(key('NOT A'));
    expect(key('A·B')).not.toBe(key('B·A'));
  });

  it('decides between a name and a product by the documented rules', () => {
    // Declared inputs settle it.
    expect(key('AB + C', 'AB, C')).toBe('or(v:AB,v:C)');
    expect(key('ACin + B', 'A, B, Cin')).toBe('or(and(v:A,v:Cin),v:B)');
    expect(key('BA', 'A, B')).toBe('and(v:B,v:A)');
    // Letters that also stand alone are a product, whatever their order.
    expect(key("BA + B'A'")).toBe('or(and(v:B,v:A),and(not(v:B),not(v:A)))');
    // Known signal names and explicit operators mean names.
    expect(key('SEL + CLK')).toBe('or(v:SEL,v:CLK)');
    expect(key('REQ·GNT')).toBe('and(v:REQ,v:GNT)');
    expect(key('NOT (sel AND en)')).toBe('not(and(v:sel,v:en))');
    // Alphabetical letters are a product; anything else is a name.
    expect(key('AB + CD')).toBe('or(and(v:A,v:B),and(v:C,v:D))');
    expect(key('KEY + DOOR')).toBe('or(v:KEY,v:DOOR)');
    expect(key('Sum + MemRead')).toBe('or(v:Sum,v:MemRead)');
    expect(key('SW1 + SW2')).toBe('or(v:SW1,v:SW2)');
    expect(error('ABC', 'A, AB, BC, C')).toMatch(/more than one product/);
  });

  it('reads the output name, function-style inputs, and first-appearance order', () => {
    const system = parseBoolSystem(["Cout = C' + AB", 'S = A ⊕ B']);
    expect(system.outputs.map((output) => output.name)).toEqual(['Cout', 'S']);
    expect(system.variables).toEqual(['C', 'A', 'B']);
    expect(system.declared).toBeNull();
    expect(parseBoolSystem(['f(z, y, x) = xy + z']).declared).toEqual(['z', 'y', 'x']);
    expect(parseBoolSystem(['A + B'], ' [B, "A",] ').declared).toEqual(['B', 'A']);
    expect(one("F' = A + B").name).toBe('F′');
    expect(one('A + B').name).toBeNull();
  });

  it('prints textbook notation with only the parentheses the structure needs', () => {
    expect(text('(A AND B) OR NOT C')).toBe('A·B + C′');
    expect(text('(A or B) and (A or not C)')).toBe('(A + B)·(A + C′)');
    expect(text('NOT (A AND B)')).toBe('(A·B)′');
    expect(text('A NAND B')).toBe('(A·B)′');
    expect(text('A NOR B')).toBe('(A + B)′');
    expect(text('A XNOR B')).toBe('(A ⊕ B)′');
    expect(text('A XOR B OR C')).toBe('(A ⊕ B) + C');
    expect(text('AB ⊕ CD')).toBe('A·B ⊕ C·D');
    expect(text('(A·B)·C')).toBe('(A·B)·C');
    expect(text("A''")).toBe('A′′');
    // The printed form reads back as the same function, and as the same structure unless a complemented gate
    // (NAND, NOR, XNOR) was printed as the complement it is.
    for (const [source] of CORPUS) {
      const { expr } = one(source);
      const names = parseBoolSystem([source]).variables;
      const again = one(formatExpr(expr), names.join(',')).expr;
      expect(truthColumn(again, names), source).toEqual(truthColumn(expr, names));
      if (!/n(?:and|or)\(/.test(exprKey(expr))) expect(exprKey(again), source).toBe(exprKey(expr));
    }
  });

  it('numbers truth-table rows with the first variable as the most significant bit', () => {
    const column = truthColumn(one("A·B + C'").expr, ABC);
    expect(column.map(Number)).toEqual([1, 0, 1, 0, 1, 0, 1, 1]);
    expect(truthColumn(one('A').expr, ['A', 'B']).map(Number)).toEqual([0, 0, 1, 1]);
  });

  it('refuses malformed expressions with the reason', () => {
    expect(error('A + ')).toMatch(/OR is missing its right operand/);
    expect(error('· B')).toMatch(/AND is missing its left operand/);
    expect(error('(A + B')).toMatch(/parenthesis is not closed/);
    expect(error('A + B)')).toMatch(/parenthesis closes nothing/);
    expect(error("'A")).toMatch(/complement mark follows nothing/);
    expect(error('F = ')).toMatch(/empty/);
    expect(error('F = A = B')).toMatch(/more than one =/);
    expect(error('A + 2')).toMatch(/unexpected character 2/);
    expect(error('A + 10')).toMatch(/only the constants 0 and 1/);
    expect(error('A \\frac B')).toMatch(/unknown symbol \\frac/);
    expect(error('A·B = C')).toMatch(/left side of = must be an output name/);
    expect(error('AND(A)')).toMatch(/needs at least two inputs/);
    expect(error('A, B')).toMatch(/comma is outside a function/);
    expect(error('A + B', 'A, 3x')).toMatch(/3x is not a variable name/);
    expect(error([])).toMatch(/no expression/);
  });

  it('bounds hostile input instead of hanging or overflowing the stack', () => {
    expect(error('('.repeat(100) + 'A' + ')'.repeat(100))).toMatch(/nested too deeply/);
    expect(error('('.repeat(5000) + 'A')).toMatch(/too long/);
    expect(error('!'.repeat(100) + 'A')).toMatch(/nested too deeply/);
    expect(error(Array.from({ length: 400 }, () => 'A').join(' + '))).toMatch(/too long/);
    expect(error('<script>alert(1)</script>')).toMatch(/unexpected character </);
    const deep: BoolNode = one("((((A'))))'").expr;
    expect(exprKey(deep)).toBe('not(not(v:A))');
  });
});
