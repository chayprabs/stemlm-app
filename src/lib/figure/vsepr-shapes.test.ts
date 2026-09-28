import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';
import { FONT_MIN, type Scene } from './types';

// VSEPR drawings follow the textbook 2D convention: AXnEm has n bonds and m lone pairs; bonds in the paper plane are
// lines, toward the viewer a filled wedge, away a hashed wedge; each lone pair is a pair of dots; the shape is named
// from n and m (NH3 is trigonal pyramidal, not a flat cross; water has two lone pairs).
interface Case {
  spec: string;
  shape: string;
  plane: number;
  wedge: number;
  dash: number;
  lonePairs: number;
  /** Angle between the in-plane bonds when exactly two (or all three for AX3) lie in the plane. */
  planeAngle?: number;
}

const CASES: Record<string, Case> = {
  'CO2 (AX2)': { spec: 'geom: AX2\ncenter: C\nligands: O,O', shape: 'linear', plane: 2, wedge: 0, dash: 0, lonePairs: 0, planeAngle: 180 },
  'BF3 (AX3)': { spec: 'geom: AX3\ncenter: B\nligands: F,F,F', shape: 'trigonal planar', plane: 3, wedge: 0, dash: 0, lonePairs: 0, planeAngle: 120 },
  'SO2 (AX2E)': { spec: 'geom: AX2E\ncenter: S\nligands: O,O', shape: 'bent', plane: 2, wedge: 0, dash: 0, lonePairs: 1, planeAngle: 120 },
  'CH4 (AX4)': { spec: 'geom: AX4\ncenter: C\nligands: H,H,H,H', shape: 'tetrahedral', plane: 2, wedge: 1, dash: 1, lonePairs: 0, planeAngle: 109.5 },
  'NH3 (AX3E)': { spec: 'geom: AX3E\ncenter: N\nligands: H,H,H', shape: 'trigonal pyramidal', plane: 1, wedge: 1, dash: 1, lonePairs: 1 },
  'H2O (AX2E2)': { spec: 'geom: AX2E2\ncenter: O\nligands: H,H', shape: 'bent', plane: 2, wedge: 0, dash: 0, lonePairs: 2, planeAngle: 104.5 },
  'PCl5 (AX5)': { spec: 'geom: trigonal bipyramidal\ncenter: P\nligands: Cl,Cl,Cl,Cl,Cl', shape: 'trigonal bipyramidal', plane: 3, wedge: 1, dash: 1, lonePairs: 0 },
  'SF4 (AX4E)': { spec: 'geom: AX4E\ncenter: S\nligands: F,F,F,F', shape: 'seesaw', plane: 2, wedge: 1, dash: 1, lonePairs: 1 },
  'ClF3 (AX3E2)': { spec: 'geom: AX3E2\ncenter: Cl\nligands: F,F,F', shape: 'T-shaped', plane: 3, wedge: 0, dash: 0, lonePairs: 2 },
  'XeF2 (AX2E3)': { spec: 'geom: AX2E3\ncenter: Xe\nligands: F,F', shape: 'linear', plane: 2, wedge: 0, dash: 0, lonePairs: 3, planeAngle: 180 },
  'SF6 (AX6)': { spec: 'geom: octahedral\ncenter: S\nligands: F,F,F,F,F,F', shape: 'octahedral', plane: 4, wedge: 1, dash: 1, lonePairs: 0 },
  'BrF5 (AX5E)': { spec: 'geom: AX5E\ncenter: Br\nligands: F,F,F,F,F', shape: 'square pyramidal', plane: 3, wedge: 1, dash: 1, lonePairs: 1 },
  'XeF4 (AX4E2)': { spec: 'geom: square planar\ncenter: Xe\nligands: F,F,F,F', shape: 'square planar', plane: 2, wedge: 1, dash: 1, lonePairs: 2 },
  'water with ax and a matching shape name': { spec: 'ax: AX2E2\ncenter: O\nligands: H,H\ngeom: bent', shape: 'bent', plane: 2, wedge: 0, dash: 0, lonePairs: 2, planeAngle: 104.5 },
};

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlap = (p: Box, q: Box) => p.x1 < q.x2 - 0.5 && q.x1 < p.x2 - 0.5 && p.y1 < q.y2 - 0.5 && q.y1 < p.y2 - 0.5;

