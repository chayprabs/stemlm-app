/**
 * Builds the text we inject into the chatbot composer.
 *
 * Preferred path: attach stemlm-protocol.txt (core + every subject playbook)
 * and insert only a short stub so the chat box stays clean. The model infers
 * the subject from the problem. Inline paste is a last-resort fallback.
 *
 *  - buildInjectionPayload / buildComposerStub: file + short stub
 *  - buildFollowupPayload: same file attach for dig-deeper / ask-in-chat
 *  - buildInjectionPrompt / buildFollowupPrompt: compact inline fallback
 */
import type { Subject } from './types';
import {
  CORE_PROTOCOL_BY_VARIANT,
  DEFAULT_PROMPT_VARIANT,
  STEP_COUNT_MAX,
  STEP_COUNT_TARGET,
  type PromptVariant,
} from './protocol';
import { getUniversalPlaybook } from './playbooks';
import { classifySubject } from './classifier';
import { normalizeFollowupSelection } from '@/src/lib/followup-selection';

export { normalizeFollowupSelection };

export const PROTOCOL_FILENAME = 'stemlm-protocol.txt';

export const STEMLM_INSTRUCTIONS_SEP = '\n\n--- stemLM instructions (do not remove) ---\n';
const SEP = STEMLM_INSTRUCTIONS_SEP;

/** Composer markers used to detect an already-injected protocol (file stub or paste fallback). */
export const STEMLM_COMPOSER_MARKERS = [
  '--- stemLM',
  'stemLM instructions',
  'Ask your question here:',
  'stemLM follow-up context',
  `Follow the attached ${PROTOCOL_FILENAME}`,
  PROTOCOL_FILENAME,
] as const;

export function composerTextHasProtocol(text: string): boolean {
  if (!text) return false;
  return STEMLM_COMPOSER_MARKERS.some((marker) => text.includes(marker));
}

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

/** Shared catalog: compiler draws; the model names ids. Never SVG coordinates. */
export const DIAGRAM_SPEC_CATALOG = [
  'DIAGRAMS: compiler draws. You name ids. Never <svg>, viewBox, path d=, text x= y=, markers.',
  'type=plot     fn: | data: | poles: | peaks:  xlabel: ylabel: units  eq:  domain:',
  'type=scene    kind=fbd|ray|geom|field  named parts, relations (incline_deg, f, do) — no pixels',
  'type=graph    node: id label   edge: a b kind   (mermaid OK for CS flow/sequence/state only)',
  'type=table    kind=ice|dp|punnett|matrix  row lines',
  'type=circuit  SPICE-like  id n1 n2 value  std=ieee  highlight:',
  'type=chem.smiles  smiles:  annotate:  (never Newman/Fischer/chair as SMILES)',
  'TEMPLATES when the playbook names them (still no pixels):',
  'hybridpi rpi,gm,RE,RC,B,C,E required',
  'opamp Rf,Rg,+,−,GND required',
  'newman | fischer | chair | haworth | lewis | vsepr',
  'mo | cft | jablonski     level tuples (id,E,occ,label)',
  'mccabe  α or eq data, zF, xD, R, q   — do NOT list staircase corners',
  'sfd     piecewise V(x), M(x)  sagging+',
  'phasor  mag∠deg',
  'smith   z0, zL',
  'feynman | minkowski | timing (WaveJSON)',
  'FORBIDDEN: AI images, "Symbols:" legends, mermaid for circuits/plots/chem, JCAMP dumps.',
  'Refuse (omit @diagram): 3D isosurfaces, FEA heatmaps, scanned copyrighted charts.',
  'Repair: convert each figure to a spec; do not emit path coordinates.',
].join('\n');

/** Chemistry-specific diagram rules — specs, not SVG craft. */
export const CHEMISTRY_DIAGRAM_REQUIREMENT = [
  'CRITICAL — chemistry/visual problems MUST include @diagram specs on steps that draw, sketch, diagram, or name structures/orbitals/mechanisms/spectra.',
  'Use the catalog: chem.smiles, newman/fischer/chair, mo/cft, table kind=ice, plot peaks. Completeness: every species named in @body MUST appear as a named id in the spec.',
  DIAGRAM_SPEC_CATALOG,
].join('\n');

