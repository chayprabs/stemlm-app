import {
  expectApprox,
  type PhysicsVerificationSolver,
  withSolverContext,
} from '../../physics-benchmark/solvers/shared';

export type MathVerificationSolver = PhysicsVerificationSolver;

const PI = Math.PI;

function square(value: number): number {
  return value * value;
}

function erfApprox(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * ax);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const poly = (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t);
  const y = 1 - poly * Math.exp(-ax * ax);
  return sign * y;
}

function simpsonIntegrate(
  fn: (x: number) => number,
  start: number,
  end: number,
  intervals = 2000,
): number {
  const n = intervals % 2 === 0 ? intervals : intervals + 1;
  const h = (end - start) / n;
  let total = fn(start) + fn(end);

  for (let i = 1; i < n; i += 1) {
    const x = start + i * h;
    total += (i % 2 === 0 ? 2 : 4) * fn(x);
  }

  return (h / 3) * total;
}

function rk4Step(
  f: (t: number, y: number) => number,
  t: number,
  y: number,
  h: number,
): { next: number; k1: number; k2: number; k3: number; k4: number } {
  const k1 = h * f(t, y);
  const k2 = h * f(t + h / 2, y + k1 / 2);
  const k3 = h * f(t + h / 2, y + k2 / 2);
  const k4 = h * f(t + h, y + k3);
  const next = y + (k1 + 2 * k2 + 2 * k3 + k4) / 6;
  return { next, k1, k2, k3, k4 };
}

function mod(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}

function factorial(n: number): number {
  let out = 1;
  for (let k = 2; k <= n; k += 1) out *= k;
  return out;
}

export const verifyQ26: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const mgfSample = (3 / (3 - 1)) ** 2;
    const meanSample = 4 / 2;
    const varianceSample = 4 / square(2);
    const sumMgfSample = (5 / (5 - 1)) ** (2 + 3);
    const sumVariance = (2 + 3) / square(5);

    expectApprox(ctx, 'Gamma MGF sample', mgfSample, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'Gamma mean sample', meanSample, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'Gamma variance sample', varianceSample, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'sum MGF sample', sumMgfSample, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'sum variance sample', sumVariance, { rel: 0.03, abs: 0.005 });
  });

export const verifyQ27: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const p13 = 0.5 * 0 + 0.5 * 0.25 + 0 * 0.5;
    const p11 = 0.5 * 0.5 + 0.5 * 0.25 + 0 * 0;
    const pi1 = 0.25;
    const pi2 = 0.5;
    const returnTime1 = 1 / pi1;

    expectApprox(ctx, 'stationary probability pi1', pi1, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'stationary probability pi2', pi2, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'two-step probability P^2_11', p11, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'two-step probability P^2_13', p13, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'mean return time to state 1', returnTime1, { rel: 0.02, abs: 0.02 });
  });

export const verifyQ28: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const firstModeDecay = Math.exp(-0.1 * PI ** 2);
    const secondTimeDecay = Math.exp(-0.2 * PI ** 2);
    const b1 = 8 / PI ** 3;
    const b2 = 0;
    const midpointLeadingTerm = b1 * Math.sin(PI / 2) * firstModeDecay;

    expectApprox(ctx, 'first-mode decay at t=0.1', firstModeDecay, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'first-mode decay at t=0.2', secondTimeDecay, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'first sine coefficient b1', b1, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'second sine coefficient b2', b2, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'midpoint leading term at t=0.1', midpointLeadingTerm, {
      rel: 0.04,
      abs: 0.003,
    });
  });

export const verifyQ29: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const u01 = Math.exp(-1);
    const u11 = 0.5 * (1 + Math.exp(-4));
    const centerLeft = -6;
    const centerRight = 6;

    expectApprox(ctx, 'u(0,1) for c=1', u01, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'u(1,1) for c=1', u11, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'left pulse center for c=2,t=3', centerLeft, { rel: 0.01, abs: 0.05 });
    expectApprox(ctx, 'right pulse center for c=2,t=3', centerRight, { rel: 0.01, abs: 0.05 });
    expectApprox(ctx, 'initial peak value', 1, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ30: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const centerValue = 1;
    const boundaryAtZero = 4;
    const interiorSample = 1 + (3 / 2) * Math.cos(PI / 4) - 2 * square(1 / 2) * Math.sin(PI / 2);
    const radialQuarterTurn = 1 - 2 * square(1 / 2);

    expectApprox(ctx, 'center value u(0,theta)', centerValue, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'boundary value at theta=0', boundaryAtZero, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'interior sample u(a/2,pi/4)', interiorSample, {
      rel: 0.03,
      abs: 0.01,
    });
    expectApprox(ctx, 'quarter-turn interior value', radialQuarterTurn, {
      rel: 0.03,
      abs: 0.01,
    });
  });

