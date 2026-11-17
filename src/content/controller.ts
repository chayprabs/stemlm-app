/**
 * Orchestration controller (content-script side).
 *
 * Wires the active platform adapter to the store: handles prompt injection,
 * watches the page for the assistant's completed capsule, parses it, and pushes
 * sessions into the store. Also powers "Load conversation" (rebuild from the
 * chatbot's own history) and the quote-reply follow-up flow.
 *
 * An answer that is not a capsule is not a dead end: a plain answer is arranged into
 * steps by src/ingest and stored as a session with `origin: 'ingest'`. Capsules always
 * win, and an ingest session is never patched, stitched or matched as capsule text.
 */
import type { PlatformAdapter } from '@/src/platforms/types';
import {
  buildInjectionAppendix,
  buildInjectionPayload,
  buildInjectionPrompt,
  buildFollowupCopyText,
  buildComposerAppendix,
  buildComposerPointer,
  composerExpectsGuideFile,
  composerHasInlineGuide,
  composerTextHasProtocol,
  GUIDE_PASTED_NOTICE,
  guideNeeded,
  pageThreadHasProtocol,
  sentStudentMessages,
  shouldReinjectOnNewQuestion,
  isEmptyFollowupSelection,
  normalizeFollowupSelection,
  FOLLOWUP_CONTEXT_HEADER,
  PROTOCOL_FILENAME,
  THREAD_PROTOCOL_SELECTORS,
} from '@/src/protocol/builder';
import { buildStepEntries } from '@/src/lib/step-entries';
import { questionFromUserTurn, readPlainAnswer, structurePlainAnswer, type PlainAnswer } from './plain-answer';
import { attachTextFile, hasConfirmedAttachment } from '@/src/lib/file-inject';
import { parse, looksComplete, findCapsuleRaw } from '@/src/protocol/parser';
import {
  applyStepPatch,
  closedPrefix,
  findResumeToken,
  sessionAcceptsPatch,
  stitchResume,
  groupResumeParts,
} from '@/src/protocol/apply';
import type {
  Capsule,
  Diagram,
  ParseResult,
  Session,
  Step,
  StepFollowup,
  Subject,
} from '@/src/protocol/types';
import type { FollowupIntent } from '@/src/protocol/builder';
import { NO_ANSWER_NOTICE, useStore } from '@/src/state/store';
import { trackEvent } from '@/src/lib/analytics';
import { rememberCurrentChat } from '@/src/lib/last-chat';
import { cleanSessionQuestion } from '@/src/lib/session-question';
import { auditCapsuleDiagrams } from '@/src/protocol/diagram-quality';
import { auditStepQuality } from '@/src/protocol/step-quality';
import { STEP_COUNT_MAX } from '@/src/protocol/protocol';

/** Fallback key when mirrored/workspace sessions strip bulky raw text. */
function sessionDedupKey(
  raw: string,
  fallback?: { topic: string; stepCount: number; firstTitle: string },
): string {
  const trimmed = (findCapsuleRaw(raw) ?? raw).trim();
  if (trimmed) return trimmed;
  if (fallback) return `fp:${fallback.topic}:${fallback.stepCount}:${fallback.firstTitle}`;
  return '';
}

/**
 * The same identity for an ingest session. Its raw text is the answer's Markdown, so it is
 * compared whole and never searched for a capsule (a `stemlm` figure fence would read as one).
 */
function plainDedupKey(raw: string, capsule: Capsule): string {
  return raw.trim() || `fp:${capsule.meta.topic}:${capsule.steps.length}:${capsule.steps[0]?.title ?? ''}`;
}

/** A session whose capsule is replaced by one the parser read is a capsule session again. */
function withoutOrigin(session: Session): Session {
  const { origin: _origin, ...rest } = session;
  return rest;
}

/** While the page changes it is inspected this often, and once more after its last change. */
const CHECK_INTERVAL_MS = 350;
/**
 * If a capsule is present but never terminates with `@end` (the model dropped
 * the token) we still capture it once the assistant text has been completely
 * stable for this long. This makes capture independent of the (fragile,
 * per-site) streaming/"stop button" selector — which is the root cause of the
 * "panel stuck on loading even though the answer is here" bug.
 */
const STABILITY_MS = 1500;
/** Allow a longer quiet period for explanations/refusals that omit the capsule entirely. */
const NO_CAPSULE_STABILITY_MS = 10_000;
/**
 * A partial answer that stops changing is usually a slow stream (Gemini/Grok
 * chunking, a network hiccup), not a malformed one. Report it only after this
 * long with no change and no streaming indicator; while the provider still
 * shows one, wait up to STREAMING_STALL_MS (a stuck indicator must not pin the
 * panel on "loading" forever).
 */
const PARTIAL_STALL_MS = 10_000;
const STREAMING_STALL_MS = 60_000;

const FULL_CAPSULE_BLOCK_WARNINGS = new Set(['missing_end']);

const CUT_OFF_NOTICE =
  'This answer is incomplete: the chat stopped before the end, so only its finished steps are shown. Ask the chat to continue it, or send your question again with the stemlm button.';

/** "Load conversation" on a chat of plain answers opens the most recent ones, not the whole history. */
const PLAIN_SESSIONS_MAX = 5;
/** How far back that search looks; short replies between worked answers do not count toward the cap. */
const PLAIN_SCAN_BLOCKS = 12;
/**
 * A chat whose student sent the stemLM guide may still be rendering its capsules after a reload.
 * Its plain answers are only structured once this long has passed without one appearing.
 */
const CAPSULE_PATIENCE_MS = 2_500;

/** How often a watching controller checks that its observed root is still in the page (CAP-OBS-01). */
const ROOT_CHECK_MS = 2_000;

/** A guide chip must stay gone this long before it counts as removed (a send also moves it). */
const GUIDE_REMOVED_CONFIRM_MS = 1_000;

/**
 * One press of the stemlm button ends within this, whatever the chat does. The slowest honest
 * path is an upload the chat began and never finished (about 50 s); past that something hung.
 */
const ATTACH_DEADLINE_MS = 75_000;

/** One short line for the student, shown at the stemlm button after a press. */
export interface AttachNotice {
  tone: 'info' | 'error';
  text: string;
}
const NOTICE_INLINE: AttachNotice = { tone: 'info', text: GUIDE_PASTED_NOTICE };
const NOTICE_FAILED: AttachNotice = { tone: 'error', text: 'stemlm could not add its guide. Check the chat box and try again.' };

/**
 * Closing blocks a finished full answer may lack (D11): its steps are still
 * shown, with a soft notice naming what is missing.
 */
const OPTIONAL_CLOSING_BLOCKS: Record<string, string> = {
  missing_verify: 'final check',
  missing_uncertainty: 'assumptions',
  missing_solution: 'summary',
};

function missingClosingNotice(result: ParseResult): string | undefined {
  const mode = result.capsule?.meta.mode;
  // Patches and Ask-in-chat answers are incremental: they never carry these blocks.
  if (result.patch?.length || mode === 'patch' || mode === 'resolve') return undefined;
  const missing = [...new Set(result.warningCodes)].flatMap((code) => OPTIONAL_CLOSING_BLOCKS[code] ?? []);
  if (missing.length) {
    const list = new Intl.ListFormat('en', { type: 'conjunction' }).format(missing);
    return `This answer arrived without its ${list}. The steps are complete; double-check the final result.`;
  }
  // PARSE-04 (D30): the parser already marked the check failed with a correction note.
  if (result.warningCodes.includes('malformed_verify')) {
    return 'The final check in this answer was incomplete, so the result is shown as not verified. Double-check it.';
  }
  return undefined;
}

function hasUsableParsedContent(result: ParseResult): boolean {
  return Boolean(
    result.status !== 'empty' &&
    ((result.capsule && result.capsule.steps.length > 0) ||
      (result.patch && result.patch.length > 0) ||
      (result.questions && result.questions.some((q) => q.steps.length > 0)))
  );
}

/** Full answers need the complete contract; repair/follow-up modes stay incremental. */
export function hasCaptureContract(result: ParseResult): boolean {
  if (!hasUsableParsedContent(result)) return false;
  const hasOversizedCapsule =
    result.warningCodes.includes('invalid_step_count') &&
    Boolean(
      (result.capsule && result.capsule.steps.length > STEP_COUNT_MAX) ||
        result.questions?.some((question) => question.steps.length > STEP_COUNT_MAX),
    );
  if (hasOversizedCapsule) return false;
  const mode = result.capsule?.meta.mode;
  if (result.patch?.length || mode === 'patch' || mode === 'resolve') return true;
  return !result.warningCodes.some((code) => FULL_CAPSULE_BLOCK_WARNINGS.has(code));
}

function makeId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function allDiagrams(...groups: Diagram[][]): Diagram[] {
  return groups.flat();
}

/**
 * mode:new or a different qid must open a new session. Topic-only mismatch is
 * handled by followUpOpensNewSession (Ask-in-chat); the post-inject
 * shouldReplace path must not use topic, or a same-question retry would fork.
 */
export function incomingForcesNewSession(
  active: Session | undefined,
  incoming: Capsule,
): boolean {
  if (!active) return false;
  if (incoming.meta.mode === 'new') return true;
  const aQid = active.capsule.meta.qid;
  const iQid = incoming.meta.qid;
  return Boolean(aQid && iQid && aQid !== iQid);
}

