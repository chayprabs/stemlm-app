import { describe, expect, it } from 'vitest';
import { compileScene } from './engines/scene';
import { parseSpec } from './spec';
import { layoutScene, type LayoutResult } from './slk';
import type { Scene, SceneStroke } from './types';

// FIG-GEOM-01: point coordinates use the math convention (larger y drawn higher, D19) with one
// uniform scale, an angle is labelled with its value and drawn between its two rays (a right angle
// as a square), dimension lines sit outside the shape, and vertex labels sit outside it too.

const ctx = { profile: 'step' as const, family: 'scene' };
type P = { x: number; y: number };

function compile(content: string): { scene: Scene; layout: LayoutResult } {
  const result = compileScene(parseSpec('scene', content), ctx);
  if (!result.ok) throw new Error(`${content}\n→ ${result.reason}`);
  const layout = layoutScene(result.scene);
  if (!layout.ok) throw new Error(layout.reason);
  return { scene: result.scene, layout };
}

const point = (scene: Scene, name: string): P => {
  const s = scene.strokes.find((stroke) => stroke.id === `point-${name.toLowerCase()}`)!;
  return { x: s.points[0]!, y: s.points[1]! };
};
const stroke = (scene: Scene, id: string): SceneStroke => scene.strokes.find((s) => s.id === id)!;
const angleOf = (from: P, to: P) => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
const angleDiff = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

function insidePolygon(p: P, poly: P[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if ((poly[i]!.y > p.y) !== (poly[j]!.y > p.y) && p.x < ((poly[j]!.x - poly[i]!.x) * (p.y - poly[i]!.y)) / (poly[j]!.y - poly[i]!.y) + poly[i]!.x) inside = !inside;
  }
  return inside;
}

const RIGHT = 'kind: geom\npoint: A 0 0\npoint: B 4 0\npoint: C 0 3\nsegment: AB A B\nsegment: BC B C\nsegment: CA C A\nangle: angA A 90 deg\nangle: ABC B 36.87 deg\ndimension: dAB A B 4 cm\ndimension: dCA C A 3 cm';
const ROTATED = 'kind: geom\npoint: A 0 0\npoint: B 3 1\npoint: C -1 3\nsegment: AB A B\nsegment: BC B C\nsegment: CA C A\nangle: BAC A 90 deg';
const ISOSCELES = 'kind: geom\npoint: P 0 0\npoint: Q 6 0\npoint: R 3 4\nsegment: PQ P Q\nsegment: QR Q R\nsegment: RP R P\nangle: PQR Q 53.13 deg\ndimension: dPQ P Q 6 m';
const EQUILATERAL = 'kind: geom\npoint: A 0 0\npoint: B 2 0\npoint: C 1 1.732\nsegment: AB A B\nsegment: BC B C\nsegment: CA C A\nangle: BAC A 60 deg';
const TALL = 'kind: geom\npoint: A 0 0\npoint: B 1 0\npoint: C 0 5\nsegment: AB A B\nsegment: BC B C\nsegment: CA C A';

