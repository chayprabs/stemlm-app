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
import { normalizeFollowupSelection } from '@/src/lib/followup-selection';

export { normalizeFollowupSelection };

export const STEMLM_INSTRUCTIONS_SEP = '\n\n--- stemLM instructions (do not remove) ---\n';
const SEP = STEMLM_INSTRUCTIONS_SEP;

/** Blank lines after this label are where the student types their follow-up question. */
export const FOLLOWUP_QUESTION_SLOT = 'Ask your question here:\n\n\n';

const FOLLOWUP_CONTEXT_HEADER = '--- stemLM follow-up context (do not remove) ---';

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
    'Every @step needs a non-empty @body: define symbols, substitute givens, compute with units.',
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

/** Protocol + playbook block only — appended below existing composer content. */
export function buildInjectionAppendix(question: string, opt?: BuildOptions): BuildResult {
  const subject = resolveSubject(question, opt);
  const variant = opt?.variant ?? DEFAULT_PROMPT_VARIANT;
  const prompt = `${SEP}${CORE_PROTOCOL_BY_VARIANT[variant]}\n\n${getPlaybook(subject)}`;
  return { prompt, subject, variant };
}

/** Full text paste when the composer is empty (question + protocol). */
export function buildInjectionPrompt(question: string, opt?: BuildOptions): BuildResult {
  const subject = resolveSubject(question, opt);
  const variant = opt?.variant ?? DEFAULT_PROMPT_VARIANT;
  const q = (question || '').trim();
  const head = q.length > 0 ? q : '(The student has not typed a question yet — ask them to type one.)';
  const { prompt: appendix } = buildInjectionAppendix(question, opt);
  const prompt = `${head}${appendix}`;
  return { prompt, subject, variant };
}

export type FollowupIntent = 'dig-deeper' | 'ask';

export interface FollowupOptions {
  /** The text the student selected to drill into. */
  selection: string;
  /** The step title for context (optional). */
  stepTitle?: string;
  /** Subject so we keep the right playbook conventions. */
  subject?: Subject;
  variant?: PromptVariant;
  /** dig-deeper = quote-reply on a step prompt; ask = free-form follow-up on last step. */
  intent?: FollowupIntent;
}

function formatQuotedSelection(selection: string): string {
  return selection
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

/** Dig-deeper context block (selection quote + instructions), without protocol. */
export function buildFollowupContextBlock(opt: FollowupOptions): string {
  const selection = normalizeFollowupSelection(opt.selection);
  const context = opt.stepTitle?.trim()
    ? ` (from the step "${opt.stepTitle.trim()}")`
    : '';
  const lead =
    opt.intent === 'ask'
      ? `The student finished the step-by-step solution and will type a follow-up question in the composer above${context}. Use this context when answering:`
      : `Dig deeper into this specific part of your previous answer${context}:`;
  const guidance =
    opt.intent === 'ask'
      ? 'Answer their follow-up in the same stemLM capsule format — split into atomic @step blocks when the explanation needs multiple moves.'
      : 'Explain it more thoroughly — split into smaller atomic steps (one move per @step), add any missing intermediate lines, and clarify anything subtle.';
  return [
    FOLLOWUP_CONTEXT_HEADER,
    lead,
    '',
    formatQuotedSelection(selection),
    '',
    guidance,
    'Follow the stemLM protocol below exactly.',
    `Reply in one fenced code block with info string stemlm: @meta … @step (${STEP_COUNT_TARGET}, one atomic move each) … @solution … @end.`,
    'Every @step needs a non-empty @body: define symbols, substitute givens, compute with units.',
    'No prose outside the block.',
  ].join('\n');
}

/** Composer text for follow-ups — pairs with an attached protocol file on Gemini. */
export function buildFollowupComposerText(opt: FollowupOptions): string {
  const subject = opt.subject ?? 'General';
  const block = buildFollowupContextBlock(opt);
  return block.replace(
    'Follow the stemLM protocol below exactly.',
    `Follow the attached ${PROTOCOL_FILENAME} exactly (${subject}).`,
  );
}

/** File-attach follow-up payload (preferred on Gemini — same path as initial injection). */
export function buildFollowupPayload(opt: FollowupOptions): InjectionPayload {
  const subject = opt.subject ?? 'General';
  const variant = opt.variant ?? DEFAULT_PROMPT_VARIANT;
  const selection = normalizeFollowupSelection(opt.selection);
  const content = `${CORE_PROTOCOL_BY_VARIANT[variant]}\n\n${getPlaybook(subject)}`;
  return {
    composerText: buildFollowupComposerText({ ...opt, selection, subject, variant }),
    fileContent: content,
    subject,
    variant,
  };
}

/**
 * Ask-in-chat / clipboard follow-up prompt: question slot at the top, dig-deeper
 * context in the middle, protocol appendix at the bottom.
 */
export function buildFollowupAskInChatPrompt(opt: FollowupOptions): string {
  const subject = opt.subject ?? 'General';
  const variant = opt.variant ?? DEFAULT_PROMPT_VARIANT;
  const context = buildFollowupContextBlock({ ...opt, subject, variant });
  const appendix = `${SEP}${CORE_PROTOCOL_BY_VARIANT[variant]}\n\n${getPlaybook(subject)}`;
  return `${FOLLOWUP_QUESTION_SLOT}${context}${appendix}`;
}

/** @alias buildFollowupAskInChatPrompt */
export function buildFollowupPrompt(opt: FollowupOptions): string {
  return buildFollowupAskInChatPrompt(opt);
}

export interface RepairPromptOptions {
  errorCode?: string;
}

const QUALITY_REPAIR_CODES = new Set([
  'missing_step_body',
  'formula_without_body',
  'step_missing_substitution',
  'step_missing_symbol_defs',
]);

export function buildRepairPrompt(opt: RepairPromptOptions = {}): string {
  const reason = opt.errorCode ? ` The parser error code was ${opt.errorCode}.` : '';
  const qualityFix = opt.errorCode && QUALITY_REPAIR_CODES.has(opt.errorCode)
    ? ' Each @step with @formula must have @body that defines every symbol and shows the numeric substitution with units — never a bare formula alone.'
    : '';
  return [
    `Your previous answer broke the stemLM capsule format.${reason}`,
    'Re-emit the same answer as exactly one fenced block with info string stemlm.',
    `No prose outside the block. Preserve the math and diagrams; fix format and step completeness.${qualityFix}`,
    `The capsule must include @meta, ${STEP_COUNT_TARGET} @step blocks (one atomic move each, max ${STEP_COUNT_MAX}), @solution, @endsolution, and final @end.`,
    'Every @step needs a non-empty @body with symbol definitions and worked numbers when a formula is used.',
  ].join('\n');
}
