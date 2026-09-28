import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';

// Field catalog figures: a current into the page is a full ×, and names sit clear of the field lines and windings.
describe('field catalog labels', () => {
  it('long wire: the current is an × at the wire and I sits clear of every B circle', async () => {
    const result = await compileDiagramSpec({ type: 'field', content: 'catalog: wire' }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    const [cx, cy] = result.scene.strokes.find((s) => s.id === 'wire')!.points as [number, number];
    const cross = result.scene.strokes.filter((s) => /^current/.test(s.id));
    expect(cross, 'two strokes make the ×').toHaveLength(2);
    for (const s of cross) {
      expect((s.points[0]! + s.points[2]!) / 2).toBeCloseTo(cx, 5);
      expect((s.points[1]! + s.points[3]!) / 2).toBeCloseTo(cy, 5);
    }
    expect(Math.sign(cross[0]!.points[3]! - cross[0]!.points[1]!)).not.toBe(Math.sign(cross[1]!.points[3]! - cross[1]!.points[1]!));
    const label = layout.placed.find((p) => p.label.id === 'I')!;
    for (const ring of result.scene.strokes.filter((s) => /^B\d+$/.test(s.id))) {
      const [x, y, r] = ring.points as [number, number, number];
      const { x1, y1, x2, y2 } = label.box;
      const nearest = Math.hypot(Math.min(Math.max(x, x1), x2) - x, Math.min(Math.max(y, y1), y2) - y);
      const farthest = Math.max(...[[x1, y1], [x2, y1], [x1, y2], [x2, y2]].map(([px, py]) => Math.hypot(px! - x, py! - y)));
      expect(nearest >= r || farthest <= r, `I clear of ${ring.id}`).toBe(true);
    }
  });

  it('solenoid: the core permeability sits above the windings', async () => {
    const result = await compileDiagramSpec({ type: 'field', content: 'catalog: solenoid\ncore: mu_r=400\nB: 1.2 T\nH: ?' }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    const label = layout.placed.find((p) => p.label.id === 'mu_r')!;
    const tops = result.scene.strokes.filter((s) => /^wrap\d+$/.test(s.id)).map((s) => s.points[1]! - s.points[3]!);
    expect(label.box.y2, 'μr label above every winding').toBeLessThanOrEqual(Math.min(...tops));
  });
});
