/** Electrical Engineering 50-question benchmark types. */

import type { EEDifficulty } from './spec-types';
export type { EEDifficulty };
export type EEYear = 1 | 2 | 3;

export interface EEStepDef {
  title: string;
  formula: string;
  body: string;
  takeaway: string;
  quickcheckQ: string;
  quickcheckA: string;
  followup: string;
  /** SVG markup for this step's diagram */
  svg: string;
}

export interface EEQuestionDef {
  id: number;
  slug: string;
  title: string;
  year: EEYear;
  difficulty: EEDifficulty;
  topic: string;
  problemStatement: string;
  steps: EEStepDef[];
  solution: string[];
  solutionSvg: string;
  /** Computed solution values from solver (not hand-authored) */
  verified: Record<string, number | string | boolean>;
}

export interface DiagramAuditResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