export const verifyQ31: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const kernelAtOrigin = 1 / Math.sqrt(4 * PI);
    const u01 = erfApprox(0.5);
    const u11 = 0.5 * erfApprox(1);
    const nearInitialValue = erfApprox(5);

    expectApprox(ctx, 'heat kernel G(0,1)', kernelAtOrigin, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'smoothed midpoint value u(0,1)', u01, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'interface value u(1,1)', u11, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'near-initial inside limit u(0,0.01)', nearInitialValue, {
      rel: 0.01,
      abs: 0.002,
    });
  });

export const verifyQ32: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const slopeAt12 = 2 * 1;
    const invariantAt12 = 2 - square(1);
    const footPoint = invariantAt12;
    const sampleValue = Math.exp(-square(invariantAt12));

    expectApprox(ctx, 'characteristic slope at (1,2)', slopeAt12, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'characteristic invariant at (1,2)', invariantAt12, {
      rel: 0.02,
      abs: 0.02,
    });
    expectApprox(ctx, 'initial foot point y0 at (1,2)', footPoint, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'sample solution value u(1,2)', sampleValue, { rel: 0.03, abs: 0.003 });
  });

export const verifyQ33: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
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

    expectApprox(ctx, 'fourth bisection midpoint', m4, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'bisection estimate after four steps', bisectionEstimate, {
      rel: 0.02,
      abs: 0.002,
    });
    expectApprox(ctx, 'first Newton iterate', x1, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'second Newton iterate', x2, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'third Newton iterate', x3, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'bisection midpoint m1', m1, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'bisection midpoint m2', m2, { rel: 0.02, abs: 0.002 });
  });

export const verifyQ34: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const q2 = 2 * Math.exp(1 / 3);
    const q3 = 8 / 9 + (10 / 9) * Math.exp(3 / 5);
    const exact = simpsonIntegrate((x) => Math.exp(x * x), -1, 1);
    const err2 = Math.abs(exact - q2);
    const err3 = Math.abs(exact - q3);

    expectApprox(ctx, '2-point Gauss-Legendre value', q2, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, '3-point Gauss-Legendre value', q3, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'reference integral value', exact, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, '2-point absolute error', err2, { rel: 0.03, abs: 0.005 });
    expectApprox(ctx, '3-point absolute error', err3, { rel: 0.03, abs: 0.003 });
  });

export const verifyQ35: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const f = (t: number, y: number) => y - t ** 2 + 1;
    const first = rk4Step(f, 0, 0.5, 0.2);
    const second = rk4Step(f, 0.2, first.next, 0.2);
    const exactAt04 = square(1.4) - 0.5 * Math.exp(0.4);

    expectApprox(ctx, 'first-step k1', first.k1, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'first-step k4', first.k4, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'RK4 value at t=0.2', first.next, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'second-step k2', second.k2, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'RK4 value at t=0.4', second.next, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'exact solution at t=0.4', exactAt04, { rel: 0.02, abs: 0.002 });
  });

export const verifyQ36: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const l21 = 1 / 3;
    const u22 = 11 / 3;
    const l32 = 3 / 11;
    const y2 = 14 / 3;
    const y3 = 30 / 11;
    const x1 = 1;
    const kappaInf = 3;

    expectApprox(ctx, 'LU multiplier l21', l21, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'U22 entry', u22, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'LU multiplier l32', l32, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'forward substitution y2', y2, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'forward substitution y3', y3, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'solution component x1', x1, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'infinity-norm condition number', kappaInf, { rel: 0.02, abs: 0.02 });
  });

export const verifyQ37: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const first01 = (3 - 1) / (1 - 0);
    const first12 = (7 - 3) / (2 - 1);
    const first23 = (13 - 7) / (3 - 2);
    const second012 = (first12 - first01) / (2 - 0);
    const second123 = (first23 - first12) / (3 - 1);
    const third = (second123 - second012) / (3 - 0);
    const sampleAt15 = 1.5 ** 2 + 1.5 + 1;

    expectApprox(ctx, 'first divided difference f[0,1]', first01, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'first divided difference f[1,2]', first12, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'second divided difference f[0,1,2]', second012, {
      rel: 0.02,
      abs: 0.002,
    });
    expectApprox(ctx, 'third divided difference', third, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'polynomial sample P(1.5)', sampleAt15, { rel: 0.02, abs: 0.01 });
  });

