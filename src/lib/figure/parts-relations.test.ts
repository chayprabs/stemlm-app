import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { distPointSeg, measureText, type Segment } from './geom';
import type { Scene } from './types';

/** Part/relation scenes as models write them: apparatus trains, cycles, regulation networks, structures. */
const SCENES: Record<string, string[]> = {
  distillation: ['kind: apparatus', 'part: burner heat source', 'part: flask round-bottom flask', 'part: condenser cooling', 'part: receiver collection flask', 'relation: burner heats flask', 'relation: flask feeds condenser', 'relation: condenser feeds receiver'],
  'rankine cycle': ['kind: cycle', 'part: pump', 'part: boiler vessel', 'part: turbine', 'part: condenser vessel', 'relation: pump feeds boiler', 'relation: boiler feeds turbine', 'relation: turbine feeds condenser', 'relation: condenser feeds pump'],
  regulation: ['kind: network', 'part: hormone', 'part: receptor', 'part: gene', 'part: protein', 'relation: hormone activates receptor', 'relation: receptor activates gene', 'relation: gene promotes protein', 'relation: protein inhibits receptor'],
  lever: ['kind: structure', 'part: beam member', 'part: pivot support', 'part: weight load', 'part: wall support', 'relation: weight loads beam', 'relation: pivot supports beam', 'relation: beam connects wall'],
  'physical scene': ['kind: apparatus', 'part: source magnetic-source', 'part: receiver conducting-loop', 'part: channel variable-width-channel', 'part: anchor fixed-support', 'part: member elastic-member deformed', 'part: load suspended-load', 'part: zone transfer-region', 'relation: source moves-toward receiver', 'relation: channel flows-to load', 'relation: anchor supports member', 'relation: load loads member'],
  'titration setup': ['kind: apparatus', 'part: burette', 'part: flask conical flask', 'part: stirrer', 'relation: burette delivers flask', 'relation: stirrer mixes flask'],
};

async function scene(lines: string[]): Promise<Scene> {
  const result = await compileDiagramSpec({ type: 'scene', content: lines.join('\n') }, 'step');
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

function segments(points: number[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i + 3 < points.length; i += 2) out.push({ x1: points[i]!, y1: points[i + 1]!, x2: points[i + 2]!, y2: points[i + 3]! });
  return out;
}

/** Length along which two segments run on top of each other (0 unless collinear and overlapping). */
function sharedLength(a: Segment, b: Segment): number {
  const on = (x: number, y: number, s: Segment) => distPointSeg(x, y, s) < 1;
  if (!(on(b.x1, b.y1, { ...a, x2: a.x1 + (a.x2 - a.x1) * 1e3, y2: a.y1 + (a.y2 - a.y1) * 1e3, x1: a.x1 - (a.x2 - a.x1) * 1e3, y1: a.y1 - (a.y2 - a.y1) * 1e3 }) &&
    on(b.x2, b.y2, { ...a, x2: a.x1 + (a.x2 - a.x1) * 1e3, y2: a.y1 + (a.y2 - a.y1) * 1e3, x1: a.x1 - (a.x2 - a.x1) * 1e3, y1: a.y1 - (a.y2 - a.y1) * 1e3 }))) return 0;
  const horizontal = Math.abs(a.x2 - a.x1) >= Math.abs(a.y2 - a.y1);
  const range = (s: Segment) => (horizontal ? [Math.min(s.x1, s.x2), Math.max(s.x1, s.x2)] : [Math.min(s.y1, s.y2), Math.max(s.y1, s.y2)]) as [number, number];
  const [a1, a2] = range(a);
  const [b1, b2] = range(b);
  return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
}

describe('part/relation scenes draw every relation unambiguously', () => {
  it.each(Object.entries(SCENES))('%s: no relation passes through a part it does not join', async (_name, lines) => {
    const drawn = await scene(lines);
    const parts = drawn.nodes.filter((node) => node.id.startsWith('part-'));
    const name = (id: string) => id.replace(/^part-/, '');
    for (const stroke of drawn.strokes.filter((s) => s.id.startsWith('relation-') && !s.id.endsWith('-label') && s.points.length >= 4)) {
      const route = segments(stroke.points);
      const ends = [{ x: stroke.points[0]!, y: stroke.points[1]! }, { x: stroke.points.at(-2)!, y: stroke.points.at(-1)! }];
      const joined = parts.filter((part) => ends.some((end) => end.x >= part.bbox.x - 1 && end.x <= part.bbox.x + part.bbox.w + 1 && end.y >= part.bbox.y - 1 && end.y <= part.bbox.y + part.bbox.h + 1));
      for (const part of parts.filter((p) => !joined.includes(p))) {
        const { x, y, w, h } = part.bbox;
        const inside = route.some((seg) => [0.1, 0.3, 0.5, 0.7, 0.9].some((t) => {
          const px = seg.x1 + (seg.x2 - seg.x1) * t;
          const py = seg.y1 + (seg.y2 - seg.y1) * t;
          return px > x + 1 && px < x + w - 1 && py > y + 1 && py < y + h - 1;
        }));
        expect(inside, `${stroke.id} crosses ${name(part.id)}`).toBe(false);
      }
    }
  });

  it.each(Object.entries(SCENES))('%s: no two relations run along the same line', async (_name, lines) => {
    const drawn = await scene(lines);
    const routes = drawn.strokes.filter((s) => s.id.startsWith('relation-') && s.kind === 'polyline' && s.points.length >= 4);
    for (const [i, a] of routes.entries()) {
      for (const b of routes.slice(i + 1)) {
        const shared = segments(a.points).reduce((sum, sa) => sum + segments(b.points).reduce((inner, sb) => inner + sharedLength(sa, sb), 0), 0);
        expect(shared, `${a.id} and ${b.id} overlap`).toBeLessThan(3);
      }
    }
  });

  it.each([
    ['distillation', 'heats'],
    ['lever', 'supports'],
    ['lever', 'loads'],
    ['titration setup', 'delivers'],
    ['titration setup', 'mixes'],
  ])('%s: the relation kind "%s" is written on its line (an arrow alone does not say it)', async (name, kind) => {
    const drawn = await scene(SCENES[name]!);
    const line = drawn.strokes.find((s) => s.id.startsWith(`relation-${kind}`) && !s.id.endsWith('-label'))!;
    expect(line, `relation-${kind} drawn`).toBeDefined();
    const label = drawn.labels.find((l) => l.text === kind);
    expect(label, `"${kind}" written`).toBeDefined();
    const size = measureText(kind, 12);
    const gap = Math.min(...segments(line.points).map((seg) => distPointSeg(label!.x, label!.y, seg)));
    expect(gap, `"${kind}" beside its own line`).toBeLessThan(size.h / 2 + 10);
  });
});
