/**
 * EE benchmark pipeline: spec → solve → synthesize → EEQuestionDef.
 *
 * Questions are never hardcoded. Each capsule is generated at runtime from
 * problem parameters and computed solutions.
 */
import type { EEBenchmarkEntry } from './spec-types';
import type { EEQuestionDef } from './types';
import { ALL_EE_SPECS } from './specs';
import { solve } from './solvers';
import { synthesizeQuestion } from './synthesize';

export function generateQuestion(entry: EEBenchmarkEntry): EEQuestionDef {
  const solution = solve(entry.spec);
  return synthesizeQuestion(entry, solution);
}

/** All 50 questions generated dynamically from specs + solvers. */
export const ALL_EE_QUESTIONS: EEQuestionDef[] = ALL_EE_SPECS.map(generateQuestion);

export function getQuestionById(id: number): EEQuestionDef | undefined {
  return ALL_EE_QUESTIONS.find((q) => q.id === id);
}

export function getQuestionBySlug(slug: string): EEQuestionDef | undefined {
  return ALL_EE_QUESTIONS.find((q) => q.slug === slug);
}

export { ALL_EE_SPECS } from './specs';
