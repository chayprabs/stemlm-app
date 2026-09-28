import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';
import { FONT_MIN, type Scene } from './types';

// FIG-HASH-01: a separate-chaining hash table draws every value inside its own entry box, a bucket's entries left to
// right in chain order on the bucket's row, and one arrow per link: bucket → head, then entry → next entry.
const CASES: Array<[string, string]> = [
  ['integer keys, m=7', 'm: 7\nbuckets: 0: 14, 21; 3: 10; 5: 19, 12, 5'],
  ['short chains, m=5', 'm: 5\nbuckets: 0: 10; 2: 7, 12; 3: 3'],
  ['string keys, m=10', 'm: 10\nbuckets: 1: apple, kiwi; 4: banana; 9: cherry, date, fig'],
  ['one bucket, long chain', 'm: 1\nbuckets: 0: 5, 8, 13, 21, 34'],
  ['Guide specimen', 'm: 4\nbuckets: 0: k0; 2: k1, k2'],
];

type Rect = { x: number; y: number; w: number; h: number };

function chains(content: string): { m: number; buckets: Map<number, string[]> } {
  const m = Number(/m:\s*(\d+)/.exec(content)![1]);
  const buckets = new Map<number, string[]>();
  for (const part of /buckets:\s*(.+)/.exec(content)![1]!.split(';')) {
    const [index, list] = part.split(':');
    buckets.set(Number(index), list!.split(',').map((value) => value.trim()));
  }
  return { m, buckets };
}

function rect(scene: Scene, id: string): Rect {
  const stroke = scene.strokes.find((s) => s.id === id && s.kind === 'rect');
  expect(stroke, `rect ${id}`).toBeDefined();
  const [x, y, w, h] = stroke!.points as [number, number, number, number];
  return { x, y, w, h };
}

function inside(box: { x1: number; y1: number; x2: number; y2: number }, r: Rect): boolean {
  return box.x1 >= r.x - 0.5 && box.x2 <= r.x + r.w + 0.5 && box.y1 >= r.y - 0.5 && box.y2 <= r.y + r.h + 0.5;
}

describe('hash table (separate chaining)', () => {
  it.each(CASES)('%s: values sit inside their own boxes in chain order, one arrow per link', async (_name, content) => {
    const result = await compileDiagramSpec({ type: 'hash', content }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.fontSize, 'labels keep the minimum font size').toBe(FONT_MIN);
    const placed = (id: string) => layout.placed.find((item) => item.label.id === id);
    const { m, buckets } = chains(content);

    const entryRects: Rect[] = [];
    for (let i = 0; i < m; i++) {
      const bucket = rect(result.scene, `bucket-${i}`);
      const index = placed(`bucket-label-${i}`);
      expect(index?.label.text).toBe(String(i));
      expect(inside(index!.box, bucket), `bucket ${i} index inside its box`).toBe(true);
      const values = buckets.get(i) ?? [];
      let previous = bucket;
      values.forEach((value, j) => {
        const entry = rect(result.scene, `entry-${i}-${j}`);
        entryRects.push(entry);
        const label = placed(`entry-label-${i}-${j}`);
        expect(label?.label.text).toBe(value);
        expect(inside(label!.box, entry), `${value} inside its own entry box`).toBe(true);
        expect(entry.x, `${value} right of its predecessor`).toBeGreaterThan(previous.x + previous.w);
        const rowMid = entry.y + entry.h / 2;
        expect(rowMid, `${value} on bucket ${i}'s row`).toBeGreaterThan(bucket.y);
        expect(rowMid).toBeLessThan(bucket.y + bucket.h);
        const arrow = result.scene.strokes.find((s) => s.id === `bucket-link-${i}-${j}`);
        expect(arrow?.markerEnd, `arrow into ${value}`).toBe(true);
        const [x1, y1, x2, y2] = arrow!.points as [number, number, number, number];
        expect(x1, `arrow into ${value} starts at its predecessor`).toBeCloseTo(previous.x + previous.w, 0);
        expect(x2, `arrow into ${value} ends at its box`).toBeCloseTo(entry.x, 0);
        expect(y1).toBeCloseTo(y2, 5);
        expect(y1).toBeGreaterThan(entry.y);
        expect(y1).toBeLessThan(entry.y + entry.h);
        previous = entry;
      });
    }
    const values = [...buckets.values()].flat().length;
    expect(result.scene.strokes.filter((s) => s.id.startsWith('bucket-link-'))).toHaveLength(values);

    for (const arrow of result.scene.strokes.filter((s) => s.id.startsWith('bucket-link-'))) {
      const [x1, y1, x2, y2] = arrow.points as [number, number, number, number];
      for (const r of entryRects) {
        const through = [0.1, 0.3, 0.5, 0.7, 0.9].some((t) => {
          const px = x1 + (x2 - x1) * t;
          const py = y1 + (y2 - y1) * t;
          return px > r.x + 1 && px < r.x + r.w - 1 && py > r.y + 1 && py < r.y + r.h - 1;
        });
        expect(through, `${arrow.id} passes through an entry box`).toBe(false);
      }
    }
    for (let a = 0; a < layout.placed.length; a++) {
      for (let b = a + 1; b < layout.placed.length; b++) {
        const p = layout.placed[a]!.box;
        const q = layout.placed[b]!.box;
        const overlap = p.x1 < q.x2 - 0.5 && q.x1 < p.x2 - 0.5 && p.y1 < q.y2 - 0.5 && q.y1 < p.y2 - 0.5;
        expect(overlap, `${layout.placed[a]!.label.text} × ${layout.placed[b]!.label.text}`).toBe(false);
      }
    }
  });

  it('refuses a chain too long to draw legibly instead of shrinking it', async () => {
    const chain = Array.from({ length: 14 }, (_, i) => `record${i}`).join(', ');
    const result = await compileDiagramSpec({ type: 'hash', content: `m: 3\nbuckets: 1: ${chain}` }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('refused');
  });
});
