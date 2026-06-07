import type { PhysicsQuestionDef } from './types';
import { Q01 } from './q01';
import { Q02 } from './q02';

/** All verified physics benchmark questions (Q1–Q50). */
export const PHYSICS_QUESTIONS: PhysicsQuestionDef[] = [Q01, Q02];

export function getPhysicsQuestion(id: string): PhysicsQuestionDef | undefined {
  return PHYSICS_QUESTIONS.find((q) => q.id === id);
}

export function getPhysicsQuestionByNumber(n: number): PhysicsQuestionDef | undefined {
  return PHYSICS_QUESTIONS.find((q) => q.number === n);
}

export { Q01, Q02 };
