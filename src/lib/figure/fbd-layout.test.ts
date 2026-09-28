import { describe, expect, it } from 'vitest';
import { compileScene } from './engines/scene';
import { parseSpec } from './spec';
import { layoutScene, type LayoutResult } from './slk';
import { boxHitsAny, type Box } from './geom';
import type { Scene, SceneStroke } from './types';

// FIG-FBD-02: a force label sits at its own arrow tip, labels carry no per-force "(schematic)" suffix
// (one "arrows not to scale" note instead, D18), the body name sits inside the body, an incline is a
// wedge with its angle marked, and nothing is drawn outside the frame or on top of an arrow.

const ctx = { profile: 'step' as const, family: 'scene' };
type P = { x: number; y: number };

function compile(content: string): { scene: Scene; layout: LayoutResult } {
  const result = compileScene(parseSpec('scene', content), ctx);
  if (!result.ok) throw new Error(`${content}\n→ ${result.reason}`);
  const layout = layoutScene(result.scene);
  if (!layout.ok) throw new Error(layout.reason);
  return { scene: result.scene, layout };
}

const SPECS: Record<string, string> = {
  cratePull: 'kind: fbd\nbody: crate\nforce: F 50 N at 30 deg from horizontal on crate\nforce: W 98 N down on crate\nforce: N 73 N up on crate\nforce: f 20 N left on crate',
  incline: 'kind: fbd\nbody: block\nincline_deg: 30\nforce: W 49 N down on block\nforce: N 42.4 N normal+ on block\nforce: f 24.5 N up-incline on block',
  steep: 'kind: fbd\nbody: box\nincline_deg: 45\nforce: W 98 N down on box\nforce: N 69.3 N normal+ on box\nforce: f 69.3 N up-incline on box',
  hanging: 'kind: fbd\nbody: mass\nforce: T 19.6 N up on mass\nforce: W 19.6 N down on mass\nmember: rope ceiling mass',
  twoBodies: 'kind: fbd\nbody: A\nbody: B\nforce: F 30 N right on B\nforce: T 12 N left on B\nforce: T 12 N right on A\nmember: rope A B',
  mixedUnits: 'kind: fbd\nbody: car\nforce: F 2 kN right on car\nforce: W 9800 N down on car\nforce: N 9800 N up on car\nforce: drag 500 N left on car',
  namesOnly: 'kind: fbd\nbody: ball\nforce: W down on ball\nforce: F_drag up on ball',
  axes: 'kind: fbd\nbody: sled\nforce: T 40 N at 25 deg from horizontal on sled\nforce: W 150 N down on sled\nforce: N 133 N up on sled\naxes: xy',
};

const forces = (scene: Scene) => scene.strokes.filter((s) => /^force-/.test(s.id));
const tip = (s: SceneStroke): P => ({ x: s.points[2]!, y: s.points[3]! });
const boxDistance = (b: Box, p: P) => Math.hypot(Math.max(b.x1 - p.x, 0, p.x - b.x2), Math.max(b.y1 - p.y, 0, p.y - b.y2));

function segmentDistance(p: P, a: P, b: P): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

