import { describe, expect, it } from 'vitest';
import { compileScene } from './engines/scene';
import { parseSpec } from './spec';
import { layoutScene, type LayoutResult } from './slk';
import { boxesOverlap, distPointSeg } from './geom';
import type { Scene } from './types';

// FIG-THERMO-01: a P–V (or any state) diagram is a real graph — scaled axes from the origin with
// nice ticks, titles outside the plot, state ids as written, process labels outside the loop beside
// their own path, arrows that stop short of the state dots — and a declared cycle sense must match
// the drawn order.

const ctx = { profile: 'step' as const, family: 'scene' };
type P = { x: number; y: number };

function compile(content: string): { scene: Scene; layout: LayoutResult } {
  const result = compileScene(parseSpec('scene', content), ctx);
  if (!result.ok) throw new Error(`${content}\n→ ${result.reason}`);
  const layout = layoutScene(result.scene);
  if (!layout.ok) throw new Error(layout.reason);
  return { scene: result.scene, layout };
}

const CARNOT_ISH = 'kind: thermodynamic\naxis: x V (L)\naxis: y P (kPa)\nstate: A 1 300\nstate: B 3 300\nstate: C 3 100\nstate: D 1 100\npath: A B isobaric\npath: B C isochoric\npath: C D isobaric\npath: D A isochoric\ncycle: clockwise';
const TRIANGLE = 'kind: thermodynamic-graph\naxis: x Volume (m^3)\naxis: y Pressure (Pa)\nstate: 1 0.01 200000\nstate: 2 0.03 200000\nstate: 3 0.01 50000\npath: 1 2 isobaric expansion\npath: 2 3 cooling\npath: 3 1 isochoric heating\ncycle: clockwise';
const OPEN = 'kind: thermodynamic\naxis: x V (L)\naxis: y P (atm)\nstate: i 2 4\nstate: f 8 1\npath: i f isothermal';

const state = (scene: Scene, id: string): P => {
  const s = scene.strokes.find((stroke) => stroke.id === `state-${id}`)!;
  return { x: s.points[0]!, y: s.points[1]! };
};
const line = (scene: Scene, id: string) => scene.strokes.find((s) => s.id === id)!.points;

function insidePolygon(p: P, poly: P[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if ((poly[i]!.y > p.y) !== (poly[j]!.y > p.y) && p.x < ((poly[j]!.x - poly[i]!.x) * (p.y - poly[i]!.y)) / (poly[j]!.y - poly[i]!.y) + poly[i]!.x) inside = !inside;
  }
  return inside;
}