/** Repeated on every inject so models cannot skip circuit / spatial diagrams. */
export const STEP_DIAGRAM_REQUIREMENT = [
  'CRITICAL — electrical/visual problems MUST include @diagram type=circuit (or hybridpi/opamp) on nearly EVERY @step.',
  'COMPLETENESS: every component named in @body MUST appear as a named id in the spec. hybridpi requires rpi, gm, RE, RC, B, C, E. opamp requires Rf, Rg. Never omit RC.',
  'Step 1: full netlist OR type=hybridpi / type=opamp with all required keys. Bode as poles/zeros. phasor as mag∠deg.',
  '≥55% of steps still need diagrams (as specs). highlight: names what changed. Never <svg> or path coordinates.',
  DIAGRAM_SPEC_CATALOG,
].join('\n');

export const PHYSICS_DIAGRAM_REQUIREMENT = [
  'CRITICAL — physics visual problems MUST include @diagram specs on each FBD, ray, field, wave, circuit, graph, phase, or state step.',
  'FREE-BODY: type=scene kind=fbd; isolate ONE body; name forces N,T,f,mg,F; axes separate.',
  'OPTICS: type=ray or scene kind=ray with f, do (compiler computes di). GRAPHS: type=plot with xlabel/ylabel units and eq:.',
  DIAGRAM_SPEC_CATALOG,
].join('\n');

export const MATH_DIAGRAM_REQUIREMENT = [
  'CRITICAL — math visual problems MUST include @diagram type=plot (or scene/table/graph) for graphs, plots, regions, number lines, geometry, vector fields, and phase portraits.',
  'GRAPHS: emit fn: and eq:; xlabel/ylabel with units. GEOMETRY: type=scene. Never <svg> coordinates.',
  DIAGRAM_SPEC_CATALOG,
].join('\n');

export const BIOLOGY_DIAGRAM_REQUIREMENT = [
  'CRITICAL — biology visual problems MUST include @diagram specs for cells, cycles, pathways, pedigrees, Punnett squares, gels, and phylogenies.',
  'Punnett: table. Pedigree/pathway: graph (pointed=activation, blunt=inhibition). Cell/gel: named templates. Never <svg>.',
  DIAGRAM_SPEC_CATALOG,
].join('\n');

export const MECHANICAL_DIAGRAM_REQUIREMENT = [
  'CRITICAL — mechanical visual problems MUST include @diagram specs for FBDs, stress, shafts/gears, and P–V/T–s plots.',
  'FBD: scene. Thermo: plot with units. Shaft/gear/cam: named templates. Never <svg>.',
  DIAGRAM_SPEC_CATALOG,
].join('\n');

export const CIVIL_DIAGRAM_REQUIREMENT = [
  'CRITICAL — civil visual problems MUST include @diagram specs for beams, trusses, SFD/BMD, and deflected shapes.',
  'Beam template then type=sfd piecewise V(x), M(x); sagging positive. Never <svg>.',
  DIAGRAM_SPEC_CATALOG,
].join('\n');

export const CHEMICAL_DIAGRAM_REQUIREMENT = [
  'CRITICAL — chemical engineering visual problems MUST include @diagram specs for PFDs, reactors, columns, and McCabe plots.',
  'PFD with numbered streams; McCabe as α,zF,xD,R,q — do NOT list staircase corners. Never <svg>.',
  DIAGRAM_SPEC_CATALOG,
].join('\n');

/** Keeps the first model response complete so the app never needs to patch the chat afterward. */
export const FIRST_PASS_COMPLETION_REQUIREMENT = [
  'FIRST PASS ONLY: produce the complete corrected capsule now; do not rely on a later repair/retry prompt.',
  'Before sending, self-check that the output is exactly one fenced stemlm block ending in @end, every @step has non-empty @body work, and every visual step has a closed @diagram spec (not SVG) that names every object in @body.',
].join('\n');

/** Blank lines after this label are where the student types their follow-up question. */
export const FOLLOWUP_QUESTION_SLOT = 'Ask your question here:\n\n\n';

export const FOLLOWUP_CONTEXT_HEADER = '--- stemLM follow-up context (do not remove) ---';

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
  /** Full protocol + every subject playbook — attached as stemlm-protocol.txt. */
  fileContent: string;
  subject: Subject;
  variant: PromptVariant;
}