/** Off-topic / mode:new / qid mismatch must open a new session, not overwrite. */
export function followUpOpensNewSession(active: Session, incoming: Capsule): boolean {
  if (incomingForcesNewSession(active, incoming)) return true;
  const aTopic = (active.capsule.meta.topic || '').trim().toLowerCase();
  const iTopic = (incoming.meta.topic || '').trim().toLowerCase();
  if (aTopic && iTopic && aTopic !== iTopic) {
    const aQ = (active.question || active.capsule.meta.question || '').toLowerCase();
    const iQ = (incoming.meta.question || '').toLowerCase();
    if (iQ && aQ) {
      const aHead = aQ.slice(0, 48);
      const iHead = iQ.slice(0, 48);
      if (!aQ.includes(iHead) && !iQ.includes(aHead)) return true;
    } else {
      return true;
    }
  }
  return false;
}

export function keepActiveQid(active: Session, incoming: Capsule): Capsule {
  if (incoming.meta.qid) return incoming;
  const qid = active.capsule.meta.qid;
  if (!qid) return incoming;
  return { ...incoming, meta: { ...incoming.meta, qid } };
}

interface ComposerOperation {
  isCurrent: () => boolean;
  /** A newer inject / follow-up started after this one. */
  superseded: () => boolean;
  recordDraft: () => void;
}

export class StemController {
  private adapter: PlatformAdapter;
  private observer: MutationObserver | null = null;
  private observedRoot: ParentNode | null = null;
  private rootTimer: ReturnType<typeof setInterval> | null = null;
  private guideMissingSince = 0;
  private checkTimer: ReturnType<typeof setTimeout> | null = null;
  private stabilityTimer: ReturnType<typeof setTimeout> | null = null;
  private capturedRaw = new Set<string>();
  private static readonly CAPTURED_RAW_MAX = 100;
  private lastQuestion = '';
  /** True while waiting for a dig-deeper / ask follow-up answer. */
  private pendingFollowUpCapture = false;
  /**
   * When set, the next captured capsule is attached inline after this step
   * (Ask-in-chat) instead of replacing the session or opening a new one.
   */
  private pendingFollowUpAnchor: { sessionId: string; anchorStepId: string } | null = null;
  /** Truncated capsule waiting for a `@resume` continuation. */
  private pendingResume: { token: string; raw: string } | null = null;
  /** D38: the cut-off answer on screen, waiting for the rest of its reply. */
  private cutOffId: string | null = null;
  private watching = false;
  /** Cleared on each inject/follow-up so stale chat capsules do not block capture. */
  private captureEpoch = 0;
  private composerGeneration = 0;
  private preparedComposer: ComposerOperation | null = null;
  /** The press of the stemlm button that is still working, if any. */
  private injecting: Promise<boolean> | null = null;
  private attachNotice: AttachNotice | null = null;

  // Answer-started detection (used to open the panel only once the assistant
  // actually begins responding, rather than the moment we inject).
  private answerStarted = false;
  /** True once an inject / follow-up armed detection; restored and shared tabs watch unarmed. */
  private answerArmed = false;
  private baselineBlocks = 0;
  private baselineAssistantText = '';
  /** The assistant messages already on the page when the guide was attached: never the awaited answer. */
  private baselineBlockSet = new WeakSet<Element>();
  private onAnswerStartedCb: (() => void) | null = null;
  /** How many of the student's messages the thread held when the guide was attached. */
  private sentBaseline = 0;
  /** The chat was still writing an earlier answer when the guide was attached. */
  private streamingAtArm = false;
  /** The question was in the chat box before the stemlm button was pressed. */
  private typedFirst = false;
  /**
   * True from a successful inject until an answer is stored. The panel only shows "loading" when
   * the question was typed first; this also covers the guide attached to an empty chat box.
   */
  private awaitingAnswer = false;
  /** Reply text that was looked at and is not a plain answer; not looked at again until it changes. */
  private plainRefused = '';
  /** What the page offers an empty panel, remembered until its latest assistant message changes. */
  private pageProbe: { key: string; latest: WeakRef<Element>; found: 'capsules' | 'answer' | null } | null = null;

  // Stability tracking for the no-`@end` fallback.
  private stableText = '';
  private stableSince = 0;
  /**
   * The chat's own sign that it is writing was seen on since the last reply was dealt with. When
   * it is off again, the reply is over and need not be measured for quiet.
   */
  private streamSeen = false;

  constructor(adapter: PlatformAdapter, private readonly delivery: 'auto' | 'file' = 'auto') {
    this.adapter = adapter;
  }

  private beginComposerOperation(): ComposerOperation {
    const generation = ++this.composerGeneration;
    const editor = this.adapter.findEditor();
    const root = this.adapter.getComposerBox() ?? this.adapter.getComposerShell() ?? document;
    const url = location.href;
    let draft = this.adapter.getEditorText();
    return {
      isCurrent: () => generation === this.composerGeneration &&
        useStore.getState().settings.stemlmEnabled !== false &&
        location.href === url && Boolean(editor?.isConnected) &&
        this.adapter.findEditor() === editor &&
        (this.adapter.getComposerBox() ?? this.adapter.getComposerShell() ?? document) === root &&
        this.adapter.getEditorText() === draft,
      superseded: () => generation !== this.composerGeneration,
      recordDraft: () => { draft = this.adapter.getEditorText(); },
    };
  }

  /**
   * INJ-01: the draft, chat, editor or on/off switch changed while the guide was
   * attaching. Say so instead of doing nothing; a newer attempt speaks for itself.
   * A press of the stemlm button never opens the panel, whether it works or not: the student is
   * still writing, and the button itself shows what happened.
   */
  private abandonAttach(operation: ComposerOperation): false {
    const store = useStore.getState();
    if (!operation.superseded() && store.settings.stemlmEnabled !== false) {
      store.setStatus('error', 'Your chat box changed while stemlm was attaching its guide, so it stopped. Check the chat box, then click the stemlm button again.');
    }
    return false;
  }

  get platformId() {
    return this.adapter.id;
  }

  /** Register a callback fired once per question: when it is sent, or at the latest when the reply begins. */
  setOnAnswerStarted(cb: (() => void) | null): void {
    this.onAnswerStartedCb = cb;
  }

  /** True when the composer already has a question (text and/or image attachment). */
  private composerHasUserContent(): boolean {
    const text = this.adapter.getEditorText().trim();
    const question = cleanSessionQuestion(text);
    if (question.length > 0) return true;
    return this.adapter.composerHasAttachments();
  }

  /**
   * One press of the stemlm button. A second press while the first is still working (a double
   * click, or the toolbar asking at the same moment) joins it, so the guide is never attached
   * twice; a press that hangs is ended and says so, so the button is never left busy.
   */
  inject(): Promise<boolean> {
    if (this.injecting) return this.injecting;
    this.attachNotice = null;
    let failed = false;
    const stopListening = useStore.subscribe((state) => {
      if (state.status === 'error') failed = true;
    });
    let timer: ReturnType<typeof setTimeout> | undefined;
    const deadline = new Promise<boolean>((resolve) => {
      timer = setTimeout(() => {
        // Whatever the stalled attempt does later, it is no longer the current one.
        this.composerGeneration += 1;
        useStore.getState().setStatus('error', 'stemlm took too long to add its guide and stopped. Check the chat box, then click the stemlm button again.');
        resolve(false);
      }, ATTACH_DEADLINE_MS);
    });
    const run = Promise.race([this.injectNow(), deadline]).then((ok) => {
      if (ok && composerHasInlineGuide(this.adapter.getEditorText())) this.attachNotice = NOTICE_INLINE;
      else if (!ok && failed) this.attachNotice = NOTICE_FAILED;
      return ok;
    }).finally(() => {
      clearTimeout(timer);
      stopListening();
      this.injecting = null;
    });
    this.injecting = run;
    return run;
  }

  /** What the last press needs the student to know; the stemlm button reads it once. */
  takeAttachNotice(): AttachNotice | null {
    const notice = this.attachNotice;
    this.attachNotice = null;
    return notice;
  }

  /**
   * Where the composer shows its file chips: the box the adapter declares when that holds the
   * attach button, else the composer found by structure (Claude's card is neither form nor fieldset).
   */
  private attachScope(): ParentNode {
    const declared = this.adapter.getComposerBox() ?? this.adapter.getComposerShell();
    const attach = this.adapter.getComposerLeadingAnchor();
    if (declared && (!attach || declared.contains(attach))) return declared;
    return this.adapter.getComposerRoot?.() ?? declared ?? document;
  }

  /**
   * Upload the guide and wait for the chat's own chip to confirm it. Where the chat takes a file
   * through its one input, that is tried once more when nothing happened (elsewhere the upload is
   * already a series of tries: a drop, a paste, each drop target). Never when an upload visibly
   * began (a second one would attach the file twice), and not at all on a composer known to
   * refuse files (it would raise the chat's login wall).
   */
  private async attachGuideFile(content: string, hasImageAttachment: boolean, operation: ComposerOperation): Promise<{ ok: boolean }> {
    if (this.adapter.acceptsFiles?.() === false) return { ok: false };
    const root = this.attachScope();
    const attempt = () => attachTextFile(content, {
      filename: PROTOCOL_FILENAME,
      fileInputSelectors: this.adapter.fileInput,
      inputIsAdditive: this.adapter.additiveFileInput === true,
      preserveExisting: hasImageAttachment,
      requireConfirmation: this.delivery === 'file',
      root,
      inputNearRoot: true,
    });
    const first = await attempt();
    if (first.ok || first.started || this.adapter.additiveFileInput !== true || !operation.isCurrent()) return first;
    return attempt();
  }

