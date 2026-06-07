/**
 * Test-only reference numeric strings — recomputed from problem definitions.
 * NOT exam solutions or Gemini steps; used to verify numeric oracles in CI.
 */
const PI = Math.PI;

function square(v: number): number {
  return v * v;
}

function erfApprox(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const poly = (((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t);
  return sign * (1 - poly * Math.exp(-ax * ax));
}

function rk4Step(f: (t: number, y: number) => number, t: number, y: number, h: number) {
  const k1 = h * f(t, y);
  const k2 = h * f(t + h / 2, y + k1 / 2);
  const k3 = h * f(t + h / 2, y + k2 / 2);
  const k4 = h * f(t + h, y + k3);
  return { next: y + (k1 + 2 * k2 + 2 * k3 + k4) / 6, k1, k2, k3, k4 };
}

function factorial(n: number): number {
  let out = 1;
  for (let k = 2; k <= n; k += 1) out *= k;
  return out;
}

function probe26(): string {
  const mgfSample = (3 / (3 - 1)) ** 2;
  const meanSample = 4 / 2;
  const varianceSample = 4 / square(2);
  const sumMgfSample = (5 / (5 - 1)) ** (2 + 3);
  const sumVariance = (2 + 3) / square(5);
  return [mgfSample, meanSample, varianceSample, sumMgfSample, sumVariance].join(' ');
}

function probe27(): string {
  const p13 = 0.5 * 0 + 0.5 * 0.25;
  const p11 = 0.5 * 0.5 + 0.5 * 0.25;
  return [0.25, 0.5, p11, p13, 4].join(' ');
}

function probe28(): string {
  const firstModeDecay = Math.exp(-0.1 * PI ** 2);
  const secondTimeDecay = Math.exp(-0.2 * PI ** 2);
  const b1 = 8 / PI ** 3;
  const midpointLeadingTerm = b1 * Math.sin(PI / 2) * firstModeDecay;
  return [firstModeDecay, secondTimeDecay, b1, 0, midpointLeadingTerm].join(' ');
}

function probe29(): string {
  const u01 = Math.exp(-1);
  const u11 = 0.5 * (1 + Math.exp(-4));
  return [u01, u11, -6, 6, 1].join(' ');
}

function probe30(): string {
  const interiorSample = 1 + (3 / 2) * Math.cos(PI / 4) - 2 * square(1 / 2) * Math.sin(PI / 2);
  const radialQuarterTurn = 1 - 2 * square(1 / 2);
  return [1, 4, interiorSample, radialQuarterTurn].join(' ');
}

function probe31(): string {
  const kernelAtOrigin = 1 / Math.sqrt(4 * PI);
  const u01 = erfApprox(0.5);
  const u11 = 0.5 * erfApprox(1);
  const nearInitialValue = erfApprox(5);
  return [kernelAtOrigin, u01, u11, nearInitialValue].join(' ');
}

function probe32(): string {
  const slopeAt12 = 2 * 1;
  const invariantAt12 = 2 - square(1);
  const footPoint = invariantAt12;
  const sampleValue = Math.exp(-square(invariantAt12));
  return [slopeAt12, invariantAt12, footPoint, sampleValue].join(' ');
}

function probe33(): string {
  const f = (x: number) => x ** 3 - 2 * x - 5;
  const m1 = 2.5;
  const m2 = 2.25;
  const m3 = 2.125;
  const m4 = 2.0625;
  const bisectionEstimate = (m4 + m3) / 2;
  const df = (x: number) => 3 * x ** 2 - 2;
  const x1 = 2 - f(2) / df(2);
  const x2 = x1 - f(x1) / df(x1);
  const x3 = x2 - f(x2) / df(x2);
  return [m4, bisectionEstimate, x1, x2, x3, m1, m2].join(' ');
}

function simpsonIntegrate(fn: (x: number) => number, start: number, end: number, intervals = 2000): number {
  const n = intervals % 2 === 0 ? intervals : intervals + 1;
  const h = (end - start) / n;
  let total = fn(start) + fn(end);
  for (let i = 1; i < n; i += 1) {
    const x = start + i * h;
    total += (i % 2 === 0 ? 2 : 4) * fn(x);
  }
  return (h / 3) * total;
}

function probe34(): string {
  const q2 = 2 * Math.exp(1 / 3);
  const q3 = 8 / 9 + (10 / 9) * Math.exp(3 / 5);
  const exact = simpsonIntegrate((x) => Math.exp(x * x), -1, 1);
  const err2 = Math.abs(exact - q2);
  const err3 = Math.abs(exact - q3);
  return [q2, q3, exact, err2, err3].join(' ');
}

function probe35(): string {
  const f = (t: number, y: number) => y - t ** 2 + 1;
  const first = rk4Step(f, 0, 0.5, 0.2);
  const second = rk4Step(f, 0.2, first.next, 0.2);
  const exactAt04 = square(1.4) - 0.5 * Math.exp(0.4);
  return [first.k1, first.k4, first.next, second.k2, second.next, exactAt04].join(' ');
}

function probe36(): string {
  const l21 = 1 / 3;
  const u22 = 11 / 3;
  const l32 = 3 / 11;
  const y2 = 14 / 3;
  const y3 = 30 / 11;
  const x1 = 1;
  const kappaInf = 3;
  return [l21, u22, l32, y2, y3, x1, kappaInf].join(' ');
}

function probe37(): string {
  const first01 = 2;
  const first12 = 4;
  const second012 = 1;
  const third = 0;
  const sampleAt15 = 4.75;
  return [first01, first12, second012, third, sampleAt15].join(' ');
}

function probe38(): string {
  const mu1 = 4;
  const x2 = 7 / 9;
  const mu3 = 43 / 9;
  const x4 = 203 / 211;
  return [mu1, x2, mu3, x4, 5].join(' ');
}

function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function probe39(): string {
  const subgroupCount = 6;
  const h = [0, 4, 8];
  const coset1 = h.map((value) => mod(value + 1, 12)).sort((a, b) => a - b);
  const coset2 = h.map((value) => mod(value + 2, 12)).sort((a, b) => a - b);
  const coset3 = h.map((value) => mod(value + 3, 12)).sort((a, b) => a - b);
  const index = 12 / h.length;
  return [subgroupCount, h.length, index, coset1[2], coset2[1], coset3[2]].join(' ');
}

function probe40(): string {
  return [0, 0, 2, 3, 4].join(' ');
}

function probe41(): string {
  return [1, 23, 1, 2, 16].join(' ');
}

function probe42(): string {
  return [1, 1, 8, 7, 7].join(' ');
}

function probe43(): string {
  const xnAt10 = 0.9 ** 10;
  const xnAt50 = 0.9 ** 50;
  return [xnAt10, xnAt50, 1, 0.1, 0.05].join(' ');
}

function probe44(): string {
  const f10half = 5 / 26;
  const f100half = 50 / 2501;
  const peak = 0.5;
  const integral10 = Math.log(101) / 20;
  const integral100 = Math.log(10001) / 200;
  return [f10half, f100half, peak, integral10, integral100].join(' ');
}

function probe45(): string {
  const b1 = 2;
  const b2 = -1;
  const b3 = 2 / 3;
  const parsevalLeft = (2 * PI ** 2) / 3;
  const basel = PI ** 2 / 6;
  return [b1, b2, b3, parsevalLeft, basel].join(' ');
}

function probe46(): string {
  const c = -0.5;
  const midpointValue = (square(0.5) - 0.5) / 2;
  const secondVariationSample = PI ** 2;
  const minimumValue = -1 / 12;
  return [c, midpointValue, secondVariationSample, minimumValue].join(' ');
}

function probe47(): string {
  const trialValue = 3;
  const zStar = 18 / 19;
  const xStar = 16 / 19;
  const yStar = 22 / 19;
  const minimumValue = 56 / 19;
  return [trialValue, zStar, xStar, yStar, minimumValue].join(' ');
}

function probe48(): string {
  const partAat1 = (4 * (3 * square(4) - 4)) / (square(square(4) + 4) * (square(4) + 4));
  const inverseAt1 = Math.exp(-1) * (1 - Math.cos(2) + 1.5 * Math.sin(2));
  return [partAat1, 1, 3, inverseAt1, 1].join(' ');
}

function probe49(): string {
  const stirling10 = Math.sqrt(2 * PI * 10) * (10 / Math.E) ** 10;
  const relativeError10 = Math.abs(factorial(10) - stirling10) / factorial(10);
  return [1, -1, -1, stirling10, relativeError10].join(' ');
}

function probe50(): string {
  const c = 2;
  const omega = Math.sqrt(c ** 2 - 1);
  const bAt1 = Math.cos(omega) + Math.sin(omega) / omega;
  const amplitudeAtMidpoint = Math.exp(-1) * bAt1;
  return [omega, 1, 1, bAt1, amplitudeAtMidpoint].join(' ');
}

function eulerTotient(n: number): number {
  let result = n;
  let value = n;
  for (let p = 2; p * p <= value; p += 1) {
    if (value % p === 0) {
      while (value % p === 0) value /= p;
      result -= result / p;
    }
  }
  if (value > 1) result -= result / value;
  return result;
}

function combinations(n: number, k: number): number {
  let out = 1;
  for (let i = 0; i < k; i += 1) out = (out * (n - i)) / (i + 1);
  return out;
}

function probe51(): string {
  const count =
    Math.floor(1000 / 2) +
    Math.floor(1000 / 3) +
    Math.floor(1000 / 5) -
    Math.floor(1000 / 6) -
    Math.floor(1000 / 10) -
    Math.floor(1000 / 15) +
    Math.floor(1000 / 30);
  return [count].join(' ');
}

function probe52(): string {
  return [8, 4].join(' ');
}

function probe53(): string {
  return [6, 'even permutation sign'].join(' ');
}

function probe54(): string {
  return ['prime ideal (7)', 4, 3].join(' ');
}

function probe55(): string {
  return ['irreducible over Q'].join(' ');
}

function probe56(): string {
  return [8, 'multiplicative inverse'].join(' ');
}

function probe57(): string {
  return ['simplified boolean', 1].join(' ');
}

function probe58(): string {
  return [(10 * 11 * 21) / 6].join(' ');
}

function probe59(): string {
  return ['countable Q', 'uncountable binary sequences'].join(' ');
}

function probe60(): string {
  return ['Cauchy sequence in Q', 'not complete'].join(' ');
}

function probe61(): string {
  return [1, 'fixed point'].join(' ');
}

function probe62(): string {
  return [eulerTotient(360)].join(' ');
}

function probe63(): string {
  return [combinations(12, 5)].join(' ');
}

function probe64(): string {
  return [22, 20].join(' ');
}

function probe65(): string {
  return [6, 12].join(' ');
}

function probe66(): string {
  let a0 = 2;
  let a1 = 3;
  for (let i = 0; i < 5; i += 1) {
    const next = a0 + a1;
    a0 = a1;
    a1 = next;
  }
  return [a1].join(' ');
}

function probe67(): string {
  return [8].join(' ');
}

function probe68(): string {
  return [Math.sqrt(54)].join(' ');
}

function probe69(): string {
  return [0.5, 60].join(' ');
}

function probe70(): string {
  return [1, -1].join(' ');
}

function probe71(): string {
  return [5, -2, 29].join(' ');
}

function probe72(): string {
  return [(combinations(4, 2) * combinations(6, 1)) / combinations(10, 3)].join(' ');
}

function probe73(): string {
  const p = 0.25;
  return [1 / p, (1 - p) / square(p), (1 - p) ** 3].join(' ');
}

function probe74(): string {
  return [5, 3, 0.5].join(' ');
}

function probe75(): string {
  return [0.25, 0.5].join(' ');
}

function probe76(): string {
  const h = 0.1;
  return [(square(2 + h) - square(2)) / h, 4].join(' ');
}

function probe77(): string {
  const h = 0.25;
  const trap =
    (h / 2) * (0 + 2 * square(0.25) + 2 * square(0.5) + 2 * square(0.75) + square(1));
  return [trap, 1 / 3].join(' ');
}

function probe78(): string {
  return [1.5, 2.25].join(' ');
}

function probe79(): string {
  return [2].join(' ');
}

function probe80(): string {
  return [-1].join(' ');
}

function probe81(): string {
  return [5, 1].join(' ');
}

function probe82(): string {
  return [3, 4, 4 / 3].join(' ');
}

function probe83(): string {
  return [100].join(' ');
}

function probe84(): string {
  return [2, -1, 2].join(' ');
}

function probe85(): string {
  return [2 * Math.sinh(1)].join(' ');
}

function probe86(): string {
  return [2].join(' ');
}

function probe87(): string {
  return [Math.exp(-1)].join(' ');
}

function probe88(): string {
  return [2, 2].join(' ');
}

function probe89(): string {
  return [0.5, 0.5, 0.5].join(' ');
}

function probe90(): string {
  return [1, 0.4, 1].join(' ');
}

function probe91(): string {
  return [-1, 0, -1, 0].join(' ');
}

function probe92(): string {
  const dp = Array.from({ length: 9 }, () => 0);
  dp[0] = 1;
  for (let part = 1; part <= 8; part += 1) {
    for (let k = part; k <= 8; k += 1) dp[k] = (dp[k] ?? 0) + (dp[k - part] ?? 0);
  }
  return [dp[8]].join(' ');
}

function probe93(): string {
  const stirling = (n: number, k: number): number => {
    if (k === 0) return n === 0 ? 1 : 0;
    if (n === 0) return 0;
    return k * stirling(n - 1, k) + stirling(n - 1, k - 1);
  };
  return [stirling(5, 3)].join(' ');
}

function probe94(): string {
  return [combinations(10, 5) / 6].join(' ');
}

function probe95(): string {
  const stirling = (n: number, k: number): number => {
    if (k === 0) return n === 0 ? 1 : 0;
    if (n === 0) return 0;
    return k * stirling(n - 1, k) + stirling(n - 1, k - 1);
  };
  let total = 0;
  for (let k = 0; k <= 5; k += 1) total += stirling(5, k);
  return [total].join(' ');
}

function probe96(): string {
  let a = 0;
  let b = 1;
  for (let i = 1; i < 10; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return [b].join(' ');
}

function probe97(): string {
  let a = 2;
  let b = 1;
  for (let i = 2; i <= 8; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return [b].join(' ');
}

function probe98(): string {
  return [17, 12, 17 / 12].join(' ');
}

function probe99(): string {
  return [13].join(' ');
}

function probe100(): string {
  const r = 3.9;
  let x = 0.5;
  const out = [x];
  for (let i = 0; i < 3; i += 1) {
    x = r * x * (1 - x);
    out.push(x);
  }
  return out.slice(1).join(' ');
}

export const MATH_NUMERIC_PROBES: Record<number, () => string> = {
  26: probe26,
  27: probe27,
  28: probe28,
  29: probe29,
  30: probe30,
  31: probe31,
  32: probe32,
  33: probe33,
  34: probe34,
  35: probe35,
  36: probe36,
  37: probe37,
  38: probe38,
  39: probe39,
  40: probe40,
  41: probe41,
  42: probe42,
  43: probe43,
  44: probe44,
  45: probe45,
  46: probe46,
  47: probe47,
  48: probe48,
  49: probe49,
  50: probe50,
  51: probe51,
  52: probe52,
  53: probe53,
  54: probe54,
  55: probe55,
  56: probe56,
  57: probe57,
  58: probe58,
  59: probe59,
  60: probe60,
  61: probe61,
  62: probe62,
  63: probe63,
  64: probe64,
  65: probe65,
  66: probe66,
  67: probe67,
  68: probe68,
  69: probe69,
  70: probe70,
  71: probe71,
  72: probe72,
  73: probe73,
  74: probe74,
  75: probe75,
  76: probe76,
  77: probe77,
  78: probe78,
  79: probe79,
  80: probe80,
  81: probe81,
  82: probe82,
  83: probe83,
  84: probe84,
  85: probe85,
  86: probe86,
  87: probe87,
  88: probe88,
  89: probe89,
  90: probe90,
  91: probe91,
  92: probe92,
  93: probe93,
  94: probe94,
  95: probe95,
  96: probe96,
  97: probe97,
  98: probe98,
  99: probe99,
  100: probe100,
};

export function getMathNumericProbe(questionNumber: number): string | undefined {
  return MATH_NUMERIC_PROBES[questionNumber]?.();
}
