/** Electrical Engineering 50-question benchmark types. */

export type EEDifficulty = 'Easy' | 'Mid' | 'Tough';
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
  /** Numeric verified answers for automated assertion */
  verified: Record<string, number | string | boolean>;
}

export interface DiagramAuditResult {
  ok: boolean;
  errors: string[];
  warnings: string[];
}