describe('FIG-GEOM-01 geometry layout', () => {
  it('draws larger y higher and keeps one uniform scale', () => {
    for (const content of [RIGHT, ROTATED, ISOSCELES, EQUILATERAL, TALL]) {
      const { scene } = compile(content);
      const coords = [...content.matchAll(/point: (\w+) (-?[\d.]+) (-?[\d.]+)/g)].map((m) => ({ name: m[1]!, x: Number(m[2]), y: Number(m[3]) }));
      const [a, ...rest] = coords;
      for (const b of rest) {
        const pa = point(scene, a!.name);
        const pb = point(scene, b.name);
        if (b.y !== a!.y) expect(Math.sign(pa.y - pb.y), `${b.name} vs ${a!.name}`).toBe(Math.sign(b.y - a!.y));
        const sx = (pb.x - pa.x) / (b.x - a!.x || NaN);
        const sy = (pa.y - pb.y) / (b.y - a!.y || NaN);
        if (Number.isFinite(sx) && Number.isFinite(sy)) expect(sx / sy).toBeCloseTo(1, 3);
      }
      for (const p of coords.map((c) => point(scene, c.name))) {
        expect(p.x).toBeGreaterThanOrEqual(10);
        expect(p.x).toBeLessThanOrEqual(scene.width - 10);
        expect(p.y).toBeGreaterThanOrEqual(10);
        expect(p.y).toBeLessThanOrEqual(scene.height - 10);
      }
    }
  });

  it('keeps a right angle square after scaling a rotated triangle', () => {
    const { scene } = compile(ROTATED);
    const a = point(scene, 'A');
    const b = point(scene, 'B');
    const c = point(scene, 'C');
    const cos = ((b.x - a.x) * (c.x - a.x) + (b.y - a.y) * (c.y - a.y)) / (Math.hypot(b.x - a.x, b.y - a.y) * Math.hypot(c.x - a.x, c.y - a.y));
    expect(Math.abs(cos)).toBeLessThan(1e-6);
  });

  it('labels an angle with its value, not its id', () => {
    const { scene } = compile(RIGHT);
    const texts = scene.labels.map((l) => l.text);
    expect(texts).toContain('36.87°');
    expect(texts).not.toContain('ABC');
    expect(texts).not.toContain('angA');
  });

  it.each([['RIGHT', RIGHT, 'angle-anga', 'A', 'B', 'C'], ['ROTATED', ROTATED, 'angle-bac', 'A', 'B', 'C']])('marks a right angle with a square between its rays (%s)', (_name, content, id, vertex, p1, p2) => {
    const { scene } = compile(content);
    const marker = stroke(scene, id);
    expect(marker.kind).toBe('polyline');
    const v = point(scene, vertex);
    const r1 = angleOf(v, point(scene, p1));
    const r2 = angleOf(v, point(scene, p2));
    const [x1, y1, x2, y2, x3, y3] = marker.points as number[];
    expect(angleDiff(angleOf(v, { x: x1!, y: y1! }), r1) < 1 || angleDiff(angleOf(v, { x: x1!, y: y1! }), r2) < 1).toBe(true);
    expect(angleDiff(angleOf(v, { x: x2!, y: y2! }), (r1 + r2) / 2 + (Math.abs(r1 - r2) > 180 ? 180 : 0))).toBeLessThan(1);
    expect(angleDiff(angleOf(v, { x: x3!, y: y3! }), r1) < 1 || angleDiff(angleOf(v, { x: x3!, y: y3! }), r2) < 1).toBe(true);
    expect(scene.labels.some((l) => l.id === `${id}-label`)).toBe(false);
  });

  it.each([
    ['RIGHT', RIGHT, 'angle-abc', 'B', 'A', 'C', 36.87],
    ['ISOSCELES', ISOSCELES, 'angle-pqr', 'Q', 'P', 'R', 53.13],
    ['EQUILATERAL', EQUILATERAL, 'angle-bac', 'A', 'B', 'C', 60],
  ])('sweeps an angle arc from its first ray to its second (%s)', (_name, content, id, vertex, p1, p2, degrees) => {
    const { scene } = compile(content);
    const arc = stroke(scene, id);
    expect(arc.kind).toBe('arc');
    const v = point(scene, vertex);
    expect(angleDiff(arc.points[4]!, angleOf(v, point(scene, p1)))).toBeLessThan(0.5);
    expect(angleDiff(arc.points[5]!, angleOf(v, point(scene, p2)))).toBeLessThan(0.5);
    expect(Math.abs(arc.points[5]! - arc.points[4]!)).toBeCloseTo(degrees, 1);
  });

  it('uses the two segments at a vertex when the angle is not named by three points', () => {
    const { scene } = compile(RIGHT.replace('angle: ABC B 36.87 deg', 'angle: beta B 36.87 deg'));
    const arc = stroke(scene, 'angle-beta');
    const v = point(scene, 'B');
    const rays = [angleOf(v, point(scene, 'A')), angleOf(v, point(scene, 'C'))];
    expect(rays.some((ray) => angleDiff(arc.points[4]!, ray) < 0.5)).toBe(true);
    expect(rays.some((ray) => angleDiff(arc.points[5]!, ray) < 0.5)).toBe(true);
  });

  it('refuses an angle whose declared value contradicts its own points', () => {
    const result = compileScene(parseSpec('scene', RIGHT.replace('angle: ABC B 36.87 deg', 'angle: ABC B 60 deg')), ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/angle ABC/);
  });

  it.each([['RIGHT', RIGHT, ['dimension-dab', 'dimension-dca'], ['A', 'B', 'C']], ['ISOSCELES', ISOSCELES, ['dimension-dpq'], ['P', 'Q', 'R']]])('draws dimension lines outside the shape (%s)', (_name, content, ids, names) => {
    const { scene } = compile(content);
    const poly = names.map((n) => point(scene, n));
    for (const id of ids) {
      const line = stroke(scene, id).points;
      const mid = { x: (line[0]! + line[2]!) / 2, y: (line[1]! + line[3]!) / 2 };
      expect(insidePolygon(mid, poly), id).toBe(false);
      expect(scene.strokes.filter((s) => s.id.startsWith(`${id}-ext`))).toHaveLength(2);
    }
  });

  it.each([['RIGHT', RIGHT, ['A', 'B', 'C']], ['ISOSCELES', ISOSCELES, ['P', 'Q', 'R']], ['EQUILATERAL', EQUILATERAL, ['A', 'B', 'C']]])('puts vertex labels outside the shape (%s)', (_name, content, names) => {
    const { scene, layout } = compile(content);
    const poly = names.map((n) => point(scene, n));
    for (const name of names) {
      const label = layout.placed.find((p) => p.label.id === `point-${name.toLowerCase()}-label`)!;
      expect(insidePolygon({ x: label.x, y: label.y }, poly), name).toBe(false);
      expect(Math.hypot(label.x - point(scene, name).x, label.y - point(scene, name).y), name).toBeLessThan(24);
    }
  });
});
