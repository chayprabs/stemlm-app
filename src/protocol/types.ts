/**
 * Core data model for a parsed stemLM "capsule" (the structured answer the AI
 * returns). These types are shared by the parser, the store, the UI, and PDF
 * export.
 */

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

export type DiagramType = 'svg' | 'mermaid';

export interface Diagram {
  type: DiagramType;
  /** Raw SVG markup or mermaid source. Sanitized at render time, never here. */
  content: string;
  /** Optional human caption. */
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

export interface ParseResult {
  status: ParseStatus;
  capsule?: Capsule;
  /** Warnings collected while parsing (missing blocks, recovered sections...). */
  warnings: string[];
  /** Original raw text the capsule was parsed from (for fallback display). */
  raw: string;
}

/** A study session = one captured answer plus user progress + provenance. */
export interface Session {
  id: string;
  createdAt: number;
  updatedAt: number;
  platform: 'chatgpt' | 'claude' | 'gemini' | 'perplexity' | 'grok' | 'deepseek';
  question: string;
  capsule: Capsule;
  /** Step ids the student has marked reviewed. */
  reviewedStepIds: string[];
  /** Raw capsule text, kept so we can re-parse / debug / export. */
  raw: string;
}