  /** Add the answer-format reminder under the question, and the guide when this chat needs it. */
  private async injectNow(): Promise<boolean> {
    const store = useStore.getState();
    const existing = this.adapter.getEditorText().trim();
    const hasImageAttachment = this.adapter.composerHasAttachments();
    const question = cleanSessionQuestion(existing);
    const alreadyInComposer = composerTextHasProtocol(existing);
    const alreadyInThread =
      alreadyInComposer || pageThreadHasProtocol(document, this.adapter.findEditor());

    if (store.buttonInjected) {
      if (
        !shouldReinjectOnNewQuestion({
          buttonInjected: true,
          question,
          lastQuestion: this.lastQuestion,
          hasProtocol: alreadyInThread,
        })
      ) {
        return false;
      }
      store.setButtonInjected(false);
    }

    const hasUserContent = this.composerHasUserContent();
    const operation = this.beginComposerOperation();

    const buildOpt = { hasImageAttachment };
    const payload = buildInjectionPayload(question, buildOpt);
    const subject = payload.subject;

    let ok = false;
    let injectionMethod: 'text' | 'file' = 'text';

    // Every message carries the answer shape; the guide file goes with it only when this chat
    // has none, the last answer missed the format, or the question needs figures it lacks.
    const attachGuide = guideNeeded(
      question,
      sentStudentMessages(document, this.adapter.findEditor()),
      store.status !== 'error' && store.errorMessage !== NO_ANSWER_NOTICE &&
        store.sessions[store.sessions.length - 1]?.origin !== 'ingest',
    );
    const attached = attachGuide
      ? await this.attachGuideFile(payload.fileContent, hasImageAttachment, operation)
      : { ok: false as const };
    if (!operation.isCurrent()) return this.abandonAttach(operation);

    if (attached.ok) {
      await new Promise((r) => setTimeout(r, 80));
      const stub = alreadyInThread
        ? buildComposerPointer({
            hasImageAttachment,
            hasQuestion: question.length > 0,
            protocolAttachmentConfirmed: true,
          })
        : hasUserContent
          ? buildComposerAppendix({
              hasImageAttachment,
              hasQuestion: question.length > 0,
            })
          : payload.composerText;
      const mode = hasUserContent || alreadyInThread ? 'append' : 'replace';
      ok = await this.insertVerifiedPrompt(stub, mode, {
        fileAttach: true,
        operation,
      });
      if (ok) injectionMethod = 'file';
      // File already on the composer — never paste the guide as well.
    } else if (!attachGuide) {
      const stub = buildComposerPointer({ hasImageAttachment, hasQuestion: question.length > 0 });
      ok = await this.insertVerifiedPrompt(stub, hasUserContent ? 'append' : 'replace', {
        fileAttach: true,
        operation,
      });
      injectionMethod = 'text';
      // The host took no upload (signed out, or its uploader failed): the guide goes in as text.
    } else if (hasUserContent) {
      const built = buildInjectionAppendix(question, buildOpt);
      ok = await this.insertVerifiedPrompt(built.prompt, 'append', { operation });
      injectionMethod = 'text';
    } else {
      const built = buildInjectionPrompt(question, buildOpt);
      ok = await this.insertVerifiedPrompt(built.prompt, 'replace', { operation });
      injectionMethod = 'text';
    }

    if (!operation.isCurrent()) return this.abandonAttach(operation);
    if (!ok) {
      store.setStatus(
        'error',
        'Could not add the stemlm study guide to the chat box. Click in the input and try stemlm again.',
      );
      return false;
    }

    this.preparedComposer = operation;
    this.lastQuestion = question;
    store.setButtonInjected(true);
    // A failed upload is never silent: the student is told the guide went in as text instead.
    const pasted = attachGuide && !attached.ok ? GUIDE_PASTED_NOTICE : undefined;
    if (!hasUserContent) {
      this.adapter.focusComposerQuestionSlot();
      store.setStatus('idle', `${pasted ?? 'Instructions attached.'} Type your question above the stemlm line, then send when ready.`);
    } else {
      // Not "loading": nothing is on its way until the student sends (maybeQuestionSent).
      store.setStatus(useStore.getState().sessions.length ? 'ready' : 'idle', pasted);
    }
    this.typedFirst = hasUserContent;
    this.pendingFollowUpCapture = false;
    this.pendingFollowUpAnchor = null;
    this.awaitingAnswer = true;
    this.plainRefused = '';
    this.beginCaptureEpoch();
    this.seedCapturedFromPage();
    this.armAnswerDetection();
    void rememberCurrentChat(this.adapter.id);
    void trackEvent('question_asked', {
      platform: this.adapter.id,
      subject,
      injection_method: injectionMethod,
    });

    this.startWatching();
    return true;
  }

  /** Inject a quote-reply that drills into selected text and re-arm capture. */
  async followUp(
    selection: string,
    stepTitle: string | undefined,
    subject: Subject,
    opt?: {
      intent?: FollowupIntent;
      /** Attach the answer inline after this step instead of replacing the session. */
      anchor?: { sessionId: string; anchorStepId: string };
      /** A question to put in the slot (the answer's own suggestion), so nothing has to be retyped. */
      question?: string;
    },
  ): Promise<boolean> {
    const normalized = normalizeFollowupSelection(selection);
    if (isEmptyFollowupSelection(selection)) {
      return true;
    }
    if (normalized.length < 3) {
      useStore
        .getState()
        .setStatus('error', 'Select more text (or use the Dig deeper prompt) before asking in chat.');
      return false;
    }

    const store = useStore.getState();
    if (store.status === 'loading' || store.writingId) {
      store.setStatus(
        'error',
        'Wait for the current answer to finish before sending a follow-up.',
      );
      return false;
    }

    const followOpt = {
      selection: normalized,
      stepTitle,
      subject,
      intent: opt?.intent,
      qid: store.sessions.find((s) => s.id === opt?.anchor?.sessionId)?.capsule.meta.qid,
      question: opt?.question,
    };
    const operation = this.beginComposerOperation();
    // The follow-up text carries its own answer shape, so no file is uploaded with it.
    const ok = await this.insertVerifiedPrompt(buildFollowupCopyText(followOpt), 'replace', {
      followUp: true,
      operation,
    });

    if (!operation.isCurrent()) return this.abandonAttach(operation);
    if (!ok) {
      useStore
        .getState()
        .setStatus(
          'error',
          'Could not insert the follow-up into the chat box. Click in the input and try again.',
        );
      return false;
    }

    this.adapter.focusComposerQuestionSlot();
    this.lastQuestion = normalized;
    this.pendingFollowUpCapture = true;
    this.pendingFollowUpAnchor = opt?.anchor ?? null;
    this.awaitingAnswer = false;
    useStore.getState().setButtonInjected(true);
    this.beginCaptureEpoch();
    // The student has NOT asked anything yet — only the context was inserted.
    // Every capsule already visible in the chat is stale for this ask: seed it
    // as captured so nothing attaches until the student types, sends, and the
    // assistant produces a genuinely NEW answer.
    this.seedCapturedFromPage();
    if (this.pendingFollowUpAnchor) {
      // Quietly wait for the student to type + send; no banner, no loading.
      useStore.getState().setStatus('ready');
    } else {
      useStore.getState().setStatus('loading');
    }
    this.armAnswerDetection();
    void trackEvent('followup_used', { platform: this.adapter.id });
    this.startWatching();
    return true;
  }

  /**
   * Mark every capsule currently on the page as already captured, so a fresh
   * Ask-in-chat can only pick up an answer generated after the student sends.
   */
  private seedCapturedFromPage(): void {
    try {
      for (const candidate of this.adapter.extractCapsules()) {
        this.rememberCaptured(candidate.trim());
        const raw = findCapsuleRaw(candidate);
        if (raw) this.rememberCaptured(raw.trim());
      }
      const latest = this.adapter.getLatestAssistantText();
      if (latest && latest.includes('@meta')) this.rememberCaptured(latest.trim());
    } catch {
      /* page not readable yet — nothing to seed */
    }
  }

  /**
   * Write `prompt` into the composer and confirm it landed.
   * A reminder is short; a guide pasted as text must have arrived whole.
   */
  private async insertVerifiedPrompt(
    prompt: string,
    mode: 'replace' | 'append' = 'replace',
    opt?: { fileAttach?: boolean; followUp?: boolean; operation?: ComposerOperation },
  ): Promise<boolean> {
    const looksComplete = (text: string) => this.promptLooksComplete(text, opt);

    const tryOnce = () => {
      if (opt?.operation && !opt.operation.isCurrent()) return false;
      const inserted = this.adapter.insertPrompt(prompt, mode);
      opt?.operation?.recordDraft();
      if (!inserted) return false;
      return looksComplete(this.adapter.getEditorText());
    };

    if (tryOnce()) return true;
    await new Promise((r) => setTimeout(r, opt?.followUp ? 250 : 120));
    return tryOnce();
  }

  private promptLooksComplete(
    text: string,
    opt?: { fileAttach?: boolean; followUp?: boolean },
  ): boolean {
    if (opt?.followUp) return text.includes(FOLLOWUP_CONTEXT_HEADER);
    return opt?.fileAttach ? composerTextHasProtocol(text) : composerHasInlineGuide(text);
  }

  /** Prefer the chat conversation root over all of document.body. */
  private watchRoot(): ParentNode {
    for (const sel of this.adapter.layoutRoots) {
      try {
        const el = document.querySelector(sel);
        if (el) return el;
      } catch {
        /* invalid selector */
      }
    }
    const blocks = this.adapter.getAssistantBlocks();
    if (blocks.length > 0) {
      let node: HTMLElement | null = blocks[blocks.length - 1] ?? null;
      for (let i = 0; i < 8 && node; i++) {
        if (
          node.matches?.(
            'infinite-scroller, chat-window, .conversation-container, main, [class*="conversation"]',
          )
        ) {
          return node;
        }
        node = node.parentElement;
      }
      const parent = blocks[blocks.length - 1]?.parentElement;
      if (parent) return parent;
    }
    return document.body;
  }

