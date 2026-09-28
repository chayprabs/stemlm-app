import { describe, expect, it } from 'vitest';
import { compilePlot } from './engines/plot';
import { parseSpec } from './spec';
import { layoutScene } from './slk';

const ctx = { profile: 'step' as const, family: 'plot' };

// Live Claude answers, 2026-09-28 (round 2 q07, q09): energy profiles whose landmarks each carry a
// point_label. Five or seven labels do not fit beside their points in the step frame, and the whole
// correct figure was hidden ("no collision-free slot for label pointl4 / pointl6").
const PROFILE = [
  'kind: function', 'domain: 0 8', 'xlabel: Reaction coordinate', 'ylabel: Enthalpy (kJ/mol)',
  'data: 0,0; 0.5,11.7; 1,40; 1.5,68.3; 2,80; 2.5,71.2; 3,50; 3.5,28.8; 4,20; 4.5,24.4; 5,35; 5.5,45.6; 6,50; 6.5,33.9; 7,-5; 7.5,-43.9; 8,-60',
  'point: 0,0', 'point: 2,80', 'point: 4,20', 'point: 6,50', 'point: 8,-60',
  'point_label: A + B: 0 kJ/mol (reference)', 'point_label: TS1 (+80): Ea1 = 80 kJ/mol from A + B',
  'point_label: Intermediate I (+20): ΔH1 = +20 kJ/mol', 'point_label: TS2 (+50): Ea2 = 30 kJ/mol from I',
  'point_label: C (−60): overall ΔH = −60 kJ/mol', 'guide: horizontal=0', 'guide: horizontal=20',
].join('\n');
const TORSION = [
  'kind: function', 'fn: 9.767+2.267*cos(0.017453*d)-0.267*cos(0.034907*d)+7.233*cos(0.05236*d)', 'domain: 0 360', 'var: d',
  'xlabel: dihedral angle CH3–C2–C3–CH3 (degrees)', 'ylabel: relative energy (kJ/mol)',
  'point: 0,19', 'point: 60,3.8', 'point: 120,16', 'point: 180,0', 'point: 240,16', 'point: 300,3.8', 'point: 360,19',
  'point_label: fully eclipsed 19', 'point_label: gauche 3.8', 'point_label: eclipsed 16', 'point_label: anti 0',
  'point_label: eclipsed 16', 'point_label: gauche 3.8', 'point_label: fully eclipsed 19',
].join('\n');

function laidOut(raw: string) {
  const result = compilePlot(parseSpec('plot', raw), ctx);
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  const layout = layoutScene(result.scene);
  if (!layout.ok) throw new Error(layout.reason);
  return { scene: result.scene, layout };
}

const labelsOf = (raw: string) => raw.split('\n').filter((line) => line.startsWith('point_label: ')).map((line) => line.slice(13));

describe('plot point labels that do not fit beside their points', () => {
  it.each([['energy profile', PROFILE], ['torsion profile', TORSION]])('%s: numbers the points and keys every label once', (_, raw) => {
    const { scene, layout } = laidOut(raw);
    const texts = labelsOf(raw);
    const unique = [...new Set(texts)];
    // Every point carries the number of its label; identical labels share a number.
    texts.forEach((text, i) => {
      const marker = scene.labels.find((l) => l.id === `pointl${i}`)!;
      expect(marker.text).toBe(String(unique.indexOf(text) + 1));
    });
    // The key states each label exactly once, next to its number.
    unique.forEach((text, k) => {
      expect(scene.labels.filter((l) => l.text === text).map((l) => l.id)).toEqual([`pointkey${k}`]);
      expect(scene.labels.find((l) => l.id === `pointkey-n${k}`)?.text).toBe(String(k + 1));
    });
    // The key sits under the x title, inside the frame.
    const box = (id: string) => layout.placed.find((p) => p.label.id === id)!.box;
    const titleBottom = Math.max(...layout.placed.filter((p) => /^xlabel\d*$/.test(p.label.id)).map((p) => p.box.y2));
    unique.forEach((_, k) => {
      expect(box(`pointkey${k}`).y1).toBeGreaterThan(titleBottom);
      expect(box(`pointkey${k}`).y2).toBeLessThanOrEqual(scene.height);
    });
  });

  it('keeps a label that fits beside its point there, with no key', () => {
    const { scene } = laidOut('kind: function\ndomain: 0 4\nfn: x^2\npoint: 2,4\npoint_label: vertex at (2, 4)');
    expect(scene.labels.find((l) => l.id === 'pointl0')?.text).toBe('vertex at (2, 4)');
    expect(scene.labels.some((l) => l.id.startsWith('pointkey'))).toBe(false);
  });
});
