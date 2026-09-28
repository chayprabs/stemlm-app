import { describe, expect, it } from 'vitest';
import { compilePlot } from './engines/plot';
import { parseSpec } from './spec';

const ctx = { profile: 'step' as const, family: 'plot' };

// Live Claude answer, 2026-09-28 (round 2 q15): Bode plots marked their key points with `marker: point=`
// and named them with `point_label:` ("repeat in point order"). The plot compiled ok but drew neither
// label: point_label only paired with `point:` records, so two stated labels were silently dropped.
const BODE = [
  'kind: bode', 'scale: x=log y=linear', 'domain: 10 100000', 'xlabel: Frequency f (Hz)', 'ylabel: Magnitude (dB)',
  'data: 10,0; 100,-0.04; 300,-0.38; 500,-0.98; 995,-3.01; 2000,-7.03; 3000,-10.04; 10000,-20.09; 30000,-29.59; 100000,-40.05',
  'marker: point=995,-3.01', 'marker: point=10000,-20.09', 'point_label: f_c, -3 dB', 'point_label: 10 kHz, -20.1 dB', 'guide: vertical=995',
].join('\n');

const texts = (raw: string) => {
  const result = compilePlot(parseSpec('plot', raw), ctx);
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  return result.ok ? result.scene.labels.map((l) => l.text ?? '') : [];
};

describe('plot point labels', () => {
  it('name `marker: point=` points too, in point order', () => {
    const all = texts(BODE);
    expect(all).toContain('f_c, -3 dB');
    expect(all).toContain('10 kHz, -20.1 dB');
  });

  it('label `point:` records before `marker: point=` records', () => {
    const all = texts('kind: function\ndomain: 0 4\nfn: x^2\npoint: 1,1\nmarker: point=3,9\npoint_label: first\npoint_label: second');
    expect(all).toEqual(expect.arrayContaining(['first', 'second']));
  });

  it('refuses a label with no point to name, instead of dropping it', () => {
    const result = compilePlot(parseSpec('plot', 'kind: function\ndomain: 0 4\nfn: x\npoint: 1,1\npoint_label: one\npoint_label: two'), ctx);
    expect(result.ok).toBe(false);
  });
});
