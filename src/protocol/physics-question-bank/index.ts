import type { PhysicsQuestionDef } from './types';
import { Q01 } from './q01';
import { Q02 } from './q02';
import { Q03 } from './q03';
import { Q04 } from './q04';

/** All verified physics benchmark questions (Q1–Q50). */
export const PHYSICS_QUESTIONS: PhysicsQuestionDef[] = [Q01, Q02, Q03, Q04];

export function getPhysicsQuestion(id: string): PhysicsQuestionDef | undefined {
  return PHYSICS_QUESTIONS.find((q) => q.id === id);
}

export function getPhysicsQuestionByNumber(num: number): PhysicsQuestionDef | undefined {
  return PHYSICS_QUESTIONS.find((q) => q.number === num);
}

export { Q01, Q02, Q03, Q04 };
