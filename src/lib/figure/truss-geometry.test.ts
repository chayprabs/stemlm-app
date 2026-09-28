import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';
import { FONT_MIN, type Scene } from './types';

// FIG-TRUSS-01: a truss is drawn from its joint coordinates (y up, one uniform scale): members join the declared
// joints, supports sit under their joints, each load arrow ends at its joint pointing the stated way with its value
// at the tail, and every joint name sits beside its own joint clear of the members.
interface Case {
  spec: string;
  loads: Array<{ at: string; text: string; dir: 'down' | 'up' | 'left' | 'right' }>;
  span?: string;
}

const CASES: Record<string, Case> = {
  'triangle': {
    spec: 'joints: A 0 0; B 4 0; C 2 3\nmembers: A-B, B-C, C-A\nsupports: pin@A, roller@B\nloads: 10kN down@C',
    loads: [{ at: 'C', text: '10 kN', dir: 'down' }],
  },
  'Pratt truss': {
    spec: [
      'joints: A 0 0; B 3 0; C 6 0; D 9 0; E 3 3; F 6 3',
      'members: A-B, B-C, C-D, A-E, E-F, F-D, B-E, C-F, B-F',
      'supports: pin@A, roller@D',
      'loads: 20kN down@B, 20kN down@C',
      'L: 9',
    ].join('\n'),
    loads: [{ at: 'B', text: '20 kN', dir: 'down' }, { at: 'C', text: '20 kN', dir: 'down' }],
    span: 'L = 9',
  },
  'wall bracket with a horizontal load': {
    spec: 'joints: A 0 0; B 0 3; C 4 3\nmembers: A-C, B-C\nsupports: pin@A, pin@B\nloads: 5kN right@C, P down@C',
    loads: [{ at: 'C', text: '5 kN', dir: 'right' }, { at: 'C', text: 'P', dir: 'down' }],
  },
};

type Pt = { x: number; y: number };
type Box = { x1: number; y1: number; x2: number; y2: number };
const overlap = (p: Box, q: Box) => p.x1 < q.x2 - 0.5 && q.x1 < p.x2 - 0.5 && p.y1 < q.y2 - 0.5 && q.y1 < p.y2 - 0.5;
const crosses = (box: Box, s: number[]) => Array.from({ length: 41 }, (_, k) => k / 40).some((t) => {
  const x = s[0]! + (s[2]! - s[0]!) * t;
  const y = s[1]! + (s[3]! - s[1]!) * t;
  return x > box.x1 + 0.5 && x < box.x2 - 0.5 && y > box.y1 + 0.5 && y < box.y2 - 0.5;
});

function joints(spec: string): Map<string, Pt> {
  const line = /joints:\s*(.+)/.exec(spec)![1]!;
  return new Map(line.split(';').map((part) => {
    const [name, x, y] = part.trim().split(/\s+/);
    return [name!, { x: Number(x), y: Number(y) }];
  }));
}

function centre(scene: Scene, name: string): Pt {
  const dot = scene.strokes.find((s) => s.id === `joint-${name}`)!;
  expect(dot, `joint ${name}`).toBeDefined();
  return { x: dot.points[0]!, y: dot.points[1]! };
}

