import { describe, expect, it } from 'vitest';
import { measureText, samplePathD } from './geom';
import { SceneBuilder } from './scene-build';
import { layoutScene } from './slk';

describe('P2 shared figure kernel', () => {
  it('measures glyph-shaped content instead of only character count', () => {
    expect(measureText('WWWW', 12).w).toBeGreaterThan(measureText('iiii', 12).w);
    expect(measureText('alpha', 12).w).toBeLessThan(measureText('alpha with a long annotation', 12).w);
  });

  it('samples elliptical arcs along their curved locus', () => {
    const segments = samplePathD('M 10 10 A 20 20 0 0 1 30 30', 12);
    expect(segments.length).toBeGreaterThan(1);
    const midpoint = segments[Math.floor(segments.length / 2)]!;
    const x = (midpoint.x1 + midpoint.x2) / 2;
    const y = (midpoint.y1 + midpoint.y2) / 2;
    expect(Math.abs((y - 10) - (x - 10))).toBeGreaterThan(1);
  });

  it('keeps protected labels inside the frame while retaining them', () => {
    const b = new SceneBuilder('p2-capacity', 300, 165);
    b.rect('body', 130, 70, 40, 30);
    b.label('required', 'a long protected annotation', 10, 12, { protected: true });
    const layout = layoutScene(b.scene());
    expect(layout.ok).toBe(true);
    if (layout.ok) {
      const placed = layout.placed.find((item) => item.label.id === 'required');
      expect(placed).toBeDefined();
      expect(placed!.box.x1).toBeGreaterThanOrEqual(4);
      expect(placed!.box.y1).toBeGreaterThanOrEqual(4);
      expect(placed!.box.x2).toBeLessThanOrEqual(296);
      expect(placed!.box.y2).toBeLessThanOrEqual(161);
    }
  });

  it('recovers capacity for a dense required-label scene', () => {
    const b = new SceneBuilder('dense-labels', 300, 165);
    for (let i = 0; i < 20; i++) b.label(`label-${i}`, `L${i}`, 150, 82);
    for (const label of b.labels) Object.assign(label, { priority: 'required' });

    const laid = layoutScene(b.scene());
    expect(laid.ok, laid.ok ? '' : laid.reason).toBe(true);
    if (laid.ok) expect(laid.placed.filter((p) => p.label.priority === 'required')).toHaveLength(20);
  });
});
