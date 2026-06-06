/**
 * Builds the text we inject into the chatbot composer.
 *
 *  - buildInjectionPrompt: the student's question + core protocol + ONE subject
 *    playbook (chosen by the classifier or an explicit override).
 *  - buildFollowupPrompt: a quote-reply that drills into a selected part of a
 *    step and asks the model to answer again in the same capsule format, so the
 *    new answer renders below in the panel.
 */
import type { Subject } from './types';
import {
  CORE_PROTOCOL_BY_VARIANT,
  DEFAULT_PROMPT_VARIANT,
  STEP_COUNT_MAX,
  STEP_COUNT_TARGET,
  type PromptVariant,
} from './protocol';
import { getPlaybook } from './playbooks';
import { classifySubject } from './classifier';

const SEP = '\n\n--- stemLM instructions (do not remove) ---\n';

export interface BuildOptions {
  /** 'Auto' => classify from the question; otherwise force this subject. */
  subject?: Subject | 'Auto';
  /** Balanced is the production default; ultra is for measured experiments. */
  variant?: PromptVariant;
}

export interface BuildResult {
  prompt: string;
  subject: Subject;
  variant: PromptVariant;
}

/** Payload for file-attach injection: short composer text + separate protocol file. */
export interface InjectionPayload {
  /** Short text shown in the composer (question + brief instruction). */
  composerText: string;
  /** Full protocol + playbook — attached as stemlm-protocol.txt, not pasted. */
  fileContent: string;
  subject: Subject;
  variant: PromptVariant;
}

export const PROTOCOL_FILENAME = 'stemlm-protocol.txt';

export function resolveSubject(question: string, opt?: BuildOptions): Subject {
  if (opt?.subject && opt.subject !== 'Auto') return opt.subject;
  return classifySubject(question);
}

/** Protocol + one playbook — the contents of the attached .txt file. */
export function buildProtocolFileContent(opt?: BuildOptions & { question?: string }): {
  content: string;
  subject: Subject;
  variant: PromptVariant;
} {
  const subject = resolveSubject(opt?.question ?? '', opt);
  const variant = opt?.variant ?? DEFAULT_PROMPT_VARIANT;
  const content = `${CORE_PROTOCOL_BY_VARIANT[variant]}\n\n${getPlaybook(subject)}`;
  return { content, subject, variant };
}

/** Short composer stub — user question plus a one-line attach instruction. */
export function buildComposerStub(question: string, subject: Subject): string {
  const q = (question || '').trim();
  const head =
    q.length > 0 ? q : '(The student has not typed a question yet — ask them to type one.)';
  return [
    head,
    '',
    `Follow the attached ${PROTOCOL_FILENAME} exactly (${subject}).`,
    `Reply in one fenced code block with info string stemlm: @meta … @step (${STEP_COUNT_TARGET}, one atomic move each) … @solution … @end.`,
    'No prose outside the block.',
  ].join('\n');
}

/** File-attach injection payload (preferred on Gemini). */
export function buildInjectionPayload(question: string, opt?: BuildOptions): InjectionPayload {
  const { content, subject, variant } = buildProtocolFileContent({ ...opt, question });
  return {
    composerText: buildComposerStub(question, subject),
    fileContent: content,
    subject,
    variant,
  };
}

/** Legacy: full text paste (fallback when file attach is unavailable). */
export function buildInjectionPrompt(question: string, opt?: BuildOptions): BuildResult {
  const subject = resolveSubject(question, opt);
  const variant = opt?.variant ?? DEFAULT_PROMPT_VARIANT;
  const q = (question || '').trim();
  const head = q.length > 0 ? q : '(The student has not typed a question yet — ask them to type one.)';
  const prompt = `${head}${SEP}${CORE_PROTOCOL_BY_VARIANT[variant]}\n\n${getPlaybook(subject)}`;
  return { prompt, subject, variant };
}

export interface FollowupOptions {
  /** The text the student selected to drill into. */
  selection: string;
  /** The step title for context (optional). */
  stepTitle?: string;
  /** Subject so we keep the right playbook conventions. */
  subject?: Subject;
}

export function buildFollowupPrompt(opt: FollowupOptions): string {
  const subject = opt.subject ?? 'General';
  const quoted = (opt.selection || '').trim();
  const context = opt.stepTitle ? ` (from the step "${opt.stepTitle}")` : '';
  return [
    `Dig deeper into this specific part of your previous answer${context}:`,
    '',
    quoted
      .split('\n')
      .map((l) => `> ${l}`)
      .join('\n'),
    '',
    'Explain it more thoroughly — split into smaller atomic steps (one move per @step), add any missing intermediate lines, and clarify anything subtle.',
    `Answer using the SAME stemLM capsule format as before (one fenced block, info string stemlm, @meta … ${STEP_COUNT_TARGET} @step blocks, @end, with step diagrams).`,
    '',
    getPlaybook(subject),
  ].join('\n');
}

export interface RepairPromptOptions {
  errorCode?: string;
}

export function buildRepairPrompt(opt: RepairPromptOptions = {}): string {
  const reason = opt.errorCode ? ` The parser error code was ${opt.errorCode}.` : '';
  return [
    `Your previous answer broke the stemLM capsule format.${reason}`,
    'Re-emit the same answer as exactly one fenced block with info string stemlm.',
    'No prose outside the block. Preserve the math, diagrams, and explanation; fix only the format.',
    `The capsule must include @meta, ${STEP_COUNT_TARGET} @step blocks (one atomic move each, max ${STEP_COUNT_MAX}), @solution, @endsolution, and final @end.`,
  ].join('\n');
}