export const verifyQ38: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const mu1 = 4;
    const x2 = 7 / 9;
    const mu3 = 43 / 9;
    const x4 = 203 / 211;
    const dominantEigenvalue = 5;

    expectApprox(ctx, 'first scaling factor', mu1, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'second iterate ratio', x2, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'third scaling factor', mu3, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'fourth iterate ratio', x4, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'dominant eigenvalue', dominantEigenvalue, { rel: 0.02, abs: 0.01 });
  });

export const verifyQ39: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const subgroupCount = 6;
    const h = [0, 4, 8];
    const coset1 = h.map((value) => mod(value + 1, 12)).sort((a, b) => a - b);
    const coset2 = h.map((value) => mod(value + 2, 12)).sort((a, b) => a - b);
    const coset3 = h.map((value) => mod(value + 3, 12)).sort((a, b) => a - b);
    const index = 12 / h.length;

    expectApprox(ctx, 'number of subgroups of Z12', subgroupCount, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'size of H', h.length, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'index of H', index, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'largest element of 1+H', coset1[2] ?? 0, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'middle element of 2+H', coset2[1] ?? 0, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'largest element of 3+H', coset3[2] ?? 0, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ40: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const pAtIReal = -1 + 1;
    const pAtIImag = 0;
    const imageReal = 2;
    const imageImag = 3;
    const twoNorm = 4;

    expectApprox(ctx, 'real part of (i^2+1)', pAtIReal, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'imaginary part of (i^2+1)', pAtIImag, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'real part of phi(2+3x)', imageReal, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'imaginary part of phi(2+3x)', imageImag, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'norm of 2 in Z[i]', twoNorm, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ41: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const crtSolution = 23;
    const kResidue = 1;
    const mod5Residue = 1;
    const mod7Residue = 2;
    const powerMod35 = 16;

    expectApprox(ctx, 'CRT auxiliary residue k mod 5', kResidue, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'CRT solution mod 105', crtSolution, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, '2^100 residue mod 5', mod5Residue, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, '2^100 residue mod 7', mod7Residue, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, '2^100 residue mod 35', powerMod35, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ42: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const p0 = 1;
    const p1 = 1;
    const fieldSize = 2 ** 3;
    const nonzeroSize = fieldSize - 1;
    const alphaOrder = 7;

    expectApprox(ctx, 'p(0) in F2', p0, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'p(1) in F2', p1, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'field size', fieldSize, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'nonzero multiplicative group size', nonzeroSize, {
      rel: 0.01,
      abs: 0.01,
    });
    expectApprox(ctx, 'multiplicative order of alpha', alphaOrder, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ43: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const xnAt10 = 0.9 ** 10;
    const xnAt50 = 0.9 ** 50;
    const supDistance = 1;
    const g10Amplitude = 1 / 10;
    const g20Amplitude = 1 / 20;

    expectApprox(ctx, '0.9^10 sample', xnAt10, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, '0.9^50 sample', xnAt50, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'sup error for x^n sequence', supDistance, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'amplitude bound for sin(10x)/10', g10Amplitude, {
      rel: 0.02,
      abs: 0.002,
    });
    expectApprox(ctx, 'amplitude bound for sin(20x)/20', g20Amplitude, {
      rel: 0.02,
      abs: 0.002,
    });
  });

export const verifyQ44: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const f10half = 5 / 26;
    const f100half = 50 / 2501;
    const peak = 0.5;
    const integral10 = Math.log(101) / 20;
    const integral100 = Math.log(10001) / 200;

    expectApprox(ctx, 'sample value f10(0.5)', f10half, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'sample value f100(0.5)', f100half, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'peak value at x=1/n', peak, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'integral for n=10', integral10, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'integral for n=100', integral100, { rel: 0.03, abs: 0.003 });
  });

export const verifyQ45: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const b1 = 2;
    const b2 = -1;
    const b3 = 2 / 3;
    const parsevalLeft = (2 * PI ** 2) / 3;
    const basel = PI ** 2 / 6;

    expectApprox(ctx, 'first sine coefficient b1', b1, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'second sine coefficient b2', b2, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'third sine coefficient b3', b3, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'Parseval left-hand side', parsevalLeft, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'Basel sum', basel, { rel: 0.02, abs: 0.02 });
  });

