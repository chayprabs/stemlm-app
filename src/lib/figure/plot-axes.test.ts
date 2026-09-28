import { describe, expect, it } from 'vitest';
import { compilePlot } from './engines/plot';
import { parseSpec } from './spec';
import { layoutScene, type LayoutResult } from './slk';
import { boxHitsAny, boxesOverlap, type Box } from './geom';
import type { Scene } from './types';

// FIG-PLOT-AXIS-01: axis titles sit outside the tick-label rows and clear of every curve, ticks are
// nice numbers dense enough to read the scale (at least four on x) and cover the plotted range,
// and no tick label lands on a curve.

const ctx = { profile: 'step' as const, family: 'plot' };

function laid(content: string): { scene: Scene; layout: LayoutResult } {
  const result = compilePlot(parseSpec('plot', content), ctx);
  if (!result.ok) throw new Error(`${content}\n→ ${result.reason}`);
  const layout = layoutScene(result.scene);
  if (!layout.ok) throw new Error(layout.reason);
  return { scene: result.scene, layout };
}

const box = (layout: LayoutResult, id: string): Box => {
  const placed = layout.placed.find((p) => p.label.id === id);
  if (!placed) throw new Error(`no label ${id}`);
  return placed.box;
};

const ticks = (layout: LayoutResult, axis: 'x' | 'y') => layout.placed
  .filter((p) => new RegExp(`^${axis}tickl\\d+$`).test(p.label.id))
  .map((p) => ({ value: tickValue(p.label.text ?? ''), box: p.box, x: p.x, y: p.y }));

function tickValue(text: string): number {
  const power = /^(-?[\d.]+)×10\^(-?\d+)$/.exec(text);
  if (power) return Number(power[1]) * 10 ** Number(power[2]);
  const decade = /^10\^(-?\d+)$/.exec(text);
  if (decade) return 10 ** Number(decade[1]);
  return Number(text);
}

const line = (scene: Scene, id: string) => scene.strokes.find((s) => s.id === id)!.points;

/** Segments of the plotted series only (curves, data, guides, asymptotes, regions). */
function plotSegments(scene: Scene): { x1: number; y1: number; x2: number; y2: number }[] {
  return scene.strokes
    .filter((s) => /^(fn|data|guide|asymptote|region)/.test(s.id) && s.points.length >= 4)
    .flatMap((s) => {
      if (s.kind === 'circle') {
        const [cx, cy, r] = s.points as [number, number, number];
        return [{ x1: cx - r, y1: cy - r, x2: cx + r, y2: cy + r }, { x1: cx - r, y1: cy + r, x2: cx + r, y2: cy - r }];
      }
      const out = [];
      for (let i = 0; i + 3 < s.points.length; i += 2) out.push({ x1: s.points[i]!, y1: s.points[i + 1]!, x2: s.points[i + 2]!, y2: s.points[i + 3]! });
      return out;
    });
}

const SPECS: Record<string, string> = {
  sinCos: 'fn: sin(x)\nfn: cos(x)\ndomain: 0 6.283\nxlabel: x (rad)\nylabel: amplitude',
  asymptote: 'fn: 1/(x-2)\ndomain: -2 6\nasymptote: x=2\nxlabel: x\nylabel: y',
  projectile: 'fn: 20*t - 4.9*t^2\nvar: t\ndomain: 0 4.08\nxlabel: t (s)\nylabel: h (m)',
  decay: 'fn: 100*exp(-0.5*x)\ndomain: 0 10\nxlabel: t (s)\nylabel: N\nguide: horizontal=50\nlabel: curve=fn value=N(t)',
  ivData: 'kind: discrete\ndata: 0,0; 1,2.1; 2,3.9; 3,6.2; 4,7.8; 5,10.1\ndomain: 0 5\nxlabel: V (V)\nylabel: I (mA)',
  cubic: 'fn: x^3 - 3*x\ndomain: -2.5 2.5\nxlabel: x\nylabel: f(x)',
  velocity: 'fn: 3*x + 2\ndomain: 0 10\nxlabel: t (s)\nylabel: v (m/s)\nregion: between=fn from=2 to=6\nlabel: region value=area',
  titration: 'fn: 7 + 5*tanh((x-25)/1.5)\ndomain: 0 50\nxlabel: V_NaOH (mL)\nylabel: pH\nguide: vertical=25',
  shm: 'kind: waveform\nfn: 0.080*cos(4.00*x)\ndomain: 0 1.57\nxlabel: t (s)\nylabel: x (m)',
  wide: 'fn: -2*x + 1\ndomain: -2 4\nxlabel: x\nylabel: y',
};

