/**
 * Builds the text we inject into the chatbot composer.
 *
 * Preferred path: attach stemlm-protocol.txt and insert a short student-facing
 * preamble so the chat box stays clean. Inline paste is a last-resort fallback.
 */
import type { Subject } from './types';
import { assembleProtocolFile, CORE_PROTOCOL } from './protocol';
import { SUBJECT_REGISTRY } from './playbooks';
import { classifySubject } from './classifier';
import { normalizeFollowupSelection } from '@/src/lib/followup-selection';
import { STUDY_GUIDE_FILENAME, STUDY_GUIDE_REFERENCE, LEGACY_GUIDE_FILENAME } from '@/src/lib/study-guide';

export { normalizeFollowupSelection };

export const PROTOCOL_FILENAME = STUDY_GUIDE_FILENAME;

/** Unique delimiter: student problem stays ABOVE this line; instructions below. */
export const STEMLM_SENTINEL = '--- stemLM ---';

export const STEMLM_INSTRUCTIONS_SEP = '\n\n--- stemLM instructions (do not remove) ---\n';
const SEP = STEMLM_INSTRUCTIONS_SEP;

/** Composer markers used to detect an already-injected protocol (file stub or paste fallback). */
export const STEMLM_COMPOSER_MARKERS = [
  STEMLM_SENTINEL,
  '--- stemLM',
  'stemLM instructions',
  'Ask your question here:',
  'stemLM follow-up context',
  `Follow the attached ${PROTOCOL_FILENAME}`,
  PROTOCOL_FILENAME,
  STUDY_GUIDE_REFERENCE,
  LEGACY_GUIDE_FILENAME,
] as const;

export function composerTextHasProtocol(text: string): boolean {
  if (!text) return false;
  return STEMLM_COMPOSER_MARKERS.some((marker) => text.includes(marker));
}

/** User-turn nodes that survive after send (composer is empty). */
export const THREAD_PROTOCOL_SELECTORS = [
  'user-query',
  '[data-message-author-role="user"]',
  '[data-message-author-role="human"]',
  '[data-testid="user-message"]',
  '[data-testid*="user-message" i]',
  '[data-testid^="conversation-turn-"][data-turn="user"]',
  'query-text',
  '.query-text',
  '.user-query',
] as const;

const THREAD_SCAN_ROOTS = [
  'infinite-scroller',
  'chat-window',
  '.conversation-container',
  'main',
  '[class*="conversation"]',
] as const;

/** Collect text under `el` while skipping the live composer subtree. */
function textOutsideComposer(el: HTMLElement, composer: HTMLElement | null): string {
  if (!composer || !el.contains(composer)) return el.textContent ?? '';
  let out = '';
  const walk = (node: Node) => {
    if (node === composer) return;
    if (node.nodeType === Node.TEXT_NODE) {
      out += node.textContent ?? '';
      return;
    }
    node.childNodes.forEach(walk);
  };
  walk(el);
  return out;
}

/**
 * True when an earlier user turn in the visible thread already carries the
 * protocol sentinel or filename (composer may already be empty after send).
 * Also scans conversation roots for `stemlm-protocol.txt` outside the composer.
 */
export function pageThreadHasProtocol(
  root: ParentNode = document,
  composer?: HTMLElement | null,
): boolean {
  const skipComposer =
    composer && composer !== document.body && composer !== document.documentElement
      ? composer
      : null;
  for (const sel of THREAD_PROTOCOL_SELECTORS) {
    let nodes: NodeListOf<Element>;
    try {
      nodes = root.querySelectorAll(sel);
    } catch {
      continue;
    }
    for (const el of nodes) {
      if (!(el instanceof HTMLElement)) continue;
      if (skipComposer && (skipComposer === el || skipComposer.contains(el))) continue;
      if (composerTextHasProtocol(el.textContent ?? '')) return true;
    }
  }

  const scopes: HTMLElement[] = [];
  for (const sel of THREAD_SCAN_ROOTS) {
    let nodes: NodeListOf<Element>;
    try {
      nodes = root.querySelectorAll(sel);
    } catch {
      continue;
    }
    for (const el of nodes) {
      if (el instanceof HTMLElement) scopes.push(el);
    }
  }
  if (scopes.length === 0 && root instanceof HTMLElement) scopes.push(root);
  if (scopes.length === 0 && 'body' in root && root.body instanceof HTMLElement) {
    scopes.push(root.body);
  }

  for (const scope of scopes) {
    const hay = textOutsideComposer(scope, skipComposer);
    if (hay.includes(PROTOCOL_FILENAME) || composerTextHasProtocol(hay)) return true;
  }
  return false;
}