function bondKinds(scene: Scene): Array<'plane' | 'wedge' | 'dash'> {
  const ids = [...new Set(scene.strokes.map((s) => /^ligand-bond-(\d+)/.exec(s.id)?.[1]).filter((id) => id !== undefined))];
  return ids.map((id) => {
    const strokes = scene.strokes.filter((s) => s.id === `ligand-bond-${id}` || s.id.startsWith(`ligand-bond-${id}-`));
    if (strokes.some((s) => s.id.includes('-hash-'))) return 'dash';
    return strokes.some((s) => s.kind === 'polygon' && s.fill === 'ink') ? 'wedge' : 'plane';
  });
}

describe('VSEPR shapes', () => {
  it.each(Object.entries(CASES))('%s: bonds, wedges, lone pairs and the shape name', async (_name, c) => {
    const result = await compileDiagramSpec({ type: 'vsepr', content: c.spec }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.fontSize).toBe(FONT_MIN);
    const { scene } = result;
    const kinds = bondKinds(scene);
    expect(kinds.filter((k) => k === 'plane').length, 'in-plane bonds').toBe(c.plane);
    expect(kinds.filter((k) => k === 'wedge').length, 'wedges').toBe(c.wedge);
    expect(kinds.filter((k) => k === 'dash').length, 'hashed wedges').toBe(c.dash);
    const dots = scene.strokes.filter((s) => /^lone-pair-\d+-[ab]$/.test(s.id));
    expect(dots, 'two dots per lone pair').toHaveLength(2 * c.lonePairs);
    expect(layout.placed.find((p) => p.label.id === 'geometry-label')?.label.text).toBe(c.shape);
    if (c.planeAngle !== undefined) {
      const planes = scene.strokes.filter((s) => /^ligand-bond-\d+$/.test(s.id) && s.kind === 'line');
      const angle = (s: typeof planes[number]) => Math.atan2(s.points[3]! - s.points[1]!, s.points[2]! - s.points[0]!);
      const between = (a: number, b: number) => {
        const d = Math.abs(((((a - b) * 180) / Math.PI) % 360 + 360) % 360);
        return Math.min(d, 360 - d);
      };
      expect(between(angle(planes[0]!), angle(planes[1]!)), 'in-plane bond angle').toBeCloseTo(c.planeAngle, 0);
    }
    const ligands = /ligands:\s*(.+)/.exec(c.spec)![1]!.split(',').map((l) => l.trim());
    ligands.forEach((ligand, i) => expect(layout.placed.find((p) => p.label.id === `ligand-label-${i}`)?.label.text).toBe(ligand));
    const dotBoxes = dots.map((d) => ({ x1: d.points[0]! - d.points[2]!, y1: d.points[1]! - d.points[2]!, x2: d.points[0]! + d.points[2]!, y2: d.points[1]! + d.points[2]! }));
    for (const p of layout.placed) for (const d of dotBoxes) expect(overlap(p.box, d), `${p.label.text} clear of a lone pair`).toBe(false);
    for (let a = 0; a < layout.placed.length; a++) {
      for (let b = a + 1; b < layout.placed.length; b++) {
        expect(overlap(layout.placed[a]!.box, layout.placed[b]!.box), `${layout.placed[a]!.label.text} × ${layout.placed[b]!.label.text}`).toBe(false);
      }
    }
  });

  it.each([
    ['an ambiguous "bent"', 'geom: bent\ncenter: O\nligands: H,H'],
    ['a shape name that contradicts ax', 'ax: AX2E2\ngeom: linear\ncenter: O\nligands: H,H'],
    ['five domains on a period-2 atom', 'geom: AX5\ncenter: N\nligands: F,F,F,F,F'],
    ['four domains plus a lone pair on carbon', 'geom: AX4E\ncenter: C\nligands: H,H,H,H'],
    ['a ligand count that does not match', 'geom: AX3E\ncenter: N\nligands: H,H'],
    ['more than six domains', 'geom: AX6E\ncenter: Xe\nligands: F,F,F,F,F,F'],
  ])('refuses %s', async (_name, content) => {
    expect((await compileDiagramSpec({ type: 'vsepr', content }, 'step')).ok).toBe(false);
  });
});