describe('FIG-PLOT-AXIS-01 axis titles, ticks and tick labels', () => {
  it.each(Object.entries(SPECS))('puts the x title below the plot, clear of tick labels and curves (%s)', (_name, content) => {
    const { scene, layout } = laid(content);
    const title = box(layout, 'xlabel');
    const xAxisY = line(scene, 'xaxis')[1]!;
    expect(title.y1).toBeGreaterThan(xAxisY + 1);
    for (const tick of ticks(layout, 'x')) expect(title.y1, `x tick ${tick.value}`).toBeGreaterThanOrEqual(tick.box.y2);
    expect(boxHitsAny(title, plotSegments(scene), 1)).toBe(false);
  });

  it.each(Object.entries(SPECS))('puts the y title left of the axis and above every y tick label (%s)', (_name, content) => {
    const { scene, layout } = laid(content);
    const title = box(layout, 'ylabel');
    expect(title.x2).toBeLessThan(line(scene, 'yaxis')[0]! - 1);
    for (const tick of ticks(layout, 'y')) expect(title.y2, `y tick ${tick.value}`).toBeLessThanOrEqual(tick.box.y1);
    expect(boxHitsAny(title, plotSegments(scene), 1)).toBe(false);
  });

  it.each([
    ['0 6.283', 0, 6.283], ['0 4.08', 0, 4.08], ['-2 4', -2, 4], ['0 50', 0, 50], ['-2.5 2.5', -2.5, 2.5], ['0 1.57', 0, 1.57],
  ])('labels at least four nice x ticks spanning domain %s', (domain, min, max) => {
    const { scene, layout } = laid(`fn: x\ndomain: ${domain}`);
    const values = ticks(layout, 'x').map((t) => t.value);
    // A "0" shared by both axes at the origin labels the x tick at 0 as well.
    const xAxisY = line(scene, 'xaxis')[1]!;
    if (min === 0 && ticks(layout, 'y').some((t) => t.value === 0 && Math.abs(t.y - xAxisY) < 1)) values.push(0);
    values.sort((a, b) => a - b);
    expect(values.length).toBeGreaterThanOrEqual(4);
    const step = values[1]! - values[0]!;
    expect(values[0]! - min).toBeLessThan(step + 1e-9);
    expect(max - values.at(-1)!).toBeLessThan(step + 1e-9);
    const mantissa = step / 10 ** Math.floor(Math.log10(step));
    expect([1, 2, 2.5, 5].some((m) => Math.abs(mantissa - m) < 1e-6)).toBe(true);
    for (const value of values) expect(Math.abs(value / step - Math.round(value / step))).toBeLessThan(1e-6);
  });

  it.each(Object.entries(SPECS))('covers every plotted value with the y tick range (%s)', (_name, content) => {
    const { scene, layout } = laid(content);
    const y = ticks(layout, 'y').sort((a, b) => a.value - b.value);
    expect(y.length).toBeGreaterThanOrEqual(3);
    const top = Math.min(...y.map((t) => t.y));
    const bottom = Math.max(...y.map((t) => t.y));
    for (const segment of plotSegments(scene).filter((_, i) => i % 7 === 0)) {
      expect(segment.y1).toBeGreaterThanOrEqual(top - 0.5);
      expect(segment.y1).toBeLessThanOrEqual(bottom + 0.5);
    }
  });

  it('shows the full -1..1 range of a sine wave', () => {
    const { layout } = laid(SPECS.sinCos!);
    const values = ticks(layout, 'y').map((t) => t.value);
    expect(values).toContain(-1);
    expect(values).toContain(0);
    expect(values).toContain(1);
  });

  it.each(Object.entries(SPECS))('keeps tick labels off each other and off every curve (%s)', (_name, content) => {
    const { scene, layout } = laid(content);
    const all = [...ticks(layout, 'x'), ...ticks(layout, 'y')];
    for (const [i, a] of all.entries()) {
      expect(boxHitsAny(a.box, plotSegments(scene), 0.5), `tick ${a.value}`).toBe(false);
      for (const b of all.slice(i + 1)) expect(boxesOverlap(a.box, b.box, 1), `${a.value} vs ${b.value}`).toBe(false);
    }
  });

  it('labels the origin once when both axes start at zero', () => {
    const { scene, layout } = laid(SPECS.sinCos!);
    const [x0] = line(scene, 'yaxis');
    const xAxisY = line(scene, 'xaxis')[1]!;
    const zeros = layout.placed.filter((p) => p.label.text === '0' && Math.hypot(p.x - x0!, p.y - xAxisY) < 24);
    expect(zeros).toHaveLength(1);
  });

  it('labels every decade of a logarithmic axis and samples the curve evenly in log space', () => {
    const { scene, layout } = laid('fn: 1/sqrt(1+(x/1000)^2)\nscale: x=log\ndomain: 10 100000\nxlabel: f (Hz)\nylabel: gain');
    expect(ticks(layout, 'x').map((t) => t.value)).toEqual([10, 100, 1000, 10000, 100000]);
    const curve = line(scene, 'fn');
    const gaps: number[] = [];
    for (let i = 2; i < curve.length; i += 2) gaps.push(curve[i]! - curve[i - 2]!);
    expect(Math.max(...gaps) / Math.min(...gaps)).toBeLessThan(1.5);
  });

  it('writes very large tick values as powers of ten', () => {
    const { layout } = laid('fn: 8.99e9*1e-6/x^2\ndomain: 0.1 1\nxlabel: r (m)\nylabel: E (N/C)');
    const labels = ticks(layout, 'y').map((t) => layout.placed.find((p) => p.box === t.box)!.label.text!);
    expect(labels.some((text) => /×10\^5/.test(text))).toBe(true);
    for (const text of labels) expect(text.replace(/[\^×]/g, '').length).toBeLessThanOrEqual(7);
  });

  it('shades a region with a translucent tint of the series colour', () => {
    const result = compilePlot(parseSpec('plot', SPECS.velocity!), ctx);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const region = new DOMParser().parseFromString(result.svg, 'image/svg+xml').querySelector('[id="region0"]')!;
    expect(region.getAttribute('fill')).toBe(region.getAttribute('stroke'));
    const opacity = Number(region.getAttribute('fill-opacity') ?? 'missing');
    expect(opacity).toBeGreaterThan(0);
    expect(opacity).toBeLessThanOrEqual(0.3);
  });

  it('keeps a curve label next to its curve', () => {
    const { scene, layout } = laid(SPECS.decay!);
    const label = layout.placed.find((p) => p.label.id === 'label-fn')!;
    const curve = line(scene, 'fn');
    let nearest = Infinity;
    for (let i = 0; i + 1 < curve.length; i += 2) nearest = Math.min(nearest, Math.hypot(curve[i]! - label.x, curve[i + 1]! - label.y));
    expect(nearest).toBeLessThan(label.h / 2 + 14);
  });
});
