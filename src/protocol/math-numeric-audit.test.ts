/**
 * Independent numeric verification for math exam problems.
 * Solvers recompute answers from first principles — they do NOT store Gemini steps or SVG.
 */
import { describe, it, expect } from 'vitest';
import { MATH_PROMPTS } from './math-prompts';
import { MATH_NUMERIC_SOLVERS, getMathNumericSolver, independentMatrixCheck } from './math-numeric-checks';

/** Minimal synthetic capsule text embedding known numeric results for solver smoke tests. */
const SYNTHETIC_ANSWERS: Record<number, string> = {
  1: 'lim (a) = 1/6, lim (b) = -1/2, x^x -> 1, indeterminate 0^0',
  2: "f is continuous at 0, f'(0) = 0, f' is not continuous at 0, not C^1",
  3: 'grad (2,-2), directional derivative 14/5, saddle at (0,0)',
  4: 'ln(1.2) ≈ 0.1823, remainder 1.07e-5, threshold 0.0001',
  5: 'polar integral 4.71239, triple integral 25.1327, intersection r^2 = 2',
  6: "Green's theorem 0, Stokes 0",
  7: 'rank 3, nullity 1, rank-nullity 3+1=4',
  8: 'eigenvalues 5, 5, 2, A^10 entry 1024 and 9765625, (1,1)=6510758',
  9: 'projection 3/5, ||u_3||^2 = 8/45, ||u_1||^2 = 2',
  10: 'sigma = 5, x_hat = 7/25 and 1/5',
  11: 'eigenvalues 0.474572, 1.369102, 6.156325, minimum on sphere 0.474572',
  12: 'exact equation, implicit x^2y+xy^2=C, integrating factor 1/(xy^2)',
  13: 'W=20.0855, c_1=-1, c_2=1',
  14: 'indicial r=1/2 and -1/2, J_{1/2}(x)',
  15: 'eigenvalue -1 repeated, stable improper node, tangent y=x/2',
  16: 'y = 1/4 (1-cos 2t) for t<pi, y=0 for t>=pi',
  17: 'eigenvalues lambda_n = ((2n-1)pi/(2L))^2, sin eigenfunctions, lambda>0 only',
  18: "f'(0)=0, harmonic conjugate v=3x^2y-y^3+2y, F(z)=z^3+2z",
  19: 'first contour 4.51310, deformed integral 0.577864',
  20: 'integral 1.04720, trig integral 3.62760, pole -0.267949',
  21: 'Laurent -1/6, residue sin/z^3 at 0 is 0, residue at 0 for 1/(z^2(1-z)) is 1, residue -1',
  22: 'phi(i)=0, harmonic U=(x^2+y^2-1)/(x^2+(y+1)^2), inverse (1+w)/(1-w)',
  23: 'c=1/2, E[X]=3, Var(X)=3',
  24: 'E[X]=2/3, E[Y]=3/4, Cov=0, P(X+Y<1)=1/10',
  25: 'SE=0.05, CI (9.982, 10.178), z=1.6, p=0.1096',
};

describe('math numeric audit (independent recomputation)', () => {
  it('has numeric solvers for all 100 exam questions', () => {
    expect(MATH_NUMERIC_SOLVERS.length).toBe(100);
    expect(MATH_PROMPTS.length).toBe(100);
  });

  it('matrix power sanity check is independent of capsule text', () => {
    expect(() => independentMatrixCheck()).not.toThrow();
  });

  for (let n = 1; n <= 25; n += 1) {
    const sample = SYNTHETIC_ANSWERS[n];
    if (!sample) continue;
    it(`Q${n} solver accepts independently computed numeric values`, () => {
      const solver = getMathNumericSolver(n)!;
      const result = solver(sample);
      expect(result.ok, result.errors.join('; ')).toBe(true);
    });

    it(`Q${n} solver rejects empty capsule text`, () => {
      const solver = getMathNumericSolver(n)!;
      const result = solver('no numeric work shown');
      expect(result.ok).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  }

  for (let n = 26; n <= 100; n += 1) {
    it(`Q${n} solver is defined and callable`, () => {
      const solver = getMathNumericSolver(n)!;
      expect(typeof solver).toBe('function');
      const fail = solver('placeholder without expected numbers');
      expect(fail.ok).toBe(false);
    });
  }
});