/** After send, + injects a pointer when protocol is present and the question changed. */
export function shouldReinjectOnNewQuestion(opt: {
  buttonInjected: boolean;
  question: string;
  lastQuestion: string;
  hasProtocol: boolean;
}): boolean {
  if (!opt.buttonInjected) return true;
  const q = opt.question.trim();
  const last = opt.lastQuestion.trim();
  return opt.hasProtocol && q.length > 0 && q !== last;
}

/** NUMERIC/LAB only — other archetypes follow the ARCHETYPE REGISTRY row. */
export const STEP_BODY_FORMULA_PATTERN =
  '$<symbol>$ is <meaning in words>. With <givens>: $<symbol>=<law plug-in>=<numeric result> <units>.';

export const STEP_BODY_REQUIREMENT = [
  'CRITICAL — every @step MUST have a non-empty @body block (never omit @body).',
  'NUMERIC/LAB only: define each new symbol once, substitute the problem givens, and show the arithmetic with units.',
  'Carry the chosen sign convention and coherent units through every derived numeric line; do not attach units only to the final answer.',
  `NUMERIC/LAB first use may follow: ${STEP_BODY_FORMULA_PATTERN}`,
  'For an already-defined symbol, start with its equation or substitution and do not repeat the definition scaffold.',
  'Proof/symbolic/conceptual/code/comparison/design/estimation: follow the ARCHETYPE REGISTRY grammar. NEVER force a numeric plug-in. A proof MUST NOT plug into the formula.',
  'Group connected setup and algebra into one meaningful move; never restate givens line by line.',
  'A step with @formula but empty @body is invalid.',
].join('\n');

export const DIAGRAM_SPEC_CATALOG = [
  'DIAGRAMS: compiler draws. You name ids. Never <svg>, viewBox, path d=, text x= y=, markers.',
  'type=plot     fn: | data: | poles: | peaks:  xlabel: ylabel: units  eq:  domain:',
  'type=scene    kind=fbd|ray|geom|field  named parts, relations (incline_deg, f, do) — no pixels',
  'type=field    catalog: dipole|parallel-plate|wire|solenoid|TE10  core: B: H:',
  'type=graph    node: id label   edge: a b kind   decision:/terminal: (flowchart)  start:/accept: (automaton)',
  'type=table    kind=ice|dp|punnett|matrix  row lines',
  'type=circuit  SPICE-like  id n1 n2 value  std=ieee  highlight:',
  'type=chem.smiles  smiles:  annotate:  (never Newman/Fischer/chair as SMILES)',
  'hybridpi rpi,gm,re,rc required. opamp rf,rg required.',
  'mccabe α,zF,xD,R,q — do NOT list staircase corners. sfd piecewise V(x), M(x) sagging+.',
  'FORBIDDEN: AI images, type=mermaid, JCAMP, type=svg.',
].join('\n');

