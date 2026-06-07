import type { MathQuestionDef } from './types';
import { Q01 } from './q01';

/** All verified mathematics benchmark questions (Q1–Q50). */
export const MATH_QUESTIONS: MathQuestionDef[] = [Q01];

export function getMathQuestion(id: string): MathQuestionDef | undefined {
  return MATH_QUESTIONS.find((q) => q.id === id);
}

export function getMathQuestionByNumber(n: number): MathQuestionDef | undefined {
  return MATH_QUESTIONS.find((q) => q.number === n);
}

export { Q01 };
