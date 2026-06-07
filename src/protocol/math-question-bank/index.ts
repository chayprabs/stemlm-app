import type { MathQuestionDef } from './types';
import { Q01 } from './q01';
import { Q02 } from './q02';
import { Q03 } from './q03';
import { Q04 } from './q04';
import { Q05 } from './q05';
import { Q06 } from './q06';

/** All verified mathematics benchmark questions (Q1–Q50). */
export const MATH_QUESTIONS: MathQuestionDef[] = [Q01, Q02, Q03, Q04, Q05, Q06];

export function getMathQuestion(id: string): MathQuestionDef | undefined {
  return MATH_QUESTIONS.find((q) => q.id === id);
}

export function getMathQuestionByNumber(n: number): MathQuestionDef | undefined {
  return MATH_QUESTIONS.find((q) => q.number === n);
}

export { Q01, Q02, Q03, Q04, Q05, Q06 };
