import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';
import { FONT_MIN, type Scene } from './types';

// FIG-KMAP-01: a Karnaugh map orders rows and columns in Gray code under headers that name the variables and their
// values, so a cell's row header bits followed by its column header bits ARE its minterm number (first variable = MSB).
interface Case {
  spec: string;
  rows: string;
  cols: string;
  size: number;
  ones: number[];
  dontCares?: number[];
}

const CASES: Record<string, Case> = {
  'four variables, corners and centre': { spec: 'vars: AB,CD\nminterms: 0,2,5,7,8,10,13,15', rows: 'AB', cols: 'CD', size: 16, ones: [0, 2, 5, 7, 8, 10, 13, 15] },
  'three variables as a list': { spec: 'vars: A,B,C\nminterms: 1,3,5,7', rows: 'A', cols: 'BC', size: 8, ones: [1, 3, 5, 7] },
  'explicit row/column split': { spec: 'vars: AB/C\nminterms: 0,1,6', rows: 'AB', cols: 'C', size: 8, ones: [0, 1, 6] },
  'two variables (XOR)': { spec: 'vars: x,y\nminterms: 1,2', rows: 'x', cols: 'y', size: 4, ones: [1, 2] },
  "don't cares": { spec: 'vars: ABCD\nminterms: 1,3,7,11,15\ndontcares: 0,2,5', rows: 'AB', cols: 'CD', size: 16, ones: [1, 3, 7, 11, 15], dontCares: [0, 2, 5] },
};

function rect(scene: Scene, id: string): { x: number; y: number; w: number; h: number } {
  const stroke = scene.strokes.find((s) => s.id === id && s.kind === 'rect');
  expect(stroke, id).toBeDefined();
  const [x, y, w, h] = stroke!.points as [number, number, number, number];
  return { x, y, w, h };
}

const oneBitApart = (a: string, b: string) => [...a].filter((bit, i) => bit !== b[i]).length === 1;
type Box = { x1: number; y1: number; x2: number; y2: number };
const overlap = (p: Box, q: Box) => p.x1 < q.x2 - 0.5 && q.x1 < p.x2 - 0.5 && p.y1 < q.y2 - 0.5 && q.y1 < p.y2 - 0.5;

describe('Karnaugh map', () => {
  it.each(Object.entries(CASES))('%s: Gray-coded headers, every cell at its own minterm', async (_name, c) => {
    const result = await compileDiagramSpec({ type: 'kmap', content: c.spec }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.fontSize).toBe(FONT_MIN);
    const texts = layout.placed.map((p) => p.label.text);
    expect(texts, 'row variables named').toContain(c.rows);
    expect(texts, 'column variables named').toContain(c.cols);
    const rowHeaders = layout.placed.filter((p) => p.label.id.startsWith('kmap-row-'));
    const colHeaders = layout.placed.filter((p) => p.label.id.startsWith('kmap-col-'));
    expect(rowHeaders).toHaveLength(2 ** c.rows.length);
    expect(colHeaders).toHaveLength(2 ** c.cols.length);
    for (const headers of [rowHeaders, colHeaders]) {
      const bits = headers.map((h) => h.label.text!);
      bits.forEach((value, i) => expect(oneBitApart(value, bits[(i + 1) % bits.length]!), `${value} → ${bits[(i + 1) % bits.length]} differ in one bit`).toBe(true));
    }

    for (let m = 0; m < c.size; m++) {
      const cell = rect(result.scene, `kmap-cell-${m}`);
      const value = layout.placed.find((p) => p.label.id === `kmap-value-${m}`)!;
      const expected = c.ones.includes(m) ? '1' : c.dontCares?.includes(m) ? 'X' : '0';
      expect(value.label.text, `cell ${m}`).toBe(expected);
      expect(value.box.x1 >= cell.x && value.box.x2 <= cell.x + cell.w && value.box.y1 >= cell.y && value.box.y2 <= cell.y + cell.h, `value ${m} inside its cell`).toBe(true);
      const row = rowHeaders.find((h) => (h.box.y1 + h.box.y2) / 2 > cell.y && (h.box.y1 + h.box.y2) / 2 < cell.y + cell.h && h.box.x2 <= cell.x);
      const col = colHeaders.find((h) => (h.box.x1 + h.box.x2) / 2 > cell.x && (h.box.x1 + h.box.x2) / 2 < cell.x + cell.w && h.box.y2 <= cell.y);
      expect(row, `row header left of cell ${m}`).toBeDefined();
      expect(col, `column header above cell ${m}`).toBeDefined();
      expect(parseInt(`${row!.label.text}${col!.label.text}`, 2), `headers of cell ${m}`).toBe(m);
    }
    for (let a = 0; a < layout.placed.length; a++) {
      for (let b = a + 1; b < layout.placed.length; b++) {
        expect(overlap(layout.placed[a]!.box, layout.placed[b]!.box), `${layout.placed[a]!.label.text} × ${layout.placed[b]!.label.text}`).toBe(false);
      }
    }
  });

  it.each([
    ['five variables (two maps)', 'vars: A,B,C,D,E\nminterms: 1'],
    ['a minterm that is also a don\'t care', 'vars: AB,CD\nminterms: 1,2\ndontcares: 2'],
    ['a don\'t care outside the map', 'vars: A,B\nminterms: 1\ndontcares: 4'],
  ])('refuses %s', async (_name, content) => {
    expect((await compileDiagramSpec({ type: 'kmap', content }, 'step')).ok).toBe(false);
  });
});
