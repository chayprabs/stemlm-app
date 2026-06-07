import { Q01 } from './q01-kvl-single-loop';
import { YEAR1_QUESTIONS } from './year1';
import { YEAR2_QUESTIONS } from './year2';
import { YEAR3_QUESTIONS } from './year3';
import type { EEQuestionDef } from '../types';

/** All 50 EE benchmark questions in order Q1–Q50 */
export const ALL_EE_QUESTIONS: EEQuestionDef[] = [
  Q01,
  ...YEAR1_QUESTIONS.filter((q) => q.id !== 1),
  ...YEAR2_QUESTIONS,
  ...YEAR3_QUESTIONS,
];

export function getQuestionById(id: number): EEQuestionDef | undefined {
  return ALL_EE_QUESTIONS.find((q) => q.id === id);
}

export function getQuestionBySlug(slug: string): EEQuestionDef | undefined {
  return ALL_EE_QUESTIONS.find((q) => q.slug === slug);
}

export { Q01 } from './q01-kvl-single-loop';
export { YEAR1_QUESTIONS, YEAR2_QUESTIONS, YEAR3_QUESTIONS };
