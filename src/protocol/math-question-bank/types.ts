/** Structured definition for a mathematics benchmark question. */

export interface MathStepDef {
  title: string;
  formula?: string;
  body: string;
  /** Full <svg>…</svg> markup or inner content (builder wraps if needed). */
  diagram?: string;
  takeaway?: string;
}

export interface MathQuestionDef {
  /** e.g. q01 */
  id: string;
  number: number;
  topic: string;
  /** Verbatim problem statement (markdown/LaTeX). */
  question: string;
  steps: MathStepDef[];
  solution: string;
  /**
   * Strings or regex patterns that must appear in step bodies + solution
   * to confirm mathematically correct final answers.
   */
  verifiedPatterns: (string | RegExp)[];
  /** Minimum number of steps that must carry SVG diagrams. */
  minDiagramSteps?: number;
}