describe('FIG-THERMO-01 thermodynamic state diagrams', () => {
  it('keeps state ids exactly as written', () => {
    const { scene } = compile(CARNOT_ISH);
    const texts = scene.labels.map((l) => l.text);
    for (const id of ['A', 'B', 'C', 'D']) expect(texts).toContain(id);
    expect(texts).not.toContain('a');
  });

  it.each([['CARNOT_ISH', CARNOT_ISH], ['TRIANGLE', TRIANGLE], ['OPEN', OPEN]])('draws scaled axes from the origin with nice ticks that cover every state (%s)', (_name, content) => {
    const { scene } = compile(content);
    for (const axis of ['x', 'y'] as const) {
      const ticks = scene.labels.filter((l) => l.id.startsWith(`axis-${axis}-tick-`));
      expect(ticks.length, `${axis} ticks`).toBeGreaterThanOrEqual(3);
      const values = ticks.map((t) => Number((t.text ?? '').replace(/×10\^(-?\d+)$/, 'e$1').replace(/^10\^(-?\d+)$/, '1e$1')));
      // One "0" labels the origin for both axes.
      if (axis === 'x' && scene.labels.some((l) => l.id.startsWith('axis-y-tick-') && l.text === '0')) values.push(0);
      expect(values.every(Number.isFinite), `${axis} tick values ${ticks.map((t) => t.text)}`).toBe(true);
      expect(Math.min(...values)).toBe(0);
      const declared = [...content.matchAll(/state: \S+ ([\d.]+) ([\d.]+)/g)].map((m) => Number(m[axis === 'x' ? 1 : 2]));
      expect(Math.max(...values)).toBeGreaterThanOrEqual(Math.max(...declared));
    }
  });

  it.each([['CARNOT_ISH', CARNOT_ISH], ['TRIANGLE', TRIANGLE], ['OPEN', OPEN]])('puts the axis titles outside the plot (%s)', (_name, content) => {
    const { scene, layout } = compile(content);
    const xAxis = line(scene, 'axis-x');
    const yAxis = line(scene, 'axis-y');
    const xTitle = layout.placed.find((p) => p.label.id === 'axis-x-label')!;
    const yTitle = layout.placed.find((p) => p.label.id === 'axis-y-label')!;
    expect(xTitle.box.y1).toBeGreaterThan(xAxis[1]!);
    expect(yTitle.box.x2).toBeLessThan(yAxis[0]!);
  });

  it('does not stretch a cycle to fill the frame', () => {
    const { scene } = compile(CARNOT_ISH);
    const xAxis = line(scene, 'axis-x');
    const origin = { x: line(scene, 'axis-y')[0]!, y: xAxis[1]! };
    // V spans 1..3 on an axis from 0: the loop starts well right of the y-axis.
    expect(state(scene, 'a').x - origin.x).toBeGreaterThan(20);
    // P spans 100..300 on an axis from 0: the loop's floor sits well above the x-axis.
    expect(origin.y - state(scene, 'd').y).toBeGreaterThan(15);
  });

  it.each([['CARNOT_ISH', CARNOT_ISH, ['a', 'b', 'c', 'd'], true], ['TRIANGLE', TRIANGLE, ['1', '2', '3'], false]] as const)('labels each process beside its own path, outside the loop when there is room (%s)', (_name, content, ids, roomy) => {
    const { scene, layout } = compile(content);
    const loop = ids.map((id) => state(scene, id));
    const labels = layout.placed.filter((p) => /^path-.*-label$/.test(p.label.id));
    expect(labels.length).toBeGreaterThan(0);
    for (const label of labels) {
      if (roomy) expect(insidePolygon({ x: label.x, y: label.y }, loop), label.label.id).toBe(false);
      const gapTo = (id: string) => {
        const p = line(scene, id);
        const seg = { x1: p[0]!, y1: p[1]!, x2: p[2]!, y2: p[3]! };
        const corners = [[label.box.x1, label.box.y1], [label.box.x2, label.box.y1], [label.box.x1, label.box.y2], [label.box.x2, label.box.y2]];
        const ends = [[seg.x1, seg.y1], [seg.x2, seg.y2]].map(([x, y]) => Math.hypot(Math.max(label.box.x1 - x!, 0, x! - label.box.x2), Math.max(label.box.y1 - y!, 0, y! - label.box.y2)));
        return Math.min(...corners.map(([x, y]) => distPointSeg(x!, y!, seg)), ...ends);
      };
      const ownId = label.label.id.replace(/-label$/, '');
      const own = gapTo(ownId);
      expect(own, label.label.id).toBeLessThan(14);
      for (const other of scene.strokes.filter((s) => /^path-/.test(s.id) && s.id !== ownId)) expect(gapTo(other.id), `${label.label.id} nearer to ${other.id}`).toBeGreaterThan(own);
    }
    for (const [i, a] of layout.placed.entries()) for (const b of layout.placed.slice(i + 1)) expect(boxesOverlap(a.box, b.box, 0.5), `${a.label.id} vs ${b.label.id}`).toBe(false);
  });

  it('stops every process arrow short of the state dots', () => {
    const { scene } = compile(CARNOT_ISH);
    for (const path of scene.strokes.filter((s) => /^path-[a-z0-9]+-[a-z0-9]+$/.test(s.id))) {
      const [, from, to] = /^path-([a-z0-9]+)-([a-z0-9]+)$/.exec(path.id)!;
      expect(Math.hypot(path.points[0]! - state(scene, from!).x, path.points[1]! - state(scene, from!).y)).toBeGreaterThanOrEqual(4.5);
      expect(Math.hypot(path.points[2]! - state(scene, to!).x, path.points[3]! - state(scene, to!).y)).toBeGreaterThanOrEqual(4.5);
      expect(path.markerEnd).toBe(true);
    }
  });

  it('refuses a cycle whose declared sense contradicts its drawn order', () => {
    const result = compileScene(parseSpec('scene', CARNOT_ISH.replace('cycle: clockwise', 'cycle: counterclockwise')), ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/clockwise/);
  });
});
