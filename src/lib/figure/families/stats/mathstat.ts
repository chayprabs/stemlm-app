/**
 * The numbers behind the statistics figures: order statistics, least squares, apportioned percentages,
 * histogram binning, and the distribution functions (to about 1e-13) the `dist` family prints.
 * Pure functions; nothing here reads a spec or draws.
 */

function ascending(values: readonly number[]): number[] {
  return [...values].sort((a, b) => a - b);
}

function medianOfSorted(sorted: readonly number[]): number {
  const mid = sorted.length >> 1;
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/**
 * Quartiles by the median-of-halves method: Q1 and Q3 are the medians of the lower and upper halves of
 * the sorted sample, and the overall median is left out of both halves when n is odd. This is the
 * convention of most introductory texts (Moore-McCabe) and of TI-83/84 `1-Var Stats`; spreadsheet
 * `QUARTILE.INC` interpolates instead and can differ on small samples.
 */
export function quartiles(values: readonly number[]): { q1: number; median: number; q3: number } {
  const sorted = ascending(values);
  const n = sorted.length;
  const median = medianOfSorted(sorted);
  if (n < 2) return { q1: median, median, q3: median };
  const half = Math.floor(n / 2);
  return { q1: medianOfSorted(sorted.slice(0, half)), median, q3: medianOfSorted(sorted.slice(n - half)) };
}

export interface BoxSummary {
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
  /** Whisker ends: the most extreme values still within 1.5 IQR of the box. */
  whiskerLo: number;
  whiskerHi: number;
  /** Values beyond 1.5 IQR from the box, in ascending order. */
  outliers: number[];
}

export function boxSummary(values: readonly number[]): BoxSummary {
  const sorted = ascending(values);
  const { q1, median, q3 } = quartiles(sorted);
  const reach = 1.5 * (q3 - q1);
  const inside = sorted.filter((value) => value >= q1 - reach && value <= q3 + reach);
  return {
    min: sorted[0]!,
    q1,
    median,
    q3,
    max: sorted[sorted.length - 1]!,
    // A quartile can lie beyond every remaining value (two points and a far outlier); the whisker never
    // reaches back inside the box.
    whiskerLo: Math.min(q1, inside[0] ?? q1),
    whiskerHi: Math.max(q3, inside[inside.length - 1] ?? q3),
    outliers: sorted.filter((value) => value < q1 - reach || value > q3 + reach),
  };
}

export interface LinearFit {
  slope: number;
  intercept: number;
  /** Coefficient of determination; null when y does not vary (0/0). */
  r2: number | null;
}

/** Ordinary least squares of y on x. Null when x does not vary: the line would be vertical. */
export function linearFit(points: ReadonlyArray<{ x: number; y: number }>): LinearFit | null {
  const n = points.length;
  if (n < 2) return null;
  const meanX = points.reduce((sum, point) => sum + point.x, 0) / n;
  const meanY = points.reduce((sum, point) => sum + point.y, 0) / n;
  let sxx = 0;
  let sxy = 0;
  let syy = 0;
  for (const point of points) {
    sxx += (point.x - meanX) ** 2;
    sxy += (point.x - meanX) * (point.y - meanY);
    syy += (point.y - meanY) ** 2;
  }
  if (!(sxx > 0)) return null;
  const slope = sxy / sxx;
  return { slope, intercept: meanY - slope * meanX, r2: syy > 0 ? Math.min(1, (sxy * sxy) / (sxx * syy)) : null };
}

/**
 * Shares of a whole, rounded so they add up to exactly 100 (largest-remainder apportionment): each share
 * is rounded down and the leftover units go to the largest remainders, earlier entries first on a tie.
 */
export function percentages(values: readonly number[], decimals = 0): number[] {
  const total = values.reduce((sum, value) => sum + value, 0);
  const unit = 10 ** decimals;
  const exact = values.map((value) => (value / total) * 100 * unit);
  const floors = exact.map((share) => Math.floor(share + 1e-9));
  let left = Math.round(100 * unit - floors.reduce((sum, share) => sum + share, 0));
  const order = exact.map((share, index) => ({ index, rest: share - floors[index]! })).sort((a, b) => b.rest - a.rest || a.index - b.index);
  for (const { index } of order) {
    if (left <= 0) break;
    floors[index]! += 1;
    left -= 1;
  }
  return floors.map((share) => share / unit);
}

export interface Bins {
  edges: number[];
  counts: number[];
}

/** Bin counts for explicit edges. Bins are [a, b) except the last, which also holds its right edge. */
export function countIntoEdges(data: readonly number[], edges: readonly number[]): number[] {
  const counts = new Array<number>(edges.length - 1).fill(0);
  const last = edges.length - 2;
  for (const value of data) {
    let bin = edges.findIndex((edge, index) => index <= last && value >= edge && value < edges[index + 1]!);
    if (bin < 0 && value === edges[edges.length - 1]) bin = last;
    if (bin >= 0) counts[bin]! += 1;
  }
  return counts;
}

const NICE_BIN_WIDTHS = [1, 2, 2.5, 5];
/** Without a stated count, a histogram gets at most this many bins. */
const MAX_AUTO_BINS = 12;
const ROUND_BIN_WIDTHS = [1, 1.2, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 7.5, 8, 9, 10];

function tidy(value: number): number {
  return Number(value.toPrecision(12));
}

function edgesFrom(lo: number, width: number, count: number): number[] {
  return Array.from({ length: count + 1 }, (_, i) => tidy(lo + i * width));
}

/**
 * Histogram bins with round edges.
 * - `bins` given: exactly that many equal bins, with the smallest round width (1, 1.2, 1.5, 2, ... x 10^k)
 *   whose bins, started at a multiple of the width, cover the data.
 * - otherwise the Freedman-Diaconis width 2 IQR n^(-1/3) (Sturges' count when the IQR is zero), snapped to
 *   the nearest of 1, 2, 2.5, 5 x 10^k and widened until there are at most 12 bins.
 */
export function histogramBins(data: readonly number[], opts: { bins?: number } = {}): Bins {
  const sorted = ascending(data);
  const min = sorted[0]!;
  const max = sorted[sorted.length - 1]!;
  const range = max - min;
  if (!(range > 0)) {
    // Every value is the same: unit bins centred on it.
    const count = opts.bins ?? 1;
    const edges = edgesFrom(min - count / 2, 1, count);
    return { edges, counts: countIntoEdges(sorted, edges) };
  }
  const covers = (width: number, count?: number) => {
    const lo = tidy(Math.floor(min / width + 1e-9) * width);
    const needed = Math.max(1, Math.ceil((max - lo) / width - 1e-9));
    return count === undefined || needed <= count ? { lo, count: count ?? needed } : null;
  };
  if (opts.bins !== undefined) {
    const target = range / opts.bins;
    const exponent = Math.floor(Math.log10(target));
    for (let e = exponent - 1; e <= exponent + 2; e++) {
      for (const mantissa of ROUND_BIN_WIDTHS) {
        const width = tidy(mantissa * 10 ** e);
        if (width < target * (1 - 1e-9)) continue;
        const fit = covers(width, opts.bins);
        if (fit) {
          const edges = edgesFrom(fit.lo, width, fit.count);
          return { edges, counts: countIntoEdges(sorted, edges) };
        }
      }
    }
    const edges = edgesFrom(min, range / opts.bins, opts.bins);
    return { edges, counts: countIntoEdges(sorted, edges) };
  }
  const { q1, q3 } = quartiles(sorted);
  const n = sorted.length;
  const raw = q3 > q1 ? (2 * (q3 - q1)) / Math.cbrt(n) : range / (Math.ceil(Math.log2(n)) + 1);
  const exponent = Math.floor(Math.log10(raw));
  const candidates = [exponent - 1, exponent, exponent + 1, exponent + 2, exponent + 3]
    .flatMap((e) => NICE_BIN_WIDTHS.map((mantissa) => tidy(mantissa * 10 ** e)))
    .sort((a, b) => a - b);
  let choice = candidates.reduce((best, width) => (Math.abs(Math.log(width / raw)) < Math.abs(Math.log(best / raw)) ? width : best));
  while (covers(choice)!.count > MAX_AUTO_BINS) choice = candidates[candidates.indexOf(choice) + 1] ?? choice * 2;
  const fit = covers(choice)!;
  const edges = edgesFrom(fit.lo, choice, fit.count);
  return { edges, counts: countIntoEdges(sorted, edges) };
}

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

/** ln Γ(x) for x > 0 (Lanczos, g = 7). */
function lnGamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lnGamma(1 - x);
  const shifted = x - 1;
  let sum = LANCZOS[0]!;
  for (let i = 1; i < LANCZOS.length; i++) sum += LANCZOS[i]! / (shifted + i);
  const t = shifted + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(sum);
}

