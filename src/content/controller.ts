/**
 * Orchestration controller (content-script side).
 *
 * Wires the active platform adapter to the store: handles prompt injection,
 * watches the page for the assistant's completed capsule, parses it, and pushes
 * sessions into the store. Also powers "Load conversation" (rebuild from the
 * chatbot's own history) and the quote-reply follow-up flow.
 */
import type { PlatformAdapter } from '@/src/platforms/types';
import {
  buildInjectionAppendix,
  buildInjectionPayload,
  buildInjectionPrompt,
  buildFollowupAskInChatPrompt,
  buildFollowupPayload,
  buildComposerAppendix,
  buildComposerPointer,
  composerTextHasProtocol,
  pageThreadHasProtocol,
  shouldReinjectOnNewQuestion,
  isEmptyFollowupSelection,
  FOLLOWUP_QUESTION_SLOT,
  normalizeFollowupSelection,
  FOLLOWUP_CONTEXT_HEADER,
  PROTOCOL_FILENAME,
  THREAD_PROTOCOL_SELECTORS,
} from '@/src/protocol/builder';
import { buildStepEntries } from '@/src/lib/step-entries';
import { attachTextFile, hasConfirmedAttachment } from '@/src/lib/file-inject';
import { parse, looksComplete, findCapsuleRaw } from '@/src/protocol/parser';
import {
  applyStepPatch,
  closedPrefix,
  findResumeToken,
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
import { useStore } from '@/src/state/store';
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

/** Quiet period after the last DOM mutation before we inspect the page. */
const DEBOUNCE_MS = 350;
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

/** How often a watching controller checks that its observed root is still in the page (CAP-OBS-01). */
const ROOT_CHECK_MS = 2_000;

/** A guide chip must stay gone this long before it counts as removed (a send also moves it). */
const GUIDE_REMOVED_CONFIRM_MS = 1_000;

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
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
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

  // Answer-started detection (used to open the panel only once the assistant
  // actually begins responding, rather than the moment we inject).
  private answerStarted = false;
  /** True once an inject / follow-up armed detection; restored and shared tabs watch unarmed. */
  private answerArmed = false;
  private baselineBlocks = 0;
  private baselineAssistantText = '';
  private onAnswerStartedCb: (() => void) | null = null;

  // Stability tracking for the no-`@end` fallback.
  private stableText = '';
  private stableSince = 0;

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
   */
  private abandonAttach(operation: ComposerOperation): false {
    const store = useStore.getState();
    if (!operation.superseded() && store.settings.stemlmEnabled !== false) {
      store.setStatus('error', 'Your chat box changed while stemlm was attaching its guide, so it stopped. Check the chat box, then click the stemlm button again.');
      store.openPanel();
    }
    return false;
  }

  get platformId() {
    return this.adapter.id;
  }

  /** Register a callback fired once, when the assistant starts answering. */
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

  /** Attach stemlm-protocol.txt and a short stub — never dump the protocol as chat text. */
  async inject(): Promise<boolean> {
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

    const attached = await attachTextFile(payload.fileContent, {
      filename: PROTOCOL_FILENAME,
      fileInputSelectors: this.adapter.fileInput,
      inputIsAdditive: this.adapter.additiveFileInput === true,
      preserveExisting: hasImageAttachment,
      requireConfirmation: this.delivery === 'file',
      root: this.adapter.getComposerBox() ?? this.adapter.getComposerShell() ?? document,
    });
    if (!operation.isCurrent()) return this.abandonAttach(operation);

    if (!attached.ok && this.delivery === 'file') {
      store.setStatus('error', 'Could not attach the stemlm guide. If the chat asks you to sign in to upload files, sign in first; otherwise wait for uploads to finish. Then try the stemlm button again. Your question is unchanged.');
      store.openPanel();
      return false;
    }

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
        attachmentConfirmed: attached.ok,
        operation,
      });
      if (ok) injectionMethod = 'file';
      // File already on the composer — never dump the protocol wall as well.
    } else if (alreadyInThread || hasImageAttachment) {
      const pointerOptions = {
        hasImageAttachment,
        hasQuestion: question.length > 0,
      };
      const stub = hasImageAttachment
        ? buildComposerAppendix(pointerOptions)
        : buildComposerPointer(pointerOptions);
      ok = await this.insertVerifiedPrompt(stub, hasUserContent ? 'append' : 'replace', {
        fileAttach: true,
        operation,
      });
      injectionMethod = 'text';
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
      store.openPanel();
      return false;
    }

    this.preparedComposer = operation;
    this.lastQuestion = question;
    store.setButtonInjected(true);
    if (!hasUserContent && attached.ok) {
      this.adapter.focusComposerQuestionSlot();
      store.setStatus('idle', 'Instructions attached. Type your question above the stemlm line, then send when ready.');
    } else {
      store.setStatus('loading');
    }
    this.pendingFollowUpCapture = false;
    this.pendingFollowUpAnchor = null;
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
    if (store.status === 'loading') {
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
    };
    const payload = buildFollowupPayload(followOpt);
    const operation = this.beginComposerOperation();
    const attached = await attachTextFile(payload.fileContent, {
      filename: PROTOCOL_FILENAME,
      fileInputSelectors: this.adapter.fileInput,
      inputIsAdditive: this.adapter.additiveFileInput === true,
      requireConfirmation: this.delivery === 'file',
      root: this.adapter.getComposerBox() ?? this.adapter.getComposerShell() ?? document,
    });
    if (!operation.isCurrent()) return this.abandonAttach(operation);
    if (!attached.ok && this.delivery === 'file') {
      store.setStatus('error', 'Could not attach the stemlm guide. If the chat asks you to sign in to upload files, sign in first; otherwise wait for uploads to finish. Then try Ask in chat again. Your draft is unchanged.');
      return false;
    }
    let ok: boolean;
    if (attached.ok) {
      // Brief pause so Gemini's uploader finishes before we replace composer text.
      await new Promise((r) => setTimeout(r, 150));
      ok = await this.insertVerifiedPrompt(`${FOLLOWUP_QUESTION_SLOT}${payload.composerText}`, 'replace', {
        fileAttach: true,
        attachmentConfirmed: attached.ok,
        followUp: true,
        operation,
      });
    } else {
      ok = await this.insertVerifiedPrompt(buildFollowupAskInChatPrompt(followOpt), 'replace', {
        followUp: true,
        operation,
      });
    }

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
   * File-attach stubs are short; inline fallback still carries the full protocol.
   */
  private async insertVerifiedPrompt(
    prompt: string,
    mode: 'replace' | 'append' = 'replace',
    opt?: { fileAttach?: boolean; followUp?: boolean; attachmentConfirmed?: boolean; operation?: ComposerOperation },
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
    if (tryOnce()) return true;
    if (opt?.followUp && opt?.fileAttach) {
      await new Promise((r) => setTimeout(r, 250));
      return tryOnce();
    }
    return false;
  }

  private promptLooksComplete(
    text: string,
    opt?: { fileAttach?: boolean; followUp?: boolean; attachmentConfirmed?: boolean },
  ): boolean {
    if (opt?.followUp) {
      const hasContext =
        text.includes(FOLLOWUP_CONTEXT_HEADER) || text.includes('stemLM follow-up context');
      if (!hasContext) return false;
      if (opt.fileAttach) {
        return composerTextHasProtocol(text) || Boolean(opt.attachmentConfirmed);
      }
      return (
        text.includes('stemLM instructions') &&
        text.includes('OUTPUT:') &&
        !text.includes(PROTOCOL_FILENAME)
      );
    }
    if (opt?.fileAttach) {
      return composerTextHasProtocol(text);
    }
    return (
      text.includes('stemLM instructions') &&
      text.includes('OUTPUT:') &&
      !text.includes(PROTOCOL_FILENAME)
    );
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
    this.baselineAssistantText = this.adapter.getLatestAssistantText();
    this.stableText = '';
    this.stableSince = 0;
    try {
      this.baselineBlocks = this.adapter.getAssistantBlocks().length;
    } catch {
      this.baselineBlocks = 0;
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
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = null;
    }
    this.stableText = '';
    this.stableSince = 0;
  }

  private scheduleCheck(): void {
    if (!this.watching) return;
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.checkForCapsule(), DEBOUNCE_MS);
  }

  /** Fresh inject/follow-up — ignore capsules deduped from a prior request. */
  private beginCaptureEpoch(): void {
    this.captureEpoch += 1;
    this.capturedRaw.clear();
    this.pendingResume = null;
    this.cutOffId = null;
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
    this.maybeAnswerStarted();

    const capsules = this.adapter.extractCapsules();
    const latest = capsules[capsules.length - 1];

    // An unclosed metadata block ending in @end may still be streaming @endmeta.
    // Keep that prefix on the existing stability path, not the final-error path.
    if (latest && looksComplete(latest) &&
        (/^\s*@endmeta\b/m.test(latest) || hasUsableParsedContent(parse(latest)))) {
      this.tryCapture(latest, true);
      return;
    }

    const candidate = this.partialCandidate(latest);
    if (!candidate) return;

    const norm = candidate.trim();
    const now = Date.now();
    if (norm !== this.stableText) {
      this.stableText = norm;
      this.stableSince = now;
    }
    // Re-evaluate once mutations go quiet for STABILITY_MS.
    if (this.stabilityTimer) clearTimeout(this.stabilityTimer);
    const delay = candidate.includes('@meta') ? STABILITY_MS : NO_CAPSULE_STABILITY_MS;
    this.stabilityTimer = setTimeout(() => this.evaluateStable(), delay);
  }

  /** The best partial-capsule text on the page, if any (code block or message text). */
  private partialCandidate(latest: string | undefined): string | null {
    if (latest && latest.includes('@meta')) return latest;
    const text = this.adapter.getLatestAssistantText();
    if (text && text.includes('@meta')) return text;
    return useStore.getState().status === 'loading' && text.trim() && text !== this.baselineAssistantText
      ? text : null;
  }

  /** Fired STABILITY_MS after the last change to a partial capsule. */
  private evaluateStable(): void {
    if (!this.watching) return;
    const capsules = this.adapter.extractCapsules();
    const latest = capsules[capsules.length - 1];
    if (latest && looksComplete(latest)) {
      this.tryCapture(latest, true);
      return;
    }
    const candidate = this.partialCandidate(latest);
    if (!candidate) return;
    // Only act if the text is still the one we measured as stable.
    if (candidate.trim() !== this.stableText) return;
    // A paused stream is not an error: keep waiting, and keep any follow-up
    // anchor, so the finished answer still lands where the student asked.
    const quietFor = Date.now() - this.stableSince;
    const stall = this.adapter.isStreaming() ? STREAMING_STALL_MS : PARTIAL_STALL_MS;
    if (quietFor < stall) {
      this.stabilityTimer = setTimeout(() => this.evaluateStable(), Math.min(STABILITY_MS, stall - quietFor));
      return;
    }
    // A stable prefix is still a prefix: the chat stopped writing. Show the blocks that closed
    // (D38), else report it; either way the watcher stays alive, so a later @end or continuation
    // replaces it instead of duplicating it.
    if (!this.showCutOff(candidate)) this.offerRepairPrompt(parse(candidate));
  }

  /**
   * D38: a full answer the chat stopped writing shows its closed blocks as a cut-off session
   * (never saved; never replacing another answer). False when nothing usable closed.
   */
  private showCutOff(candidate: string): boolean {
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
    const shown = store.sessions.find((s) => s.id === this.cutOffId);
    if (shown?.raw === result.raw) return true;
    const session: Session = {
      id: shown?.id ?? makeId(),
      createdAt: shown?.createdAt ?? Date.now(),
      updatedAt: Date.now(),
      platform: this.adapter.id,
      question: cleanSessionQuestion(this.lastQuestion) || cap.meta.question?.trim() || cap.meta.topic,
      capsule: cap,
      raw: result.raw,
      cutOff: true,
    };
    this.commitSession(session, Boolean(shown));
    this.cutOffId = session.id;
    void rememberCurrentChat(this.adapter.id);
    this.resetInjection();
    useStore.getState().setStatus(
      'ready',
      'This answer is incomplete: the chat stopped before the end, so only its finished steps are shown. Ask the chat to continue it, or send your question again with the stemlm button.',
    );
    return true;
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
    this.stableText = '';
    this.stableSince = 0;
    this.captureFromText(candidate, this.lastQuestion, result);
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
    // No capsule at all is usually the chat's own error or usage-limit reply, not a garbled answer;
    // a missing @end on a stable reply means the chat stopped writing.
    const lead = code === 'no_capsule'
      ? 'This reply has no stemlm answer. If the chat showed an error or a usage limit, wait a moment, then send your question again with the stemlm button.'
      : code === 'missing_end'
        ? 'This answer is incomplete: the chat stopped before the end. Ask the chat to continue it, or send your question again with the stemlm button.'
        : "stemlm couldn't read this answer. Click the stemlm button and send your question again.";
    useStore.getState().setStatus('error', `${lead}\nParser code: ${code}.`);
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
    // An earlier stemLM answer already on the page is not this answer starting.
    const started = this.answerArmed
      ? blocks > this.baselineBlocks || this.adapter.isStreaming() ||
        (text !== this.baselineAssistantText && text.includes('@meta'))
      : this.adapter.isStreaming();
    // Watching without a question (restored / shared answers, Load conversation): what the page
    // already shows is history, so settle rather than wait for an answer nobody asked stemLM for.
    if (!started && !this.answerArmed) this.answerStarted = true;
    if (started) {
      this.answerStarted = true;
      // DISABLED-01: switched off mid-answer, stemLM must not pop its panel open.
      if (useStore.getState().settings.stemlmEnabled === false) return;
      try {
        this.onAnswerStartedCb?.();
      } catch {
        /* ignore */
      }
    }
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

  private captureFromText(text: string, question: string, parsed?: ParseResult): void {
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
    const nativeSameQid =
      active &&
      questionCapsules.length === 1 &&
      incoming.meta.mode !== 'new' &&
      incoming.meta.mode !== 'full' &&
      Boolean(active.capsule.meta.qid) &&
      Boolean(incoming.meta.qid) &&
      active.capsule.meta.qid === incoming.meta.qid &&
      (incoming.meta.mode === 'resolve' ||
        incoming.meta.mode === 'patch' ||
        incoming.meta.mode == null);

    const followUpSameQuestion =
      !cutOff &&
      (this.pendingFollowUpCapture || Boolean(nativeSameQid)) &&
      active &&
      questionCapsules.length === 1 &&
      (nativeSameQid || !followUpOpensNewSession(active, incoming));

    if (followUpSameQuestion) {
      const cap = keepActiveQid(active, questionCapsules[0]!);
      this.commitSession(
        {
          ...active,
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
      const cleanedQuestion =
        (i === 0 ? cleanSessionQuestion(question) : '') ||
        cap.meta.question?.trim() ||
        topic;
      const last = store.sessions[store.sessions.length - 1];
      const shouldReplace =
        i === 0 &&
        !this.pendingFollowUpCapture &&
        last &&
        store.activeSessionId === last.id &&
        last.platform === this.adapter.id &&
        cleanSessionQuestion(last.question) === cleanedQuestion &&
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
    this.cutOffId = null;
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
   * True when this chat already has stemLM answers that are not loaded into
   * the panel. Empty-state uses this to offer “Load conversation from this chat”.
   */
  hasConversationToLoad(): boolean {
    if (useStore.getState().sessions.length > 0) return false;
    const capsules = this.adapter.extractCapsules();
    for (const candidate of capsules) {
      const text = findCapsuleRaw(candidate) ?? candidate;
      if (text.includes('@meta')) return true;
    }
    return pageThreadHasProtocol(document, this.adapter.findEditor());
  }

  /**
   * Rebuild sessions from the chatbot's own visible history (no server). Used
   * when the panel was lost (tab closed) but the chat history remains.
   *
   * Polls briefly so Gemini has time to render history after a tab reload.
   */
  async loadConversation(opt?: { maxWaitMs?: number }): Promise<number> {
    const maxWaitMs = opt?.maxWaitMs ?? 2500;
    const deadline = Date.now() + maxWaitMs;

    while (true) {
      const count = this.loadConversationOnce();
      if (count > 0) return count;
      if (Date.now() >= deadline) break;
      await new Promise((r) => setTimeout(r, 300));
    }

    const store = useStore.getState();
    if (store.sessions.length === 0) {
      const candidates = groupResumeParts(this.adapter.extractCapsules());
      const rejected = candidates.reverse().find((candidate) => candidate.includes('@meta'));
      if (rejected) {
        this.offerRepairPrompt(parse(rejected));
      } else {
        store.setStatus(
          'error',
          'No stemlm answers found in this chat. Solve a question with stemlm first.',
        );
      }
    }
    this.startWatching();
    return 0;
  }

  /** Single pass over the visible chat history. */
  private loadConversationOnce(): number {
    const store = useStore.getState();
    const capsules = this.adapter.extractCapsules();
    const sessions: Session[] = [];
    const seen = new Set<string>();
    const existingByRaw = new Map<string, Session>();
    for (const s of store.sessions) {
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

    if (sessions.length) {
      // LOAD-01: merge, never replace. Sessions the page does not show (restored, other
      // chats) stay; reloaded ones keep their place and follow-ups.
      const byId = new Map(sessions.map((s) => [s.id, s]));
      const merged = store.sessions.map((s) => byId.get(s.id) ?? s);
      merged.push(...sessions.filter((s) => !store.sessions.some((e) => e.id === s.id)));
      store.setSessions(merged);
      store.setActiveSession(sessions[sessions.length - 1]!.id);
      store.setStatus('ready');
      void trackEvent('conversation_loaded', { platform: this.adapter.id, count: sessions.length });
    }

    this.startWatching();
    return sessions.length;
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
      composerTextHasProtocol(this.adapter.getEditorText()) &&
      !hasConfirmedAttachment(PROTOCOL_FILENAME, this.adapter.getComposerBox() ?? this.adapter.getComposerShell() ?? document);
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