  /** Reset answer-started detection and snapshot the current message count. */
  private armAnswerDetection(): void {
    this.answerStarted = false;
    this.answerArmed = true;
    this.sentBaseline = sentStudentMessages(document, this.adapter.findEditor()).length;
    this.streamingAtArm = this.adapter.isStreaming();
    this.baselineAssistantText = this.adapter.getLatestAssistantText();
    this.resetQuiet();
    try {
      const blocks = this.adapter.getAssistantBlocks();
      this.baselineBlocks = blocks.length;
      this.baselineBlockSet = new WeakSet<Element>(blocks);
    } catch {
      this.baselineBlocks = 0;
      this.baselineBlockSet = new WeakSet<Element>();
    }
  }

  /** Begin watching the page for a completed capsule. */
  startWatching(): void {
    if (this.watching) return;
    this.watching = true;
    this.observer = new MutationObserver(() => this.scheduleCheck());
    this.observeRoot();
    // CAP-OBS-01: a host that swaps its conversation root would leave the observer on a
    // detached node and capture would silently stop. Rebind when that happens.
    this.rootTimer = setInterval(() => {
      if (this.observedRoot && !(this.observedRoot as Node).isConnected) {
        this.observeRoot();
        this.scheduleCheck();
      }
    }, ROOT_CHECK_MS);
    // Also check immediately in case the answer is already present.
    this.scheduleCheck();
  }

  private observeRoot(): void {
    this.observer?.disconnect();
    this.observedRoot = this.watchRoot();
    this.observer?.observe(this.observedRoot, {
      childList: true,
      subtree: true,
      characterData: true,
    });
  }

