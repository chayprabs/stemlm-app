import { describe, expect, it } from 'vitest';
import { compilePlot } from './engines/plot';
import { parseSpec } from './spec';
import { layoutScene } from './slk';
import { boxHitsAny, type Box } from './geom';
import type { Scene } from './types';

// FIG-PLOT-LABEL-02: a marked point's label sits beside the point on the side away from its curve,
// never on the line it labels, in the step frame and in the print (PDF) frame alike.

type Segment = { x1: number; y1: number; x2: number; y2: number };

/** The plotted series and the point markers, as segments (circles as their bounding diagonals). */
function curveSegments(scene: Scene): Segment[] {
  return scene.strokes
    .filter((s) => /^(fn|data|marker-point)/.test(s.id) && s.points.length >= 3)
    .flatMap((s) => {
      if (s.kind === 'circle') {
        const [cx, cy, r] = s.points as [number, number, number];
        return [{ x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r }, { x1: cx - r, y1: cy + r, x2: cx + r, y2: cy - r }];
      }
      const out: Segment[] = [];
      for (let i = 0; i + 3 < s.points.length; i += 2) out.push({ x1: s.points[i]!, y1: s.points[i + 1]!, x2: s.points[i + 2]!, y2: s.points[i + 3]! });
      return out;
    });
}

function gapToPoint(box: Box, x: number, y: number): number {
  const dx = Math.max(box.x1 - x, 0, x - box.x2);
  const dy = Math.max(box.y1 - y, 0, y - box.y2);
  return Math.hypot(dx, dy);
}

const CURVES: Record<string, string> = {
  rising: 'fn: 4.905*t\nvar: t\ndomain: 0 4\nxlabel: t (s)\nylabel: v (m/s)\npoint: 2, 9.81\npoint_label: (2 s, 9.81 m/s)',
  falling: 'fn: 20 - 4.905*t\nvar: t\ndomain: 0 4\nxlabel: t (s)\nylabel: v (m/s)\npoint: 2, 10.19\npoint_label: (2 s, 10.19 m/s)',
  flat: 'fn: 5 + 0*x\ndomain: 0 10\nxlabel: x\nylabel: y\npoint: 5, 5\npoint_label: (5, 5)',
  steep: 'fn: x^3\ndomain: 0 3\nxlabel: x\nylabel: y\npoint: 2, 8\npoint_label: (2, 8)',
  peak: 'fn: sin(x)\ndomain: 0 6.283\nxlabel: x (rad)\nylabel: y\npoint: 1.571, 1\npoint_label: maximum',
  trough: 'fn: sin(x)\ndomain: 0 6.283\nxlabel: x (rad)\nylabel: y\npoint: 4.712, -1\npoint_label: minimum',
  decay: 'fn: 100*exp(-x/2)\ndomain: 0 8\nxlabel: t (s)\nylabel: N\npoint: 2, 36.79\npoint_label: (2 s, 36.8)',
};

describe('plot point labels (FIG-PLOT-LABEL-02)', () => {
  for (const profile of ['step', 'print'] as const) {
    for (const [name, content] of Object.entries(CURVES)) {
      it(`${name} (${profile}): the label sits beside its point, off the curve`, () => {
        const result = compilePlot(parseSpec('plot', content), { profile, family: 'plot' });
        expect(result.ok, result.ok ? '' : result.reason).toBe(true);
        if (!result.ok) return;
        const layout = layoutScene(result.scene);
        expect(layout.ok, layout.ok ? '' : layout.reason).toBe(true);
        if (!layout.ok) return;
        const placed = layout.placed.find((p) => p.label.id === 'pointl0');
        expect(placed, 'point label placed').toBeTruthy();
        const marker = result.scene.strokes.find((s) => s.id === 'marker-point0')!;
        const [px, py] = marker.points as [number, number];
        expect(boxHitsAny(placed!.box, curveSegments(result.scene), 1), `${name} label on its curve`).toBe(false);
        // Beside: within about two label heights (a peak at the frame top pushes its label sideways).
        expect(gapToPoint(placed!.box, px, py), `${name} label strays from its point`).toBeLessThanOrEqual(40);
      });
    }
  }
});
