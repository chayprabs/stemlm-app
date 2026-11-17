import { describe, expect, it } from 'vitest';
import { TRUTH_MAX_INPUTS, TRUTH_MAX_OUTPUTS, naturalOrder } from './truth';
import { boxOf, draw, expectCleanLabels, reason, type Drawn } from './testing';

const heads = (drawn: Drawn) => drawn.scene.labels.filter((label) => label.id.startsWith('truth-head-')).map((label) => label.text);
const notes = (drawn: Drawn) => drawn.scene.labels.filter((label) => label.id.startsWith('truth-note-')).map((label) => label.text);
/** The table body as printed, one string of digits per row. */
function body(drawn: Drawn): string[] {
  const columns = heads(drawn).length;
  const rows: string[] = [];
  for (let row = 0; drawn.text(`truth-cell-${row}-0`) !== undefined; row++) {
    rows.push(Array.from({ length: columns }, (_, column) => drawn.text(`truth-cell-${row}-${column}`)).join(''));
  }
  return rows;
}
const tinted = (drawn: Drawn) => drawn.scene.strokes.filter((stroke) => stroke.id.startsWith('truth-row-')).map((stroke) => Number(stroke.id.slice('truth-row-'.length)));

describe('truth table', () => {
  it('computes every row of F = A·B + C′ and tints the rows where F is 1', async () => {
    const drawn = await draw('truth', "expr: F = A·B + C'");
    expect(heads(drawn)).toEqual(['A', 'B', 'C', 'F']);
    expect(body(drawn)).toEqual(['0001', '0010', '0101', '0110', '1001', '1010', '1101', '1111']);
    expect(tinted(drawn)).toEqual([0, 2, 4, 6, 7]);
    expect(notes(drawn)).toEqual(['F = A·B + C′']);
    expect(drawn.stroke('truth-rule-head')).toBeDefined();
    expectCleanLabels(drawn);
  });

  it('agrees with a brute-force evaluation for every notation of the same function', async () => {
    const expected = Array.from({ length: 8 }, (_, row) => {
      const [a, b, c] = [(row >> 2) & 1, (row >> 1) & 1, row & 1];
      return `${a}${b}${c}${(a && b) || !c ? 1 : 0}`;
    });
    for (const expr of ['(A AND B) OR NOT C', '(a and b) or not c'.toUpperCase(), "AB + C'", 'A & B | ~C', 'A ∧ B ∨ ¬C', 'A \\cdot B + \\overline{C}', 'OR(AND(A,B), NOT(C))']) {
      expect(body(await draw('truth', `expr: F = ${expr}`)), expr).toEqual(expected);
    }
  });

  it('orders columns alphabetically by default, or as inputs: says', async () => {
    expect(heads(await draw('truth', "expr: F = C' + B·A"))).toEqual(['A', 'B', 'C', 'F']);
    expect(heads(await draw('truth', 'expr: Y = x10 + x2·x1'))).toEqual(['x1', 'x2', 'x10', 'Y']);
    expect(naturalOrder(['b', 'A', 'x10', 'x9', 'a'])).toEqual(['A', 'a', 'b', 'x9', 'x10']);

    const declared = await draw('truth', 'expr: F = A·B\ninputs: B, A');
    expect(heads(declared)).toEqual(['B', 'A', 'F']);
    expect(body(declared)).toEqual(['000', '010', '100', '111']);
    // A function-style left side is an order too; a declared input the expression ignores still gets its column.
    expect(heads(await draw('truth', 'expr: f(z, y, x) = x + y'))).toEqual(['z', 'y', 'x', 'f']);
    expect(body(await draw('truth', 'expr: F = A\ninputs: A, B'))).toEqual(['000', '010', '101', '111']);
    // A variable the declaration forgot is appended, never dropped.
    expect(heads(await draw('truth', 'expr: F = A·B + C\ninputs: B, A'))).toEqual(['B', 'A', 'C', 'F']);
  });

  it('draws one column per expr; a short bare expression heads its own column', async () => {
    const gates = await draw('truth', 'expr: A and B\nexpr: A or B\nexpr: A NAND B\nexpr: A xor B');
    expect(heads(gates)).toEqual(['A', 'B', 'A·B', 'A + B', '(A·B)′', 'A ⊕ B']);
    expect(body(gates)).toEqual(['000010', '010111', '100111', '111100']);
    expect(notes(gates)).toEqual([]);
    expectCleanLabels(gates);

    const adder = await draw('truth-table', 'expr: S = A ⊕ B ⊕ Cin\nexpr: Cout = AB + Cin(A ⊕ B)');
    expect(heads(adder)).toEqual(['A', 'B', 'Cin', 'S', 'Cout']);
    expect(body(adder)).toEqual(['00000', '00110', '01010', '01101', '10010', '10101', '11001', '11111']);
    expect(notes(adder)).toEqual(['S = A ⊕ B ⊕ Cin', 'Cout = A·B + Cin·(A ⊕ B)']);
    // Only the first output decides the tint.
    expect(tinted(adder)).toEqual([1, 2, 4, 7]);

    const long = await draw('truth', "expr: (A + B)·(A' + C)·(B + C + D')\nexpr: (A·B + C·D)·(A' + B' + C')");
    expect(heads(long).slice(4)).toEqual(['F1', 'F2']);
    expect(notes(long)[0]).toBe('F1 = (A + B)·(A′ + C)·(B + C + D′)');
    // A generated name never collides with a variable.
    expect(heads(await draw('truth', "expr: (F + G)·(F' + H)·(G + H + F')")).at(-1)).toBe('Y');
  });

  it('prints the canonical forms it computed', async () => {
    expect(notes(await draw('truth', "expr: F = A·B + C'\nshow: minterms"))).toEqual(['F = Σm(0, 2, 4, 6, 7)']);
    expect(notes(await draw('truth', "expr: F = A·B + C'\nshow: maxterms"))).toEqual(['F = ΠM(1, 3, 5)']);
    expect(notes(await draw('truth', "expr: F = A·B + C'\nshow: Both,"))).toEqual(['F = Σm(0, 2, 4, 6, 7)', 'F = ΠM(1, 3, 5)']);
    expect(notes(await draw('truth', "expr: F = A·A'\nexpr: G = A + A'\nshow: both"))).toEqual(['F = 0', 'F = ΠM(0, 1)', 'G = Σm(0, 1)', 'G = 1']);
    expect(await reason('truth', 'expr: A·B\nshow: karnaugh')).toMatch(/show: karnaugh is not minterms, maxterms or both/);
  });

  it('keeps a 16-row table and a seven-output table clean', async () => {
    const wide = await draw('truth', ["a = A + C + BD + B'D'", "b = B' + C'D' + CD", "c = B + C' + D", "d = B'D' + CD' + BC'D + B'C + A", "e = B'D' + CD'", "f = A + C'D' + BC' + BD'", "g = A + BC' + B'C + CD'"].map((expr) => `expr: ${expr}`).join('\n'));
    expect(heads(wide)).toEqual(['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd', 'e', 'f', 'g']);
    expect(body(wide)).toHaveLength(16);
    // Digit 8 (1000) lights every segment; digit 1 (0001) lights b and c only.
    expect(body(wide)[8]).toBe('10001111111');
    expect(body(wide)[1]).toBe('00010110000');
    expectCleanLabels(wide);
    const top = boxOf(wide.stroke('truth-rule-top')!);
    const bottom = boxOf(wide.stroke('truth-rule-bottom')!);
    expect(top.x1).toBeGreaterThanOrEqual(0);
    expect(bottom.y1).toBeLessThanOrEqual(wide.scene.height);
    for (const item of wide.placed.filter((placed) => placed.label.id.startsWith('truth-cell-'))) {
      expect(item.box.y1).toBeGreaterThan(top.y1);
      expect(item.box.y2).toBeLessThan(bottom.y1);
    }
  });

  it('refuses what it cannot draw, with the reason', async () => {
    expect(await reason('truth', 'expr: F = A·B·C·D·E')).toBe(`a truth table of 5 inputs has 32 rows; at most ${TRUTH_MAX_INPUTS} inputs (16 rows) are drawn`);
    expect(await reason('truth', 'expr: F = 1')).toBe('truth needs at least one input variable');
    expect(await reason('truth', 'expr: F = A + · B')).toBe('truth: AND is missing its left operand');
    expect(await reason('truth', 'inputs: A, B')).toBe('missing expr');
    expect(await reason('truth', Array.from({ length: TRUTH_MAX_OUTPUTS + 1 }, (_, i) => `expr: F${i} = A`).join('\n'))).toMatch(/at most 8 output columns/);
    expect(await reason('truth', 'expr: A·B\nrows: 0,0,1')).toMatch(/unconsumed declaration: rows/);
  });
});
