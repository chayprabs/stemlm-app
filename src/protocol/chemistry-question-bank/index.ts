import type { ChemistryQuestionDef } from './types';
import { Q01 } from './q01';

/** All verified chemistry benchmark questions (Q1–Q50). */
export const CHEMISTRY_QUESTIONS: ChemistryQuestionDef[] = [Q01];

export function getChemistryQuestionByNumber(n: number): ChemistryQuestionDef | undefined {
  return CHEMISTRY_QUESTIONS.find((q) => q.number === n);
}
