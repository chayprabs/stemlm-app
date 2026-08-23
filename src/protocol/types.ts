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

export type Archetype =
  | 'numeric'
  | 'symbolic'
  | 'proof'
  | 'design'
  | 'comparison'
  | 'conceptual'
  | 'code'
  | 'lab'
  | 'estimation';

export const ARCHETYPES: Archetype[] = [
  'numeric',
  'symbolic',
  'proof',
  'design',
  'comparison',
  'conceptual',
  'code',
  'lab',
  'estimation',
];

export type LevelBand = 'intro' | 'undergrad' | 'advanced' | 'research';

export type CapsuleMode = 'full' | 'patch' | 'resolve' | 'new';

export type VerifyMethod =
  | 'dimensional'
  | 'units'
  | 'limit'
  | 'oom'
  | 'backsub'
  | 'conservation'
  | 'alt';

export type VerifyStatus = 'pass' | 'fail';

/** Hatch (`svg`/`mermaid`), five engines, leftover families, or an unknown token (not collapsed). */
export type DiagramType = string;

export interface Diagram {
  type: DiagramType;
  /** Spec body, raw SVG markup, or mermaid source. Sanitized at render time, never here. */
  content: string;
  /** Optional human caption (from `caption:` or the hatch). */
  caption?: string;
  /** Stable figure id emitted as `@diagram id=fN`. */
  id?: string;
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
  /** Stable equation id emitted as `@formula id=eN`. */
  formulaId?: string;
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
  /** Stable question object id (`q1`, `q2`, …). */
  qid?: string;
  archetype?: Archetype;
  level?: LevelBand;
  locale?: string;
  mode?: CapsuleMode;
}

export interface UncertaintyBlock {
  assumptions: string[];
  lowConfidenceSteps: string[];
  studentChecks: string[];
}

export interface VerificationBlock {
  methods: VerifyMethod[];
  status: VerifyStatus;
  notes: string;
  /** Visible correction when verification fails — never a silent re-solve. */
  correction?: string;
}

/** The fully parsed structured answer. */
export interface Capsule {
  meta: CapsuleMeta;
  steps: Step[];
  /** Plain-language full solution (markdown + math, may embed diagrams). */
  solution: string;
  solutionDiagrams: Diagram[];
  uncertainty?: UncertaintyBlock;
  verification?: VerificationBlock;
}

export type PatchOpKind = 'replace' | 'insert' | 'delete';

export interface PatchOp {
  op: PatchOpKind;
  /** Target step id for replace/delete. */
  id?: string;
  /** Insert after this step id. */
  after?: string;
  step?: Step;
  /** Optional capsule-level updates inside `@patch` (final-answer changes). */
  solution?: string;
  verification?: VerificationBlock;
  uncertainty?: UncertaintyBlock;
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
  | 'diagram_legend_only'
  | 'missing_verify'
  | 'missing_uncertainty'
  | 'missing_step_id'
  | 'missing_formula_id'
  | 'missing_diagram_id'
  | 'patch_unknown_id'
  | 'missing_archetype';

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
  /** Multi-question input: one capsule per `@q` object (capsule is questions[0]). */
  questions?: Capsule[];
  /** Follow-up diff against step ids (mode: patch). */
  patch?: PatchOp[];
  /** Truncation resume token from `@resume token=…`. */
  resumeToken?: string;
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
