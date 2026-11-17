import { describe, expect, it } from 'vitest';
import { boxOf, compile, draw, expectCleanLabels, reason, type Drawn } from '../cs/testing';

const dist = (content: string) => draw('dist', content);
const refused = (content: string) => reason('dist', content);
const ticks = (drawn: Drawn) => drawn.scene.labels.filter((label) => label.id.startsWith('tickl-')).map((label) => label.text);
const bars = (drawn: Drawn) => drawn.scene.strokes.filter((stroke) => stroke.id.startsWith('bar-'));

describe('dist: the shaded probability is computed', () => {
  it.each([
    ['shade: -1.96 1.96', 'P(−1.96 < Z < 1.96) = 0.9500'],
    ['mean: 100\nsd: 15\nshade: 85 115', 'P(85 < X < 115) = 0.6827'],
    ['shade: < -1.645', 'P(Z < −1.645) = 0.0500'],
    ['shade: outside -1.96 1.96', 'P(Z < −1.96 or Z > 1.96) = 0.0500'],
    ['kind: t\ndf: 10\nshade: -2.228 2.228', 'P(−2.228 < T < 2.228) = 0.9500'],
    ['kind: t\ndf: 10\nshade: > 2.228', 'P(T > 2.228) = 0.0250'],
    ['kind: chi2\ndf: 3\nshade: > 7.815', 'P(χ² > 7.815) = 0.0500'],
    ['kind: exponential\nrate: 0.5\nshade: < 2', 'P(X < 2) = 0.6321'],
    ['kind: uniform\nmin: 0\nmax: 10\nshade: 2 5', 'P(2 < X < 5) = 0.3000'],
    ['kind: binomial\nn: 10\np: 0.5\nshade: <= 3', 'P(X ≤ 3) = 0.1719'],
    ['kind: binomial\nn: 10\np: 0.5\nshade: < 3', 'P(X < 3) = 0.0547'],
    ['kind: binomial\nn: 10\np: 0.5\nshade: 4 6', 'P(4 ≤ X ≤ 6) = 0.6563'],
    ['kind: binomial\nn: 10\np: 0.5\nshade: >= 8', 'P(X ≥ 8) = 0.0547'],
    ['kind: binomial\nn: 10\np: 0.5\nshade: outside 2 8', 'P(X < 2 or X > 8) = 0.0215'],
    ['kind: poisson\nlambda: 4\nshade: 2 6', 'P(2 ≤ X ≤ 6) = 0.7977'],
    ['kind: poisson\nrate: 4\nshade: > 6', 'P(X > 6) = 0.1107'],
    ['shade: > 5', 'P(Z > 5) = 2.9×10^{−7}'],
  ])('%s', async (content, statement) => {
    const drawn = await dist(content);
    expect(drawn.text('probability')).toBe(statement);
    expectCleanLabels(drawn);
  });

  it('prints no probability without a shaded event', async () => {
    const drawn = await dist('kind: normal');
    expect(drawn.text('probability')).toBeUndefined();
    expect(drawn.text('caption')).toBe('μ = 0, σ = 1');
    expect(drawn.stroke('shade')).toBeUndefined();
  });
});

