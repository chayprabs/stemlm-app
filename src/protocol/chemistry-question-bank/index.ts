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
import { Q11 } from './q11';
import { Q12 } from './q12';
import { Q13 } from './q13';
import { Q14 } from './q14';
import { Q16 } from './q16';
import { Q17 } from './q17';
import { Q18 } from './q18';
import { Q19 } from './q19';
import { Q20 } from './q20';
import { Q21 } from './q21';
import { Q22 } from './q22';
import { Q23 } from './q23';
import { Q24 } from './q24';
import { Q25 } from './q25';
import { Q26 } from './q26';

/** All verified chemistry benchmark questions (Q1-Q50). */
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
  Q11,
  Q12,
  Q13,
  Q14,
  Q16,
  Q17,
  Q18,
  Q19,
  Q20,
  Q21,
  Q22,
  Q23,
  Q24,
  Q25,
  Q26,
];

export function getChemistryQuestionByNumber(n: number): ChemistryQuestionDef | undefined {
  return CHEMISTRY_QUESTIONS.find((q) => q.number === n);
}
