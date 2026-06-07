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

/** Repeated on every inject so models cannot skip worked @body blocks. */
export const STEP_BODY_FORMULA_PATTERN =
  '$<symbol>$ is <meaning in words>. With <givens>: $<symbol>=<law plug-in>=<numeric result> <units>.';

/** Repeated on every inject so models cannot skip worked @body blocks. */
export const STEP_BODY_REQUIREMENT = [
  'CRITICAL — every @step MUST have a non-empty @body block (never omit @body).',
  'In @body: define each new symbol in words, substitute the problem givens, and show the arithmetic with units.',
  `When @formula has symbols, @body MUST follow: ${STEP_BODY_FORMULA_PATTERN}`,
  'Example: $X_L$ is inductive reactance in $\\Omega$. With $\\omega=377\\,\\text{rad/s}$ and $L=0.2\\,\\text{H}$: $X_L=\\omega L=377\\times0.2=75.4\\,\\Omega$.',
  'A step with @formula but empty @body is invalid. Conceptual steps still need @body prose.',
].join('\n');

/** Chemistry-specific diagram rules — Gemini must draw structures/spectra, not text-only. */
export const CHEMISTRY_DIAGRAM_REQUIREMENT = [
  'CRITICAL — chemistry/visual problems MUST include @diagram type=svg on steps that draw, sketch, diagram, or name structures/orbitals/mechanisms/spectra.',
  'Each @diagram shows the chemical state AT THIS STEP: Lewis/line structures, MO energy levels, orbital lobes, Newman/Fischer projections, energy profiles, ICE tables, phase diagrams, unit cells, spectra with labeled peaks, electrochemical cells.',
  'COMPLETENESS: every species, bond, orbital, electrode, or peak you name in @body MUST appear labeled in that step\'s SVG — partial fragments are invalid.',
  'Step 1 on multi-part problems: overview diagram (energy levels, MO diagram, mechanism outline, or cell schematic).',
  'Each SVG: viewBox="0 0 300 180", font-size 13–15, ≥5 primitives (line/path/circle/rect) + ≥3 text labels; offset labels 10px from symbols.',
  'Minimum ≥40% of steps have diagrams on diagram-intensive chemistry problems; never text-only SVG.',
].join('\n');

/** Repeated on every inject so models cannot skip circuit / spatial diagrams. */
export const STEP_DIAGRAM_REQUIREMENT = [
  'CRITICAL — electrical/visual problems MUST include @diagram type=svg on nearly EVERY @step (never skip for laziness).',
  'COMPLETENESS: each @diagram must show EVERY component you name in @body for that step — if you write R_C, R_E, r_π, g_m, v_in, collector, load, they MUST all appear labeled in the SVG. Partial fragments are invalid.',
  'Step 1: FULL original circuit or full small-signal/hybrid-π model (BJT: base B, collector C, emitter E, r_π, g_m v_be source, R_E, R_C to supply, ground, v_in).',
  'BJT/OP-AMP/SMALL-SIGNAL: draw the complete hybrid-π or op-amp schematic — transistor triangle/circle, all resistors (zigzag), controlled current source (diamond/circle+arrow), every node wired. Never show only r_π+RE without R_C and collector.',
  'REQUIRED @diagram on: model drawing, R_in/R_out/gain derivations, KCL/KVL, superposition, Thevenin, source killing, bandwidth/stability — any step mentioning circuit elements.',
  'Each SVG: ≥8 primitives on model steps, ≥5 on other EE steps, ≥3 text labels; use line/path/polyline/rect/circle — NOT text-only. Highlight what changed this step.',
  'Minimum: ≥55% of steps have diagrams; never fewer than 3; complex multi-part problems need a diagram on most steps.',
  'SVG SIZE: use compact viewBox="0 0 300 180" (max ~360×220); font-size 13–15 on every <text>; max ~6 value labels; no "Symbols: …" legend block inside the SVG.',
  'LABELS: name components (R1,L1,Vs,Id); offset text 10px from symbol — never stacked or on wires.',
  'PHASOR: Re/Im at axis ends; real/imag values (18/97, j8/97) at projection foot on dashed line; I1/I2 beside arrowhead not on stroke.',
].join('\n');

/** Keeps the first model response complete so the app never needs to patch the chat afterward. */
export const FIRST_PASS_COMPLETION_REQUIREMENT = [
  'FIRST PASS ONLY: produce the complete corrected capsule now; do not rely on a later repair/retry prompt.',
  'Before sending, self-check that the output is exactly one fenced stemlm block ending in @end, every @step has non-empty @body work, and every required SVG is complete and labeled.',
].join('\n');

/** Blank lines after this label are where the student types their follow-up question. */
export const FOLLOWUP_QUESTION_SLOT = 'Ask your question here:\n\n\n';

const FOLLOWUP_CONTEXT_HEADER = '--- stemLM follow-up context (do not remove) ---';

