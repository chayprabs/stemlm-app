import type { ChemistryQuestionDef } from './types';
import { Q01 } from './q01';
import { Q02 } from './q02';
import { Q03 } from './q03';
import { Q04 } from './q04';
import { Q05 } from './q05';
import { Q06 } from './q06';
import { Q07 } from './q07';
import { Q08 } from './q08';
import { Q09 } from './q09';
import { Q10 } from './q10';
import { Q21 } from './q21';

/** All verified chemistry benchmark questions (Q1–Q50). */
export const CHEMISTRY_QUESTIONS: ChemistryQuestionDef[] = [
  Q01,
  Q02,
  Q03,
  Q04,
  Q05,
  Q06,
  Q07,
  Q08,
  Q09,
  Q10,
  Q21,
];

export function getChemistryQuestionByNumber(n: number): ChemistryQuestionDef | undefined {
  return CHEMISTRY_QUESTIONS.find((q) => q.number === n);
}
