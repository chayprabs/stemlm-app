/**
 * End-to-end readiness audit for math exam prompts with numeric oracles (Q1–50).
 */
import { describe, it, expect } from 'vitest';
import { MATH_PROMPTS } from './math-prompts';
import { classifySubject } from './classifier';
import { buildInjectionPrompt, buildInjectionPayload } from './builder';
import { getMathNumericSolver } from './math-numeric-checks';
import { getMathNumericProbe } from './math-numeric-checks/probes';

const ORACLE_QUESTION_LIMIT = 50;

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

function probeTextForQuestion(n: number): string {
  return SYNTHETIC_ANSWERS[n] ?? getMathNumericProbe(n) ?? '';
}

describe('math exam readiness', () => {
  const oraclePrompts = MATH_PROMPTS.filter((p) => p.number <= ORACLE_QUESTION_LIMIT);
  const report: { q: number; ok: boolean; issues: string[] }[] = [];

  it('prompt bank has at least 50 math questions', () => {
    expect(MATH_PROMPTS.length).toBeGreaterThanOrEqual(ORACLE_QUESTION_LIMIT);
  });

  for (const prompt of oraclePrompts) {
    const n = prompt.number;
    const issues: string[] = [];

    it(`Q${n}: prompt → classify → inject → numeric oracle`, () => {
      if (!prompt.question || prompt.question.length < 20) issues.push('question too short');
      if (!prompt.topic) issues.push('missing topic');
      expect(prompt).not.toHaveProperty('steps');
      expect(prompt).not.toHaveProperty('solution');
      expect(prompt).not.toHaveProperty('verifiedPatterns');

      const classified = classifySubject(`${prompt.topic}. ${prompt.question}`);
      if (classified !== 'Math') issues.push(`classifier returned ${classified}`);

      const { prompt: injected, subject } = buildInjectionPrompt(prompt.question, { subject: 'Math' });
      if (subject !== 'Math') issues.push('injection subject not Math');
      if (!injected.includes('stemLM instructions')) issues.push('missing stemLM instructions');
      if (!injected.includes('MATH')) issues.push('missing math playbook');

      const payload = buildInjectionPayload(prompt.question, { subject: 'Math' });
      if (!payload.fileContent.includes('MATH')) issues.push('payload missing math playbook');

      const solver = getMathNumericSolver(n);
      if (!solver) issues.push('missing numeric solver');

      const sample = probeTextForQuestion(n);
      if (!sample) issues.push('missing numeric probe text');
      if (solver && sample) {
        const numeric = solver(sample);
        if (!numeric.ok) issues.push(`numeric oracle failed: ${numeric.errors.join('; ')}`);
        const reject = solver('no numeric work shown');
        if (reject.ok) issues.push('numeric oracle should reject empty work');
      }

      report.push({ q: n, ok: issues.length === 0, issues });
      expect(issues, `Q${n} issues:\n${issues.join('\n')}`).toEqual([]);
    });
  }

  it(`summary: Q1–${ORACLE_QUESTION_LIMIT} pass readiness checks`, () => {
    const failed = report.filter((r) => !r.ok);
    expect(failed, `Failed questions: ${failed.map((f) => `Q${f.q}`).join(', ')}`).toEqual([]);
    expect(report.length).toBe(ORACLE_QUESTION_LIMIT);
  });
});
