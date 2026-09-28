import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { lineCounts } from './leftovers/field-charges';
import type { Scene } from './types';

// Live Claude answer, 2026-09-28 (round 2 q06): +3 μC at x = 0 and −5 μC at x = 0.40 m, "draw the field
// lines". The only field form was a symmetric `dipole` sketch, so the model omitted the figure: it could not
// show unequal charges or the neutral point at x = −1.3746 m.
const LIVE = 'catalog: charges\ncharge: q1 +3 μC at 0,0\ncharge: q2 -5 μC at 0.40,0';

async function scene(content: string): Promise<Scene> {
  const result = await compileDiagramSpec({ type: 'field', content });
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

const centre = (s: Scene, id: string) => { const [x, y] = s.strokes.find((k) => k.id === id)!.points as [number, number]; return { x, y }; };
const lineIds = (s: Scene) => new Set(s.strokes.filter((k) => k.id.startsWith('field-line-')).map((k) => k.id.split('-')[2]));

/** The Coulomb field direction at p from the drawn charge marks (signs from the labels). */
function coulomb(s: Scene, p: { x: number; y: number }) {
  let ex = 0;
  let ey = 0;
  s.strokes.filter((k) => /^charge-\d+$/.test(k.id)).forEach((mark) => {
    const q = Number(/=\s*([+−-])(\d+(?:\.\d+)?)/.exec(s.labels.find((l) => l.id === `${mark.id}-label`)!.text!)!.slice(1).join('').replace('−', '-'));
    const [cx, cy] = mark.points as [number, number];
    const r = Math.hypot(p.x - cx, p.y - cy);
    ex += (q * (p.x - cx)) / r ** 3;
    ey += (q * (p.y - cy)) / r ** 3;
  });
  return { x: ex, y: ey };
}

describe('field lines of stated point charges', () => {
  it('traces every drawn segment along the Coulomb field of the stated charges', async () => {
    for (const content of [LIVE, 'charge: A +2 nC at 0,0\ncharge: B +2 nC at 1,0', 'charge: q +1 at 0,0\ncharge: p -1 at 2,1', 'charge: Q +4 at 0,0']) {
      const s = await scene(content);
      let checked = 0;
      for (const line of s.strokes.filter((k) => /^(field-line|separatrix)-/.test(k.id))) {
        for (let i = 0; i + 3 < line.points.length; i += 2) {
          const [x1, y1, x2, y2] = line.points.slice(i, i + 4) as [number, number, number, number];
          const len = Math.hypot(x2 - x1, y2 - y1);
          if (len < 2) continue;
          const e = coulomb(s, { x: (x1 + x2) / 2, y: (y1 + y2) / 2 });
          const cos = ((x2 - x1) * e.x + (y2 - y1) * e.y) / (len * Math.hypot(e.x, e.y));
          expect(cos, `${content.split('\n')[0]} ${line.id}`).toBeGreaterThan(0.97);
          checked++;
        }
      }
      expect(checked).toBeGreaterThan(10);
    }
  });

  it('draws lines in proportion to charge: 6 leave +3, 10 reach -5 (4 of them from outside)', async () => {
    expect(lineCounts([3, -5])).toEqual([6, 10]);
    expect(lineCounts([1, -1])).toEqual([8, 8]);
    const s = await scene(LIVE);
    expect(lineIds(s).size).toBe(10);
  });

  it('marks the neutral point where the stated charges put it', async () => {
    const s = await scene(LIVE);
    const q1 = centre(s, 'charge-0');
    const q2 = centre(s, 'charge-1');
    const zero = centre(s, 'null-0');
    // x0 = -d with (d + 0.40)/d = sqrt(5/3): -1.3746 m, i.e. -3.4365 charge separations from q1.
    expect((zero.x - q1.x) / (q2.x - q1.x)).toBeCloseTo(-3.4365, 2);
    expect(zero.y).toBeCloseTo(q1.y, 5);
    expect(s.labels.some((l) => l.id === 'null-0-label' && l.text === 'E = 0')).toBe(true);
    // Two separatrices come into the neutral point and two leave it.
    expect(new Set(s.strokes.filter((k) => k.id.startsWith('separatrix-')).map((k) => k.id.split('-')[1])).size).toBe(4);
    const twin = await scene('charge: A +2 nC at 0,0\ncharge: B +2 nC at 1,0');
    const mid = centre(twin, 'null-0');
    expect(mid.x).toBeCloseTo((centre(twin, 'charge-0').x + centre(twin, 'charge-1').x) / 2, 3);
  });

  it('labels each charge with its stated name and value, nearer that charge than any other', async () => {
    const s = await scene(LIVE);
    expect(s.labels.map((l) => l.text)).toEqual(expect.arrayContaining(['q1 = +3 μC', 'q2 = −5 μC']));
    for (const content of [LIVE, 'charge: a +1 at 0,0\ncharge: b -1 at 1,0\ncharge: c +1 at 1,1\ncharge: d -1 at 0,1']) {
      const t = await scene(content);
      const marks = t.strokes.filter((k) => /^charge-\d+$/.test(k.id));
      for (const mark of marks) {
        const label = t.labels.find((l) => l.id === `${mark.id}-label`)!;
        const d = (k: typeof mark) => Math.hypot(label.x - k.points[0]!, label.y - k.points[1]!);
        for (const other of marks) if (other !== mark) expect(d(mark), `${label.text} vs ${other.id}`).toBeLessThan(d(other));
      }
    }
  });

  it.each([
    ['magnitudes 20x apart', 'charge: a +20 at 0,0\ncharge: b -1 at 1,0'],
    ['two charges on one spot', 'charge: a +1 at 0,0\ncharge: b -1 at 0,0'],
    ['a record without a position', 'charge: a +1'],
    ['a zero charge', 'charge: a 0 at 0,0'],
    ['an unknown key', 'charge: a +1 at 0,0\nsurface: kind=closed'],
    ['a different catalog', 'catalog: solenoid\ncharge: a +1 at 0,0'],
    ['five charges', Array.from({ length: 5 }, (_, i) => `charge: c${i} +1 at ${i},0`).join('\n')],
  ])('refuses %s', async (_, content) => {
    const result = await compileDiagramSpec({ type: 'field', content });
    expect(result.ok).toBe(false);
  });
});
