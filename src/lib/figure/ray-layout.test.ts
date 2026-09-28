import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { boxHitsAny, boxesOverlap, measureText } from './geom';
import { strokeSegments } from './slk';
import type { Scene } from './types';

/** Thin-lens cases a physics course draws: real/inverted, at 2F, magnifier, far object, near F, at F. */
const CASES: Record<string, [f: number, d: number, h: number]> = {
  'real, inverted': [10, 25, 4],
  'object at 2F': [10, 20, 3],
  'magnifier (virtual)': [10, 6, 2],
  'distant object': [5, 40, 3],
  'just outside F': [10, 12, 2],
  'object at F': [10, 10, 3],
  'units of centimetres': [12, 18, 3],
};

async function ray(f: number, d: number, h: number): Promise<Scene> {
  const result = await compileDiagramSpec({ type: 'scene', content: `kind: ray\nf: ${f}\ndo: ${d}\nho: ${h}` }, 'step');
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

describe('thin-lens ray diagram layout', () => {
  it.each(Object.entries(CASES))('%s: the lens is a converging-lens symbol (outward arrowheads)', async (_name, [f, d, h]) => {
    const scene = await ray(f, d, h);
    const lens = scene.strokes.find((stroke) => stroke.id === 'lens')!;
    expect(lens.markerStart && lens.markerEnd).toBe(true);
    expect(lens.points[0]).toBe(lens.points[2]);
  });

  it.each(Object.entries(CASES))('%s: F, object and image labels stay clear of every ray and of each other', async (_name, [f, d, h]) => {
    const scene = await ray(f, d, h);
    const segments = strokeSegments(scene);
    const boxes = scene.labels.map((label) => {
      const size = measureText(label.text ?? '', 12);
      return { id: label.id, box: { x1: label.x - size.w / 2, y1: label.y - size.h / 2, x2: label.x + size.w / 2, y2: label.y + size.h / 2 } };
    });
    for (const [i, a] of boxes.entries()) {
      expect(boxHitsAny(a.box, segments, 1), `${a.id} clear of the rays`).toBe(false);
      for (const c of boxes.slice(i + 1)) expect(boxesOverlap(a.box, c.box, 1), `${a.id} vs ${c.id}`).toBe(false);
    }
  });

  it.each(Object.entries(CASES))('%s: each label names the thing under it', async (_name, [f, d, h]) => {
    const scene = await ray(f, d, h);
    const stroke = (id: string) => scene.strokes.find((s) => s.id === id);
    const label = (id: string) => scene.labels.find((l) => l.id === id);
    for (const side of ['left', 'right']) {
      const focus = stroke(`focus-${side}`)!;
      // The focus dot is rounded to the emitter's tenth-unit text coordinates.
      expect(label(`F-${side}`)!.x, `F-${side} over its focal point`).toBeCloseTo(focus.points[0]!, 1);
      expect(Math.abs(label(`F-${side}`)!.y - focus.points[1]!), `F-${side} next to the axis`).toBeLessThan(30);
    }
    for (const id of ['object', 'image']) {
      const arrow = stroke(id);
      if (!arrow) continue;
      const text = label(`${id}-label`)!;
      expect(Math.abs(text.x - arrow.points[0]!), `${id} label over its arrow`).toBeLessThan(12);
      const [top, bottom] = [Math.min(arrow.points[1]!, arrow.points[3]!), Math.max(arrow.points[1]!, arrow.points[3]!)];
      expect(text.y > top - 32 && text.y < bottom + 32, `${id} label beside its arrow`).toBe(true);
    }
  });
});