function insidePolygon(p: P, pts: number[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 2; i < pts.length; j = i, i += 2) {
    const [xi, yi, xj, yj] = [pts[i]!, pts[i + 1]!, pts[j]!, pts[j + 1]!];
    if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const bodyPolygon = (s: SceneStroke) => (s.kind === 'rect' ? [s.points[0]!, s.points[1]!, s.points[0]! + s.points[2]!, s.points[1]!, s.points[0]! + s.points[2]!, s.points[1]! + s.points[3]!, s.points[0]!, s.points[1]! + s.points[3]!] : s.points);

describe('FIG-FBD-02 free-body layout', () => {
  it.each(Object.entries(SPECS))('labels each force at its own arrow tip (%s)', (_name, content) => {
    const { scene, layout } = compile(content);
    for (const arrow of forces(scene)) {
      const label = layout.placed.find((p) => p.label.id === `force-label-${arrow.id.slice('force-'.length)}`)!;
      expect(label, arrow.id).toBeTruthy();
      const end = tip(arrow);
      const own = boxDistance(label.box, end);
      expect(own, `${arrow.id} label distance to its tip`).toBeLessThanOrEqual(16);
      const dir = { x: end.x - arrow.points[0]!, y: end.y - arrow.points[1]! };
      const len = Math.hypot(dir.x, dir.y);
      expect(((label.x - end.x) * dir.x + (label.y - end.y) * dir.y) / len, `${arrow.id} label not behind its tip`).toBeGreaterThanOrEqual(-2);
      for (const other of forces(scene).filter((s) => s !== arrow)) {
        expect(boxDistance(label.box, tip(other)), `${arrow.id} label nearer to ${other.id}`).toBeGreaterThan(own);
      }
    }
  });

  it.each([
    ['cratePull', 1], ['mixedUnits', 1], ['axes', 1], ['incline', 0], ['hanging', 0], ['namesOnly', 0],
  ] as const)('writes clean force labels and one scale note only when arrows are not to scale (%s)', (name, notes) => {
    const { scene } = compile(SPECS[name]!);
    const texts = scene.labels.map((l) => l.text ?? '');
    expect(texts.some((t) => t.includes('(schematic)'))).toBe(false);
    expect(texts.filter((t) => t === 'arrows not to scale')).toHaveLength(notes);
  });

  it.each(Object.entries(SPECS))('puts a short body name inside its body (%s)', (_name, content) => {
    const { scene, layout } = compile(content);
    for (const body of scene.strokes.filter((s) => /^body-/.test(s.id))) {
      const label = layout.placed.find((p) => p.label.id === `body-label-${body.id.slice('body-'.length)}`)!;
      expect(insidePolygon({ x: label.x, y: label.y }, bodyPolygon(body)), body.id).toBe(true);
    }
  });

  it.each([['incline', 30], ['steep', 45]] as const)('draws the incline as a wedge with its angle marked (%s)', (name, degrees) => {
    const { scene, layout } = compile(SPECS[name]!);
    const slope = scene.strokes.find((s) => s.id === 'incline')!.points;
    const low = slope[1]! > slope[3]! ? { x: slope[0]!, y: slope[1]! } : { x: slope[2]!, y: slope[3]! };
    const base = scene.strokes.find((s) => s.id === 'incline-base')!.points;
    expect(Math.abs(base[1]! - base[3]!)).toBeLessThan(0.01);
    expect(Math.min(Math.hypot(base[0]! - low.x, base[1]! - low.y), Math.hypot(base[2]! - low.x, base[3]! - low.y))).toBeLessThan(0.01);
    const arc = scene.strokes.find((s) => s.id === 'incline-angle')!;
    expect(arc.kind).toBe('arc');
    expect(Math.hypot(arc.points[0]! - low.x, arc.points[1]! - low.y)).toBeLessThan(0.01);
    expect(Math.abs(arc.points[5]! - arc.points[4]!)).toBeCloseTo(degrees, 5);
    const angleLabel = layout.placed.find((p) => p.label.text === `${degrees}°`)!;
    expect(angleLabel).toBeTruthy();
    expect(Math.hypot(angleLabel.x - low.x, angleLabel.y - low.y)).toBeLessThan(64);
    expect(boxHitsAny(angleLabel.box, layout.strokes, 1)).toBe(false);
  });

  it.each(Object.entries(SPECS))('keeps every stroke inside the frame (%s)', (_name, content) => {
    const { scene } = compile(content);
    for (const s of scene.strokes.filter((stroke) => stroke.kind === 'line' || stroke.kind === 'polyline' || stroke.kind === 'polygon')) {
      for (let i = 0; i + 1 < s.points.length; i += 2) {
        expect(s.points[i]!, s.id).toBeGreaterThanOrEqual(0);
        expect(s.points[i]!, s.id).toBeLessThanOrEqual(scene.width);
        expect(s.points[i + 1]!, s.id).toBeGreaterThanOrEqual(0);
        expect(s.points[i + 1]!, s.id).toBeLessThanOrEqual(scene.height);
      }
    }
  });

  it.each([['hanging'], ['twoBodies']] as const)('ends members at body outlines and never on top of an arrow (%s)', (name) => {
    const { scene } = compile(SPECS[name]!);
    const bodies = scene.strokes.filter((s) => /^body-/.test(s.id)).map(bodyPolygon);
    for (const member of scene.strokes.filter((s) => /^member-/.test(s.id) && s.kind === 'line')) {
      const a = { x: member.points[0]!, y: member.points[1]! };
      const b = { x: member.points[2]!, y: member.points[3]! };
      for (let t = 0.02; t < 1; t += 0.06) {
        const p = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
        expect(bodies.some((poly) => insidePolygon(p, poly)), `${member.id} passes through a body`).toBe(false);
      }
      for (const arrow of forces(scene)) {
        const s = { x: arrow.points[0]!, y: arrow.points[1]! };
        const e = tip(arrow);
        const samples = Array.from({ length: 11 }, (_, i) => ({ x: s.x + ((e.x - s.x) * i) / 10, y: s.y + ((e.y - s.y) * i) / 10 }));
        const onMember = samples.filter((p) => segmentDistance(p, a, b) < 2.5).length;
        expect(onMember, `${member.id} runs along ${arrow.id}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it('keeps the coordinate axes off every force arrow', () => {
    const { scene } = compile(SPECS.axes!);
    for (const axis of scene.strokes.filter((s) => /^axis-[xy]$/.test(s.id))) {
      const a = { x: axis.points[0]!, y: axis.points[1]! };
      const b = { x: axis.points[2]!, y: axis.points[3]! };
      for (const arrow of forces(scene)) {
        const samples = Array.from({ length: 21 }, (_, i) => ({ x: arrow.points[0]! + ((arrow.points[2]! - arrow.points[0]!) * i) / 20, y: arrow.points[1]! + ((arrow.points[3]! - arrow.points[1]!) * i) / 20 }));
        expect(Math.min(...samples.map((p) => segmentDistance(p, a, b))), `${axis.id} vs ${arrow.id}`).toBeGreaterThan(6);
      }
    }
  });
});
