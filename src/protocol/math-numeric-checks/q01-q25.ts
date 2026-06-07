import { expectApprox, expectContains, withSolverContext, type NumericVerificationSolver } from '../numeric-verify-shared';

const PI = Math.PI;

function matrixPower2x2(
  a: number,
  b: number,
  c: number,
  d: number,
  n: number,
): [number, number, number, number] {
  let m00 = 1;
  let m01 = 0;
  let m10 = 0;
  let m11 = 1;
  for (let k = 0; k < n; k += 1) {
    const n00 = a * m00 + b * m10;
    const n01 = a * m01 + b * m11;
    const n10 = c * m00 + d * m10;
    const n11 = c * m01 + d * m11;
    m00 = n00;
    m01 = n01;
    m10 = n10;
    m11 = n11;
  }
  return [m00, m01, m10, m11];
}

export const verifyQ01: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'limit (a) Taylor remainder', 1 / 6, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'limit (b) asymptotic', -0.5, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'limit (c) x^x', 1, { rel: 0.01, abs: 0.01 });
    expectContains(ctx, 'indeterminate 0^0 discussion', 'indeterminate');
  });

export const verifyQ02: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, "derivative f'(0)", 0, { rel: 0.01, abs: 0.01 });
    expectContains(ctx, 'continuity at 0', 'continuous');
    expectContains(ctx, 'not C^1 conclusion', 'not c');
  });

export const verifyQ03: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'directional derivative', 14 / 5, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'gradient x-component at (1,1)', 2, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'gradient y-component at (1,1)', -2, { rel: 0.02, abs: 0.02 });
    expectContains(ctx, 'saddle classification', 'saddle');
  });

export const verifyQ04: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'ln(1.2) approximation', 0.1823, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'Lagrange remainder bound', 1.07e-5, { rel: 0.15, abs: 5e-6 });
    expectApprox(ctx, 'error threshold', 1e-4, { rel: 0.05, abs: 1e-5 });
  });

export const verifyQ05: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'polar integral (a)', (3 * PI) / 2, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'triple integral (b)', 8 * PI, { rel: 0.02, abs: 0.05 });
    expectApprox(ctx, 'intersection radius r^2=2', 2, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ06: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, "Green's theorem result", 0, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, "Stokes' theorem result", 0, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ07: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'rank(A)', 3, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'nullity', 1, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'rank-nullity sum', 4, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ08: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'eigenvalue 5', 5, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'eigenvalue 2', 2, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'A^10 (3,3) entry 2^10', 2 ** 10, { rel: 0.01, abs: 1 });
    expectApprox(ctx, 'A^10 (1,1) entry', 6510758, { rel: 0.01, abs: 100 });
  });

export const verifyQ09: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'projection coefficient on x^3', 3 / 5, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, '||u_3||^2', 8 / 45, { rel: 0.03, abs: 0.002 });
    expectApprox(ctx, '||u_1||^2', 2, { rel: 0.02, abs: 0.02 });
  });

export const verifyQ10: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'singular value', 5, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'least-squares x1', 7 / 25, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'least-squares x2', 1 / 5, { rel: 0.02, abs: 0.002 });
  });

export const verifyQ11: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'minimum eigenvalue on unit sphere', 0.474572, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'middle eigenvalue', 1.369102, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'largest eigenvalue', 6.156325, { rel: 0.02, abs: 0.003 });
  });

export const verifyQ12: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectContains(ctx, 'exactness of first equation', 'exact');
    expectContains(ctx, 'implicit solution first equation', 'x^2y+xy^2');
    expectContains(ctx, 'integrating factor power form', 'xy^2');
  });

export const verifyQ13: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Wronskian sample', Math.E ** 3, { rel: 0.02, abs: 0.05 });
    expectApprox(ctx, 'c1', -1, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'c2', 1, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ14: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'indicial root +1/2', 0.5, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'indicial root -1/2', -0.5, { rel: 0.01, abs: 0.01 });
    expectContains(ctx, 'Bessel J_{1/2}', 'j_{1/2}');
  });

