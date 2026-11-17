import { describe, expect, it } from 'vitest';
import {
  binomialLaw, boxSummary, chiSquareLaw, countIntoEdges, exponentialLaw, histogramBins, linearFit, normalLaw,
  percentages, poissonLaw, quartiles, studentLaw, uniformLaw,
} from './mathstat';

describe('quartiles (median of halves)', () => {
  it('splits an even sample into two halves', () => {
    expect(quartiles([42, 4, 16, 8, 23, 15])).toEqual({ q1: 8, median: 15.5, q3: 23 });
  });

  it('leaves the median out of both halves of an odd sample', () => {
    expect(quartiles([1, 2, 3, 4, 5, 6, 7])).toEqual({ q1: 2, median: 4, q3: 6 });
    expect(quartiles([1, 2, 3, 4, 5])).toEqual({ q1: 1.5, median: 3, q3: 4.5 });
  });

  it('handles one and two values', () => {
    expect(quartiles([7])).toEqual({ q1: 7, median: 7, q3: 7 });
    expect(quartiles([5, 7])).toEqual({ q1: 5, median: 6, q3: 7 });
  });
});

describe('box summary', () => {
  it('marks values beyond 1.5 IQR as outliers and ends the whiskers inside the fences', () => {
    const box = boxSummary([1, 2, 3, 4, 5, 6, 7, 8, 9, 30]);
    expect(box).toMatchObject({ min: 1, q1: 3, median: 5.5, q3: 8, max: 30, whiskerLo: 1, whiskerHi: 9, outliers: [30] });
  });

  it('keeps a value exactly on the fence', () => {
    // Q1 = 2.5, Q3 = 6.5: the upper fence is 6.5 + 1.5 x 4 = 12.5.
    expect(boxSummary([1, 2, 3, 4, 5, 6, 7, 12.5]).outliers).toEqual([]);
    expect(boxSummary([1, 2, 3, 4, 5, 6, 7, 12.6]).outliers).toEqual([12.6]);
  });

  it('never draws a whisker back inside the box', () => {
    const box = boxSummary([1, 1, 100]);
    expect(box.whiskerLo).toBeLessThanOrEqual(box.q1);
    expect(box.whiskerHi).toBeGreaterThanOrEqual(box.q3);
  });
});

describe('least squares', () => {
  it('recovers an exact line', () => {
    expect(linearFit([{ x: 0, y: 1 }, { x: 1, y: 3 }, { x: 2, y: 5 }])).toEqual({ slope: 2, intercept: 1, r2: 1 });
  });

  it('fits noisy points', () => {
    const fit = linearFit([{ x: 1, y: 2 }, { x: 2, y: 3.9 }, { x: 3, y: 6.1 }])!;
    expect(fit.slope).toBeCloseTo(2.05, 10);
    expect(fit.intercept).toBeCloseTo(-0.1, 10);
    expect(fit.r2).toBeCloseTo(16.81 / 16.84, 10);
  });

  it('has no line through points that share one x, and no r² when y does not vary', () => {
    expect(linearFit([{ x: 2, y: 1 }, { x: 2, y: 5 }])).toBeNull();
    expect(linearFit([{ x: 1, y: 1 }])).toBeNull();
    expect(linearFit([{ x: 1, y: 4 }, { x: 3, y: 4 }])).toEqual({ slope: 0, intercept: 4, r2: null });
  });
});

describe('percentages (largest remainder)', () => {
  it('always adds up to 100', () => {
    expect(percentages([1, 1, 1])).toEqual([34, 33, 33]);
    expect(percentages([900, 450, 200, 300, 150])).toEqual([45, 23, 10, 15, 7]);
    expect(percentages([1, 1, 1, 1, 1, 1, 1])).toEqual([15, 15, 14, 14, 14, 14, 14]);
    for (const values of [[3, 1], [0.2, 0.3, 0.5], [7, 11, 13, 17, 19, 23], [1, 999]]) {
      expect(percentages(values).reduce((sum, share) => sum + share, 0)).toBe(100);
    }
  });

  it('apportions tenths when asked', () => {
    const shares = percentages([78.08, 20.95, 0.93, 0.04], 1);
    expect(shares).toEqual([78.1, 21, 0.9, 0]);
  });
});