export function resolveSubject(question: string, opt?: BuildOptions): Subject {
  if (opt?.subject && opt.subject !== 'Auto') return opt.subject;
  return classifySubject(question);
}

/** Generic diagram rules for visual subjects without a dedicated block. */
export const GENERAL_DIAGRAM_REQUIREMENT = [
  'CRITICAL — include @diagram specs on steps that draw, sketch, diagram, or show spatial/visual state.',
  'Each @diagram is a SPEC of the state AT THIS STEP — every component, force, bond, axis, or node from @body must appear as a named id. Never <svg> or path coordinates.',
  DIAGRAM_SPEC_CATALOG,
].join('\n');

/** Subject-specific diagram injection block for Gemini prompts (inline/appendix path). */
export function getDiagramRequirement(subject: Subject): string {
  switch (subject) {
    case 'Electrical':
      return STEP_DIAGRAM_REQUIREMENT;
    case 'Chemistry':
      return CHEMISTRY_DIAGRAM_REQUIREMENT;
    case 'Physics':
      return PHYSICS_DIAGRAM_REQUIREMENT;
    case 'Math':
      return MATH_DIAGRAM_REQUIREMENT;
    case 'Biology':
      return BIOLOGY_DIAGRAM_REQUIREMENT;
    case 'Mechanical':
      return MECHANICAL_DIAGRAM_REQUIREMENT;
    case 'Civil':
      return CIVIL_DIAGRAM_REQUIREMENT;
    case 'Chemical':
      return CHEMICAL_DIAGRAM_REQUIREMENT;
    default:
      return GENERAL_DIAGRAM_REQUIREMENT;
  }
}

/** One-line diagram reminder per subject — keeps the composer stub small. */
const DIAGRAM_REMINDERS: Record<Subject, string> = {
  Electrical:
    'Use @diagram type=circuit or hybridpi/opamp on nearly EVERY step; every named id (rpi,gm,RE,RC) must appear in the spec. Never SVG coordinates.',
  Chemistry:
    'Use chem.smiles / newman / mo / table kind=ice on visual steps — every named species is a spec id. Never SVG coordinates.',
  Physics:
    'Use scene FBD / ray (f,do) / plot on visual steps — named forces and axes. Never SVG coordinates.',
  Math:
    'Use type=plot with fn: and eq: (or scene/table) when visual. Never SVG coordinates.',
  Biology:
    'Use table/graph/named templates (or mermaid for pathways). Never SVG coordinates.',
  CS:
    'Use mermaid for control flow / state; table/graph/array for DS traces (highlight the current cell). Code as inline `code`, never a fence.',
  Mechanical:
    'Use scene FBD / plot P-V / shaft templates. Never SVG coordinates.',
  Civil:
    'Use beam then type=sfd (sagging+). Never SVG coordinates.',
  Chemical:
    'Use PFD streams / type=mccabe (α,zF,xD,R,q — no stair corners). Never SVG coordinates.',
  General:
    'Use the dominant subject\'s spec types whenever spatial/visual. Never SVG coordinates.',
};

/** Compact diagram reminder for the short composer stub (full rules ship in the file). */
export function getDiagramReminder(subject: Subject): string {
  return DIAGRAM_REMINDERS[subject] ?? DIAGRAM_REMINDERS.General;
}

/** One-line worked-body reminder for the short composer stub. */
export const STEP_BODY_REMINDER =
  'Every @step needs a worked @body: define each symbol, substitute the givens, and compute with units (never a bare formula).';

/** Protocol + every subject playbook — the contents of the attached .txt file. */
export function buildProtocolFileContent(opt?: BuildOptions & { question?: string }): {
  content: string;
  subject: Subject;
  variant: PromptVariant;
} {
  const subject = resolveSubject(opt?.question ?? '', opt);
  const variant = opt?.variant ?? DEFAULT_PROMPT_VARIANT;
  const content = `${CORE_PROTOCOL_BY_VARIANT[variant]}\n\n${getUniversalPlaybook()}`;
  return { content, subject, variant };
}

const IMAGE_STUB_LINE =
  '(Problem image/PDF is attached — transcribe the full question in @meta question:.)';

const COMPOSER_OUTPUT_LINE = `Reply in ONE fenced stemlm block ending @end (@meta … ${STEP_COUNT_TARGET} @step … @solution). No prose outside.`;
const COMPOSER_DIAGRAM_LINE = 'Diagrams: typed SPEC; never SVG coordinates.';

