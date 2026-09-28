import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import type { Scene } from './types';

// Phase 3 table rules: a table whose cells are short but whose columns are too many for the nominal
// frame stays ONE coherent table (presentation scales it; no column shredding); a stacked layout never
// spends a panel on the row-key column alone; a consistently semicolon-delimited table keeps commas
// inside its cells.

async function scene(content: string): Promise<Scene> {
  const result = await compileDiagramSpec({ type: 'table', content }, 'step');
  if (!result.ok) throw new Error(`${content}\n→ ${result.reason}`);
  return result.scene;
}

const frames = (s: Scene) => s.strokes.filter((stroke) => /^frame(-\d+-\d+)?$/.test(stroke.id));
const cellTexts = (s: Scene) => s.labels.map((label) => label.text ?? label.katex ?? '');

const COMPARISON = 'kind: matrix\nheaders: Property, Mitosis, Meiosis\nrow: Divisions, 1, 2\nrow: Daughter cells, 2, 4\nrow: Ploidy of daughters, Diploid (2n), Haploid (n)\nrow: Crossing over, No, Yes (prophase I)\nrow: Purpose, Growth and repair, Gamete formation';
const ELEMENTS = 'kind: matrix\nheaders: Element, Z, Mass (u), Group, Period, Electronegativity\nrow: Hydrogen, 1, 1.008, 1, 1, 2.20\nrow: Carbon, 6, 12.011, 14, 2, 2.55\nrow: Nitrogen, 7, 14.007, 15, 2, 3.04\nrow: Oxygen, 8, 15.999, 16, 2, 3.44\nrow: Sodium, 11, 22.990, 1, 3, 0.93\nrow: Chlorine, 17, 35.45, 17, 3, 3.16';
const PROSE = [
  'kind: matrix',
  'headers: Organelle, Structure, Function',
  'row: Nucleus, Double membrane envelope with nuclear pores and chromatin inside, Stores DNA and controls gene expression and cell division',
  'row: Mitochondrion, Double membrane with folded inner cristae and its own DNA, Site of aerobic respiration producing most of the ATP',
  'row: Ribosome, Small complex of rRNA and protein without any membrane, Translates messenger RNA into polypeptide chains of amino acids',
  'row: Golgi apparatus, Stack of flattened membrane sacs called cisternae near the nucleus, Modifies and sorts proteins for secretion or delivery',
  'row: Chloroplast, Double membrane with stacked thylakoids called grana in the stroma, Absorbs light energy and carries out photosynthesis',
].join('\n');

describe('Phase 3 table layout', () => {
  it.each([['comparison', COMPARISON, 15], ['elements', ELEMENTS, 36]])('keeps a short-celled %s table as one coherent grid', async (_name, content, bodyCells) => {
    const s = await scene(content);
    expect(frames(s)).toHaveLength(1);
    expect(s.panels ?? []).toHaveLength(0);
    expect(s.labels.filter((label) => /^table-cell-\d+-\d+$/.test(label.id))).toHaveLength(bodyCells);
  });

  it('never spends a stacked panel on the row-key column alone', async () => {
    const s = await scene(PROSE);
    const boxes = frames(s).map((frame) => ({ x1: frame.points[0]!, y1: frame.points[1]!, x2: frame.points[0]! + frame.points[2]!, y2: frame.points[1]! + frame.points[3]! }));
    for (const box of boxes) {
      const inside = s.labels.filter((label) => /^table-(cell|header|row-key)-/.test(label.id) && label.x > box.x1 && label.x < box.x2 && label.y > box.y1 && label.y < box.y2);
      // A repeated row key (table-row-key-*) is column 0.
      const columns = new Set(inside.map((label) => (/^table-row-key-/.test(label.id) ? '0' : /^table-cell-\d+-(\d+)/.exec(label.id)?.[1] ?? /^table-header-(\d+)/.exec(label.id)?.[1])));
      expect(columns.size, `panel at ${box.x1},${box.y1}`).toBeGreaterThan(1);
    }
    for (const word of ['Nucleus', 'Chloroplast', 'photosynthesis']) {
      expect(cellTexts(s).some((text) => text.includes(word))).toBe(true);
    }
  });

  it('keeps commas inside the cells of a semicolon-delimited table', async () => {
    const s = await scene('kind: matrix\nheaders: Stage; What happens\nrow: 1; Glucose is phosphorylated by hexokinase, using one ATP\nrow: 2; Fructose-1,6-bisphosphate splits into two trioses');
    expect(s.labels.filter((label) => /^table-cell-\d+-\d+/.test(label.id)).map((label) => /^table-cell-(\d+)-(\d+)/.exec(label.id)![2])).not.toContain('2');
    expect(cellTexts(s).join(' ')).toContain('hexokinase, using one ATP');
    expect(cellTexts(s).join(' ')).toContain('Fructose-1,6-bisphosphate');
  });
});

describe('Phase 3 ICE species notation', () => {
  it('writes ICE species as chemical formulas: digits subscript, charges superscript', async () => {
    const result = await compileDiagramSpec({ type: 'table', content: 'kind: ice\nspecies: CH3COOH, H+, CH3COO-, Fe2+, SO4^2-\ni: 0.10, 0, 0, 0.01, 0.02\nc: -x, +x, +x, -y, -y\ne: 0.10 - x, x, x, 0.01 - y, 0.02 - y' }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const root = new DOMParser().parseFromString(result.svg, 'image/svg+xml').documentElement;
    const species = ['', 'CH3COOH', 'H+', 'CH3COO-', 'Fe2+', 'SO4^2-'];
    const header = (index: number) => [...root.querySelectorAll('text')].find((text) => text.textContent === species[index]!.replace('^', ''))!;
    const runs = (el: Element) => [...el.querySelectorAll('tspan')].map((span) => `${Number(span.getAttribute('dy')) > 0 ? '_' : '^'}${span.textContent}`);
    expect(header(1).textContent).toBe('CH3COOH');
    expect(runs(header(1))).toContain('_3');
    expect(header(2).textContent).toBe('H+');
    expect(runs(header(2))).toContain('^+');
    expect(runs(header(3))).toEqual(expect.arrayContaining(['_3', '^-']));
    expect(runs(header(4))).toContain('^2+');
    expect(runs(header(5))).toEqual(expect.arrayContaining(['_4', '^2-']));
  });
});

describe('chemicalNotation', () => {
  it.each([
    ['Fe2+', 'Fe^{2+}'],
    ['Al3+', 'Al^{3+}'],
    ['NH4+', 'NH_{4}^{+}'],
    ['SO42-', 'SO_{4}^{2-}'],
    ['SO4^2-', 'SO_{4}^{2-}'],
    ['Cr2O72-', 'Cr_{2}O_{7}^{2-}'],
    ['H3O+', 'H_{3}O^{+}'],
    ['Cu(OH)2', 'Cu(OH)_{2}'],
    ['H2O(l)', 'H_{2}O(l)'],
    ['A-', 'A^{-}'],
    ['HA', 'HA'],
    ['x', 'x'],
    ['0.10 - x', '0.10 - x'],
  ])('%s → %s', async (input, output) => {
    const { chemicalNotation } = await import('./label-format');
    expect(chemicalNotation(input)).toBe(output);
  });
});