export function getDiagramRequirement(subject: Subject): string {
  const row = SUBJECT_REGISTRY[subject] ?? SUBJECT_REGISTRY.General;
  const extra: Record<Subject, string> = {
    Electrical:
      'CRITICAL — show one complete @diagram type=circuit (or hybridpi/opamp) for the original topology and each material visual state change; OMIT pure algebra and unchanged states. Reconstruct node connectivity before the spec. Every visible component and every component named in @body MUST appear once as a parser-safe named device line. hybridpi requires rpi, gm, re, rc. Never omit rc.',
    Chemistry:
      'CRITICAL — chemistry/visual problems MUST include @diagram specs. chem.smiles / newman / mo / table kind=ice / type=echem. NEVER SMILES-as-Newman. Every named species is a spec id.',
    Physics:
      'CRITICAL — physics visual problems MUST include @diagram specs. FREE-BODY: type=scene kind=fbd; isolate ONE body; name forces N,T,f,mg,F; axes separate. OPTICS: type=ray or scene kind=ray with f, do. FIELDS: type=field catalog: solenoid|dipole|parallel-plate|wire|TE10 with core:/B:/H: keys — never a prose paragraph.',
    Math: 'CRITICAL — math visual problems MUST include @diagram type=plot (or scene/table/graph) for graphs, regions, geometry. Omit on purely symbolic algebra.',
    Biology:
      'CRITICAL — biology visual problems MUST include @diagram specs. Punnett: table. Pedigree/pathway: graph (pointed=activation, blunt=inhibition).',
    CS: 'CRITICAL — CS traces MUST include graph (flowchart/state machine) or table/array. Code as inline `code`, never a fence.',
    Mechanical:
      'CRITICAL — mechanical visual problems MUST include @diagram specs for FBDs, stress, shafts/gears, and P–V/T–s plots.',
    Civil:
      'CRITICAL — civil visual problems MUST include @diagram specs for beams, trusses, SFD/BMD. type=sfd piecewise V(x), M(x); sagging positive.',
    Chemical:
      'CRITICAL — chemical engineering visual problems MUST include @diagram specs. PFD numbered streams; type=mccabe with α,zF,xD,R,q — never list staircase corners.',
    General:
      'CRITICAL — include @diagram specs on steps that draw, sketch, diagram, or show spatial/visual state. Never <svg> or path coordinates.',
  };
  return [extra[subject] ?? extra.General, `diagrams: ${row.diagrams}`, DIAGRAM_SPEC_CATALOG].join(
    '\n',
  );
}

export const FIRST_PASS_COMPLETION_REQUIREMENT = [
  'FIRST PASS ONLY: produce the complete corrected capsule now; do not rely on a later repair/retry prompt.',
  'Before sending, self-check that the output is exactly one fenced stemlm block ending in @end, every @step has non-empty @body work and id=, and every visual state-changing step has a closed @diagram spec (not SVG) that names every object in @body.',
].join('\n');

export const FOLLOWUP_QUESTION_SLOT = 'Ask your question here:\n\n\n';

export const FOLLOWUP_CONTEXT_HEADER = '--- stemLM follow-up context (do not remove) ---';

export interface BuildOptions {
  subject?: Subject | 'Auto';
  hasImageAttachment?: boolean;
}

export interface BuildResult {
  prompt: string;
  subject: Subject;
}

export interface InjectionPayload {
  composerText: string;
  fileContent: string;
  subject: Subject;
}

export function resolveSubject(question: string, opt?: BuildOptions): Subject {
  if (opt?.subject && opt.subject !== 'Auto') return opt.subject;
  return classifySubject(question);
}

const DIAGRAM_REMINDERS: Record<Subject, string> = {
  Electrical:
    'Use one complete circuit or hybridpi/opamp spec for the source topology and material state changes; OMIT unchanged algebra. Reconstruct node connectivity and count-check device lines and terminals. Never SVG coordinates.',
  Chemistry:
    'Use chem.smiles / newman / mo / table kind=ice / echem on visual steps — every named species is a spec id. Never SVG coordinates.',
  Physics:
    'Use scene FBD / ray (f,do) / field catalog (solenoid,dipole,parallel-plate,wire,TE10) / plot on visual steps — named forces, axes, core/B/H. Never SVG coordinates.',
  Math: 'Use type=plot with fn: and eq: (or scene/table) when visual. Never SVG coordinates.',
  Biology: 'Use table/graph/named templates (graph for pathways). Never SVG coordinates.',
  CS: 'Use graph for control flow / state machines; table/array for DS traces. Code as inline `code`, never a fence.',
  Mechanical: 'Use scene FBD / plot P-V / shaft templates. Never SVG coordinates.',
  Civil: 'Use beam then type=sfd (sagging+). Never SVG coordinates.',
  Chemical: 'Use PFD streams / type=mccabe (α,zF,xD,R,q — no stair corners). Never SVG coordinates.',
  General: "Use the dominant subject's spec types whenever spatial/visual. Never SVG coordinates.",
};

export function getDiagramReminder(subject: Subject): string {
  return DIAGRAM_REMINDERS[subject] ?? DIAGRAM_REMINDERS.General;
}

export const STEP_BODY_REMINDER =
  'Every @step needs a non-empty @body. Numeric/lab: substitute givens with units. Proof/symbolic: name the rule — NEVER a numeric plug-in.';

