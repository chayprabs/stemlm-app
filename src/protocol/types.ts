/**
 * Core data model for a parsed stemLM "capsule" (the structured answer the AI
 * returns). These types are shared by the parser, the store, the UI, and PDF
 * export.
 */
import type { PlatformId } from '@/src/platforms/types';

export type Subject =
  | 'Physics'
  | 'Chemistry'
  | 'Math'
  | 'Biology'
  | 'CS'
  | 'Electrical'
  | 'Mechanical'
  | 'Civil'
  | 'Chemical'
  | 'General';

export const SUBJECTS: Subject[] = [
  'Physics',
  'Chemistry',
  'Math',
  'Biology',
  'CS',
  'Electrical',
  'Mechanical',
  'Civil',
  'Chemical',
  'General',
];

/** Hatch (`svg`/`mermaid`), five engines, leftover families, or an unknown token (not collapsed). */
export type DiagramType = string;

export interface Diagram {
  type: DiagramType;
  /** Spec body, raw SVG markup, or mermaid source. Sanitized at render time, never here. */
  content: string;
  /** Optional human caption (from `caption:` or the hatch). */
  caption?: string;
}

export interface QuickCheck {
  question: string;
  answer: string;
}

export interface Step {
  id: string;
  index: number;
  title: string;
  /** Display LaTeX (already in `$$...$$` or raw) for the key formula. */
  formula?: string;
  /** Markdown body (may contain inline `$math$`). */
  body: string;
  diagram?: Diagram;
  takeaway?: string;
  quickCheck?: QuickCheck;
  /** Ready-to-send follow-up prompt to dig deeper on this step. */
  followup?: string;
}

export interface CapsuleMeta {
  version: number;
  subject: Subject;
  topic: string;
  /** Full verbatim problem statement — required when the student pasted an image. */
  question?: string;
}

/** The fully parsed structured answer. */
export interface Capsule {
  meta: CapsuleMeta;
  steps: Step[];
  /** Plain-language full solution (markdown + math, may embed diagrams). */
  solution: string;
  solutionDiagrams: Diagram[];
}

export type ParseStatus = 'ok' | 'partial' | 'empty';

export type ParseWarningCode =
  | 'no_capsule'
  | 'missing_fence'
  | 'missing_meta'
  | 'missing_end'
  | 'inner_triple_backticks'
  | 'invalid_step_count'
  | 'step_body_too_long'
  | 'invalid_subject'
  | 'missing_topic'
  | 'missing_step_title'
  | 'missing_solution'
  | 'malformed_diagram'
  | 'unknown_diagram_type'
  | 'missing_step_body'
  | 'formula_without_body'
  | 'step_missing_substitution'
  | 'step_missing_symbol_defs'
  | 'quickcheck_missing_question'
  | 'quickcheck_missing_answer'
  | 'quickcheck_thin_answer'
  | 'quickcheck_generic_trivia'
  | 'missing_initial_circuit'
  | 'missing_circuit_diagram'
  | 'insufficient_diagrams'
  | 'diagram_lacks_graphics'
  | 'diagram_incomplete'
  | 'diagram_bad_viewbox'
  | 'diagram_label_collision'
  | 'diagram_label_over_graphic'
  | 'diagram_missing_axes'
  | 'diagram_legend_only';

export type ParseErrorCode =
  | 'no_capsule'
  | 'no_usable_content'
  | 'missing_meta'
  | 'missing_end'
  | 'inner_triple_backticks'
  | 'invalid_step_count';

export interface ParseResult {
  status: ParseStatus;
  capsule?: Capsule;
  /** Warnings collected while parsing (missing blocks, recovered sections...). */
  warnings: string[];
  /** Stable warning codes for telemetry, scoring, and repair prompts. */
  warningCodes: ParseWarningCode[];
  /** Stable primary failure code when status is not usable. */
  errorCode?: ParseErrorCode;
  /** Original raw text the capsule was parsed from (for fallback display). */
  raw: string;
}

/** A study session = one captured answer plus user progress + provenance. */
export interface Session {
  id: string;
  createdAt: number;
  updatedAt: number;
  platform: PlatformId;
  question: string;
  capsule: Capsule;
  /** Raw capsule text, kept so we can re-parse / debug / export. */
  raw: string;
}