const EPS = 1e-16;
const TINY = 1e-300;

function gammaSeries(a: number, x: number): number {
  let term = 1 / a;
  let sum = term;
  for (let n = 1; n < 2000; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * EPS) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

/** Upper incomplete gamma by its continued fraction (modified Lentz); converges fast for x > a + 1. */
function gammaFraction(a: number, x: number): number {
  let b = x + 1 - a;
  let c = 1 / TINY;
  let d = 1 / b;
  let h = d;
  for (let n = 1; n < 2000; n++) {
    const an = -n * (n - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }
  return h * Math.exp(-x + a * Math.log(x) - lnGamma(a));
}

/** Regularized lower incomplete gamma P(a, x). */
function gammaP(a: number, x: number): number {
  if (!(x > 0)) return 0;
  if (x === Infinity) return 1;
  return x < a + 1 ? gammaSeries(a, x) : 1 - gammaFraction(a, x);
}

/** Regularized upper incomplete gamma Q(a, x) = 1 - P(a, x), computed directly in the tail. */
function gammaQ(a: number, x: number): number {
  if (!(x > 0)) return 1;
  if (x === Infinity) return 0;
  return x < a + 1 ? 1 - gammaSeries(a, x) : gammaFraction(a, x);
}

function betaFraction(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;
  for (let m = 1; m < 3000; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPS) break;
  }
  return h;
}

/** Regularized incomplete beta I_x(a, b). */
function betaI(a: number, b: number, x: number): number {
  if (!(x > 0)) return 0;
  if (x >= 1) return 1;
  const front = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (front * betaFraction(a, b, x)) / a : 1 - (front * betaFraction(b, a, 1 - x)) / b;
}

/** erfc through Q(1/2, x^2): no cancellation in the tails, unlike 1 - erf(x). */
function erfc(x: number): number {
  return x >= 0 ? gammaQ(0.5, x * x) : 1 + gammaP(0.5, x * x);
}

/** A distribution as the `dist` family needs it: cdf, survival function (accurate upper tail), density. */
export interface Law {
  discrete: boolean;
  /** Density, or probability mass at an integer. */
  f: (x: number) => number;
  /** P(X <= x). */
  cdf: (x: number) => number;
  /** P(X > x). */
  sf: (x: number) => number;
  mean: number;
}

export function normalLaw(mean: number, sd: number): Law {
  return {
    discrete: false,
    f: (x) => Math.exp(-0.5 * ((x - mean) / sd) ** 2) / (sd * Math.sqrt(2 * Math.PI)),
    cdf: (x) => 0.5 * erfc(-(x - mean) / (sd * Math.SQRT2)),
    sf: (x) => 0.5 * erfc((x - mean) / (sd * Math.SQRT2)),
    mean,
  };
}

export function studentLaw(df: number): Law {
  const norm = Math.exp(lnGamma((df + 1) / 2) - lnGamma(df / 2)) / Math.sqrt(df * Math.PI);
  const tail = (t: number) => 0.5 * betaI(df / 2, 0.5, df / (df + t * t));
  return {
    discrete: false,
    f: (t) => norm * (1 + (t * t) / df) ** (-(df + 1) / 2),
    cdf: (t) => (t === -Infinity ? 0 : t === Infinity ? 1 : t <= 0 ? tail(t) : 1 - tail(t)),
    sf: (t) => (t === -Infinity ? 1 : t === Infinity ? 0 : t >= 0 ? tail(t) : 1 - tail(t)),
    mean: 0,
  };
}

export function chiSquareLaw(df: number): Law {
  const k = df / 2;
  return {
    discrete: false,
    f: (x) => (x < 0 ? 0 : x === 0 ? (df < 2 ? Infinity : df === 2 ? 0.5 : 0) : Math.exp((k - 1) * Math.log(x) - x / 2 - k * Math.LN2 - lnGamma(k))),
    cdf: (x) => gammaP(k, x / 2),
    sf: (x) => gammaQ(k, x / 2),
    mean: df,
  };
}

export function exponentialLaw(rate: number): Law {
  return {
    discrete: false,
    f: (x) => (x < 0 ? 0 : rate * Math.exp(-rate * x)),
    cdf: (x) => (x <= 0 ? 0 : -Math.expm1(-rate * x)),
    sf: (x) => (x <= 0 ? 1 : Math.exp(-rate * x)),
    mean: 1 / rate,
  };
}

export function uniformLaw(min: number, max: number): Law {
  const width = max - min;
  return {
    discrete: false,
    f: (x) => (x >= min && x <= max ? 1 / width : 0),
    cdf: (x) => Math.max(0, Math.min(1, (x - min) / width)),
    sf: (x) => Math.max(0, Math.min(1, (max - x) / width)),
    mean: (min + max) / 2,
  };
}

/** Discrete laws sum their masses in whichever direction is shorter, so neither tail loses digits. */
function discreteLaw(pmf: (k: number) => number, upper: number, mean: number): Law {
  const below = (x: number) => {
    let sum = 0;
    for (let k = 0; k <= Math.min(Math.floor(x), upper); k++) sum += pmf(k);
    return Math.min(1, sum);
  };
  const above = (x: number) => {
    let sum = 0;
    for (let k = Math.max(0, Math.floor(x) + 1); k <= upper; k++) sum += pmf(k);
    return Math.min(1, sum);
  };
  return {
    discrete: true,
    f: (k) => (Number.isInteger(k) && k >= 0 && k <= upper ? pmf(k) : 0),
    cdf: (x) => (x < 0 ? 0 : x >= upper ? 1 : x <= mean ? below(x) : 1 - above(x)),
    sf: (x) => (x < 0 ? 1 : x >= upper ? 0 : x >= mean ? above(x) : 1 - below(x)),
    mean,
  };
}

export function binomialLaw(n: number, p: number): Law {
  const lnChoose = (k: number) => lnGamma(n + 1) - lnGamma(k + 1) - lnGamma(n - k + 1);
  const pmf = (k: number) => {
    if (p === 0) return k === 0 ? 1 : 0;
    if (p === 1) return k === n ? 1 : 0;
    return Math.exp(lnChoose(k) + k * Math.log(p) + (n - k) * Math.log1p(-p));
  };
  return discreteLaw(pmf, n, n * p);
}

export function poissonLaw(lambda: number): Law {
  // Mass beyond this point is below 1e-17 of the total, so it bounds the summation.
  const upper = Math.ceil(lambda + 12 * Math.sqrt(lambda) + 40);
  return discreteLaw((k) => Math.exp(-lambda + k * Math.log(lambda) - lnGamma(k + 1)), upper, lambda);
}
