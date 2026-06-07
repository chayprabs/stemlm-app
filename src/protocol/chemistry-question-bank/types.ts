/** Structured definition for a chemistry benchmark question. */

export interface ChemistryStepDef {
  title: string;
  formula?: string;
  body: string;
  /** Full <svg>…</svg> markup or inner content (builder wraps if needed). */
  diagram?: string;
  takeaway?: string;
}

export interface ChemistryQuestionDef {
  /** e.g. q01 */
  id: string;
  number: number;
  topic: string;
  /** Verbatim problem statement (markdown/LaTeX). */
  question: string;
  steps: ChemistryStepDef[];
  solution: string;
  /**
   * Strings or regex patterns that must appear in step bodies + solution
   * to confirm chemically correct final answers.
   */
  verifiedPatterns: (string | RegExp)[];
  /** Minimum number of steps that must carry SVG diagrams. */
  minDiagramSteps?: number;
}
