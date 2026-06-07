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
};

export function getMathNumericProbe(questionNumber: number): string | undefined {
  return MATH_NUMERIC_PROBES[questionNumber]?.();
}
