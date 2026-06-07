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
import { Q15 } from './q15';
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
import { Q27 } from './q27';
import { Q28 } from './q28';
import { Q29 } from './q29';
import { Q30 } from './q30';
import { Q31 } from './q31';
import { Q32 } from './q32';
import { Q33 } from './q33';
import { Q34 } from './q34';
import { Q35 } from './q35';
import { Q36 } from './q36';
import { Q37 } from './q37';
import { Q38 } from './q38';
import { Q39 } from './q39';
import { Q40 } from './q40';
import { Q41 } from './q41';
import { Q42 } from './q42';
import { Q43 } from './q43';
import { Q44 } from './q44';
import { Q45 } from './q45';
import { Q46 } from './q46';
import { Q47 } from './q47';
import { Q48 } from './q48';
import { Q49 } from './q49';
import { Q50 } from './q50';

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
  Q15,
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
  Q27,
  Q28,
  Q29,
  Q30,
  Q31,
  Q32,
  Q33,
  Q34,
  Q35,
  Q36,
  Q37,
  Q38,
  Q39,
  Q40,
  Q41,
  Q42,
  Q43,
  Q44,
  Q45,
  Q46,
  Q47,
  Q48,
  Q49,
  Q50,
];

export function getChemistryQuestionByNumber(n: number): ChemistryQuestionDef | undefined {
  return CHEMISTRY_QUESTIONS.find((q) => q.number === n);
}
