import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { resolveDiagram } from '../resolve-diagram';
import { layoutScene } from './slk';
import { FONT_MIN } from './types';

// Shear-force / bending-moment diagrams as textbooks draw them: the beam with its loads above two aligned ordinate
// panels; each key ordinate (a plateau, both sides of a jump, an extremum, a nonzero end, the moment at a load point)
// is written once, on its own side of its own baseline; load values read as quantities, never as spec syntax.
interface Case {
  spec: string;
  loads: string[];
  V: string[];
  M: string[];
  spans: number[];
}

const CASES: Record<string, Case> = {
  'Guide specimen (one point load)': {
    spec: 'L: 6\nsupports: pin@0, roller@6\nloads: point 12kN down@2\nV: 0 8; 2 8; 2 -4; 6 -4\nM: 0 0; 2 16; 6 0\nsign: sagging+',
    loads: ['12 kN'], V: ['8', '-4'], M: ['16'], spans: [2, 4],
  },
  'uniform load (sampled)': {
    spec: 'L: 6\nsupports: pin@0, roller@6\nV: 0 12; 6 -12\nM: 0 0; 1.5 13.5; 3 18; 4.5 13.5; 6 0\nsign: sagging+',
    loads: [], V: ['12', '-12'], M: ['18'], spans: [6],
  },
  'two point loads': {
    spec: 'L: 8\nsupports: pin@0, roller@8\nloads: point 10kN down@2, point 20kN down@6\nV: 0 12.5; 2 12.5; 2 2.5; 6 2.5; 6 -17.5; 8 -17.5\nM: 0 0; 2 25; 6 35; 8 0',
    loads: ['10 kN', '20 kN'], V: ['12.5', '2.5', '-17.5'], M: ['25', '35'], spans: [2, 4, 2],
  },
  'overhang (hogging moment)': {
    spec: 'L: 8\nsupports: pin@0, roller@6\nloads: point 6kN down@8\nV: 0 -2; 6 -2; 6 6; 8 6\nM: 0 0; 6 -12; 8 0',
    loads: ['6 kN'], V: ['-2', '6'], M: ['-12'], spans: [6, 2],
  },
  'symbolic load': {
    spec: 'L: 4\nsupports: pin@0, roller@4\nloads: P@1\nV: 0 3; 1 3; 1 -1; 4 -1\nM: 0 0; 1 3; 4 0',
    loads: ['P'], V: ['3', '-1'], M: ['3'], spans: [1, 3],
  },
};

type Box = { x1: number; y1: number; x2: number; y2: number };
const overlap = (p: Box, q: Box) => p.x1 < q.x2 - 0.5 && q.x1 < p.x2 - 0.5 && p.y1 < q.y2 - 0.5 && q.y1 < p.y2 - 0.5;

describe('shear-force and bending-moment diagram', () => {
  it.each(Object.entries(CASES))('%s: key ordinates on their own side of their own baseline, loads as quantities', async (_name, c) => {
    expect(await resolveDiagram({ type: 'sfd', content: c.spec }, 'light', 'step'), 'admitted').toMatchObject({ ok: true });
    const result = await compileDiagramSpec({ type: 'sfd', content: c.spec }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.fontSize, 'labels keep the minimum font size').toBe(FONT_MIN);
    const { scene } = result;
    const line = (id: string) => scene.strokes.find((s) => s.id === id)!.points;
    const panel = (id: string) => scene.panels!.find((p) => p.id === id)!.bbox;
    const beam = panel('beam');
    const vPanel = panel('V-panel');
    const mPanel = panel('M-panel');
    expect(beam.y + beam.h, 'beam panel above V').toBeLessThanOrEqual(vPanel.y);
    expect(vPanel.y + vPanel.h, 'V panel above M').toBeLessThanOrEqual(mPanel.y);

    for (const [name, box, expected] of [['V', vPanel, c.V], ['M', mPanel, c.M]] as const) {
      const baseline = line(`${name}-x`)[1]!;
      const values = layout.placed.filter((p) => p.label.id.startsWith(`${name}-o`));
      expect(values.map((p) => p.label.text).sort(), `${name} ordinates written`).toEqual([...expected].sort());
      for (const value of values) {
        const b = value.box;
        expect(b.y1 >= box.y && b.y2 <= box.y + box.h, `${name} ${value.label.text} inside the ${name} panel`).toBe(true);
        if (Number(value.label.text) > 0) expect(b.y2, `${name} ${value.label.text} above the baseline`).toBeLessThanOrEqual(baseline);
        else expect(b.y1, `${name} ${value.label.text} below the baseline`).toBeGreaterThanOrEqual(baseline);
      }
    }

    const beamY = line('beam')[1]!;
    const loadLabels = layout.placed.filter((p) => /^load-\d+-label$/.test(p.label.id));
    expect(loadLabels.map((p) => p.label.text)).toEqual(c.loads);
    loadLabels.forEach((label, index) => {
      const arrowX = line(`load-${index}`)[0]!;
      expect(label.box.y2, `${label.label.text} above the beam`).toBeLessThan(beamY);
      expect(Math.abs((label.box.x1 + label.box.x2) / 2 - arrowX), `${label.label.text} over its arrow`).toBeLessThanOrEqual(8);
    });

    const spans = layout.placed.filter((p) => p.label.id.startsWith('span-')).map((p) => Number(p.label.text));
    expect(spans, 'span dimensions between stations').toEqual(c.spans);

    for (const p of layout.placed) {
      expect(p.label.text ?? '', 'no spec syntax or spec words in labels').not.toMatch(/@|\bpoint\b|\bdown\b|^pin$|^roller$|sagging/);
    }
    for (let a = 0; a < layout.placed.length; a++) {
      for (let b = a + 1; b < layout.placed.length; b++) {
        expect(overlap(layout.placed[a]!.box, layout.placed[b]!.box), `${layout.placed[a]!.label.text} × ${layout.placed[b]!.label.text}`).toBe(false);
      }
    }
  });
});
