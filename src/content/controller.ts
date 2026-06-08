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
  FOLLOWUP_QUESTION_SLOT,
  normalizeFollowupSelection,
  FOLLOWUP_CONTEXT_HEADER,
  PROTOCOL_FILENAME,
} from '@/src/protocol/builder';
import { attachTextFile } from '@/src/lib/file-inject';
import { parse, looksComplete, findCapsuleRaw } from '@/src/protocol/parser';
import type { Diagram, ParseResult, Session, Subject } from '@/src/protocol/types';
import type { FollowupIntent } from '@/src/protocol/builder';
import { useStore } from '@/src/state/store';
import { trackEvent } from '@/src/lib/analytics';
import { cleanSessionQuestion } from '@/src/lib/session-question';
import { auditCapsuleDiagrams } from '@/src/protocol/diagram-quality';
import { auditStepQuality } from '@/src/protocol/step-quality';

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

function makeId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function allDiagrams(...groups: Diagram[][]): Diagram[] {
  return groups.flat();
}

export class StemController {
  private adapter: PlatformAdapter;
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private stabilityTimer: ReturnType<typeof setTimeout> | null = null;
  private capturedRaw = new Set<string>();
  private static readonly CAPTURED_RAW_MAX = 100;
  private lastQuestion = '';
  /** True while waiting for a dig-deeper / ask follow-up answer (never replace the prior session). */
  private pendingFollowUpCapture = false;
  private watching = false;
  /** Cleared on each inject/follow-up so stale chat capsules do not block capture. */
  private captureEpoch = 0;

  // Answer-started detection (used to open the panel only once the assistant
  // actually begins responding, rather than the moment we inject).
  private answerStarted = false;
  private baselineBlocks = 0;
  private onAnswerStartedCb: (() => void) | null = null;