describe('histogram bins', () => {
  it('counts into [a, b) bins, the last bin holding its right edge', () => {
    expect(countIntoEdges([1, 2, 2, 3, 5, 10], [0, 5, 10])).toEqual([4, 2]);
  });

  it('chooses round edges that cover the sample', () => {
    const scores = [62, 65, 67, 68, 70, 71, 71, 72, 73, 74, 74, 75, 76, 77, 78, 79, 81, 83, 85, 91];
    expect(histogramBins(scores)).toEqual({ edges: [60, 65, 70, 75, 80, 85, 90, 95], counts: [1, 3, 7, 5, 2, 1, 1] });
  });

  it('makes exactly the requested number of equal bins', () => {
    const bins = histogramBins([4, 8, 15, 16, 23, 42], { bins: 4 });
    expect(bins.edges).toEqual([0, 12, 24, 36, 48]);
    expect(bins.counts).toEqual([2, 3, 0, 1]);
    expect(bins.counts.reduce((sum, count) => sum + count, 0)).toBe(6);
  });

  it('bins a constant sample', () => {
    const bins = histogramBins([5, 5, 5]);
    expect(bins.counts).toEqual([3]);
    expect(bins.edges[0]!).toBeLessThanOrEqual(5);
    expect(bins.edges[1]!).toBeGreaterThanOrEqual(5);
  });
});

describe('distribution functions', () => {
  it('the error function behind the normal law', () => {
    // erf(x) = 2 Phi(x sqrt 2) - 1
    const erf = (x: number) => 2 * normalLaw(0, 1).cdf(x * Math.SQRT2) - 1;
    expect(erf(0)).toBeCloseTo(0, 14);
    expect(erf(1)).toBeCloseTo(0.8427007929497149, 12);
    expect(erf(-0.5)).toBeCloseTo(-0.5204998778130465, 12);
  });

  it('normal: P(-1.96 < Z < 1.96) = 0.9500', () => {
    const z = normalLaw(0, 1);
    expect(z.cdf(1.96) - z.cdf(-1.96)).toBeCloseTo(0.9500042097, 9);
    expect(z.cdf(0)).toBeCloseTo(0.5, 14);
    expect(z.sf(6)).toBeCloseTo(9.865876450377e-10, 18);
    const iq = normalLaw(100, 15);
    expect(iq.cdf(115) - iq.cdf(85)).toBeCloseTo(0.6826894921, 9);
  });

  it('t: df = 10, two tails beyond 2.228 leave 0.95', () => {
    const t = studentLaw(10);
    expect(1 - 2 * t.sf(2.228)).toBeCloseTo(0.95, 4);
    expect(t.cdf(0)).toBeCloseTo(0.5, 12);
    expect(studentLaw(1).cdf(1)).toBeCloseTo(0.75, 10);
  });

  it('chi-square: df = 3, the tail beyond 7.815 is 0.05', () => {
    expect(chiSquareLaw(3).sf(7.815)).toBeCloseTo(0.05, 4);
    expect(chiSquareLaw(2).cdf(2)).toBeCloseTo(1 - Math.exp(-1), 12);
  });

  it('binomial: n = 10, p = 0.5, P(X <= 3) = 0.1719', () => {
    const law = binomialLaw(10, 0.5);
    expect(law.cdf(3)).toBeCloseTo(0.171875, 12);
    expect(law.f(5)).toBeCloseTo(252 / 1024, 12);
    expect(law.cdf(10)).toBe(1);
    expect(law.sf(3)).toBeCloseTo(1 - 0.171875, 12);
  });

  it('poisson, exponential, uniform', () => {
    const poisson = poissonLaw(3);
    expect(poisson.f(0)).toBeCloseTo(Math.exp(-3), 12);
    expect(poisson.cdf(2)).toBeCloseTo(Math.exp(-3) * (1 + 3 + 4.5), 12);
    expect(exponentialLaw(0.5).cdf(2)).toBeCloseTo(1 - Math.exp(-1), 12);
    expect(uniformLaw(0, 10).cdf(2.5)).toBe(0.25);
  });
});