export const verifyQ15: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'repeated eigenvalue', -1, { rel: 0.01, abs: 0.01 });
    expectContains(ctx, 'stable improper node', 'improper');
    expectContains(ctx, 'eigendirection y=x/2', 'x/2');
  });

export const verifyQ16: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'amplitude coefficient 1/4', 0.25, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'solution after pi', 0, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ17: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectContains(ctx, 'eigenvalue formula', '(2n-1)');
    expectContains(ctx, 'first eigenfunction sine', 'sin');
    expectContains(ctx, 'no negative eigenvalues', 'lambda>0');
  });

export const verifyQ18: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, "f'(0)", 0, { rel: 0.01, abs: 0.01 });
    expectContains(ctx, 'harmonic conjugate', '3x^2y-y^3');
    expectContains(ctx, 'analytic function z^3+2z', 'z^3+2z');
  });

export const verifyQ19: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const firstContour = 2 * PI * (Math.E - 2);
    expectApprox(ctx, 'first contour integral', firstContour, { rel: 0.03, abs: 0.05 });
    expectApprox(ctx, 'deformed contour value', PI / (2 * Math.E), { rel: 0.03, abs: 0.005 });
  });

export const verifyQ20: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'real integral (a)', PI / 3, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'trig integral (b)', (2 * PI) / Math.sqrt(3), { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'inside pole -2+sqrt3', -2 + Math.sqrt(3), { rel: 0.02, abs: 0.002 });
  });

export const verifyQ21: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Laurent coeff -1/6', -1 / 6, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'residue sin z / z^3 at 0', 0, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'residue 1/(z^2(1-z)) at 0', 1, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'residue at z=1', -1, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ22: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'phi(i)', 0, { rel: 0.01, abs: 0.01 });
    expectContains(ctx, 'boundary harmonic solution', 'x^2+y^2-1');
    expectContains(ctx, 'inverse Mobius map', '1+w');
  });

export const verifyQ23: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'normalizing constant c', 0.5, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'E[X]', 3, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'Var(X)', 3, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ24: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'E[X]', 2 / 3, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'E[Y]', 0.75, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'Cov(X,Y)', 0, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'P(X+Y<1)', 0.1, { rel: 0.02, abs: 0.01 });
  });

export const verifyQ25: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'standard error', 0.05, { rel: 0.02, abs: 0.002 });
    expectApprox(ctx, 'CI lower bound', 9.982, { rel: 0.01, abs: 0.003 });
    expectApprox(ctx, 'CI upper bound', 10.178, { rel: 0.01, abs: 0.003 });
    expectApprox(ctx, 'z statistic', 1.6, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'p-value', 0.1096, { rel: 0.05, abs: 0.005 });
  });

export const MATH_NUMERIC_SOLVERS_Q01_TO_Q25: NumericVerificationSolver[] = [
  verifyQ01,
  verifyQ02,
  verifyQ03,
  verifyQ04,
  verifyQ05,
  verifyQ06,
  verifyQ07,
  verifyQ08,
  verifyQ09,
  verifyQ10,
  verifyQ11,
  verifyQ12,
  verifyQ13,
  verifyQ14,
  verifyQ15,
  verifyQ16,
  verifyQ17,
  verifyQ18,
  verifyQ19,
  verifyQ20,
  verifyQ21,
  verifyQ22,
  verifyQ23,
  verifyQ24,
  verifyQ25,
];

/** Sanity: power method on 2x2 block of Q08 matrix matches dominant eigenvalue 5. */
export function independentMatrixCheck(): void {
  const [m00] = matrixPower2x2(4, 1, 2, 3, 10);
  if (Math.abs(m00 - 6510758) > 100) {
    throw new Error(`matrix power check failed: ${m00}`);
  }
}