  // Stability tracking for the no-`@end` fallback.
  private stableText = '';
  private stableSince = 0;

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
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
    if (text.includes('stemLM instructions')) return false;
    if (text.length > 0) return true;
    return this.adapter.composerHasAttachments();
  }

  /** Paste the full protocol prompt into the chat composer. */
  async inject(): Promise<boolean> {
    const store = useStore.getState();
    if (store.buttonInjected) return false;

    const existing = this.adapter.getEditorText().trim();
    const hasUserContent = this.composerHasUserContent();
    const hasImageAttachment = this.adapter.composerHasAttachments();
    const question = existing;
    this.lastQuestion = question;

    const variant = store.settings.promptVariant;
    const buildOpt = { variant, hasImageAttachment };
    let subject: Subject;
    let ok: boolean;
    let injectionMethod: 'text' | 'file' = 'text';

    if (hasUserContent) {
      const built = buildInjectionAppendix(question, buildOpt);
      subject = built.subject;
      ok = await this.insertVerifiedPrompt(built.prompt, 'append');
    } else {
      const payload = buildInjectionPayload(question, buildOpt);
      subject = payload.subject;
      const attached = await attachTextFile(payload.fileContent, { filename: PROTOCOL_FILENAME });
      if (attached.ok) {
        ok = await this.insertVerifiedPrompt(payload.composerText, 'replace', { fileAttach: true });
        if (ok) injectionMethod = 'file';
      } else {
        ok = false;
      }
      if (!ok) {
        const built = buildInjectionPrompt(question, buildOpt);
        subject = built.subject;
        ok = await this.insertVerifiedPrompt(built.prompt, 'replace');
        injectionMethod = 'text';
      }
    }

    if (!ok) {
      store.setStatus(
        'error',
        'Could not paste the stemLM protocol into the chat box. Click in the input and try stemLM again.',
      );
      store.openPanel();
      return false;
    }

    store.setButtonInjected(true);
    store.setStatus('loading');
    this.beginCaptureEpoch();
    this.armAnswerDetection();
    void trackEvent('question_asked', {
      platform: this.adapter.id,
      subject,
      prompt_variant: variant,
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
    opt?: { intent?: FollowupIntent },
  ): Promise<boolean> {
    const normalized = normalizeFollowupSelection(selection);
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

    const variant = store.settings.promptVariant;
    const followOpt = {
      selection: normalized,
      stepTitle,
      subject,
      variant,
      intent: opt?.intent,
    };
    const payload = buildFollowupPayload(followOpt);
    const attached = await attachTextFile(payload.fileContent, { filename: PROTOCOL_FILENAME });
    let ok: boolean;
    if (attached.ok) {
      // Brief pause so Gemini's uploader finishes before we replace composer text.
      await new Promise((r) => setTimeout(r, 150));
      ok = await this.insertVerifiedPrompt(`${FOLLOWUP_QUESTION_SLOT}${payload.composerText}`, 'replace', {
        fileAttach: true,
        followUp: true,
      });
    } else {
      ok = await this.insertVerifiedPrompt(buildFollowupAskInChatPrompt(followOpt), 'replace', {
        followUp: true,
      });
    }

    if (!ok) {
      useStore
        .getState()
        .setStatus(
          'error',
          'Could not insert the follow-up into Gemini. Click in the chat box and try again.',
        );
      return false;
    }

    this.adapter.focusComposerQuestionSlot();
    this.lastQuestion = normalized;
    this.pendingFollowUpCapture = true;
    useStore.getState().setButtonInjected(true);
    useStore.getState().setStatus('loading');
    this.beginCaptureEpoch();
    this.armAnswerDetection();
    void trackEvent('followup_used', { platform: this.adapter.id });
    this.startWatching();
    return true;
  }

  /**
   * Write `prompt` into the composer and confirm the full protocol is visible
   * (not the old short file-attach stub). Retries once after a brief pause.
   */
  private async insertVerifiedPrompt(
    prompt: string,
    mode: 'replace' | 'append' = 'replace',
    opt?: { fileAttach?: boolean; followUp?: boolean },
  ): Promise<boolean> {
    const looksComplete = (text: string) => this.promptLooksComplete(text, opt);

    const tryOnce = () => {
      if (!this.adapter.insertPrompt(prompt, mode)) return false;
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
    opt?: { fileAttach?: boolean; followUp?: boolean },
  ): boolean {
    if (opt?.followUp) {
      const hasContext =
        text.includes(FOLLOWUP_CONTEXT_HEADER) || text.includes('stemLM follow-up context');
      if (!hasContext) return false;
      if (opt.fileAttach) {
        return (
          text.includes(PROTOCOL_FILENAME) ||
          text.includes('Follow the attached') ||
          this.adapter.composerHasAttachments()
        );
      }
      return (
        text.includes('stemLM instructions') &&
        text.includes('OUTPUT:') &&
        !text.includes(PROTOCOL_FILENAME)
      );
    }
    if (opt?.fileAttach) {
      return text.includes(PROTOCOL_FILENAME) || text.includes('Follow the attached');
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
    this.observer.observe(this.watchRoot(), {
      childList: true,
      subtree: true,
      characterData: true,
    });
    // Also check immediately in case the answer is already present.
    this.scheduleCheck();
  }

  stopWatching(): void {
    this.watching = false;
    this.observer?.disconnect();
    this.observer = null;
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
    this.maybeAnswerStarted();

    const capsules = this.adapter.extractCapsules();
    const latest = capsules[capsules.length - 1];

    if (latest && looksComplete(latest)) {
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
    this.stabilityTimer = setTimeout(() => this.evaluateStable(), STABILITY_MS);
  }

  /** The best partial-capsule text on the page, if any (code block or message text). */
  private partialCandidate(latest: string | undefined): string | null {
    if (latest && latest.includes('@meta')) return latest;
    const text = this.adapter.getLatestAssistantText();
    return text && text.includes('@meta') ? text : null;
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
    this.tryCapture(candidate, false);
  }

  /**
   * Attempt to parse + store a capsule candidate. `complete` indicates the
   * candidate had a terminating `@end`; for incomplete candidates we only
   * surface a parse error if there is genuinely nothing usable.
   */
  private tryCapture(candidate: string, complete: boolean): void {
    if (!this.watching) return;
    const key = candidate.trim();
    if (this.capturedRaw.has(key)) {
      this.resolveLoadingIfAlreadyCaptured(key);
      return;
    }

    const result = parse(candidate);
    const usable = result.status !== 'empty' && result.capsule && result.capsule.steps.length > 0;
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
    const code = result.errorCode ?? result.warningCodes[0] ?? 'no_usable_content';
    useStore
      .getState()
      .setStatus('error', `stemLM couldn't read a structured answer from this response. Parser code: ${code}.`);
    this.resetInjection();
    void trackEvent('extension_error', {
      platform: this.adapter.id,
      source: 'parse',
      parse_status: result.status,
      parse_error_code: code,
      warnings_count: result.warningCodes.length,
      repair_used: false,
      prompt_variant: useStore.getState().settings.promptVariant,
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
    const started =
      blocks > this.baselineBlocks || this.adapter.isStreaming() || text.includes('@meta');
    if (started) {
      this.answerStarted = true;
      try {
        this.onAnswerStartedCb?.();
      } catch {
        /* ignore */
      }
    }
  }

  private captureFromText(text: string, question: string, parsed?: ParseResult): void {
    const result = parsed ?? parse(text);
    if (result.status === 'empty' || !result.capsule) {
      this.offerRepairPrompt(result);
      return;
    }
    const diagrams = allDiagrams(result.capsule.steps.flatMap((s) => (s.diagram ? [s.diagram] : [])), result.capsule.solutionDiagrams);
    const stepQualityIssues = result.capsule.steps.flatMap((s) => auditStepQuality(s));
    const diagramIssues = auditCapsuleDiagrams(result.capsule);
    const store = useStore.getState();
    const topic = result.capsule.meta.topic;
    const cleanedQuestion =
      cleanSessionQuestion(question) ||
      result.capsule.meta.question?.trim() ||
      topic;
    const last = store.sessions[store.sessions.length - 1];
    const shouldReplace =
      !this.pendingFollowUpCapture &&
      last &&
      store.activeSessionId === last.id &&
      last.platform === this.adapter.id &&
      cleanSessionQuestion(last.question) === cleanedQuestion;

    const newStepIds = new Set(result.capsule.steps.map((s) => s.id));
    const session: Session = {
      id: shouldReplace ? last.id : makeId(),
      createdAt: shouldReplace ? last.createdAt : Date.now(),
      updatedAt: Date.now(),
      platform: this.adapter.id,
      question: cleanedQuestion,
      capsule: result.capsule,
      reviewedStepIds: shouldReplace
        ? last.reviewedStepIds.filter((id) => newStepIds.has(id))
        : [],
      raw: result.raw,
    };

    if (shouldReplace) {
      useStore.setState((s) => {
        const maxStep = Math.max(0, session.capsule.steps.length - 1);
        return {
          sessions: s.sessions.map((sess) => (sess.id === last.id ? session : sess)),
          activeStepIndex: Math.min(s.activeStepIndex, maxStep),
          status: 'ready',
          errorMessage: undefined,
        };
      });
    } else {
      store.addSession(session);
    }
    this.pendingFollowUpCapture = false;
    this.resetInjection();
    void trackEvent('question_solved', {
      platform: this.adapter.id,
      subject: result.capsule.meta.subject,
      steps: result.capsule.steps.length,
      prompt_variant: useStore.getState().settings.promptVariant,
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
      store.setStatus(
        'error',
        'No stemLM answers found in this chat. Solve a question with stemLM first.',
      );
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

    for (const candidate of capsules) {
      const text = findCapsuleRaw(candidate) ?? candidate;
      const key = text.trim();
      if (!key.includes('@meta') || seen.has(key)) continue;

      const result = parse(candidate);
      const usable =
        result.status !== 'empty' && result.capsule && result.capsule.steps.length > 0;
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
        reviewedStepIds: prev?.reviewedStepIds ?? [],
        raw: result.raw,
      });
    }

    if (sessions.length) {
      store.setSessions(sessions);
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

  /** Allow the user to inject again (e.g. after starting a new question). */
  resetInjection(): void {
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
  }
}

let controller: StemController | null = null;

export function initController(adapter: PlatformAdapter): StemController {
  controller = new StemController(adapter);
  return controller;
}

export function getController(): StemController | null {
  return controller;
}
