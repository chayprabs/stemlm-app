import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';
import { FONT_MIN } from './types';

// Mohr's circle for plane stress (τ axis positive downward, A = (σx, τxy), B = (σy, −τxy)): centre (σx+σy)/2,
// radius √(((σx−σy)/2)² + τxy²); the principal stresses, τmax and both stress points are drawn and labelled.
const CASES: Record<string, { spec: string; sx: number; sy: number; txy: number; texts: string[] }> = {
  'tension with shear': { spec: 'sigma: 40\nsy: 10\ntau: 8', sx: 40, sy: 10, txy: 8, texts: ['A (40, 8)', 'B (10, -8)', 'σ1 = 42', 'σ2 = 8', 'τmax = 17'] },
  'mixed signs, units': { spec: 'sx: -20 MPa\nsy: 30 MPa\ntxy: -15 MPa', sx: -20, sy: 30, txy: -15, texts: ['A (-20, -15)', 'B (30, 15)', 'σ1 = 34.2', 'σ2 = -24.2', 'τmax = 29.2', 'σ (MPa)'] },
  'pure shear': { spec: 'sigma: 0\nsy: 0\ntau: 10', sx: 0, sy: 0, txy: 10, texts: ['A (0, 10)', 'B (0, -10)', 'σ1 = 10', 'σ2 = -10', 'τmax = 10'] },
};

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlap = (p: Box, q: Box) => p.x1 < q.x2 - 0.5 && q.x1 < p.x2 - 0.5 && p.y1 < q.y2 - 0.5 && q.y1 < p.y2 - 0.5;

describe("Mohr's circle", () => {
  it.each(Object.entries(CASES))('%s: circle, stress points and principal values', async (_name, c) => {
    const result = await compileDiagramSpec({ type: 'mohr', content: c.spec }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.fontSize).toBe(FONT_MIN);
    const { scene } = result;
    const stroke = (id: string) => scene.strokes.find((s) => s.id === id)!;
    const [cx, cy, r] = stroke('mohr-circle').points as [number, number, number];
    const centre = (c.sx + c.sy) / 2;
    const radius = Math.hypot((c.sx - c.sy) / 2, c.txy);
    const scale = r / radius;
    const origin = stroke('tau-axis').points[0]!;
    expect(cx - origin, 'centre at (σx+σy)/2').toBeCloseTo(centre * scale, 3);
    expect(stroke('sigma-axis').points[1], 'centre on the σ axis').toBeCloseTo(cy, 5);
    const tauAxis = stroke('tau-axis').points;
    expect(tauAxis[3]!, 'τ axis points down').toBeGreaterThan(tauAxis[1]!);
    const a = stroke('state-a').points;
    const b = stroke('state-b').points;
    expect(a[0]! - origin).toBeCloseTo(c.sx * scale, 3);
    expect(a[1]! - cy, 'A: positive τxy plotted downward').toBeCloseTo(c.txy * scale, 3);
    expect(b[0]! - origin).toBeCloseTo(c.sy * scale, 3);
    expect(b[1]! - cy).toBeCloseTo(-c.txy * scale, 3);
    const texts = layout.placed.map((p) => p.label.text);
    for (const text of c.texts) expect(texts, text).toContain(text);
    for (const id of ['state-a', 'state-b']) {
      const label = layout.placed.find((p) => p.label.anchorId === id)!;
      const [px, py] = stroke(id).points as [number, number];
      const mid = { x: (label.box.x1 + label.box.x2) / 2, y: (label.box.y1 + label.box.y2) / 2 };
      expect(Math.hypot(mid.x - cx, mid.y - cy), `${label.label.text} outside the circle`).toBeGreaterThan(Math.hypot(px - cx, py - cy));
    }
    for (let i = 0; i < layout.placed.length; i++) {
      for (let j = i + 1; j < layout.placed.length; j++) {
        expect(overlap(layout.placed[i]!.box, layout.placed[j]!.box), `${layout.placed[i]!.label.text} × ${layout.placed[j]!.label.text}`).toBe(false);
      }
    }
  });

  it('refuses a hydrostatic state (the circle is a point)', async () => {
    expect((await compileDiagramSpec({ type: 'mohr', content: 'sigma: 20\nsy: 20\ntau: 0' }, 'step')).ok).toBe(false);
  });
});