export function buildFollowAttachedLine(): string {
  return `Follow the attached ${PROTOCOL_FILENAME} exactly. Infer the subject from the problem and apply that playbook in the file.`;
}

export interface ComposerStubOptions extends Pick<BuildOptions, 'hasImageAttachment'> {
  /** When false, do not repeat the question (it is already in the composer). */
  includeQuestion?: boolean;
}

/** Short composer stub — question (optional) plus a pointer at the attached file. */
export function buildComposerStub(question: string, opt?: ComposerStubOptions): string {
  const includeQuestion = opt?.includeQuestion !== false;
  const q = (question || '').trim();
  const lines: string[] = [];

  if (includeQuestion) {
    if (q) lines.push(q, '');
    else if (opt?.hasImageAttachment) lines.push(IMAGE_STUB_LINE, '');
    else lines.push('(The student has not typed a question yet — ask them to type one.)', '');
  } else if (!q && opt?.hasImageAttachment) {
    lines.push(IMAGE_STUB_LINE);
  }

  lines.push(buildFollowAttachedLine(), COMPOSER_OUTPUT_LINE, COMPOSER_DIAGRAM_LINE);
  return lines.join('\n').trim();
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

/** File-attach injection payload (preferred on Gemini). */
export function buildInjectionPayload(question: string, opt?: BuildOptions): InjectionPayload {
  const { content, subject, variant } = buildProtocolFileContent({ ...opt, question });
  return {
    composerText: buildComposerStub(question, opt),
    fileContent: content,
    subject,
    variant,
  };
}

const IMAGE_QUESTION_PREAMBLE = [
  'The student attached a problem image/PDF (no typed question).',
  'Read it and transcribe the full problem statement verbatim in @meta question: (all givens, labels, and parts (a)(b)…).',
  'topic: stays a short ≤8-word title only.',
].join(' ');

/**
 * Last-resort inline paste when the host cannot attach a file.
 * Same universal payload as the file (core + every subject playbook).
 */
export function buildInjectionAppendix(question: string, opt?: BuildOptions): BuildResult {
  const subject = resolveSubject(question, opt);
  const variant = opt?.variant ?? DEFAULT_PROMPT_VARIANT;
  const imageNote =
    opt?.hasImageAttachment && !(question || '').trim() ? `${IMAGE_QUESTION_PREAMBLE}\n\n` : '';
  const prompt = `${SEP}${imageNote}${CORE_PROTOCOL_BY_VARIANT[variant]}\n\n${getUniversalPlaybook()}`;
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
    COMPOSER_OUTPUT_LINE,
    STEP_BODY_REMINDER,
    getDiagramReminder(subject),
    'No prose outside the block.',
  ].join('\n');
}

/**
 * Short composer stub for follow-ups — mirrors buildComposerStub. Full diagram
 * rules and protocol live in the attached file so Gemini Quill does not truncate
 * the paste (which broke Ask-in-chat verification).
 */
export function buildFollowupComposerText(opt: FollowupOptions): string {
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
    buildFollowAttachedLine(),
    lead,
    formatQuotedSelection(selection),
    guidance,
    COMPOSER_OUTPUT_LINE,
  ].join('\n');
}

/** File-attach follow-up payload (preferred — same protocol file as initial injection). */
export function buildFollowupPayload(opt: FollowupOptions): InjectionPayload {
  const subject = opt.subject ?? 'General';
  const variant = opt.variant ?? DEFAULT_PROMPT_VARIANT;
  const selection = normalizeFollowupSelection(opt.selection);
  const { content } = buildProtocolFileContent({ subject, variant });
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
  const appendix = `${SEP}${CORE_PROTOCOL_BY_VARIANT[variant]}\n\n${getUniversalPlaybook()}`;
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
    ? ' Convert each figure to a spec; do not emit path coordinates. ADD a complete @diagram SPEC for its subject — electrical: circuit or hybridpi/opamp with required keys; physics: scene FBD/ray or plot; math: plot/scene; chemistry: chem.smiles/mo/table; civil: sfd; ChemE: mccabe without stair corners. Every object named in @body MUST appear as a named id. Never <svg>.'
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