  stopWatching(): void {
    this.composerGeneration += 1;
    this.watching = false;
    this.observer?.disconnect();
    this.observer = null;
    this.observedRoot = null;
    if (this.rootTimer) {
      clearInterval(this.rootTimer);
      this.rootTimer = null;
    }
    if (this.checkTimer) {
      clearTimeout(this.checkTimer);
      this.checkTimer = null;
    }
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = null;
    }
    this.resetQuiet();
  }

  /** Measure the next reply afresh: nothing seen of an earlier one counts for it. */
  private resetQuiet(): void {
    this.stableText = '';
    this.stableSince = 0;
    this.streamSeen = false;
  }

  /**
   * One look at the page per CHECK_INTERVAL_MS while it changes, the last one after the final
   * change. Not a debounce: a reply that streams without a pause would hold that off until it ends.
   */
  private scheduleCheck(): void {
    if (!this.watching || this.checkTimer) return;
    this.checkTimer = setTimeout(() => {
      this.checkTimer = null;
      this.checkForCapsule();
    }, CHECK_INTERVAL_MS);
  }

  /** Fresh inject/follow-up — ignore capsules deduped from a prior request. */
  private beginCaptureEpoch(): void {
    this.captureEpoch += 1;
    this.capturedRaw.clear();
    this.pendingResume = null;
    this.forgetCutOff();
  }

  /**
   * Inspect the page for the assistant's answer.
   *
   * Capture strategy (deliberately NOT gated on `isStreaming()`):
   *  1. If a capsule candidate `looksComplete()` (terminating `@end` present),
   *     capture it immediately — the answer is finished regardless of whether a
   *     "stop" button still lingers in the DOM.
   *  2. Otherwise, if a partial capsule (`@meta` present) is on the page, track
   *     its text and arm a trailing timer; if the text stays completely stable
   *     for STABILITY_MS we tolerantly parse it anyway (handles a dropped
   *     `@end`, and never blocks on a stuck streaming indicator).
   */
  private checkForCapsule(): void {
    if (!this.watching) return;
    this.checkGuideStillAttached();
    this.maybeQuestionSent();
    this.maybeAnswerStarted();
    const streaming = this.adapter.isStreaming();
    // Seen before the reply has any text too: a short reply can be whole by the next look.
    if (streaming) this.streamSeen = true;

    const capsules = this.adapter.extractCapsules();
    const latest = capsules[capsules.length - 1];

    // An unclosed metadata block ending in @end may still be streaming @endmeta.
    // Keep that prefix on the existing stability path, not the final-error path.
    let candidate: string | null;
    if (latest && looksComplete(latest) &&
        (/^\s*@endmeta\b/m.test(latest) || hasUsableParsedContent(parse(latest)))) {
      this.tryCapture(latest, true);
      candidate = this.plainReplyBelowCapsule(latest);
    } else {
      candidate = this.partialCandidate(latest);
    }
    if (!candidate) return;

    const norm = candidate.trim();
    const now = Date.now();
    const changed = this.stableText !== '' && norm !== this.stableText;
    if (norm !== this.stableText) {
      this.stableText = norm;
      this.stableSince = now;
    }
    // The chat is writing this answer now (its text moved, or the chat says so): show the steps
    // it has finished instead of waiting for the last one.
    if (candidate.includes('@meta') && (changed || streaming) && this.inNewestReply(norm)) {
      this.showClosedSteps(candidate, false);
    }
    // Re-evaluate once mutations go quiet. A chat whose own sign of writing has been seen is asked
    // again soon: when that sign goes off the reply is over, capsule or not.
    if (this.stabilityTimer) clearTimeout(this.stabilityTimer);
    const delay = candidate.includes('@meta') || this.streamSeen ? STABILITY_MS : NO_CAPSULE_STABILITY_MS;
    this.stabilityTimer = setTimeout(() => this.evaluateStable(), delay);
  }

  /**
   * The reply being waited for, when it is prose below an earlier answer's capsule. That capsule
   * is still the newest on the page, but it was captured before this question was asked, so it
   * says nothing about the reply.
   */
  private plainReplyBelowCapsule(latest: string): string | null {
    if (!this.awaitingAnswer || !this.capturedRaw.has(latest.trim())) return null;
    const text = this.adapter.getLatestAssistantText();
    return text.trim() && !text.includes('@meta') && text !== this.baselineAssistantText &&
      text.trim() !== this.plainRefused ? text : null;
  }

  /** The best partial-capsule text on the page, if any (code block or message text). */
  private partialCandidate(latest: string | undefined): string | null {
    if (latest && latest.includes('@meta')) return latest;
    const text = this.adapter.getLatestAssistantText();
    if (text && text.includes('@meta')) return text;
    const waiting = useStore.getState().status === 'loading' || this.awaitingAnswer;
    return waiting && text.trim() && text !== this.baselineAssistantText && text.trim() !== this.plainRefused
      ? text : null;
  }

  /** Fired STABILITY_MS after the last change to a partial capsule. */
  private evaluateStable(): void {
    if (!this.watching) return;
    const capsules = this.adapter.extractCapsules();
    const latest = capsules[capsules.length - 1];
    let candidate: string | null;
    if (latest && looksComplete(latest)) {
      this.tryCapture(latest, true);
      candidate = this.plainReplyBelowCapsule(latest);
    } else {
      candidate = this.partialCandidate(latest);
    }
    if (!candidate) return;
    // Only act if the text is still the one we measured as stable.
    if (candidate.trim() !== this.stableText) return;
    // A paused stream is not an error: keep waiting, and keep any follow-up
    // anchor, so the finished answer still lands where the student asked.
    const quietFor = Date.now() - this.stableSince;
    // The chat showed it was writing and no longer does: the reply is over, and need not sit
    // under "loading" for as long as a stream that may only have paused.
    const stall = this.adapter.isStreaming() ? STREAMING_STALL_MS : this.streamSeen ? STABILITY_MS : PARTIAL_STALL_MS;
    if (quietFor < stall) {
      this.stabilityTimer = setTimeout(() => this.evaluateStable(), Math.min(STABILITY_MS, stall - quietFor));
      return;
    }
    // A stable prefix is still a prefix: the chat stopped writing. Show the blocks that closed
    // (D38), else report it; either way the watcher stays alive, so a later @end or continuation
    // replaces it instead of duplicating it.
    if (this.showClosedSteps(candidate, true)) return;
    if (!candidate.includes('@meta')) {
      // No capsule at all: the chat answered in its own words. Study that answer as it is.
      if (this.capturePlainAnswer()) return;
      // Not an answer either. It is not looked at again unless it changes, and only a question
      // the panel is visibly waiting on reports it.
      this.plainRefused = candidate.trim();
      if (useStore.getState().status !== 'loading') return;
    }
    this.offerRepairPrompt(parse(candidate));
  }

  /**
   * The finished reply to a question sent with the guide, when it holds no capsule: structured
   * from the answer's own text and opened with a notice that says so. False when the reply is not
   * a plain answer (a refusal, an error, a short reply), so the caller reports it as before.
   */
  private capturePlainAnswer(): boolean {
    // An Ask-in-chat reply belongs under the step it was asked about, never in a session of its own.
    if (this.pendingFollowUpCapture) return false;
    const store = useStore.getState();
    const blocks = this.adapter.getAssistantBlocks();
    const block = blocks[blocks.length - 1];
    // The reply is a message that was not there when the guide was attached.
    if (!block || this.baselineBlockSet.has(block)) return false;
    const asked = this.adapter.getUserQuestionBefore?.(block) ?? '';
    // "Loading" means the student typed the question, pressed the button and sent. Without that,
    // the turn being answered must itself show stemLM's stub: anything else was sent without it.
    if (store.status !== 'loading' && !composerTextHasProtocol(asked)) return false;
    const question = cleanSessionQuestion(this.lastQuestion) || questionFromUserTurn(asked);
    const answer = readPlainAnswer(block, question);
    if (!answer) return false;

    const last = store.sessions[store.sessions.length - 1];
    // A regenerated plain answer to the same question replaces the one on screen. A capsule
    // answer is never replaced by a structured one.
    const replaced =
      last && last.origin === 'ingest' && store.activeSessionId === last.id &&
      last.platform === this.adapter.id && cleanSessionQuestion(last.question) === question
        ? last : undefined;
    this.commitSession(this.plainSession(answer, question, replaced), Boolean(replaced));
    if (this.stabilityTimer) clearTimeout(this.stabilityTimer);
    this.resetQuiet();
    void rememberCurrentChat(this.adapter.id);
    this.forgetCutOff();
    this.awaitingAnswer = false;
    this.lastQuestion = '';
    this.resetInjection();
    // No status line: the panel says where this answer came from under its question, once.
    useStore.getState().setStatus('ready');
    void trackEvent('question_solved', {
      platform: this.adapter.id,
      subject: answer.capsule.meta.subject,
      steps: answer.capsule.steps.length,
      parse_status: 'ingest',
    });
    return true;
  }

  /** A session built from a plain answer. `previous` keeps its identity, place and follow-ups. */
  private plainSession(answer: PlainAnswer, question: string, previous?: Session, createdAt = Date.now()): Session {
    return {
      id: previous?.id ?? makeId(),
      createdAt: previous?.createdAt ?? createdAt,
      updatedAt: Date.now(),
      platform: this.adapter.id,
      question: question || previous?.question || answer.capsule.meta.topic,
      capsule: answer.capsule,
      ...(previous?.followups ? { followups: previous.followups } : {}),
      raw: answer.markdown,
      origin: 'ingest',
    };
  }

  /**
   * The closed blocks of a full answer that has no @end, as a session of its own: while the chat
   * is still writing it, and (`stopped`, D38) once the chat has stopped before the end. The block
   * being written is left out whole, so a step or figure is only ever shown finished. The session
   * is never saved and is replaced by the finished reply. False when nothing usable has closed.
   */
  private showClosedSteps(candidate: string, stopped: boolean): boolean {
    const prefix = this.pendingFollowUpCapture ? null : closedPrefix(candidate);
    if (!prefix) return false;
    const result = parse(prefix);
    const cap = result.capsule;
    const closedContract = hasCaptureContract({
      ...result,
      warningCodes: result.warningCodes.filter((code) => code !== 'missing_end'),
    });
    if (!cap || result.patch?.length || cap.meta.mode === 'patch' || cap.meta.mode === 'resolve' ||
        !closedContract) return false;
    const store = useStore.getState();
    const pending = store.sessions.find((s) => s.id === this.cutOffId);
    // Only the same reply, further along, takes the place of what is shown. While another
    // answer waits for its continuation, a reply still being written is left until it ends.
    const shown = pending && result.raw.startsWith(pending.raw) ? pending : undefined;
    if (pending && !shown && !stopped) return false;
    const fresh = shown?.raw !== result.raw;
    if (fresh) {
      const session: Session = {
        id: shown?.id ?? makeId(),
        createdAt: shown?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        platform: this.adapter.id,
        question: shown?.question ?? (this.askedQuestion(this.studentTurnAbove(candidate.trim())) ||
          cap.meta.question?.trim() || cap.meta.topic),
        capsule: cap,
        raw: result.raw,
        cutOff: true,
      };
      this.commitSession(session, Boolean(shown));
      this.cutOffId = session.id;
      void rememberCurrentChat(this.adapter.id);
      this.resetInjection();
    }
    const wasWriting = store.writingId === this.cutOffId;
    if (stopped) {
      // Said once: a notice the student dismissed does not come back while nothing changes.
      if (fresh || wasWriting) useStore.setState({ writingId: undefined, status: 'ready', errorMessage: CUT_OFF_NOTICE });
      // The chat's sign of writing was wrong about this reply, or is gone: go by quiet from here.
      this.streamSeen = false;
    } else if (!wasWriting) {
      // Writing (again, after a pause that looked like the end): that notice no longer holds.
      useStore.setState((s) => ({
        writingId: this.cutOffId ?? undefined,
        ...(s.errorMessage === CUT_OFF_NOTICE ? { errorMessage: undefined } : {}),
      }));
    }
    return true;
  }

  /** No answer is being followed as partial any more. */
  private forgetCutOff(): void {
    this.cutOffId = null;
    if (useStore.getState().writingId) useStore.setState({ writingId: undefined });
  }

  /**
   * The assistant message `capsule` was read from. Null when it was not read from one message;
   * undefined when the adapter cannot say.
   */
  private replyHolding(capsule: string): HTMLElement | null | undefined {
    const sources = this.adapter.getCapsuleSources?.();
    return sources && (sources.findLast((source) => source.text.trim() === capsule)?.message ?? null);
  }

  /** False only when the page shows `capsule` in a reply that is not the newest one: history, not an answer in progress. */
  private inNewestReply(capsule: string): boolean {
    const message = this.replyHolding(capsule);
    if (!message) return true;
    const blocks = this.adapter.getAssistantBlocks();
    return message === blocks[blocks.length - 1];
  }

  /** D38: the cut-off answer `incoming` finishes, unless it answers a different question. */
  private cutOffTarget(incoming: Capsule): Session | undefined {
    const shown = useStore.getState().sessions.find((s) => s.id === this.cutOffId);
    return shown && !incomingForcesNewSession(shown, incoming) ? shown : undefined;
  }

  /** D38: a reply that brings only steps the cut-off answer lacks continues it (stitched). */
  private joinCutOff(candidate: string): string {
    if (!this.cutOffId) return candidate;
    const incoming = parse(candidate).capsule;
    const shown = incoming?.steps.length ? this.cutOffTarget(incoming) : undefined;
    if (!shown) return candidate;
    const ids = new Set(shown.capsule.steps.map((s) => s.id));
    return incoming!.steps.some((s) => ids.has(s.id)) ? candidate : stitchResume([shown.raw, candidate]);
  }

  /**
   * Attempt to parse + store a capsule candidate. `complete` indicates the
   * candidate had a terminating `@end`; for incomplete candidates we only
   * surface a parse error if there is genuinely nothing usable.
   */
  private tryCapture(candidate: string, complete: boolean): void {
    if (!this.watching) return;
    const onPage = candidate.trim();
    const resumeToken = findResumeToken(candidate);
    if (resumeToken && !looksComplete(candidate)) {
      this.pendingResume = { token: resumeToken, raw: candidate };
      return;
    }
    if (this.pendingResume) {
      const sameToken = Boolean(resumeToken && resumeToken === this.pendingResume.token);
      if (sameToken) {
        candidate = stitchResume([this.pendingResume.raw, candidate]);
      }
      this.pendingResume = null;
    }

    const own = candidate.trim();
    if (this.capturedRaw.has(own)) {
      this.resolveLoadingIfAlreadyCaptured(own);
      return;
    }
    candidate = this.joinCutOff(candidate);
    const key = candidate.trim();
    // A continuation stitched onto a cut-off answer must not be captured again on its own.
    if (key !== own) this.rememberCaptured(own);

    const result = parse(candidate);
    const usable = hasCaptureContract(result);
    if (!usable) {
      if (complete) {
        this.rememberCaptured(key);
        this.offerRepairPrompt(result);
      }
      return;
    }

    this.rememberCaptured(key);
    if (this.stabilityTimer) clearTimeout(this.stabilityTimer);
    this.resetQuiet();
    const turn = this.studentTurnAbove(onPage);
    this.captureFromText(candidate, this.askedQuestion(turn), result, turn);
  }

  /**
   * The student's message that the reply holding `capsule` answers, as the page shows it (stemLM's
   * own lines included). Empty when the host's markup for it is not recognised.
   */
  private studentTurnAbove(capsule: string): string {
    const message = this.replyHolding(capsule);
    return message ? this.adapter.getUserQuestionBefore?.(message) ?? '' : '';
  }

  /**
   * The question a captured reply answers: the student's own message when the page shows it.
   * What was in the chat box when the stemlm button was pressed stands in only for the answer that
   * press is waiting for. Any later reply was asked without it and is a question of its own.
   */
  private askedQuestion(turn: string): string {
    return questionFromUserTurn(turn) ||
      (this.awaitingAnswer || this.pendingFollowUpCapture ? cleanSessionQuestion(this.lastQuestion) : '');
  }

  /**
   * The student's message above a reply asks something other than `session`'s question, so the
   * reply is a new answer whatever qid or mode the model copied into it. False when the page does
   * not show the message, and for stemLM's own follow-up text, which is about that answer.
   */
  private asksSomethingElse(session: Session, turn: string): boolean {
    if (turn.includes(FOLLOWUP_CONTEXT_HEADER)) return false;
    const asked = questionFromUserTurn(turn);
    return asked !== '' && asked !== cleanSessionQuestion(session.question);
  }

  /** Surface malformed responses without mutating the user's chat composer. */
  private offerRepairPrompt(result: ParseResult): void {
    const code = result.errorCode ??
      result.warningCodes.find((warning) => FULL_CAPSULE_BLOCK_WARNINGS.has(warning)) ??
      result.warningCodes[0] ?? 'no_usable_content';
    // This response cannot satisfy the pending follow-up request. Do not
    // let its capture mode leak into the next ordinary injection: otherwise a
    // same-topic capsule without a qid can replace the active session.
    this.pendingFollowUpCapture = false;
    this.pendingFollowUpAnchor = null;
    const store = useStore.getState();
    if (code === 'no_capsule') {
      // The chat replied, but not with an answer: a refusal, a usage limit, a question back.
      // Nothing of stemLM's failed, so this is a note, not an error.
      store.setStatus(store.sessions.length ? 'ready' : 'idle', NO_ANSWER_NOTICE);
    } else {
      // A missing @end on a stable reply means the chat stopped writing.
      const lead = code === 'missing_end'
        ? 'This answer is incomplete: the chat stopped before the end. Ask the chat to continue it, or send your question again with the stemlm button.'
        : "stemlm couldn't read this answer. Click the stemlm button and send your question again.";
      store.setStatus('error', `${lead}\nParser code: ${code}.`);
    }
    this.streamSeen = false;
    this.resetInjection();
    void trackEvent('extension_error', {
      platform: this.adapter.id,
      source: 'parse',
      parse_status: result.status,
      parse_error_code: code,
      warnings_count: result.warningCodes.length,
      repair_used: false,
    });
  }

  /** stemLM's lines are no longer in the chat box: the prepared draft was sent, or thrown away. */
  private draftLeftChatBox(): boolean {
    return !composerTextHasProtocol(this.adapter.getEditorText());
  }

  /**
   * The prepared question was sent: it has left the chat box, and a new message of the
   * student's, carrying stemLM's lines, is in the thread. Only now is an answer on its way.
   */
  private maybeQuestionSent(): void {
    if (this.answerStarted || !this.awaitingAnswer || !this.draftLeftChatBox()) return;
    const sent = sentStudentMessages(document, this.adapter.findEditor());
    const newest = sent[sent.length - 1];
    if (sent.length > this.sentBaseline && newest !== undefined && composerTextHasProtocol(newest)) this.questionUnderWay(true);
  }

  /**
   * Once per question, when it is sent or, where the chat's own messages cannot be read, when
   * the reply begins: the panel starts waiting for the answer, and opens if the student wants it
   * to. A guide that is attached and never sent gets here never: nothing opens, nothing loads.
   * `withGuide`: the message was seen to carry stemLM's lines. Without that, the panel waits only
   * for a question that was typed before the button was pressed (it cannot have been sent bare).
   */
  private questionUnderWay(withGuide: boolean): void {
    this.answerStarted = true;
    const store = useStore.getState();
    // DISABLED-01: switched off mid-answer, stemLM must not pop its panel open.
    if (store.settings.stemlmEnabled === false) return;
    if (this.awaitingAnswer && (withGuide || this.typedFirst) && store.status !== 'loading') store.setStatus('loading');
    try {
      this.onAnswerStartedCb?.();
    } catch {
      /* ignore */
    }
  }

  /** Detect (once) that the assistant has started answering, and notify. */
  private maybeAnswerStarted(): void {
    if (this.answerStarted) return;
    let blocks = 0;
    try {
      blocks = this.adapter.getAssistantBlocks().length;
    } catch {
      /* ignore */
    }
    const text = this.adapter.getLatestAssistantText();
    const streaming = this.adapter.isStreaming();
    // An answer that was still being written when the guide was attached is not this one starting.
    if (!streaming) this.streamingAtArm = false;
    // An earlier stemLM answer already on the page is not this answer starting, and nothing is
    // this answer while the question still sits in the chat box.
    const started = this.answerArmed
      ? this.draftLeftChatBox() && (blocks > this.baselineBlocks || (streaming && !this.streamingAtArm) ||
        (text !== this.baselineAssistantText && text.trim() !== ''))
      : streaming;
    // Watching without a question (restored / shared answers, Load conversation): what the page
    // already shows is history, so settle rather than wait for an answer nobody asked stemLM for.
    if (!started && !this.answerArmed) this.answerStarted = true;
    if (started) this.questionUnderWay(false);
  }

  /**
   * Attach an Ask-in-chat mini-capsule to the originating step / solution tab.
   * Returns false when there is nothing usable to hang off the anchor.
   */
  private attachAnchoredFollowup(result: ParseResult): boolean {
    const anchor = this.pendingFollowUpAnchor;
    if (!anchor) return false;
    const store = useStore.getState();
    const target = store.sessions.find((s) => s.id === anchor.sessionId);
    if (!target) return false;

    let cap = result.questions?.[0] ?? result.capsule;
    if (!cap?.steps.length) {
      const steps = (result.patch ?? [])
        .map((p) => p.step)
        .filter((s): s is Step => Boolean(s));
      if (!steps.length) return false;
      cap = {
        meta: { ...target.capsule.meta, mode: 'resolve' },
        steps,
        solution: result.patch?.find((p) => p.solution)?.solution ?? '',
        solutionDiagrams: [],
      };
    }

    const followup: StepFollowup = {
      id: makeId(),
      anchorStepId: anchor.anchorStepId,
      question: this.extractTypedFollowupQuestion(),
      capsule: cap,
      createdAt: Date.now(),
    };
    store.addFollowup(anchor.sessionId, followup);
    this.finishCapture(cap, result);
    return true;
  }

  /** A patch was refused. Nothing is mutated; the student can retry. */
  private rejectPatch(detail: string): void {
    this.pendingFollowUpCapture = false;
    this.pendingFollowUpAnchor = null;
    useStore.getState().setStatus('error', `stemlm couldn't apply this change, so the answer on screen is unchanged.\n${detail}`);
    this.resetInjection();
  }

  /**
   * `question`: what the student asked, when that is known (askedQuestion). `turn`: their message
   * above the reply as the page shows it, or '' when it cannot be read.
   */
  private captureFromText(text: string, question: string, parsed?: ParseResult, turn = ''): void {
    const result = parsed ?? parse(text);
    const store = useStore.getState();
    const active = store.sessions.find((s) => s.id === store.activeSessionId);

    // Anchored Ask-in-chat (step or whole-solution): never patch, never replace,
    // never open a new session. The answer hangs off the originating view only.
    if (this.pendingFollowUpCapture && this.pendingFollowUpAnchor) {
      const target = store.sessions.find((session) => session.id === this.pendingFollowUpAnchor!.sessionId);
      const incoming = result.questions?.length === 1 ? result.questions[0] : result.capsule;
      const expectedQid = target?.capsule.meta.qid;
      const qidMatches = expectedQid
        ? incoming?.meta.qid === expectedQid
        : incoming?.meta.mode === 'resolve';
      const anchoredContractMatches = Boolean(
        target &&
        incoming &&
        qidMatches &&
        incoming.meta.mode === 'resolve' &&
        !result.patch?.length,
      );
      if (anchoredContractMatches) {
        if (this.attachAnchoredFollowup(result)) return;
        this.offerRepairPrompt(result);
        return;
      }
      // A wrong qid/mode is not an anchored answer. Clear the capture mode and
      // let normal routing decide whether it is a new question or a patch.
      this.pendingFollowUpCapture = false;
      this.pendingFollowUpAnchor = null;
    }

    if (result.patch && result.patch.length && active) {
      const incoming = result.capsule;
      const incomingQid = incoming?.meta.qid;
      const activeQid = active.capsule.meta.qid;
      const qidMismatch = Boolean(incomingQid && activeQid && incomingQid !== activeQid);
      const modeContradiction = incoming?.meta.mode === 'new' || incoming?.meta.mode === 'full';
      if (qidMismatch || modeContradiction) {
        this.rejectPatch(
          qidMismatch
            ? `This patch targets question ${incomingQid}, not the answer on screen.`
            : 'This response declares a full answer and a patch at the same time.',
        );
        return;
      }
      if (!sessionAcceptsPatch(active)) {
        this.rejectPatch('This change was written for a stemlm answer, but the answer on screen was structured from a plain chat reply.');
        return;
      }
      const patched = applyStepPatch(active.capsule, result.patch);
      if (!patched.ok) {
        this.rejectPatch(patched.warnings[0] ?? 'The patch did not match the current answer.');
        return;
      }
      this.commitSession(
        { ...active, updatedAt: Date.now(), capsule: patched.capsule, raw: result.raw },
        true,
      );
      this.finishCapture(patched.capsule, result);
      return;
    }

    const questionCapsules =
      result.questions && result.questions.length > 0
        ? result.questions
        : result.capsule
          ? [result.capsule]
          : [];
    if (result.status === 'empty' || questionCapsules.length === 0) {
      this.offerRepairPrompt(result);
      return;
    }

    const incoming = questionCapsules[0]!;
    const cutOff = this.cutOffTarget(incoming);
    // The model must say it is redoing that answer. A qid alone does not: a model repeats the qid
    // of its last answer under a new question, and that answer would be written over.
    const nativeSameQid =
      active &&
      questionCapsules.length === 1 &&
      Boolean(active.capsule.meta.qid) &&
      active.capsule.meta.qid === incoming.meta.qid &&
      (incoming.meta.mode === 'resolve' || incoming.meta.mode === 'patch');

    const followUpSameQuestion =
      !cutOff &&
      (this.pendingFollowUpCapture || Boolean(nativeSameQid)) &&
      active &&
      questionCapsules.length === 1 &&
      (nativeSameQid || !followUpOpensNewSession(active, incoming)) &&
      !this.asksSomethingElse(active, turn);

    if (followUpSameQuestion) {
      const cap = keepActiveQid(active, questionCapsules[0]!);
      this.commitSession(
        {
          ...withoutOrigin(active),
          updatedAt: Date.now(),
          capsule: cap,
          raw: result.raw,
          question:
            cleanSessionQuestion(active.question) ||
            cap.meta.question?.trim() ||
            cap.meta.topic,
        },
        true,
      );
      this.finishCapture(cap, result);
      return;
    }

    for (let i = 0; i < questionCapsules.length; i++) {
      const cap = questionCapsules[i]!;
      const diagrams = allDiagrams(
        cap.steps.flatMap((s) => (s.diagram ? [s.diagram] : [])),
        cap.solutionDiagrams,
      );
      const stepQualityIssues = cap.steps.flatMap((s) =>
        auditStepQuality(s, { archetype: cap.meta.archetype }),
      );
      const diagramIssues = auditCapsuleDiagrams(cap);
      const topic = cap.meta.topic;
      const asked = i === 0 ? cleanSessionQuestion(question) : '';
      const cleanedQuestion = asked || cap.meta.question?.trim() || topic;
      const last = store.sessions[store.sessions.length - 1];
      // A retry of the same question replaces its answer. Only the student's own words say it is
      // the same question: two different questions can share the topic a model gives them.
      const shouldReplace =
        asked !== '' &&
        !this.pendingFollowUpCapture &&
        last &&
        store.activeSessionId === last.id &&
        last.platform === this.adapter.id &&
        cleanSessionQuestion(last.question) === asked &&
        !incomingForcesNewSession(active, cap);
      // D38: the finished reply replaces the cut-off answer it completes, even when not active.
      const replaced = i === 0 && cutOff ? cutOff : shouldReplace ? last : undefined;

      const session: Session = {
        id: replaced?.id ?? makeId(),
        createdAt: replaced?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        platform: this.adapter.id,
        question: cleanedQuestion,
        capsule: cap,
        raw: result.raw,
      };
      this.commitSession(session, Boolean(replaced));
      void trackEvent('question_solved', {
        platform: this.adapter.id,
        subject: cap.meta.subject,
        steps: cap.steps.length,
        parse_status: result.status,
        warnings_count: result.warningCodes.length,
        step_quality_warnings_count: stepQualityIssues.length,
        diagram_warnings_count: diagramIssues.length,
        step_work_ok: stepQualityIssues.length === 0 ? 1 : 0,
        had_svg: diagrams.some((d) => d.type === 'svg'),
        had_mermaid: diagrams.some((d) => d.type === 'mermaid'),
      });
    }
    this.settleCapture(result);
  }

  /**
   * Best-effort read of what the student actually typed into the follow-up
   * question slot: the last user turn's text before the context header.
   */
  private extractTypedFollowupQuestion(): string | undefined {
    let latest: string | undefined;
    for (const sel of THREAD_PROTOCOL_SELECTORS) {
      let nodes: NodeListOf<Element>;
      try {
        nodes = document.querySelectorAll(sel);
      } catch {
        continue;
      }
      for (const el of nodes) {
        const text = el.textContent ?? '';
        if (text.includes(FOLLOWUP_CONTEXT_HEADER)) latest = text;
      }
    }
    if (!latest) return undefined;
    const head = latest.slice(0, latest.indexOf(FOLLOWUP_CONTEXT_HEADER));
    const typed = head
      .replace(/ask your question here:/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!typed) return undefined;
    return typed.length > 400 ? `${typed.slice(0, 400)}…` : typed;
  }

  private commitSession(session: Session, replace: boolean): void {
    if (replace) {
      const id = session.id;
      useStore.setState((s) => {
        const maxStep = Math.max(0, buildStepEntries(session).length - 1);
        // Only the answer the student is reading may move its step cursor.
        const activeStepIndex =
          s.activeSessionId === id ? Math.min(s.activeStepIndex, maxStep) : s.activeStepIndex;
        return {
          sessions: s.sessions.map((sess) => (sess.id === id ? session : sess)),
          activeStepIndex,
          status: 'ready',
          errorMessage: undefined,
        };
      });
    } else {
      useStore.getState().addSession(session);
    }
  }

  /** Leave capture mode after an answer was stored; surface any D11 notice. */
  private settleCapture(result: ParseResult): void {
    void rememberCurrentChat(this.adapter.id);
    this.pendingFollowUpCapture = false;
    this.pendingFollowUpAnchor = null;
    this.forgetCutOff();
    this.awaitingAnswer = false;
    // The press this answer belongs to is over: its question must not name a later reply.
    this.lastQuestion = '';
    this.resetInjection();
    const notice = missingClosingNotice(result);
    if (notice) useStore.getState().setStatus('ready', notice);
  }

  private finishCapture(capsule: Session['capsule'], result: ParseResult): void {
    const diagrams = allDiagrams(
      capsule.steps.flatMap((s) => (s.diagram ? [s.diagram] : [])),
      capsule.solutionDiagrams,
    );
    const stepQualityIssues = capsule.steps.flatMap((s) =>
      auditStepQuality(s, { archetype: capsule.meta.archetype }),
    );
    const diagramIssues = auditCapsuleDiagrams(capsule);
    this.settleCapture(result);
    void trackEvent('question_solved', {
      platform: this.adapter.id,
      subject: capsule.meta.subject,
      steps: capsule.steps.length,
      parse_status: result.status,
      warnings_count: result.warningCodes.length,
      step_quality_warnings_count: stepQualityIssues.length,
      diagram_warnings_count: diagramIssues.length,
      step_work_ok: stepQualityIssues.length === 0 ? 1 : 0,
      had_svg: diagrams.some((d) => d.type === 'svg'),
      had_mermaid: diagrams.some((d) => d.type === 'mermaid'),
    });
  }

  /**
   * What "Load conversation" would find for an empty panel. `capsules`: stemLM answers (or a
   * sent guide, whose answers may still be rendering). `answer`: no capsule anywhere, but one of
   * the chat's recent replies is a finished plain answer that can be studied as it is. Null: nothing.
   */
  conversationToLoad(): 'capsules' | 'answer' | null {
    if (useStore.getState().sessions.length > 0) return null;
    return this.probePage() ??
      (pageThreadHasProtocol(document, this.adapter.findEditor()) ? 'capsules' : null);
  }

  /** True when this chat has something the panel has not loaded. Empty-state offers to load it. */
  hasConversationToLoad(): boolean {
    return this.conversationToLoad() !== null;
  }

  /**
   * Capsules win over plain answers, and nothing is offered while a reply is being written: the
   * student is about to want that one. A short reply after a worked answer ("You're welcome")
   * does not hide the answer above it. The empty panel asks repeatedly while it waits, so the
   * result is kept until the replies it was read from change.
   */
  private probePage(): 'capsules' | 'answer' | null {
    const blocks = this.adapter.getAssistantBlocks();
    const latest = blocks[blocks.length - 1];
    const streaming = this.adapter.isStreaming();
    const read = blocks.slice(-PLAIN_SCAN_BLOCKS).reduce((n, block) => n + (block.textContent ?? '').length, 0);
    const key = `${blocks.length}:${read}:${streaming ? 1 : 0}`;
    if (latest && this.pageProbe?.key === key && this.pageProbe.latest.deref() === latest) {
      return this.pageProbe.found;
    }
    let found: 'capsules' | 'answer' | null = null;
    if (this.adapter.extractCapsules().some((candidate) => (findCapsuleRaw(candidate) ?? candidate).includes('@meta'))) {
      found = 'capsules';
    } else if (!streaming && this.recentPlainAnswers(1).length > 0) {
      found = 'answer';
    }
    // Without a recognised message there is nothing to key the memory on: look again every time.
    this.pageProbe = latest ? { key, latest: new WeakRef(latest), found } : null;
    return found;
  }

  /**
   * Rebuild sessions from the chatbot's own visible history (no server). Used
   * when the panel was lost (tab closed) but the chat history remains, and to
   * study a chat that was answered without stemLM.
   *
   * Polls briefly so Gemini has time to render history after a tab reload.
   * `quiet`: the student did not ask to load anything (the panel was only opened), so finding
   * nothing changes nothing.
   */
  async loadConversation(opt?: { maxWaitMs?: number; quiet?: boolean }): Promise<number> {
    const maxWaitMs = opt?.maxWaitMs ?? 2500;
    const started = Date.now();
    const deadline = started + maxWaitMs;
    /** The page's plain answers at the previous look, and at the look that found nothing to study. */
    let seen: string | null = null;
    let refused = '';
    let writing = false;

    while (true) {
      const capsules = this.adapter.extractCapsules();
      const count = this.loadConversationOnce(capsules);
      if (count > 0) return count;
      const last = Date.now() >= deadline;
      const page = capsules.some((candidate) => candidate.includes('@meta')) ? '' : this.plainPageState();
      // Plain answers are read once two looks agree (a history still rendering or an answer still
      // being written changes between them), or at once when there is no time for a second look.
      const settled = seen === null ? last : page === seen;
      writing = page !== '' && (!settled || this.adapter.isStreaming());
      if (page && settled && page !== refused && (last || !this.capsulesMayFollow(started))) {
        const plain = this.loadPlainAnswers();
        if (plain > 0) return plain;
        refused = page;
      }
      seen = page;
      if (last) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    const store = useStore.getState();
    if (store.sessions.length === 0 && !opt?.quiet) {
      const candidates = groupResumeParts(this.adapter.extractCapsules());
      const rejected = candidates.reverse().find((candidate) => candidate.includes('@meta'));
      if (rejected) {
        this.offerRepairPrompt(parse(rejected));
      } else if (writing) {
        store.setStatus('idle', 'The chat is still writing its answer. Open it here when it has finished.');
      } else {
        store.setStatus(
          'error',
          'No answer to study in this chat yet. Ask a question, then open stemlm again once the chat has answered.',
        );
      }
    }
    this.startWatching();
    return 0;
  }

  /** The assistant side of a capsule-free page in a few numbers; '' when no reply is on it. */
  private plainPageState(): string {
    const blocks = this.adapter.getAssistantBlocks();
    const latest = blocks[blocks.length - 1];
    return latest ? `${blocks.length}:${(latest.textContent ?? '').length}:${this.adapter.isStreaming() ? 1 : 0}` : '';
  }

  /** The student sent the guide in this chat, so capsules may still be on their way into the page. */
  private capsulesMayFollow(started: number): boolean {
    return Date.now() - started < CAPSULE_PATIENCE_MS && pageThreadHasProtocol(document, this.adapter.findEditor());
  }

  /** Single pass over the capsules in the visible chat history. */
  private loadConversationOnce(capsules: string[]): number {
    const store = useStore.getState();
    const sessions: Session[] = [];
    const seen = new Set<string>();
    const existingByRaw = new Map<string, Session>();
    for (const s of store.sessions) {
      // An ingest session's raw text is Markdown: it is not a capsule and never matches one.
      if (s.origin === 'ingest') continue;
      const k = sessionDedupKey(s.raw, {
        topic: s.capsule.meta.topic,
        stepCount: s.capsule.steps.length,
        firstTitle: s.capsule.steps[0]?.title ?? '',
      });
      if (k) existingByRaw.set(k, s);
    }

    for (const candidate of groupResumeParts(capsules)) {
      const text = findCapsuleRaw(candidate) ?? candidate;
      const key = text.trim();
      if (!key.includes('@meta') || seen.has(key)) continue;

      const result = parse(candidate);
      const usable = hasCaptureContract(result) && result.capsule && result.capsule.steps.length > 0;
      if (!usable) continue;

      const dedupKey =
        sessionDedupKey(result.raw, {
          topic: result.capsule!.meta.topic,
          stepCount: result.capsule!.steps.length,
          firstTitle: result.capsule!.steps[0]?.title ?? '',
        }) || key;
      seen.add(key);
      this.rememberCaptured(key);
      const prev = existingByRaw.get(dedupKey);
      sessions.push({
        id: prev?.id ?? makeId(),
        createdAt: prev?.createdAt ?? Date.now(),
        updatedAt: Date.now(),
        platform: this.adapter.id,
        question:
          prev?.question ??
          result.capsule!.meta.question ??
          result.capsule!.meta.topic,
        capsule: result.capsule!,
        ...(prev?.followups ? { followups: prev.followups } : {}),
        raw: result.raw,
      });
    }

    if (sessions.length) this.adoptLoaded(sessions);
    this.startWatching();
    return sessions.length;
  }

  /**
   * Up to `max` of the most recent finished plain answers on the page, oldest first, each with
   * the question it answers. Replies that are not answers are passed over without counting.
   */
  private recentPlainAnswers(max: number): Array<{ answer: PlainAnswer; question: string }> {
    let blocks = this.adapter.getAssistantBlocks();
    // The message still being written is not an answer yet.
    if (this.adapter.isStreaming()) blocks = blocks.slice(0, -1);
    const found: Array<{ answer: PlainAnswer; question: string }> = [];
    const seen = new Set<string>();
    const oldest = Math.max(0, blocks.length - PLAIN_SCAN_BLOCKS);
    for (let i = blocks.length - 1; i >= oldest && found.length < max; i--) {
      const block = blocks[i]!;
      const question = questionFromUserTurn(this.adapter.getUserQuestionBefore?.(block) ?? '');
      const answer = readPlainAnswer(block, question);
      const key = answer?.markdown.trim();
      if (!answer || !key || seen.has(key)) continue;
      seen.add(key);
      found.unshift({ answer, question });
    }
    return found;
  }

  /**
   * Sessions for the most recent plain answers on the page. Only called for a chat that holds no
   * capsule: there, every worked answer is one the student may want to study.
   */
  private loadPlainAnswers(): number {
    const found = this.recentPlainAnswers(PLAIN_SESSIONS_MAX);
    if (!found.length) return 0;
    const existing = new Map<string, Session>();
    for (const s of useStore.getState().sessions) {
      if (s.origin === 'ingest') existing.set(plainDedupKey(s.raw, s.capsule), s);
    }

    const now = Date.now();
    const sessions = found.map(({ answer, question }, i) => {
      // A session restored without its text (mirrored tabs, the reload backup) is matched by shape.
      const previous = existing.get(answer.markdown.trim()) ?? existing.get(plainDedupKey('', answer.capsule));
      // One pass stamps every answer; a millisecond apart keeps them in page order wherever
      // sessions are sorted by creation time.
      return this.plainSession(answer, previous?.question || question, previous, now + i);
    });
    this.adoptLoaded(sessions);
    return sessions.length;
  }

  /**
   * Study an answer the student pasted, for a page stemLM cannot read or a chat it does not
   * support. A stemLM answer is read as one; anything else is arranged into steps as a plain
   * answer. Nothing on the page is touched. False when the text holds no answer to study.
   */
  loadFromText(text: string): boolean {
    const result = parse(text);
    const capsule = hasCaptureContract(result) && result.capsule?.steps.length ? result.capsule : null;
    const plain = capsule ? null : structurePlainAnswer(text, '');
    if (!capsule && !plain) return false;
    const now = Date.now();
    this.adoptLoaded([
      capsule
        ? { id: makeId(), createdAt: now, updatedAt: now, platform: this.adapter.id, question: capsule.meta.question?.trim() || capsule.meta.topic, capsule, raw: result.raw }
        : this.plainSession(plain!, ''),
    ]);
    return true;
  }

  /**
   * LOAD-01: merge, never replace. Sessions the page does not show (restored, other chats) stay;
   * reloaded ones keep their place and follow-ups. The newest loaded answer opens.
   */
  private adoptLoaded(sessions: Session[]): void {
    const store = useStore.getState();
    const byId = new Map(sessions.map((s) => [s.id, s]));
    const merged = store.sessions.map((s) => byId.get(s.id) ?? s);
    merged.push(...sessions.filter((s) => !store.sessions.some((e) => e.id === s.id)));
    store.setSessions(merged);
    store.setActiveSession(sessions[sessions.length - 1]!.id);
    store.setStatus('ready');
    void trackEvent('conversation_loaded', { platform: this.adapter.id, count: sessions.length });
  }

  /** Question text from the last inject / follow-up (used to detect a new prompt). */
  getLastQuestion(): string {
    return this.lastQuestion;
  }

  /** A successful attachment still belongs to this exact editor, route and draft. */
  isCurrentDraftInjected(): boolean {
    return useStore.getState().buttonInjected && this.preparedComposer?.isCurrent() === true;
  }

  /** Allow the user to inject again (e.g. after starting a new question). */
  /**
   * LIVE-02: the student removed the attached guide from the chat box before sending. The draft still
   * carries the stemlm pointer (nothing was sent) but no guide chip is shown any more. Confirmed after
   * a second, because a send also moves the chip out of the composer just before the host clears it.
   */
  private checkGuideStillAttached(): void {
    const removed = useStore.getState().buttonInjected && this.delivery === 'file' &&
      composerExpectsGuideFile(this.adapter.getEditorText()) &&
      !hasConfirmedAttachment(PROTOCOL_FILENAME, this.attachScope());
    if (!removed) {
      this.guideMissingSince = 0;
      return;
    }
    const now = Date.now();
    if (!this.guideMissingSince) {
      this.guideMissingSince = now;
      setTimeout(() => this.checkGuideStillAttached(), GUIDE_REMOVED_CONFIRM_MS + 50);
      return;
    }
    if (now - this.guideMissingSince < GUIDE_REMOVED_CONFIRM_MS) return;
    this.guideMissingSince = 0;
    this.resetInjection();
    this.pendingFollowUpCapture = false;
    this.pendingFollowUpAnchor = null;
    this.awaitingAnswer = false;
    // Nothing of stemLM's is on its way any more: the next reply is not one to open the panel for.
    this.answerStarted = true;
    useStore.getState().setStatus('idle', 'The stemlm guide was removed from the chat box. Click the stemlm button to attach it again.');
  }

  resetInjection(): void {
    this.preparedComposer = null;
    useStore.getState().setButtonInjected(false);
  }

  private rememberCaptured(raw: string): void {
    if (this.capturedRaw.size >= StemController.CAPTURED_RAW_MAX) {
      const keep = [...this.capturedRaw].slice(-Math.floor(StemController.CAPTURED_RAW_MAX / 2));
      this.capturedRaw = new Set(keep);
    }
    this.capturedRaw.add(raw);
  }

  /**
   * If the model regenerated byte-identical text, exit loading when we already
   * stored this capsule for the current epoch.
   */
  private resolveLoadingIfAlreadyCaptured(key: string): void {
    const store = useStore.getState();
    if (store.status !== 'loading' || !store.buttonInjected) return;
    const match = store.sessions.find(
      (s) =>
        s.origin !== 'ingest' &&
        sessionDedupKey(s.raw, {
          topic: s.capsule.meta.topic,
          stepCount: s.capsule.steps.length,
          firstTitle: s.capsule.steps[0]?.title ?? '',
        }) === key,
    );
    if (!match) return;
    useStore.setState({ status: 'ready', errorMessage: undefined });
    this.resetInjection();
    this.pendingFollowUpCapture = false;
    this.pendingFollowUpAnchor = null;
  }
}

let controller: StemController | null = null;

export function initController(adapter: PlatformAdapter): StemController {
  controller = new StemController(adapter, 'file');
  return controller;
}

export function getController(): StemController | null {
  return controller;
}
