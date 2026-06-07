import { MATH_NUMERIC_SOLVERS_Q01_TO_Q25 } from './q01-q25';
import { MATH_NUMERIC_SOLVERS_Q26_TO_Q50 } from './q26-q50';
import { MATH_NUMERIC_SOLVERS_Q51_TO_Q75 } from './q51-q75';
import { MATH_NUMERIC_SOLVERS_Q76_TO_Q100 } from './q76-q100';
import type { NumericVerificationSolver } from '../numeric-verify-shared';

export const MATH_NUMERIC_SOLVERS: NumericVerificationSolver[] = [
  ...MATH_NUMERIC_SOLVERS_Q01_TO_Q25,
  ...MATH_NUMERIC_SOLVERS_Q26_TO_Q50,
  ...MATH_NUMERIC_SOLVERS_Q51_TO_Q75,
  ...MATH_NUMERIC_SOLVERS_Q76_TO_Q100,
];

export function getMathNumericSolver(questionNumber: number): NumericVerificationSolver | undefined {
  if (questionNumber < 1 || questionNumber > MATH_NUMERIC_SOLVERS.length) return undefined;
  return MATH_NUMERIC_SOLVERS[questionNumber - 1];
}

export { independentMatrixCheck } from './q01-q25';
