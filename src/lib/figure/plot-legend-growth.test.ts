import { describe, expect, it } from 'vitest';
import { compilePlot } from './engines/plot';
import { parseSpec } from './spec';
import { frameSize } from './scene-build';

const ctx = { profile: 'step' as const, family: 'plot' };

// Live Claude answer, 2026-09-28 (round 2 q12): sin x with its Taylor polynomials T1, T3, T5, one equation
// per curve. The four legend rows (two of them fractions) left no readable plotting area and the correct
// figure was hidden ("plot panel cannot retain a readable plotting area").
const TAYLOR = [
  'kind: function', 'domain: -3.14159 3.14159', 'var: x',
  'fn: sin(x)', 'fn: x', 'fn: x-x^3/6', 'fn: x-x^3/6+x^5/120',
  'eq: y=\\sin x', 'eq: T_1(x)=x', 'eq: T_3(x)=x-\\frac{x^{3}}{6}', 'eq: T_5(x)=x-\\frac{x^{3}}{6}+\\frac{x^{5}}{120}',
  'xlabel: x (rad)', 'ylabel: y',
].join('\n');

function plotArea(raw: string) {
  const result = compilePlot(parseSpec('plot', raw), ctx);
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  const axis = (id: string) => result.scene.strokes.find((s) => s.id === id)!.points;
  const y = axis('yaxis');
  return { scene: result.scene, height: Math.abs(y[1]! - y[3]!) };
}

describe('a plot legend band', () => {
  it('grows the frame instead of squeezing the plot below a readable height', () => {
    const { scene, height } = plotArea(TAYLOR);
    expect(height).toBeGreaterThanOrEqual(60);
    expect(scene.labels.filter((l) => /^eq\d*$/.test(l.id))).toHaveLength(4);
    expect(scene.height).toBeGreaterThan(frameSize('step').h);
  });

  it('leaves the frame alone when the band fits', () => {
    const { scene } = plotArea('kind: function\ndomain: 0 4\nfn: x\nfn: 2*x\neq: y=x\neq: y=2x');
    expect(scene.height).toBe(frameSize('step').h);
  });
});