export function buildProtocolFileContent(opt?: BuildOptions & { question?: string }): {
  content: string;
  subject: Subject;
} {
  const subject = resolveSubject(opt?.question ?? '', opt);
  return { content: assembleProtocolFile(), subject };
}

/** Complete inline fallback, with attachment-only labels rewritten for pasted use. */
function buildInlineFallbackProtocol(): string {
  return assembleProtocolFile()
    .replaceAll(PROTOCOL_FILENAME, 'the stemLM instruction attachment')
    .replaceAll('DIAGRAM REGISTRY', 'FIGURE FAMILY CATALOG');
}

const IMAGE_STUB_LINE =
  '(Problem image/PDF is attached — transcribe the full question into the capsule question field.)';

/** Student-facing product copy. Short, plain, states what is happening. */
export const STUDENT_PREAMBLE = [
  `Follow the attached ${STUDY_GUIDE_REFERENCE} as an answer-format reference for my question. Infer the subject from the problem.`,
  'Use its worked steps and diagram instructions.',
].join(' ');

export const POINTER_PREAMBLE = [
  `New problem. Follow the attached ${STUDY_GUIDE_REFERENCE}, including its diagram instructions.`,
].join(' ');

export function buildFollowAttachedLine(): string {
  return `Follow the attached ${STUDY_GUIDE_REFERENCE} as an answer-format reference for my question. Infer the subject from the problem.`;
}

export interface ComposerStubOptions extends Pick<BuildOptions, 'hasImageAttachment'> {
  includeQuestion?: boolean;
}

function joinStub(parts: Array<string | false | undefined | null>): string {
  return parts.filter((p): p is string => typeof p === 'string').join('\n');
}

/** Short composer stub — question (optional) above the sentinel, preamble below. */
export function buildComposerStub(question: string, opt?: ComposerStubOptions): string {
  const includeQuestion = opt?.includeQuestion !== false;
  const q = (question || '').trim();
  const above: string[] = [];

  if (includeQuestion) {
    if (q) above.push(q);
    else if (opt?.hasImageAttachment) above.push(IMAGE_STUB_LINE);
  } else if (!q && opt?.hasImageAttachment) {
    above.push(IMAGE_STUB_LINE);
  }

  return joinStub([above.join('\n'), above.length ? '' : undefined, STEMLM_SENTINEL, STUDENT_PREAMBLE]);
}

/** Stub appended under an existing question / image — never repeats the question. */
export function buildComposerAppendix(
  opt?: Pick<BuildOptions, 'hasImageAttachment'> & { hasQuestion?: boolean },
): string {
  return buildComposerStub('', {
    hasImageAttachment: Boolean(opt?.hasImageAttachment) && !opt?.hasQuestion,
    includeQuestion: false,
  });
}

/** Short pointer when the protocol is already in this composer or thread. */
export function buildComposerPointer(
  opt?: Pick<BuildOptions, 'hasImageAttachment'> & {
    hasQuestion?: boolean;
    protocolAttachmentConfirmed?: boolean;
  },
): string {
  const imageNote =
    Boolean(opt?.hasImageAttachment) && !opt?.hasQuestion ? IMAGE_STUB_LINE : '';
  // Legacy callers can explicitly request a pointer before delivery is known.
  // Production callers confirm the upload and always use the compact branch.
  if (!opt?.protocolAttachmentConfirmed) {
    if (opt?.hasImageAttachment) {
      return joinStub([imageNote, STEMLM_SENTINEL, buildInlineFallbackProtocol()]);
    }
    return joinStub([
      imageNote,
      STEMLM_SENTINEL,
      `New problem. Re-read and apply the earlier ${STUDY_GUIDE_REFERENCE} (attached file or inline fallback) before answering.`,
    ]);
  }
  return joinStub([imageNote, STEMLM_SENTINEL, POINTER_PREAMBLE]);
}

export function buildInjectionPayload(question: string, opt?: BuildOptions): InjectionPayload {
  const { content, subject } = buildProtocolFileContent({ ...opt, question });
  return {
    composerText: buildComposerStub(question, opt),
    fileContent: content,
    subject,
  };
}

const IMAGE_QUESTION_PREAMBLE = [
  'The student attached a problem image/PDF (no typed question).',
  'Read it and transcribe the full problem statement verbatim in @meta question: (all givens, labels, and parts (a)(b)…).',
  'topic: stays a short ≤8-word title only.',
].join(' ');