export const verifyQ46: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const c = -0.5;
    const midpointValue = (square(0.5) - 0.5) / 2;
    const secondVariationSample = PI ** 2;
    const minimumValue = -1 / 12;

    expectApprox(ctx, 'linear coefficient C', c, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'midpoint value y(1/2)', midpointValue, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'sample second variation', secondVariationSample, {
      rel: 0.02,
      abs: 0.03,
    });
    expectApprox(ctx, 'minimum functional value', minimumValue, { rel: 0.02, abs: 0.002 });
  });

export const verifyQ47: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const zStar = 18 / 19;
    const xStar = 16 / 19;
    const yStar = 22 / 19;
    const trialValue = 3;
    const minimumValue = 56 / 19;

    expectApprox(ctx, 'trial feasible value at (1,1,1)', trialValue, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'minimizing z coordinate', zStar, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'minimizing x coordinate', xStar, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'minimizing y coordinate', yStar, { rel: 0.02, abs: 0.003 });
    expectApprox(ctx, 'minimum objective value', minimumValue, { rel: 0.02, abs: 0.003 });
  });

export const verifyQ48: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const partAat1 = (4 * (3 * square(4) - 4)) / (square(square(4) + 4) * (square(4) + 4));
    const inverseAt1 = Math.exp(-1) * (1 - Math.cos(2) + 1.5 * Math.sin(2));
    const yAtPiOver2 = Math.sin(PI / 2);
    const partialFractionA = 1;
    const partialFractionC = 3;

    expectApprox(ctx, 'part (a) transform at s=1', partAat1, { rel: 0.03, abs: 0.003 });
    expectApprox(ctx, 'partial fraction coefficient A', partialFractionA, {
      rel: 0.01,
      abs: 0.01,
    });
    expectApprox(ctx, 'partial fraction coefficient C', partialFractionC, {
      rel: 0.01,
      abs: 0.01,
    });
    expectApprox(ctx, 'inverse transform sample at t=1', inverseAt1, {
      rel: 0.03,
      abs: 0.01,
    });
    expectApprox(ctx, 'solution sample y(pi/2)', yAtPiOver2, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ49: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const saddle = 1;
    const phiAtSaddle = -1;
    const phi2AtSaddle = -1;
    const stirling10 = Math.sqrt(2 * PI * 10) * (10 / Math.E) ** 10;
    const relativeError10 = Math.abs(factorial(10) - stirling10) / factorial(10);

    expectApprox(ctx, 'dominant saddle location', saddle, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'phase value phi(1)', phiAtSaddle, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'second derivative phi"(1)', phi2AtSaddle, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'Stirling approximation for 10!', stirling10, {
      rel: 0.02,
      abs: 1000,
    });
    expectApprox(ctx, 'relative error for 10!', relativeError10, {
      rel: 0.05,
      abs: 0.001,
    });
  });

export const verifyQ50: MathVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const c = 2;
    const omega = Math.sqrt(c ** 2 - 1);
    const bAt1 = Math.cos(omega) + Math.sin(omega) / omega;
    const amplitudeAtMidpoint = Math.exp(-1) * bAt1;
    const b0 = 1;
    const bPrime0 = 1;

    expectApprox(ctx, 'frequency sqrt(c^2-1) for c=2', omega, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'initial value b(0)', b0, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'initial slope b\'(0)', bPrime0, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'time factor b(1) for c=2', bAt1, { rel: 0.03, abs: 0.01 });
    expectApprox(ctx, 'u(pi/2,1) for c=2', amplitudeAtMidpoint, { rel: 0.04, abs: 0.01 });
  });

export const MATH_BENCHMARK_SOLVERS_Q26_TO_Q50: MathVerificationSolver[] = [
  verifyQ26,
  verifyQ27,
  verifyQ28,
  verifyQ29,
  verifyQ30,
  verifyQ31,
  verifyQ32,
  verifyQ33,
  verifyQ34,
  verifyQ35,
  verifyQ36,
  verifyQ37,
  verifyQ38,
  verifyQ39,
  verifyQ40,
  verifyQ41,
  verifyQ42,
  verifyQ43,
  verifyQ44,
  verifyQ45,
  verifyQ46,
  verifyQ47,
  verifyQ48,
  verifyQ49,
  verifyQ50,
];

export default MATH_BENCHMARK_SOLVERS_Q26_TO_Q50;
