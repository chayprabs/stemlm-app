/**
 * Builds the text stemLM writes into the chat box, and decides when the guide goes with it.
 *
 * Every question carries a short reminder of the answer shape in the message itself, so the format
 * holds in a long chat where an attachment is no longer attended to. The full guide travels as an
 * attached file, and only when the chat needs it (guideNeeded). Where the host takes no upload,
 * the guide goes into the message instead, cut shorter.
 */
import type { Subject } from './types';
import { assembleGuide, figureFormsNamed } from './protocol';
import { classifySubject } from './classifier';
import { normalizeFollowupSelection } from '@/src/lib/followup-selection';
import { cleanSessionQuestion } from '@/src/lib/session-question';
import { STUDY_GUIDE_END, STUDY_GUIDE_FILENAME, STUDY_GUIDE_REFERENCE, LEGACY_GUIDE_FILENAME } from '@/src/lib/study-guide';

export { normalizeFollowupSelection };

export const PROTOCOL_FILENAME = STUDY_GUIDE_FILENAME;

/** Unique delimiter: the student's question stays above this line, stemLM's text below. */
export const STEMLM_SENTINEL = '--- stemLM ---';

/** Marks of stemLM's own text in a composer or a sent message, in every wording it has shipped. */
const STEMLM_COMPOSER_MARKERS = [
  '--- stemLM',
  'stemLM instructions',
  'Ask your question here:',
  'stemLM follow-up context',
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

/**
 * The whole chat box around the editor: its text, its file chips and its buttons. Nothing in it
 * has been sent, so none of it may count as the thread: a guide attached and not yet sent (or
 * attached and then removed) is not a guide the chat has.
 */
function composerRegion(composer: HTMLElement | null | undefined): HTMLElement | null {
  if (!composer || composer === document.body || composer === document.documentElement) return null;
  return composer.closest<HTMLElement>('form, fieldset, [role="form"], input-area-v2') ?? composer;
}

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
 * True when an earlier user turn in the visible thread already carries stemLM's text or the guide
 * filename (the composer may already be empty after send). Also scans conversation roots for the
 * filename outside the chat box. `composer` is the editor; everything in its chat box is skipped.
 */
export function pageThreadHasProtocol(
  root: ParentNode = document,
  composer?: HTMLElement | null,
): boolean {
  if (sentStudentMessages(root, composer).some(composerTextHasProtocol)) return true;

  const skipComposer = composerRegion(composer);
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

/**
 * The text of the student's messages already sent in this chat, oldest first: never the draft or
 * the file chips in the chat box. Empty when the host's user turns cannot be told apart, which
 * guideNeeded reads as "attach the guide".
 */
export function sentStudentMessages(root: ParentNode = document, composer?: HTMLElement | null): string[] {
  try {
    const region = composerRegion(composer);
    const turns = [...root.querySelectorAll(THREAD_PROTOCOL_SELECTORS.join(','))]
      .filter((el) => !region?.contains(el));
    // `user-query` wraps `query-text` on Gemini: count the message once, by its outer element.
    return turns
      .filter((el) => !turns.some((other) => other !== el && other.contains(el)))
      .map((el) => el.textContent ?? '');
  } catch {
    return [];
  }
}

/** After send, + injects again when stemLM's text is present and the question changed. */
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

/**
 * The shape of an answer, written out line by line: a model shown the markers on one line, with
 * commas between them, wrote them back on one line. `meta` and `solution` fill those two blocks.
 */
function answerShape(lead: string, meta: string[], solution: string): string[] {
  return [
    lead,
    '@meta', ...meta, '@endmeta',
    '@step id=s1', 'title: …', '@body', 'why this step, and the working', '@endbody', '@endstep',
    '@solution', solution, '@endsolution',
    '@end',
  ];
}

/** The answer shape, short enough to sit in the student's own message. */
const REMINDER = answerShape(
  'Answer in one stemlm code block, usually 3 to 7 steps, like this:',
  ['subject: …', 'topic: …'],
  'the final answer',
);

const GUIDE_ATTACHED = `The attached ${STUDY_GUIDE_REFERENCE} has the rest: figures, checks and quick questions.`;
const GUIDE_EARLIER = `Add @verify and @uncertainty too. The ${STUDY_GUIDE_REFERENCE} earlier in this chat has the rest.`;
const GUIDE_INLINE = `Answer in the stemLM format that the ${STUDY_GUIDE_REFERENCE} below describes.`;

/** What to tell the student when the guide went into the message because the upload failed. */
export const GUIDE_PASTED_NOTICE = 'This chat did not take a file, so the guide is in your message as text.';

/**
 * Student messages that may follow the one carrying the guide before it is sent again. Five worked
 * answers are about 10,000 tokens, which is as much as the smallest chat context windows hold.
 */
export const GUIDE_REFRESH_TURNS = 5;

const IMAGE_STUB_LINE = '(Problem image/PDF is attached: copy the full question out after question:.)';

export interface BuildOptions {
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

function joinStub(parts: Array<string | false | undefined | null>): string {
  return parts.filter((p): p is string => typeof p === 'string').join('\n');
}

/**
 * The composer text for a question whose guide is attached: the question, the sentinel, the
 * reminder. In an empty chat box the first line is left blank for the student's question.
 */
export function buildComposerStub(
  question: string,
  opt?: BuildOptions & { includeQuestion?: boolean },
): string {
  const appended = opt?.includeQuestion === false;
  const q = appended ? '' : (question || '').trim();
  const above = q || (opt?.hasImageAttachment ? IMAGE_STUB_LINE : '');
  return joinStub([above || (appended ? undefined : ''), above ? '' : undefined, STEMLM_SENTINEL, ...REMINDER, GUIDE_ATTACHED]);
}

/** The same text for appending under a question or image already in the composer. */
export function buildComposerAppendix(
  opt?: BuildOptions & { hasQuestion?: boolean },
): string {
  return buildComposerStub('', {
    hasImageAttachment: Boolean(opt?.hasImageAttachment) && !opt?.hasQuestion,
    includeQuestion: false,
  });
}

/**
 * The reminder for a later question in a chat that already has the guide. Without
 * `protocolAttachmentConfirmed` no file goes with this message, so it points at the earlier one.
 */
export function buildComposerPointer(
  opt?: BuildOptions & {
    hasQuestion?: boolean;
    protocolAttachmentConfirmed?: boolean;
  },
): string {
  // An image stands in for a question; with neither, a blank first line is left for one.
  const above = opt?.hasQuestion ? undefined : opt?.hasImageAttachment ? IMAGE_STUB_LINE : '';
  return joinStub([
    above,
    STEMLM_SENTINEL,
    ...REMINDER,
    opt?.protocolAttachmentConfirmed ? GUIDE_ATTACHED : GUIDE_EARLIER,
  ]);
}

export function buildInjectionPayload(question: string, opt?: BuildOptions): InjectionPayload {
  return {
    composerText: buildComposerStub(question, opt),
    fileContent: assembleGuide(question).text,
    subject: classifySubject(question),
  };
}

/** The compact guide as message text under the question, for a host that took no upload. */
export function buildInjectionAppendix(question: string, opt?: BuildOptions): BuildResult {
  const guide = assembleGuide(question, undefined, true).text;
  const image = opt?.hasImageAttachment && !(question || '').trim() ? `${IMAGE_STUB_LINE}\n\n` : '';
  return { prompt: `${image}${STEMLM_SENTINEL}\n${GUIDE_INLINE}\n\n${guide}`, subject: classifySubject(question) };
}

/** The same with the question above it, for an empty chat box. */
export function buildInjectionPrompt(question: string, opt?: BuildOptions): BuildResult {
  const { prompt, subject } = buildInjectionAppendix(question, opt);
  const q = (question || '').trim();
  return { prompt: q ? `${q}\n\n${prompt}` : prompt, subject };
}

/** True when the composer holds a whole pasted guide, from its opening line to its last. */
export function composerHasInlineGuide(text: string): boolean {
  return text.includes(GUIDE_INLINE) && text.includes(STUDY_GUIDE_END);
}

/** True when the composer's stemLM text says a guide file is attached to this message. */
export function composerExpectsGuideFile(text: string): boolean {
  return text.includes(`attached ${STUDY_GUIDE_REFERENCE}`) || text.includes(LEGACY_GUIDE_FILENAME);
}

/**
 * Whether the next question must carry the full guide, not only the reminder. `sent` is the text
 * of the student's messages already in the chat, oldest first. Which guide a message carried is
 * read from the message itself, so nothing has to be remembered between page loads.
 *
 * The guide goes again when the chat has none, when the last answer did not come back in the
 * format, and when GUIDE_REFRESH_TURNS messages have followed it. A guide file describes every
 * figure type, so a new subject needs no new file. A guide pasted as text holds only a few: it
 * goes again for a new subject, and for a figure form this question names that it left out.
 */
export function guideNeeded(question: string, sent: readonly string[], lastAnswerInFormat = true): boolean {
  if (!lastAnswerInFormat) return true;
  for (const message of sent.slice(-GUIDE_REFRESH_TURNS).reverse()) {
    if (message.includes(GUIDE_INLINE)) {
      const earlier = cleanSessionQuestion(message);
      // A question that names no subject stays in the chat's subject, so it never forces a new guide.
      const subject = classifySubject(question);
      if (subject !== 'General' && subject !== classifySubject(earlier)) return true;
      const carried = assembleGuide(earlier, undefined, true).forms;
      return figureFormsNamed(question).some((form) => !carried.includes(form));
    }
    if (composerExpectsGuideFile(message)) return false;
  }
  return true;
}

/** Above the context: this label, the line the question goes on, a blank line. */
const FOLLOWUP_QUESTION_LABEL = 'Ask your question here:';

export const FOLLOWUP_CONTEXT_HEADER = '--- stemLM follow-up context (do not remove) ---';

/** `dig-deeper` sends the quoted text as the request; the ask intents wait for a typed question. */
export type FollowupIntent = 'dig-deeper' | 'ask' | 'ask-solution';

export function isAskIntent(intent?: FollowupIntent): boolean {
  return intent === 'ask' || intent === 'ask-solution';
}

export interface FollowupOptions {
  selection: string;
  stepTitle?: string;
  subject?: Subject;
  intent?: FollowupIntent;
  /** `qid:` of the answer being asked about, when it has one: the reply must repeat it to be matched. */
  qid?: string;
  /** A question already worded for the student (the answer's own suggestion): it fills the slot. */
  question?: string;
}

function followupLead(opt: FollowupOptions): string {
  const step = opt.stepTitle?.trim() ? ` ("${opt.stepTitle.trim()}")` : '';
  if (opt.intent === 'ask-solution') return 'My question above is about your whole earlier answer:';
  if (opt.intent === 'ask') return `My question above is about this step of your earlier answer${step}:`;
  return `Explain this part of your earlier answer in more depth${step}:`;
}

/** The shape of the reply, complete enough to follow in a chat that no longer attends to the guide. */
function followupFormat(opt: FollowupOptions): string[] {
  const qid = opt.qid ? [`qid: ${opt.qid}`] : [];
  if (!isAskIntent(opt.intent)) {
    return [
      'Rewrite only that step, in one stemlm code block, like this:',
      '@meta', ...qid, 'mode: patch', '@endmeta',
      '@patch op=replace id=(the id of that step)',
      '@step id=(the same id)', 'title: …', '@body', 'why this step, and the working', '@endbody', '@endstep',
      '@endpatch',
      '@end',
    ];
  }
  return [
    ...answerShape(
      'Answer only that question, in one short stemlm code block, 1 to 3 steps, like this:',
      [...qid, 'mode: resolve'],
      'the answer in two or three sentences',
    ),
    'Do not repeat the earlier steps. Add a @diagram only if a picture is needed.',
  ];
}

/** A follow-up about a step or the whole answer: a slot for the student's question, then the context. */
export function buildFollowupCopyText(opt: FollowupOptions): string {
  const quoted = normalizeFollowupSelection(opt.selection).split('\n').map((line) => `> ${line}`);
  // The slot keeps its label either way, so a filled question is read back the way a typed one is.
  const slot = `${FOLLOWUP_QUESTION_LABEL}\n${opt.question?.replace(/\s+/g, ' ').trim() ?? ''}\n\n`;
  return slot + [FOLLOWUP_CONTEXT_HEADER, followupLead(opt), ...quoted, ...followupFormat(opt)].join('\n');
}

export function isEmptyFollowupSelection(selection: string): boolean {
  return normalizeFollowupSelection(selection).length === 0;
}
