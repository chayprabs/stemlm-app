import type { ChemistryQuestionDef } from './types';
import { Q01 } from './q01';
import { Q02 } from './q02';
import { Q03 } from './q03';
import { Q04 } from './q04';
import { Q05 } from './q05';

/** All verified chemistry benchmark questions (Q1–Q50). */
export const CHEMISTRY_QUESTIONS: ChemistryQuestionDef[] = [Q01, Q02, Q03, Q04, Q05];

export function getChemistryQuestionByNumber(n: number): ChemistryQuestionDef | undefined {
  return CHEMISTRY_QUESTIONS.find((q) => q.number === n);
}
