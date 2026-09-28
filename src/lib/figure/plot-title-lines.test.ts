import { describe, expect, it } from 'vitest';
import { compilePlot } from './engines/plot';
import { parseSpec } from './spec';
import { layoutScene } from './slk';

const ctx = { profile: 'step' as const, family: 'plot' };

// Live Claude answers, 2026-09-28 (round 2 q07, q09): a wrapped axis title stacked its two lines exactly
// one line-height apart. The boxes touched, the label kernel read that as an overlap and moved the second
// line ("(kJ/mol)") into the plot, onto the curve.
const PROFILE = 'kind: function\ndomain: 0 8\nxlabel: Reaction coordinate\nylabel: Enthalpy (kJ/mol)\ndata: 0,0; 2,80; 4,20; 6,50; 8,-60';
const TORSION = 'kind: function\nfn: 9.767+2.267*cos(0.017453*d)-0.267*cos(0.034907*d)+7.233*cos(0.05236*d)\ndomain: 0 360\nvar: d\nxlabel: dihedral angle CH3–C2–C3–CH3 (degrees)\nylabel: relative energy (kJ/mol)';

describe('wrapped plot axis titles', () => {
  it.each([['y title', PROFILE, /^ylabel2?$/], ['x title', TORSION, /^xlabel2?$/]])('%s: every line stays where the plot put it', (_, raw, ids) => {
    const result = compilePlot(parseSpec('plot', raw), ctx);
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    if (!layout.ok) throw new Error(layout.reason);
    const lines = layout.placed.filter((p) => (ids as RegExp).test(p.label.id));
    expect(lines.length, 'the title wraps').toBe(2);
    for (const line of lines) {
      expect(Math.abs(line.x - line.label.x), line.label.id).toBeLessThan(0.01);
      expect(Math.abs(line.y - line.label.y), line.label.id).toBeLessThan(0.01);
    }
  });
});