describe('dist: drawn to scale', () => {
  it('puts the peak of a normal curve at its mean and names whole deviations on the axis', async () => {
    const drawn = await dist('mean: 100\nsd: 15\nxlabel: IQ score');
    const points = drawn.stroke('curve')!.points;
    let peak = 0;
    for (let i = 0; i < points.length; i += 2) if (points[i + 1]! < points[peak + 1]!) peak = i;
    const mean = drawn.scene.strokes.find((stroke) => stroke.id === 'tick-0')!.points[0]!;
    expect(points[peak]).toBeCloseTo(mean, 6);
    expect(ticks(drawn).sort((a, b) => Number(a) - Number(b))).toEqual(['55', '70', '85', '100', '115', '130', '145']);
    expect(drawn.text('xlabel')).toBe('IQ score');
    expect(drawn.text('caption')).toBe('μ = 100, σ = 15');
  });

  it('shades exactly between the bounds', async () => {
    const drawn = await dist('mean: 100\nsd: 15\nshade: 85 115');
    const shade = boxOf(drawn.stroke('shade')!);
    const at = (text: string) => {
      const index = drawn.scene.labels.find((label) => label.text === text)!.id.replace('tickl-', '');
      return drawn.stroke(`tick-${index}`)!.points[0]!;
    };
    expect(shade.x1).toBeCloseTo(at('85'), 6);
    expect(shade.x2).toBeCloseTo(at('115'), 6);
    const tails = await dist('shade: outside -1 1');
    expect(tails.stroke('shade')).toBeDefined();
    expect(tails.stroke('shade-2')).toBeDefined();
  });

  it('names shade bounds and marks on the axis, dropping the regular ticks they crowd', async () => {
    const drawn = await dist('shade: outside -1.96 1.96\nmark: 0');
    expect(ticks(drawn)).toEqual(expect.arrayContaining(['−1.96', '1.96', '0', '−1', '1', '−3', '3']));
    expect(ticks(drawn)).not.toContain('2');
    expect(drawn.stroke('mark-0')).toBeDefined();
    expectCleanLabels(drawn);
  });

  it('prints parameters and axis numbers exactly', async () => {
    const drawn = await dist('mu: 0.00123\nsigma: 0.00045\nshade: < 0.0008');
    expect(drawn.text('caption')).toBe('μ = 0.00123, σ = 0.00045');
    expect(ticks(drawn)).toEqual(expect.arrayContaining(['0.0008', '0.00168']));
    expectCleanLabels(drawn);
  });

  it('draws a discrete distribution as bars whose heights are its probabilities', async () => {
    const drawn = await dist('kind: binomial\nn: 4\np: 0.5\nshade: <= 1');
    const heights = ['bar-0', 'bar-1', 'bar-2', 'bar-3', 'bar-4'].map((id) => { const box = boxOf(drawn.stroke(id)!); return box.y2 - box.y1; });
    // 1 : 4 : 6 : 4 : 1
    expect(heights[1]! / heights[0]!).toBeCloseTo(4, 6);
    expect(heights[2]! / heights[0]!).toBeCloseTo(6, 6);
    expect(heights[3]!).toBeCloseTo(heights[1]!, 6);
    expect(bars(drawn).filter((bar) => bar.fill === 'ink').map((bar) => bar.id)).toEqual(['bar-0', 'bar-1']);
    expect(drawn.text('probability')).toBe('P(X ≤ 1) = 0.3125');
  });

  it('draws the edges of a uniform density upright', async () => {
    const drawn = await dist('kind: uniform\nmin: 0\nmax: 10');
    const points = drawn.stroke('curve')!.points;
    const xs = points.filter((_, i) => i % 2 === 0);
    const ys = points.filter((_, i) => i % 2 === 1);
    const top = Math.min(...ys);
    const firstTop = ys.findIndex((y) => y === top);
    expect(xs[firstTop]! - xs[firstTop - 1]!).toBeLessThan(0.001);
    expect(drawn.text('caption')).toBe('Uniform on [0, 10]');
  });
});

