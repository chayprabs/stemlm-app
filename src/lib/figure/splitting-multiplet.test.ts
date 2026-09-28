import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';
import { FONT_MIN } from './types';

// FIG-SPLIT-01: a first-order NMR multiplet is the convolution of one binomial pattern per coupling — n equivalent
// neighbours give n+1 lines in Pascal's-triangle ratio, J apart — so line positions, heights and the stated ratio
// all follow from the multiplicity and J values.
interface Case {
  spec: string;
  /** Line positions in Hz relative to the centre, left to right. */
  at: number[];
  weights: number[];
  j: string;
}

const CASES: Record<string, Case> = {
  singlet: { spec: 'mult: s', at: [0], weights: [1], j: '' },
  doublet: { spec: 'mult: d\nj: 8.5 Hz', at: [-4.25, 4.25], weights: [1, 1], j: '8.5 Hz' },
  triplet: { spec: 'mult: t\nj: 7 Hz', at: [-7, 0, 7], weights: [1, 2, 1], j: '7 Hz' },
  quartet: { spec: 'mult: q\nj: 7', at: [-10.5, -3.5, 3.5, 10.5], weights: [1, 3, 3, 1], j: '7' },
  septet: { spec: 'mult: septet\nj: 6.9 Hz', at: [-20.7, -13.8, -6.9, 0, 6.9, 13.8, 20.7], weights: [1, 6, 15, 20, 15, 6, 1], j: '6.9 Hz' },
  'doublet of doublets': { spec: 'mult: dd\nj: 10, 4 Hz', at: [-7, -3, 3, 7], weights: [1, 1, 1, 1], j: '10, 4 Hz' },
  'doublet of triplets': { spec: 'mult: dt\nj: 10, 3 Hz', at: [-8, -5, -2, 2, 5, 8], weights: [1, 2, 1, 1, 2, 1], j: '10, 3 Hz' },
};

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlap = (p: Box, q: Box) => p.x1 < q.x2 - 0.5 && q.x1 < p.x2 - 0.5 && p.y1 < q.y2 - 0.5 && q.y1 < p.y2 - 0.5;

describe('NMR multiplet', () => {
  it.each(Object.entries(CASES))('%s: lines at the coupling positions in binomial ratio', async (_name, c) => {
    const result = await compileDiagramSpec({ type: 'splitting', content: c.spec }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.fontSize).toBe(FONT_MIN);
    const lines = result.scene.strokes
      .filter((s) => /^split-peak-\d+$/.test(s.id))
      .map((s) => ({ x: s.points[0]!, h: Math.abs(s.points[3]! - s.points[1]!) }))
      .sort((a, b) => a.x - b.x);
    expect(lines).toHaveLength(c.at.length);
    const tallest = Math.max(...lines.map((line) => line.h));
    const heaviest = Math.max(...c.weights);
    lines.forEach((line, i) => expect(line.h / tallest, `line ${i} height`).toBeCloseTo(c.weights[i]! / heaviest, 2));
    if (lines.length > 1) {
      const scale = (lines.at(-1)!.x - lines[0]!.x) / (c.at.at(-1)! - c.at[0]!);
      lines.forEach((line, i) => expect(line.x - lines[0]!.x, `line ${i} position`).toBeCloseTo((c.at[i]! - c.at[0]!) * scale, 1));
    }
    const texts = layout.placed.map((p) => p.label.text ?? '');
    expect(texts, 'intensity ratio').toContain(c.weights.join(':'));
    if (c.j) expect(texts.some((text) => text === `J = ${c.j}`), `J label in ${texts.join(' | ')}`).toBe(true);
    for (let a = 0; a < layout.placed.length; a++) {
      for (let b = a + 1; b < layout.placed.length; b++) {
        expect(overlap(layout.placed[a]!.box, layout.placed[b]!.box), `${layout.placed[a]!.label.text} × ${layout.placed[b]!.label.text}`).toBe(false);
      }
    }
  });

  it.each([
    ['a J count that does not match the couplings', 'mult: dd\nj: 10'],
    ['an unknown multiplicity', 'mult: x\nj: 5'],
    ['a coupled multiplet without J', 'mult: t'],
    ['lines too close to tell apart', 'mult: dd\nj: 12, 0.2 Hz'],
  ])('refuses %s', async (_name, content) => {
    expect((await compileDiagramSpec({ type: 'splitting', content }, 'step')).ok).toBe(false);
  });
});
