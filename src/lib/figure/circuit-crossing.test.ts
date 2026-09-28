import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { strokeSegments } from './slk';
import type { Scene } from './types';

// Live Claude answer, 2026-09-28 (q03): battery with internal resistance, R1 in series with R2 ∥ R3. The
// single-row layout started R2's lead inside R1's symbol (it read as a tap into R1) and put "R2 6" over R1.
const LIVE = 'std: iec\nV_bat: n1 0 DC 12\nR_int: n1 n2 0.5\nR_1: n2 n3 4\nR_2: n3 0 6\nR_3: n3 0 3\nprobe: V_t=n2\nhighlight: R_2';

function glyphBox(scene: Scene, id: string) {
  const own = scene.strokes.filter((s) => (s.id === id || s.id.startsWith(`${id}-`)) && !/-n[123]$/.test(s.id) && s.role !== 'connector');
  const segs = strokeSegments({ ...scene, strokes: own.map((s) => ({ ...s, protected: false })) });
  const xs = segs.flatMap((g) => [g.x1, g.x2]);
  const ys = segs.flatMap((g) => [g.y1, g.y2]);
  return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
}

describe('series-parallel circuits', () => {
  it('never runs a wire through another symbol', async () => {
    const result = await compileDiagramSpec({ type: 'circuit', content: LIVE });
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    for (const id of ['V_bat', 'R_int', 'R_1', 'R_2', 'R_3']) {
      const box = glyphBox(result.scene, id);
      const inner = { x1: box.x1 + 1.5, y1: box.y1 + 1.5, x2: box.x2 - 1.5, y2: box.y2 - 1.5 };
      const foreign = result.scene.strokes.filter((s) => s.role === 'connector' && s.id !== id && !s.id.startsWith(`${id}-`));
      for (const g of strokeSegments({ ...result.scene, strokes: foreign.map((s) => ({ ...s, protected: false })) })) {
        const inside = Math.max(g.x1, g.x2) > inner.x1 && Math.min(g.x1, g.x2) < inner.x2 && Math.max(g.y1, g.y2) > inner.y1 && Math.min(g.y1, g.y2) < inner.y2;
        expect(inside, `${id} is crossed`).toBe(false);
      }
    }
  });

  it('puts every designator nearest its own symbol', async () => {
    const result = await compileDiagramSpec({ type: 'circuit', content: LIVE });
    if (!result.ok) throw new Error(result.reason);
    const ids = ['V_bat', 'R_int', 'R_1', 'R_2', 'R_3'];
    const distance = (x: number, y: number, box: ReturnType<typeof glyphBox>) => Math.hypot(Math.max(box.x1 - x, 0, x - box.x2), Math.max(box.y1 - y, 0, y - box.y2));
    for (const id of ids) {
      const label = result.scene.labels.find((l) => l.id === id)!;
      const own = distance(label.x, label.y, glyphBox(result.scene, id));
      for (const other of ids.filter((o) => o !== id)) {
        expect(own, `${id} label nearer ${other}`).toBeLessThan(distance(label.x, label.y, glyphBox(result.scene, other)));
      }
    }
  });
});
