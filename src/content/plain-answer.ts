/**
 * Plain chat answer -> the parts of a study session (content-script side).
 *
 * The bridge between the page and src/ingest. It decides which assistant messages may be
 * structured at all, reads the question a message answers, and renames figure fences to the names
 * the figure compiler knows. No store and no capture state: when to structure is the controller's
 * call, what comes out is decided here.
 */
import type { Capsule, Diagram } from '@/src/protocol/types';
import { messageToMarkdown, structureAnswer } from '@/src/ingest';
import { cleanSessionQuestion } from '@/src/lib/session-question';
import { LEGACY_GUIDE_FILENAME, STUDY_GUIDE_FILENAME } from '@/src/lib/study-guide';

/** Status line shown when an answer the student asked stemLM for arrived without the format. */
export const INGEST_NOTICE =
  'The chat did not use the stemlm format, so this view was structured from its answer.';

/**
 * A closing token of the capsule grammar alone on a line. `@meta` anywhere already makes a message
 * a capsule candidate for the adapters; this also catches a capsule that lost its opening. Opening
 * tokens are left out on purpose: `@step(...)` and `@patch(...)` are ordinary decorators in code.
 */
const CAPSULE_CLOSE_LINE =
  /^[ \t]*@(?:endmeta|endstep|endbody|endformula|enddiagram|endsolution|endverify|enduncertainty|end)[ \t]*$/m;
/** The stub stemLM writes into the composer, and the heading of the guide's inline fallback. */
const STUB_MARKERS = ['--- stemLM', 'stemLM instructions'];

/**
 * True when `text` is stemLM's own writing rather than a plain answer: a capsule (whole or
 * broken), or the guide or composer stub echoed back. Naming the guide file is not enough: "I
 * cannot open stemLM Guide.txt, but here is the solution" is exactly the answer worth structuring.
 */
export function carriesStemlmText(text: string): boolean {
  return text.includes('@meta') || CAPSULE_CLOSE_LINE.test(text) || STUB_MARKERS.some((marker) => text.includes(marker));
}

/** Fence languages that name a notation the figure compiler knows under another name. */
const FENCE_NOTATIONS: Record<string, string> = { mmd: 'mermaid', graphviz: 'dot', gv: 'dot' };
const STEMLM_FAMILY_FENCE = /^stemlm[-:.]([a-z0-9][a-z0-9.-]*)$/;

/**
 * A figure fence from a plain answer under the type the figure compiler resolves. Aliased here, at
 * the ingest boundary, because the catalog lists figure families, not the tags chat models put on
 * code fences. A bare `stemlm` fence names no family: it goes through as written and the
 * compiler's notation repair infers the family from the spec, or the figure stays hidden.
 */
export function figureFromFence(diagram: Diagram): Diagram {
  const tag = diagram.type.trim().toLowerCase();
  const type = STEMLM_FAMILY_FENCE.exec(tag)?.[1] ?? FENCE_NOTATIONS[tag] ?? tag;
  return type === diagram.type ? diagram : { ...diagram, type };
}

export interface PlainAnswer {
  /** The answer as Markdown, kept as `Session.raw`. */
  markdown: string;
  capsule: Capsule;
}

/**
 * Where hosts keep a model's reasoning. Read from above, the Markdown walker skips these as
 * chrome; but Gemini sets its thoughts in a second `<message-content>`, which the adapter counts
 * as an assistant block of its own. Reasoning is not the answer, however worked it looks.
 */
const REASONING_SELECTOR =
  'model-thoughts, .model-thoughts, .thoughts-container, .thoughts-content, .thinking-container, [data-testid*="thinking"], [data-testid*="reasoning"]';

function isReasoning(message: Element): boolean {
  try {
    return message.closest(REASONING_SELECTOR) !== null;
  } catch {
    return false;
  }
}

/**
 * A rendered assistant message as a study capsule, or null when it is not a plain answer worth
 * structuring (stemLM's own text, the model's reasoning, a short reply, a refusal, bare code).
 * Reads the page, never writes to it, and never throws.
 */
export function readPlainAnswer(message: Element, question: string): PlainAnswer | null {
  if (isReasoning(message) || carriesStemlmText(message.textContent ?? '')) return null;
  const markdown = messageToMarkdown(message);
  if (!markdown.trim() || carriesStemlmText(markdown)) return null;
  const structured = structureAnswer(markdown, { question });
  if (!structured) return null;
  const { capsule } = structured;
  return {
    markdown,
    capsule: {
      ...capsule,
      steps: capsule.steps.map((step) => (step.diagram ? { ...step, diagram: figureFromFence(step.diagram) } : step)),
    },
  };
}

const GUIDE_FILE_LINE = new RegExp(
  `^(?:${[STUDY_GUIDE_FILENAME, LEGACY_GUIDE_FILENAME].map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})$`,
  'i',
);
/** The type or size label a host prints under an attached file's name. */
const FILE_LABEL_LINE = /^(?:document|file|text|plain text|txt|\d+(?:\.\d+)?\s*(?:bytes?|kb|mb|lines?))$/i;

/**
 * The student's question out of a sent user turn. A host lists the attached guide above the typed
 * text; left in place, the stub stripper would cut the question off at the file's name.
 */
export function questionFromUserTurn(text: string): string {
  const lines = text.split('\n').map((line) => line.trim());
  let dropped = false;
  while (lines.length && (GUIDE_FILE_LINE.test(lines[0]!) || (dropped && FILE_LABEL_LINE.test(lines[0]!)) || lines[0] === '')) {
    if (lines[0] !== '') dropped = true;
    lines.shift();
  }
  return cleanSessionQuestion(lines.join('\n'));
}