/** Last-resort composer paste: the complete protocol because no attachment survived. */
export function buildCoreFallbackAppendix(question: string, opt?: BuildOptions): BuildResult {
  const subject = resolveSubject(question, opt);
  const imageNote =
    opt?.hasImageAttachment && !(question || '').trim() ? `${IMAGE_QUESTION_PREAMBLE}\n\n` : '';
  const prompt = `${SEP}${imageNote}${buildInlineFallbackProtocol()}`;
  return { prompt, subject };
}

export function buildInjectionAppendix(question: string, opt?: BuildOptions): BuildResult {
  return buildCoreFallbackAppendix(question, opt);
}

export function buildInjectionPrompt(question: string, opt?: BuildOptions): BuildResult {
  const subject = resolveSubject(question, opt);
  const q = (question || '').trim();
  const head = q.length > 0 ? q : '(The student has not typed a question yet — ask them to type one.)';
  const { prompt: appendix } = buildInjectionAppendix(question, opt);
  const prompt = `${head}${appendix}`;
  return { prompt, subject };
}

export type FollowupIntent = 'dig-deeper' | 'ask' | 'ask-solution';

export function isAskIntent(intent?: FollowupIntent): boolean {
  return intent === 'ask' || intent === 'ask-solution';
}

export interface FollowupOptions {
  selection: string;
  stepTitle?: string;
  subject?: Subject;
  intent?: FollowupIntent;
}

function formatQuotedSelection(selection: string): string {
  return selection
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');
}

const FOLLOWUP_CONTRACT_SHORT = [
  'FOLLOW-UP CONTRACT (current question — not new homework):',
  'step N is wrong → PATCH replace that step id; @meta mode: patch',
  'solve it another way → RESOLVE full re-emission same qid; mode: resolve',
  'explain it simpler → PATCH rewrite bodies, keep ids; mode: patch',
  'change this value and redo → RESOLVE with the new given; mode: resolve',
  'add a step → PATCH insert after the named id; mode: patch',
  'off-topic / new problem → NEW question object; mode: new',
  'revert last patch → PATCH restore that id; mode: patch',
  'only the diagram is wrong → PATCH that @diagram; keep @body; mode: patch',
  'translate this → PATCH language only; keep ids; mode: patch',
  'hint, don\'t solve → PATCH hint; NEVER dump the final answer; mode: patch',
  'check my working → PATCH mark student lines; mode: patch',
  'multiple-choice → RESOLVE; name the option and why others fail; mode: resolve',
  'skip to the answer → structure still wins; full steps; mode: resolve',
  'change two givens → RESOLVE with both new givens; mode: resolve',
  'explain this formula only → PATCH that formula step; mode: patch',
  'empty follow-up → NO-OP; emit nothing',
].join('\n');

/**
 * Ask-in-chat contract: the answer must be a compact standalone mini-capsule
 * that stemLM attaches inline after the quoted step — never a rewrite, patch,
 * or new question object.
 */
const ASK_IN_CHAT_CONTRACT = [
  'ASK-IN-CHAT CONTRACT (inline step answer — NOT new homework, NOT a rewrite):',
  'The student typed a question at the very top about the quoted step of the CURRENT problem.',
  'Answer ONLY that typed question, grounded in the quoted step context.',
  '@meta: keep the SAME qid and topic as the current question; mode: resolve.',
  'Emit 1-3 compact @step blocks (each id=sN, non-empty @body) that answer the question directly.',
  'Do NOT re-emit the original solution steps. Do NOT emit @patch ops. Do NOT open a new @q object.',
  '@solution: 2-4 sentences that answer the typed question directly.',
  'If the question needs a figure, include a @diagram spec (never SVG).',
  'If the student typed nothing above, emit nothing.',
].join('\n');

/**
 * Whole-solution Ask-in-chat: same mini-capsule shape as a step ask, but the
 * question spans the entire solution rather than one step.
 */
const ASK_SOLUTION_CONTRACT = [
  'ASK-IN-CHAT CONTRACT (whole-solution answer — NOT new homework, NOT a rewrite):',
  'The student typed a question at the very top about the CURRENT problem\'s full solution (not one step).',
  'Answer ONLY that typed question, using the quoted solution overview as context.',
  '@meta: keep the SAME qid and topic as the current question; mode: resolve.',
  'Emit 1-3 compact @step blocks (each id=sN, non-empty @body) that answer the question directly.',
  'Do NOT re-emit the original solution steps. Do NOT emit @patch ops. Do NOT open a new @q object.',
  '@solution: 2-4 sentences that answer the typed question directly.',
  'If the question needs a figure, include a @diagram spec (never SVG).',
  'If the student typed nothing above, emit nothing.',
].join('\n');

