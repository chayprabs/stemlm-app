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

function stirlingSecond(n: number, k: number): number {
  if (k === 0) return n === 0 ? 1 : 0;
  if (n === 0) return 0;
  return k * stirlingSecond(n - 1, k) + stirlingSecond(n - 1, k - 1);
}

function bellNumber(n: number): number {
  let total = 0;
  for (let k = 0; k <= n; k += 1) total += stirlingSecond(n, k);
  return total;
}

function catalan(n: number): number {
  return combinations(2 * n, n) / (n + 1);
}

function fibonacci(n: number): number {
  if (n === 0) return 0;
  let a = 0;
  let b = 1;
  for (let i = 1; i < n; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

function lucas(n: number): number {
  if (n === 0) return 2;
  if (n === 1) return 1;
  let a = 2;
  let b = 1;
  for (let i = 2; i <= n; i += 1) {
    const next = a + b;
    a = b;
    b = next;
  }
  return b;
}

function partitions(n: number): number {
  const dp = Array.from({ length: n + 1 }, () => 0);
  dp[0] = 1;
  for (let part = 1; part <= n; part += 1) {
    for (let k = part; k <= n; k += 1) dp[k] = (dp[k] ?? 0) + (dp[k - part] ?? 0);
  }
  return dp[n] ?? 0;
}

function mobius(n: number): number {
  if (n === 1) return 1;
  let count = 0;
  let value = n;
  for (let p = 2; p * p <= value; p += 1) {
    if (value % p === 0) {
      value /= p;
      count += 1;
      if (value % p === 0) return 0;
    }
  }
  if (value > 1) count += 1;
  return count % 2 === 0 ? 1 : -1;
}

export const verifyQ76: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const h = 0.1;
    const approx = (square(2 + h) - square(2)) / h;
    expectApprox(ctx, 'forward difference f\'(2)', approx, { rel: 0.02, abs: 0.05 });
    expectApprox(ctx, 'exact derivative', 4, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ77: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const h = 0.25;
    const trap =
      (h / 2) *
      (0 +
        2 * square(0.25) +
        2 * square(0.5) +
        2 * square(0.75) +
        square(1));
    expectApprox(ctx, 'trapezoidal approximation', trap, { rel: 0.02, abs: 0.005 });
    expectApprox(ctx, 'exact integral', 1 / 3, { rel: 0.02, abs: 0.005 });
  });

export const verifyQ78: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Euler y(0.5)', 1.5, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'Euler y(1)', 2.25, { rel: 0.02, abs: 0.02 });
  });

export const verifyQ79: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'matrix rank', 2, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ80: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'permutation matrix determinant', -1, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ81: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'N^5 upper entry', 5, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'N^5 diagonal entry', 1, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ82: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'singular value 3', 3, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'singular value 4', 4, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'condition number', 4 / 3, { rel: 0.03, abs: 0.02 });
  });

export const verifyQ83: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'condition number kappa_2', 100, { rel: 0.02, abs: 1 });
  });

export const verifyQ84: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'sine coefficient b_1', 2, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'sine coefficient b_2', -1, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'partial sum at pi/2', 2, { rel: 0.03, abs: 0.03 });
  });

export const verifyQ85: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const y1 = 2 * Math.sinh(1);
    expectApprox(ctx, 'y(1) from Laplace solution', y1, { rel: 0.03, abs: 0.03 });
  });

export const verifyQ86: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Z-transform at z=2', 2, { rel: 0.02, abs: 0.02 });
  });

export const verifyQ87: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'u(pi/2,1)', Math.exp(-1), { rel: 0.03, abs: 0.01 });
  });

export const verifyQ88: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'wave speed c', 2, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'frequency for wavelength 1', 2, { rel: 0.02, abs: 0.02 });
  });

export const verifyQ89: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'minimum value', 0.5, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'optimal x', 0.5, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'optimal y', 0.5, { rel: 0.02, abs: 0.01 });
  });

export const verifyQ90: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'eigenvalue 1', 1, { rel: 0.02, abs: 0.02 });
    expectApprox(ctx, 'eigenvalue 0.4', 0.4, { rel: 0.03, abs: 0.02 });
    expectApprox(ctx, 'spectral radius', 1, { rel: 0.02, abs: 0.02 });
  });

export const verifyQ91: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Mobius mu(30)', mobius(30), { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'Mobius mu(12)', mobius(12), { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'Mobius mu(17)', mobius(17), { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'sum mu(d|30)', 0, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ92: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'partition count p(8)', partitions(8), { rel: 0.01, abs: 0.01 });
  });

export const verifyQ93: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Stirling S(5,3)', stirlingSecond(5, 3), { rel: 0.01, abs: 0.01 });
  });

export const verifyQ94: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Catalan C_5', catalan(5), { rel: 0.01, abs: 0.01 });
  });

export const verifyQ95: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Bell number B_5', bellNumber(5), { rel: 0.01, abs: 0.01 });
  });

export const verifyQ96: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Fibonacci F_10', fibonacci(10), { rel: 0.01, abs: 0.01 });
  });

export const verifyQ97: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'Lucas L_8', lucas(8), { rel: 0.01, abs: 0.01 });
  });

export const verifyQ98: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'fourth convergent numerator', 17, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'fourth convergent denominator', 12, { rel: 0.01, abs: 0.01 });
    expectApprox(ctx, 'convergent value', 17 / 12, { rel: 0.02, abs: 0.01 });
  });

export const verifyQ99: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    expectApprox(ctx, 'pigeonhole card count', 13, { rel: 0.01, abs: 0.01 });
  });

export const verifyQ100: NumericVerificationSolver = (input) =>
  withSolverContext(input, (ctx) => {
    const r = 3.9;
    let x = 0.5;
    const values = [x];
    for (let i = 0; i < 3; i += 1) {
      x = r * x * (1 - x);
      values.push(x);
    }
    expectApprox(ctx, 'logistic x_1', values[1] ?? 0, { rel: 0.02, abs: 0.01 });
    expectApprox(ctx, 'logistic x_2', values[2] ?? 0, { rel: 0.03, abs: 0.01 });
    expectApprox(ctx, 'logistic x_3', values[3] ?? 0, { rel: 0.03, abs: 0.02 });
  });

export const MATH_NUMERIC_SOLVERS_Q76_TO_Q100: NumericVerificationSolver[] = [
  verifyQ76,
  verifyQ77,
  verifyQ78,
  verifyQ79,
  verifyQ80,
  verifyQ81,
  verifyQ82,
  verifyQ83,
  verifyQ84,
  verifyQ85,
  verifyQ86,
  verifyQ87,
  verifyQ88,
  verifyQ89,
  verifyQ90,
  verifyQ91,
  verifyQ92,
  verifyQ93,
  verifyQ94,
  verifyQ95,
  verifyQ96,
  verifyQ97,
  verifyQ98,
  verifyQ99,
  verifyQ100,
];
