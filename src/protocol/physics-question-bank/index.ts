import type { PhysicsQuestionDef } from './types';
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

/** All verified physics benchmark questions (Q1–Q50). */
export const PHYSICS_QUESTIONS: PhysicsQuestionDef[] = [
  Q01, Q02, Q03, Q04, Q05, Q06, Q07, Q08, Q09, Q10,
  Q11, Q12, Q13, Q14, Q15, Q16, Q17, Q18, Q19, Q20,
];

export function getPhysicsQuestion(id: string): PhysicsQuestionDef | undefined {
  return PHYSICS_QUESTIONS.find((q) => q.id === id);
}

export function getPhysicsQuestionByNumber(n: number): PhysicsQuestionDef | undefined {
  return PHYSICS_QUESTIONS.find((q) => q.number === n);
}

export {
  Q01, Q02, Q03, Q04, Q05, Q06, Q07, Q08, Q09, Q10,
  Q11, Q12, Q13, Q14, Q15, Q16, Q17, Q18, Q19, Q20,
};
