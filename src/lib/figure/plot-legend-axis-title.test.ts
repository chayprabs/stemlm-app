import { describe, expect, it } from 'vitest';
import { compilePlot } from './engines/plot';
import { parseSpec } from './spec';
import { layoutScene } from './slk';
import { boxesOverlap } from './geom';

const ctx = { profile: 'step' as const, family: 'plot' };
const compile = (content: string) => compilePlot(parseSpec('plot', content), ctx);

// Live Claude answers, 2026-09-28. Each plot was correct and each was hidden or garbled.
const CLIFF = [
  'kind: function',
  'fn: 20 + 0.8391*x - 0.037147*x*x',
  'domain: 0 37.1',
  'var: x',
  'xlabel: horizontal distance from cliff base x (m)',
  'ylabel: height above ground y (m)',
  'eq: y=20+0.839x-0.0371x^2',
  'point: 0,20',
  'point: 11.29,24.74',
  'point: 37.1,0',
  'point_label: launch (0, 20)',
  'point_label: peak (11.3, 24.7)',
  'point_label: landing (37.1, 0)',
  'caption: Trajectory of the ball from the cliff top',
].join('\n');

const INHIBITOR = [
  'kind: function',
  'fn: 50*S/(2+S)',
  'fn2: 50*S/(4+S)',
  'domain: 0 20',
  'var: S',
  'xlabel: [S] (mM)',
  'ylabel: v (μmol/min)',
  'eq: no inhibitor: v=\\frac{50[S]}{2.0+[S]}',
  'eq: competitive inhibitor ([I]=K_i): v=\\frac{50[S]}{4.0+[S]}',
  'point: 2,25',
  'point: 4,25',
  'point_label: Km = 2.0 mM',
  'point_label: Km,app = 4.0 mM',
  'asymptote: y=50',
].join('\n');

const AREA = [
  'kind: function',
  'fn: x^2',
  'fn2: 2*x+3',
  'var: x',
  'domain: -2 4',
  'eq: y=x^2',
  'eq: y=2x+3',
  'region: between=fn,fn2 from=-1 to=3',
  'label: region value=A',
  'point: -1,1',
  'point: 3,9',
  'point_label: (-1, 1)',
  'point_label: (3, 9)',
  'xlabel: x',
  'ylabel: y',
].join('\n');

describe('plot axis title longer than the plot', () => {
  it('keeps the plot when the axis titles are long (live cliff trajectory)', () => {
    const result = compile(CLIFF);
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    const title = laid.placed.filter((placed) => /^xlabel/.test(placed.label.id));
    expect(title.map((placed) => placed.label.text).join(' ')).toBe('horizontal distance from cliff base x (m)');
    // The long y title takes two lines left of the axis instead of squeezing the plot to a sliver.
    const xAxis = result.scene.strokes.find((stroke) => stroke.id === 'xaxis')!.points;
    expect(xAxis[2]! - xAxis[0]!).toBeGreaterThan(result.scene.width * 0.6);
    const yTitle = laid.placed.filter((placed) => /^ylabel/.test(placed.label.id));
    expect(yTitle.map((placed) => placed.label.text).join(' ')).toBe('height above ground y (m)');
    expect(yTitle.length).toBe(2);
    for (const line of yTitle) expect(line.box.x2).toBeLessThan(xAxis[0]! - 1);
  });

  it('wraps an x-axis title wider than the plot onto two lines instead of hiding the figure', () => {
    const result = compile(CLIFF.replace('xlabel: horizontal distance from cliff base x (m)', 'xlabel: horizontal distance measured from the base of the cliff, x (m)'));
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const laid = layoutScene(result.scene);
    expect(laid.ok).toBe(true);
    if (!laid.ok) return;
    const title = laid.placed.filter((placed) => /^xlabel/.test(placed.label.id));
    expect(title.map((placed) => placed.label.text).join(' ')).toBe('horizontal distance measured from the base of the cliff, x (m)');
    expect(title.length).toBe(2);
    for (const line of title) {
      expect(line.box.x1).toBeGreaterThanOrEqual(0);
      expect(line.box.x2).toBeLessThanOrEqual(result.scene.width);
      expect(line.box.y2).toBeLessThanOrEqual(result.scene.height);
    }
    expect(boxesOverlap(title[0]!.box, title[1]!.box, 0)).toBe(false);
  });
});

describe('plot equation labels for two series', () => {
  for (const [name, content, sources] of [
    ['enzyme inhibition', INHIBITOR, ['2.0+[S]', '4.0+[S]']],
    ['area between curves', AREA, ['y=x^2', 'y=2x+3']],
  ] as const) {
    it(`draws a legend row per equation (${name})`, () => {
      const result = compile(content);
      expect(result.ok, result.ok ? '' : result.reason).toBe(true);
      if (!result.ok) return;
      const laid = layoutScene(result.scene);
      expect(laid.ok).toBe(true);
      if (!laid.ok) return;
      const legend = laid.placed.filter((placed) => /^eq/.test(placed.label.id));
      expect(legend.length).toBe(2);
      sources.forEach((source, index) => expect(legend[index]!.label.katex).toContain(source));
      // One row each, stacked with a clear gap even if KaTeX renders a little taller than measured.
      expect(legend[1]!.box.y1 - legend[0]!.box.y2).toBeGreaterThanOrEqual(2);
      // Each row starts with a swatch in its series colour.
      const swatches = result.scene.strokes.filter((stroke) => /^legend-swatch/.test(stroke.id));
      expect(swatches.map((stroke) => stroke.semanticColor)).toEqual(['accent', 'muted']);
      // The legend sits above the plotting area, clear of every curve.
      const yAxisTop = Math.min(...result.scene.strokes.find((stroke) => stroke.id === 'yaxis')!.points.filter((_, i) => i % 2 === 1));
      for (const row of legend) expect(row.box.y2).toBeLessThanOrEqual(yAxisTop);
    });
  }

  it('sets the words of an equation label upright, not as italic variables', () => {
    const result = compile(INHIBITOR);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const sources = result.overlays.filter((overlay) => /^eq/.test(overlay.id)).map((overlay) => overlay.source);
    expect(sources[0]).toContain('\\text{no inhibitor}');
    expect(sources[1]).toContain('\\text{competitive inhibitor}');
    expect(sources[1]).toContain('K_i');
  });
});
