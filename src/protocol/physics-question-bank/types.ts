/** Structured definition for a physics benchmark question. */

export interface PhysicsStepDef {
  title: string;
  formula?: string;
  body: string;
  diagram?: string;
  takeaway?: string;
}

export interface PhysicsQuestionDef {
  id: string;
  number: number;
  topic: string;
  question: string;
  steps: PhysicsStepDef[];
  solution: string;
  verifiedPatterns: (string | RegExp)[];
  minDiagramSteps?: number;
}
