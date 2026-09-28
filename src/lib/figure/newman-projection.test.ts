import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';
import { FONT_MIN, type Scene } from './types';

// Newman projection conventions: the front carbon is the centre point, its three bonds meet there; the back carbon
// is the circle, its bonds start at the rim. All bonds are solid. The back bonds sit `deg` clockwise from the front
// ones (an eclipsed pair is drawn slightly apart so both show), and every group is written at the end of its own bond.
const CASES: Record<string, { spec: string; deg: number }> = {
  'butane anti': { spec: 'front: CH3,H,H\nback: CH3,H,H\ndeg: 180\naxis: C2-C3', deg: 180 },
  'butane gauche': { spec: 'front: CH3,H,H\nback: CH3,H,H\ndeg: 60', deg: 60 },
  'eclipsed': { spec: 'front: CH3,H,H\nback: CH3,H,H\ndeg: 0\naxis: C2-C3', deg: 0 },
  'bromo staggered': { spec: 'axis: C2-C3\ndeg: 60\nfront: H, CH3, H\nback: H, H, Br', deg: 60 },
  'ethane default': { spec: 'front: H,H,H\nback: H,H,H\ndeg: -60', deg: -60 },
};

type Seg = { x1: number; y1: number; x2: number; y2: number };
type Box = { x1: number; y1: number; x2: number; y2: number };

const bond = (scene: Scene, id: string): Seg => {
  const s = scene.strokes.find((stroke) => stroke.id === id);
  expect(s, id).toBeDefined();
  expect(s!.dash, `${id} is solid`).toBeFalsy();
  const [x1, y1, x2, y2] = s!.points as [number, number, number, number];
  return { x1, y1, x2, y2 };
};
const angleOf = (s: Seg) => (Math.atan2(s.y2 - s.y1, s.x2 - s.x1) * 180) / Math.PI;
const turn = (from: number, to: number) => ((((to - from) % 360) + 540) % 360) - 180;
const overlap = (p: Box, q: Box) => p.x1 < q.x2 - 0.5 && q.x1 < p.x2 - 0.5 && p.y1 < q.y2 - 0.5 && q.y1 < p.y2 - 0.5;
function crosses(box: Box, s: Seg): boolean {
  for (let t = 0; t <= 1; t += 0.02) {
    const x = s.x1 + (s.x2 - s.x1) * t;
    const y = s.y1 + (s.y2 - s.y1) * t;
    if (x > box.x1 + 0.5 && x < box.x2 - 0.5 && y > box.y1 + 0.5 && y < box.y2 - 0.5) return true;
  }
  return false;
}

describe('Newman projection', () => {
  it.each(Object.entries(CASES))('%s: front bonds from the centre, back bonds from the rim, groups at their bond ends', async (_name, c) => {
    const result = await compileDiagramSpec({ type: 'newman', content: c.spec }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.fontSize).toBe(FONT_MIN);
    const circle = result.scene.strokes.find((s) => s.id === 'back-carbon' && s.kind === 'circle')!;
    expect(circle, 'back carbon circle').toBeDefined();
    const [cx, cy, r] = circle.points as [number, number, number];
    const dist = (x: number, y: number) => Math.hypot(x - cx, y - cy);
    const front = [0, 1, 2].map((i) => bond(result.scene, `front-${i}`));
    const back = [0, 1, 2].map((i) => bond(result.scene, `back-${i}`));
    for (const s of front) {
      expect(dist(s.x1, s.y1), 'front bond meets the centre').toBeLessThan(0.5);
      expect(dist(s.x2, s.y2), 'front bond leaves the circle').toBeGreaterThan(r);
    }
    for (const s of back) {
      expect(Math.abs(dist(s.x1, s.y1) - r), 'back bond starts on the rim').toBeLessThan(0.5);
      expect(dist(s.x2, s.y2), 'back bond points outward').toBeGreaterThan(r + 8);
    }
    const eclipsed = ((c.deg % 120) + 120) % 120 === 0;
    for (let i = 0; i < 3; i++) {
      const offset = turn(angleOf(front[i]!), angleOf(back[i]!));
      if (eclipsed) {
        expect(Math.abs(offset), 'eclipsed pair drawn slightly apart').toBeGreaterThan(5);
        expect(Math.abs(offset)).toBeLessThanOrEqual(25);
      } else {
        expect(Math.abs(turn(offset, c.deg)), `back ${i} sits ${c.deg}° clockwise of front ${i}`).toBeLessThan(1e-3);
      }
    }
    const groups = [...front.map((s, i) => [s, `front-${i}-label`] as const), ...back.map((s, i) => [s, `back-${i}-label`] as const)];
    for (const [s, id] of groups) {
      const label = layout.placed.find((p) => p.label.id === id)!;
      const mx = (label.box.x1 + label.box.x2) / 2;
      const my = (label.box.y1 + label.box.y2) / 2;
      expect(dist(mx, my), `${id} beyond its bond end`).toBeGreaterThan(dist(s.x2, s.y2));
      expect(Math.abs(turn(angleOf(s), (Math.atan2(my - cy, mx - cx) * 180) / Math.PI)), `${id} along its bond`).toBeLessThan(20);
    }
    const bonds = [...front, ...back];
    for (const p of layout.placed) {
      const corners = [[p.box.x1, p.box.y1], [p.box.x2, p.box.y1], [p.box.x1, p.box.y2], [p.box.x2, p.box.y2]] as const;
      expect(corners.some(([x, y]) => dist(x, y) < r), `${p.label.text} clear of the circle`).toBe(false);
      for (const s of bonds) expect(crosses(p.box, s), `${p.label.text} clear of every bond`).toBe(false);
    }
    for (let a = 0; a < layout.placed.length; a++) {
      for (let b = a + 1; b < layout.placed.length; b++) {
        expect(overlap(layout.placed[a]!.box, layout.placed[b]!.box), `${layout.placed[a]!.label.text} × ${layout.placed[b]!.label.text}`).toBe(false);
      }
    }
  });

  it('sawhorse: front carbon lower left, back carbon upper right, solid bonds', async () => {
    const result = await compileDiagramSpec({ type: 'newman', content: 'view: sawhorse\nfront: H,CH3,H\nback: H,H,CH3\ndeg: 60\naxis: C-C' }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const axis = bond(result.scene, 'newman-axis');
    expect(axis.x2, 'back carbon to the right').toBeGreaterThan(axis.x1);
    expect(axis.y2, 'back carbon above').toBeLessThan(axis.y1);
    for (let i = 0; i < 3; i++) {
      bond(result.scene, `front-${i}`);
      bond(result.scene, `back-${i}`);
    }
  });
});