describe('dist: reading', () => {
  it('lets the type alias name the kind, and an explicit kind win', async () => {
    expect((await draw('normal', 'mean: 100\nsd: 15')).text('caption')).toBe('μ = 100, σ = 15');
    expect((await draw('bellcurve', 'shade: -1 1')).text('probability')).toBe('P(−1 < Z < 1) = 0.6827');
    expect((await draw('bell-curve', 'kind: t\ndf: 5')).text('caption')).toBe('t, df = 5');
    // A normal curve has no trials: the alias decides before the keys are looked at.
    expect(await reason('normal', 'n: 10\np: 0.5\nshade: > 3')).toBe('a normal distribution does not use n, p');
  });

  it('infers the kind from its parameters', async () => {
    expect((await dist('n: 10\np: 0.3\nshade: > 3')).text('caption')).toBe('Binomial, n = 10, p = 0.3');
    expect((await dist('min: 0\nmax: 4\nshade: 1 2')).text('caption')).toBe('Uniform on [0, 4]');
    expect((await dist('rate: 2\nshade: < 1')).text('caption')).toBe('Exponential, rate = 2');
    expect((await dist('lambda: 3\nshade: < 1')).text('caption')).toBe('Poisson, λ = 3');
    expect(await refused('df: 5\nshade: > 2')).toBe('df belongs to a t or a chi-square distribution: state kind: t or kind: chi2');
  });

  it('accepts other spellings of the same thing', async () => {
    expect((await dist('kind: Gaussian\nmu: 100\nsigma: 15\nshade: 85 to 115')).text('probability')).toBe('P(85 < X < 115) = 0.6827');
    expect((await dist('kind: chi-squared\ndf: 3\nshade: x ≥ 7.815')).text('probability')).toBe('P(χ² ≥ 7.815) = 0.0500');
    expect((await dist("kind: Student's t\ndf: 10\nshade: between −2.228 and 2.228")).text('probability')).toBe('P(−2.228 < T < 2.228) = 0.9500');
    expect((await dist('kind: binomial distribution\nn: 10\np: 50%\nshade: ≤ 3')).text('probability')).toBe('P(X ≤ 3) = 0.1719');
    expect((await dist('kind: binomial\nn: 3\np: 1/3\nshade: >= 3')).text('probability')).toBe('P(X ≥ 3) = 0.0370');
    expect((await dist('shade: -inf, 1.645')).text('probability')).toBe('P(Z < 1.645) = 0.9500');
    expect((await dist('kind: normal\nmark: -1, 1')).stroke('mark-1')).toBeDefined();
  });

  it('refuses with the reason', async () => {
    expect(await refused('mean: 10\nsd: -2')).toBe('sd must be positive');
    expect(await refused('mean: 10\nsd: 0')).toBe('sd must be positive');
    expect(await refused('kind: t')).toBe('a t distribution needs df');
    expect(await refused('kind: binomial\nn: 10')).toBe('a binomial distribution needs p');
    expect(await refused('kind: binomial\nn: 2.5\np: 0.5')).toBe('n must be a whole number of trials, 1 or more');
    expect(await refused('kind: binomial\nn: 10\np: 1.3')).toBe('p must be a probability between 0 and 1');
    expect(await refused('kind: uniform\nmin: 5\nmax: 5')).toBe('max must be greater than min');
    expect(await refused('kind: cauchy')).toMatch(/unknown distribution "cauchy"/);
    expect(await refused('kind: normal\ndf: 4')).toBe('a normal distribution does not use df');
    expect(await refused('mean: 100\nmu: 90')).toBe('mean is stated twice (100, 90)');
    expect(await refused('shade: 115 85\nmean: 100\nsd: 15')).toBe('shade needs its lower bound first');
    expect(await refused('shade: < tall')).toBe('shade "tall" is not a number');
    expect(await refused('shade: 1 2 3')).toMatch(/is not understood/);
    expect(await refused('shade: > 40')).toBe('a mark or shade bound lies too far from the distribution to draw to scale');
    expect(await refused('kind: normal\nmark: 1\nmark: 1.01')).toBe('1 and 1.01 are too close together to name on the axis');
    expect(await refused('kind: poisson\nlambda: 400')).toMatch(/outcomes are too many to draw as separate bars/);
  });

  it('never throws on garbage', async () => {
    for (const content of ['kind: 1', 'mean: 1', 'shade: 1', 'df: 1', 'kind: t\ndf: 1e-9', 'kind: chi2\ndf: 1\nshade: > 3.84', 'kind: binomial\nn: 1\np: 0', 'kind: binomial\nn: 60\np: 1', 'mean: 1e300\nsd: 1e300', 'sd: 1e-300', 'kind: exponential\nrate: 1e9']) {
      const result = await compile('dist', content);
      if (!result.ok) expect(`${result.code}: ${result.reason}`, content).not.toMatch(/^throw|undefined|Cannot read/);
    }
  });
});
