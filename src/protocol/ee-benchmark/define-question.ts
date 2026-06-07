/**
 * Compact question definition → full EEQuestionDef with standard 5-step workflow.
 */
import type { EEQuestionDef, EEStepDef } from './types';

export interface CompactQuestion {
  id: number;
  slug: string;
  title: string;
  year: 1 | 2 | 3;
  difficulty: 'Easy' | 'Mid' | 'Tough';
  topic: string;
  problemStatement: string;
  verified: Record<string, number | string | boolean>;
  svg: string;
  solutionSvg?: string;
  solution: string[];
  steps: Array<{
    title: string;
    formula: string;
    body: string;
    takeaway: string;
    quickcheckQ: string;
    quickcheckA: string;
    followup: string;
    svg?: string;
  }>;
}

export function defineQuestion(c: CompactQuestion): EEQuestionDef {
  const defaultSvg = c.svg;
  const steps: EEStepDef[] = c.steps.map((s) => ({
    ...s,
    svg: s.svg ?? defaultSvg,
  }));
  return {
    id: c.id,
    slug: c.slug,
    title: c.title,
    year: c.year,
    difficulty: c.difficulty,
    topic: c.topic,
    problemStatement: c.problemStatement,
    verified: { ...c.verified, stepCount: steps.length },
    steps,
    solution: c.solution,
    solutionSvg: c.solutionSvg ?? defaultSvg,
  };
}
