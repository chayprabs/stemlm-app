/** Structured definition for a biology benchmark question. */

export interface BiologyStepDef {
  title: string;
  formula?: string;
  body: string;
  diagram?: string;
  takeaway?: string;
}

export interface BiologyQuestionDef {
  id: string;
  number: number;
  topic: string;
  question: string;
  steps: BiologyStepDef[];
  solution: string;
  verifiedPatterns: (string | RegExp)[];
  minDiagramSteps?: number;
}