export interface BuildOptions {
  /** 'Auto' => classify from the question; otherwise force this subject. */
  subject?: Subject | 'Auto';
  /** Balanced is the production default; ultra is for measured experiments. */
  variant?: PromptVariant;
  /** Composer has an image attachment but may have no typed text. */
  hasImageAttachment?: boolean;
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

/** Generic diagram rules for non-EE visual subjects (not circuit-specific). */
export const GENERAL_DIAGRAM_REQUIREMENT = [
  'CRITICAL — include @diagram type=svg on steps that draw, sketch, diagram, or show spatial/chemical/mechanical state.',
  'Each @diagram shows the state AT THIS STEP only — every named component, bond, load, or label from @body must appear in the SVG.',
  'Each SVG: viewBox="0 0 300 180", font-size 13–15, ≥5 primitives (line/path/circle/rect) + ≥3 text labels; offset labels 10px from symbols.',
  'Minimum ≥40% of steps carry diagrams on diagram-intensive problems; never text-only SVG.',
].join('\n');

/** Subject-specific diagram injection block for Gemini prompts. */
export function getDiagramRequirement(subject: Subject): string {
  if (subject === 'Electrical') return STEP_DIAGRAM_REQUIREMENT;
  if (subject === 'Chemistry') return CHEMISTRY_DIAGRAM_REQUIREMENT;
  return GENERAL_DIAGRAM_REQUIREMENT;
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
export function buildComposerStub(question: string, subject: Subject, opt?: Pick<BuildOptions, 'hasImageAttachment'>): string {
  const q = (question || '').trim();
  const head =
    q.length > 0
      ? q
      : opt?.hasImageAttachment
        ? '(Problem image is attached above — read it and transcribe the full question in @meta question:.)'
        : '(The student has not typed a question yet — ask them to type one.)';
  return [
    head,
    '',
    `Follow the attached ${PROTOCOL_FILENAME} exactly (${subject}).`,
    `Reply in one fenced code block with info string stemlm: @meta … @step (${STEP_COUNT_TARGET}, one atomic move each) … @solution … @end.`,
    STEP_BODY_REQUIREMENT,
    getDiagramRequirement(subject),
    FIRST_PASS_COMPLETION_REQUIREMENT,
    'No prose outside the block.',
  ].join('\n');
}

/** File-attach injection payload (preferred on Gemini). */
export function buildInjectionPayload(question: string, opt?: BuildOptions): InjectionPayload {
  const { content, subject, variant } = buildProtocolFileContent({ ...opt, question });
  return {
    composerText: buildComposerStub(question, subject, opt),
    fileContent: content,
    subject,
    variant,
  };
}

const IMAGE_QUESTION_PREAMBLE = [
  'The student pasted a problem image in the composer above (no typed question).',
  'Read that image carefully and transcribe the full problem statement verbatim in @meta question: (all givens, labels, and parts (a)(b)…).',
  'topic: stays a short ≤8-word title only.',
].join(' ');

/** Protocol + playbook block only — appended below existing composer content. */
export function buildInjectionAppendix(question: string, opt?: BuildOptions): BuildResult {
  const subject = resolveSubject(question, opt);
  const variant = opt?.variant ?? DEFAULT_PROMPT_VARIANT;
  const imageNote =
    opt?.hasImageAttachment && !(question || '').trim() ? `${IMAGE_QUESTION_PREAMBLE}\n\n` : '';
  const prompt = `${SEP}${imageNote}${STEP_BODY_REQUIREMENT}\n\n${getDiagramRequirement(subject)}\n\n${FIRST_PASS_COMPLETION_REQUIREMENT}\n\n${CORE_PROTOCOL_BY_VARIANT[variant]}\n\n${getPlaybook(subject)}`;
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
  const subject = opt.subject ?? 'General';
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
    getDiagramRequirement(subject),
    FIRST_PASS_COMPLETION_REQUIREMENT,
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
  'quickcheck_thin_answer',
  'quickcheck_generic_trivia',
  'quickcheck_missing_question',
  'quickcheck_missing_answer',
  'missing_initial_circuit',
  'missing_circuit_diagram',
  'insufficient_diagrams',
  'diagram_lacks_graphics',
  'diagram_incomplete',
]);

const DIAGRAM_REPAIR_CODES = new Set([
  'missing_initial_circuit',
  'missing_circuit_diagram',
  'insufficient_diagrams',
  'diagram_lacks_graphics',
  'diagram_incomplete',
]);

export function buildRepairPrompt(opt: RepairPromptOptions = {}): string {
  const reason = opt.errorCode ? ` The parser error code was ${opt.errorCode}.` : '';
  const bodyFix = opt.errorCode && QUALITY_REPAIR_CODES.has(opt.errorCode) && !DIAGRAM_REPAIR_CODES.has(opt.errorCode)
    ? ' Each @step with @formula must have @body that defines every symbol and shows the numeric substitution with units — never a bare formula alone. @quickcheck answers must include because/since and a formula or number from the step — never one-word verdicts.'
    : '';
  const diagramFix = opt.errorCode && DIAGRAM_REPAIR_CODES.has(opt.errorCode)
    ? ' ADD or REDRAW every @diagram type=svg to be COMPLETE: electrical — full circuit/hybrid-π with every named component labeled; chemistry — structures/orbitals/mechanisms/spectra with every species and label from @body. No partial fragments. ≥5 SVG primitives + ≥3 labels. Diagram on every visual step.'
    : '';
  return [
    `Your previous stemLM capsule was incomplete or malformed.${reason}`,
    'Re-emit the FULL answer as exactly one fenced block with info string stemlm.',
    `No prose outside the block. Keep the same math; fix every step's @body work and add every required circuit diagram.${bodyFix}${diagramFix}`,
    `The capsule must include @meta, ${STEP_COUNT_TARGET} @step blocks (one atomic move each, max ${STEP_COUNT_MAX}), @solution, @endsolution, and final @end.`,
    STEP_BODY_REQUIREMENT,
    getDiagramRequirement('General'),
    '@quickcheck: test this step\'s result; answer with because + formula/number — not one word.',
  ].join('\n');
}