function followupCopy(opt: FollowupOptions): { lead: string; contract: string } {
  if (opt.intent === 'ask-solution') {
    return {
      lead: 'The student is asking a question about the WHOLE solution of the current problem (not one step). Their question is at the very top; the quoted lines are the solution overview.',
      contract: ASK_SOLUTION_CONTRACT,
    };
  }
  const context = opt.stepTitle?.trim()
    ? ` (from the step "${opt.stepTitle.trim()}")`
    : '';
  if (opt.intent === 'ask') {
    return {
      lead: `The student is asking a question about this step${context}. Their question is at the very top of this message; the quoted lines below are the step context.`,
      contract: ASK_IN_CHAT_CONTRACT,
    };
  }
  return {
    lead: `Dig deeper into this specific part of your previous answer${context}. Patch or split the named step; do not open a new homework blob.`,
    contract: FOLLOWUP_CONTRACT_SHORT,
  };
}

export function buildFollowupContextBlock(opt: FollowupOptions): string {
  const selection = normalizeFollowupSelection(opt.selection);
  const { lead, contract } = followupCopy(opt);
  const guidance =
    opt.intent === 'ask' || opt.intent === 'ask-solution'
      ? contract
      : [
          contract,
          'Split only when the explanation changes reasoning goal; keep connected work together. Keep the current qid. mode: patch unless the student asked for another method (resolve).',
        ].join('\n');
  return [
    FOLLOWUP_CONTEXT_HEADER,
    lead,
    '',
    formatQuotedSelection(selection),
    '',
    guidance,
    `Reply in ONE fenced stemlm block ending @end (@meta … @step id=sN … @end). No prose outside.`,
    STEP_BODY_REMINDER,
  ].join('\n');
}

export function buildFollowupComposerText(opt: FollowupOptions): string {
  const selection = normalizeFollowupSelection(opt.selection);
  const { lead, contract } = followupCopy(opt);
  return [
    FOLLOWUP_CONTEXT_HEADER,
    `Follow the attached ${STUDY_GUIDE_REFERENCE}. Do not treat this as new homework.`,
    lead,
    formatQuotedSelection(selection),
    contract,
    'Reply with one fenced stemlm block ending @end. No prose outside.',
  ].join('\n');
}

export function buildFollowupPayload(opt: FollowupOptions): InjectionPayload {
  const subject = opt.subject ?? 'General';
  const selection = normalizeFollowupSelection(opt.selection);
  const { content } = buildProtocolFileContent({ subject });
  return {
    composerText: buildFollowupComposerText({ ...opt, selection, subject }),
    fileContent: content,
    subject,
  };
}

const COMPACT_GRAMMAR = [
  'OUTPUT: one fenced stemlm block ending @end. @meta version/subject/topic/question/qid/mode then @step id=sN with @body. Diagrams are specs, never SVG.',
  'mode: patch uses @patch op=replace|insert|delete. mode: resolve re-emits the current qid. mode: new opens @q id=qN.',
].join('\n');

/** Attach-failed follow-up: local context plus the complete protocol. */
export function buildFollowupAskInChatPrompt(opt: FollowupOptions): string {
  const subject = opt.subject ?? 'General';
  const context = buildFollowupContextBlock({ ...opt, subject });
  return `${FOLLOWUP_QUESTION_SLOT}${context}\n${SEP}${COMPACT_GRAMMAR}\n\n${buildInlineFallbackProtocol()}`;
}

/** Clipboard Copy: short composer form + question slot — never the instructions wall. */
export function buildFollowupCopyText(opt: FollowupOptions): string {
  return `${FOLLOWUP_QUESTION_SLOT}${buildFollowupComposerText(opt)}`;
}

export function isEmptyFollowupSelection(selection: string): boolean {
  return normalizeFollowupSelection(selection).length === 0;
}

export function buildFollowupPrompt(opt: FollowupOptions): string {
  return buildFollowupCopyText(opt);
}