describe('truss', () => {
  it.each(Object.entries(CASES))('%s: drawn to scale from joint coordinates, loads and names in place', async (_name, c) => {
    const result = await compileDiagramSpec({ type: 'truss', content: c.spec }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.fontSize).toBe(FONT_MIN);
    const { scene } = result;
    const declared = joints(c.spec);
    const names = [...declared.keys()];
    const [first, second] = names.map((name) => ({ name, at: declared.get(name)!, drawn: centre(scene, name) }));
    // One uniform scale, y up: every drawn offset from the first joint is the declared offset times s (y flipped).
    const far = names.map((name) => ({ at: declared.get(name)!, drawn: centre(scene, name) }))
      .reduce((best, j) => (Math.hypot(j.at.x - first!.at.x, j.at.y - first!.at.y) > Math.hypot(best.at.x - first!.at.x, best.at.y - first!.at.y) ? j : best), second!);
    const s = Math.hypot(far.drawn.x - first!.drawn.x, far.drawn.y - first!.drawn.y) / Math.hypot(far.at.x - first!.at.x, far.at.y - first!.at.y);
    for (const name of names) {
      const at = declared.get(name)!;
      const drawn = centre(scene, name);
      expect(drawn.x - first!.drawn.x, `${name} x to scale`).toBeCloseTo((at.x - first!.at.x) * s, 3);
      expect(drawn.y - first!.drawn.y, `${name} y to scale, y up`).toBeCloseTo(-(at.y - first!.at.y) * s, 3);
    }
    const members = /members:\s*(.+)/.exec(c.spec)![1]!.split(',').map((m) => m.trim().split('-') as [string, string]);
    const memberStrokes = scene.strokes.filter((st) => st.id.startsWith('member-'));
    expect(memberStrokes).toHaveLength(members.length);
    for (const [a, b] of members) {
      const stroke = memberStrokes.find((st) => st.id === `member-${a}-${b}`)!;
      const [pa, pb] = [centre(scene, a), centre(scene, b)];
      expect([stroke.points[0], stroke.points[1], stroke.points[2], stroke.points[3]].map((v) => Number(v!.toFixed(3))), `${a}-${b} joins its joints`)
        .toEqual([pa.x, pa.y, pb.x, pb.y].map((v) => Number(v.toFixed(3))));
    }
    for (const support of /supports:\s*(.+)/.exec(c.spec)![1]!.split(',')) {
      const joint = support.split('@')[1]!.trim();
      const glyph = scene.strokes.find((st) => st.id.startsWith(`support-${joint}`))!;
      expect(glyph, `support at ${joint}`).toBeDefined();
      const ys = glyph.points.filter((_, i) => i % 2 === 1);
      expect(Math.min(...ys), `support under ${joint}`).toBeGreaterThanOrEqual(centre(scene, joint).y - 0.5);
    }
    c.loads.forEach((load, index) => {
      const arrow = scene.strokes.find((st) => st.id === `load-${index}`)!;
      const [x1, y1, x2, y2] = arrow.points as [number, number, number, number];
      const joint = centre(scene, load.at);
      expect(arrow.markerEnd).toBe(true);
      // A load arrow ends at its joint or starts there (when a member takes the other side); its value is at the far end.
      const tipAtJoint = Math.hypot(x2 - joint.x, y2 - joint.y) < 6;
      expect(tipAtJoint || Math.hypot(x1 - joint.x, y1 - joint.y) < 6, `load ${index} touches ${load.at}`).toBe(true);
      const dir = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] }[load.dir];
      const len = Math.hypot(x2 - x1, y2 - y1);
      expect((x2 - x1) / len).toBeCloseTo(dir[0]!, 5);
      expect((y2 - y1) / len).toBeCloseTo(dir[1]!, 5);
      const label = layout.placed.find((p) => p.label.id === `load-${index}-label`)!;
      expect(label.label.text).toBe(load.text);
      const mid = { x: (label.box.x1 + label.box.x2) / 2, y: (label.box.y1 + label.box.y2) / 2 };
      const [far, near] = tipAtJoint ? [[x1, y1], [x2, y2]] : [[x2, y2], [x1, y1]];
      expect(Math.hypot(mid.x - far[0]!, mid.y - far[1]!), `${load.text} at the far end of its arrow`).toBeLessThan(Math.hypot(mid.x - near[0]!, mid.y - near[1]!));
    });
    for (const name of names) {
      const label = layout.placed.find((p) => p.label.id === `joint-${name}-label`)!;
      expect(label?.label.text).toBe(name);
      const joint = centre(scene, name);
      const mid = { x: (label.box.x1 + label.box.x2) / 2, y: (label.box.y1 + label.box.y2) / 2 };
      expect(Math.hypot(mid.x - joint.x, mid.y - joint.y), `${name} beside its joint`).toBeLessThan(24);
    }
    if (c.span) expect(layout.placed.some((p) => p.label.text === c.span), c.span).toBe(true);
    const lines = scene.strokes.filter((st) => st.kind === 'line' && /^(member|load)-/.test(st.id));
    for (const p of layout.placed) {
      for (const line of lines) expect(crosses(p.box, line.points), `${p.label.text} clear of ${line.id}`).toBe(false);
    }
    for (let a = 0; a < layout.placed.length; a++) {
      for (let b = a + 1; b < layout.placed.length; b++) {
        expect(overlap(layout.placed[a]!.box, layout.placed[b]!.box), `${layout.placed[a]!.label.text} × ${layout.placed[b]!.label.text}`).toBe(false);
      }
    }
  });

  it.each([
    ['joints without coordinates (a grid would invent the geometry)', 'joints: A, B, C\nmembers: A-B, B-C, C-A'],
    ['a span that contradicts the coordinates', 'joints: A 0 0; B 4 0\nmembers: A-B\nL: 6'],
    ['two joints at one point', 'joints: A 0 0; B 0 0; C 2 3\nmembers: A-B, B-C, C-A'],
    ['a member to an undeclared joint', 'joints: A 0 0; B 4 0\nmembers: A-B, B-Z'],
    ['a load without a joint', 'joints: A 0 0; B 4 0\nmembers: A-B\nloads: 10kN down'],
  ])('refuses %s', async (_name, content) => {
    expect((await compileDiagramSpec({ type: 'truss', content }, 'step')).ok).toBe(false);
  });
});
