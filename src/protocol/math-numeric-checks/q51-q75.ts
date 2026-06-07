import {
  expectApprox,
  expectContains,
  type NumericVerificationSolver,
  withSolverContext,
} from '../numeric-verify-shared';

const PI = Math.PI;

function square(v: number): number {
  return v * v;
}

function combinations(n: number, k: number): number {
  let out = 1;
  for (let i = 0; i < k; i += 1) out = (out * (n - i)) / (i + 1);
  return out;
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

export const verifyQ51: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const count =
      Math.floor(1000 / 2) +
      Math.floor(1000 / 3) +
      Math.floor(1000 / 5) -
      Math.floor(1000 / 6) -
      Math.floor(1000 / 10) -
      Math.floor(1000 / 15) +
      Math.floor(1000 / 30);
    expectApprox(ctx, 'inclusion-exclusion count', count, { rel: 0.01, abs: 1 });
  });

export const verifyQ52: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'number of subgroups of Z_24', 8, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'elements of order 8', 4, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ53: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'order of permutation', 6, { rel: 0.01, abs: 0.01 });
    expectContains(ctx, 'even permutation sign', 'even');
  });

export const verifyQ54: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectContains(ctx, 'prime ideal (7)', 'prime');
    expectApprox(ctx, 'Z/4 factor in decomposition', 4, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'Z/3 factor in decomposition', 3, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ55: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectContains(ctx, 'irreducibility conclusion', 'irreducible');
  });

export const verifyQ56: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'field size |F_8|', 8, { rel: 0.01, abs: 0.01 });
    expectContains(ctx, 'multiplicative inverse discussion', 'inverse');
  });

export const verifyQ57: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectContains(ctx, 'simplified boolean form', 'a');
    expectApprox(ctx, 'sample simplified evaluation', 1, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ58: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const sumSquares10 = (10 * 11 * 21) / 6;
    expectApprox(ctx, 'sum of squares n=10', sumSquares10, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ59: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectContains(ctx, 'Q is countable', 'countable');
    expectContains(ctx, 'uncountable binary sequences', 'uncountable');
  });

export const verifyQ60: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectContains(ctx, 'Cauchy sequence example', 'cauchy');
    expectContains(ctx, 'completeness failure in Q', 'complete');
  });

export const verifyQ61: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Lipschitz constant of integration operator', 1, { rel: 0.01, abs: 0.01 });
    expectContains(ctx, 'fixed-point setup', 'fixed');
  });

export const verifyQ62: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Euler totient phi(360)', eulerTotient(360), { rel: 0.01, abs: 0.01 });
  });

export const verifyQ63: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'binomial C(12,5)', combinations(12, 5), { rel: 0.01, abs: 0.01 });
  });

export const verifyQ64: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'least positive CRT solution', 22, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'modulus', 20, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ65: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'edges in K_4', 6, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'sum of degrees', 12, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ66: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    let a0 = 2;
    let a1 = 3;
    for (let i = 0; i < 5; i += 1) {
      const next = a0 + a1;
      a0 = a1;
      a1 = next;
    }
    expectApprox(ctx, 'a_6 term', a1, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ67: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'determinant', 8, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ68: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const crossMag = Math.sqrt(9 + 36 + 9);
    expectApprox(ctx, 'cross product magnitude', crossMag, { rel: 0.02, abs: 0.02 });
  });

export const verifyQ69: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'cosine of angle', 0.5, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'angle in degrees', 60, { rel: 0.02, abs: 0.5 });
  });

export const verifyQ70: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'eigenvalue +1', 1, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'eigenvalue -1', -1, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ71: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'trace of B', 5, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'determinant of B', -2, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'trace of B^2', 29, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ72: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const prob = (combinations(4, 2) * combinations(6, 1)) / combinations(10, 3);
    expectApprox(ctx, 'hypergeometric P(X=2)', prob, { rel: 0.02, abs: 0.02 });
  });

export const verifyQ73: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const p = 0.25;
    expectApprox(ctx, 'geometric mean E[X]', 1 / p, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'geometric variance', (1 - p) / square(p), { rel: 0.02, abs: 0.05 });
    expectApprox(ctx, 'P(X>=4)', (1 - p) ** 3, { rel: 0.03, abs: 0.02 });
  });

export const verifyQ74: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'uniform mean', 5, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'uniform variance', 3, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'P(X<=5)', 0.5, { rel: 0.02, abs: 0.02 });
  });

export const verifyQ75: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Chebyshev bound sigma^2=25', 0.25, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'Chebyshev bound sigma^2=100', 0.5, { rel: 0.03, abs: 0.02 });
  });

export const MATH_NUMERIC_SOLVERS_Q51_TO_Q75: NumericVerificationSolver[] = [
  verifyQ51,
  verifyQ52,
  verifyQ53,
  verifyQ54,
  verifyQ55,
  verifyQ56,
  verifyQ57,
  verifyQ58,
  verifyQ59,
  verifyQ60,
  verifyQ61,
  verifyQ62,
  verifyQ63,
  verifyQ64,
  verifyQ65,
  verifyQ66,
  verifyQ67,
  verifyQ68,
  verifyQ69,
  verifyQ70,
  verifyQ71,
  verifyQ72,
  verifyQ73,
  verifyQ74,
  verifyQ75,
];
