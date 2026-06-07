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
  buildInjectionPrompt,
  buildFollowupAskInChatPrompt,
  buildRepairPrompt,
  normalizeFollowupSelection,
} from '@/src/protocol/builder';
import { parse, looksComplete, findCapsuleRaw } from '@/src/protocol/parser';
import type { Diagram, ParseResult, Session, Subject } from '@/src/protocol/types';
import type { FollowupIntent } from '@/src/protocol/builder';
import { useStore } from '@/src/state/store';
import { trackEvent } from '@/src/lib/analytics';
import { cleanSessionQuestion } from '@/src/lib/session-question';
import { auditStepQuality } from '@/src/protocol/step-quality';

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
  private watching = false;
  private repairPromptInserted = false;

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
    const question = existing;
    this.lastQuestion = question;

    const variant = store.settings.promptVariant;
    const { prompt, subject } = hasUserContent
      ? buildInjectionAppendix(question, { variant })
      : buildInjectionPrompt(question, { variant });
    const ok = await this.insertVerifiedPrompt(prompt, hasUserContent ? 'append' : 'replace');

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
    this.armAnswerDetection();
    void trackEvent('question_asked', {
      platform: this.adapter.id,
      subject,
      prompt_variant: variant,
      injection_method: 'text',
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

    const variant = useStore.getState().settings.promptVariant;
    const prompt = buildFollowupAskInChatPrompt({
      selection: normalized,
      stepTitle,
      subject,
      variant,
      intent: opt?.intent,
    });
    const ok = await this.insertVerifiedPrompt(prompt);

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
    useStore.getState().setButtonInjected(true);
    useStore.getState().setStatus('loading');
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
  ): Promise<boolean> {
    const marker = 'stemLM instructions';
    const looksComplete = (text: string) =>
      text.includes(marker) && text.includes('OUTPUT:') && !text.includes('stemlm-protocol.txt');

    const tryOnce = () => {
      if (!this.adapter.insertPrompt(prompt, mode)) return false;
      return looksComplete(this.adapter.getEditorText());
    };

    if (tryOnce()) return true;
    await new Promise((r) => setTimeout(r, 120));
    return tryOnce();
  }

  /** Reset answer-started detection and snapshot the current message count. */
  private armAnswerDetection(): void {
    this.answerStarted = false;
    this.stableText = '';
    this.stableSince = 0;
    this.repairPromptInserted = false;
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
    this.observer.observe(document.body, {
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
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    if (this.stabilityTimer) clearTimeout(this.stabilityTimer);
    this.stableText = '';
    this.stableSince = 0;
    this.repairPromptInserted = false;
  }

  private scheduleCheck(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.checkForCapsule(), DEBOUNCE_MS);
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
    const key = candidate.trim();
    if (this.capturedRaw.has(key)) return;

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

  /** When steps still lack worked @body after parse enrichment, queue a repair prompt. */
  private offerQualityRepair(result: ParseResult): void {
    if (this.repairPromptInserted || !result.capsule) return;
    const weakSteps = result.capsule.steps.filter((s) => auditStepQuality(s).length > 0);
    if (!weakSteps.length) return;
    const code = auditStepQuality(weakSteps[0]!)[0];
    if (!code) return;
    const inserted = this.adapter.insertPrompt(buildRepairPrompt({ errorCode: code }), 'append');
    this.repairPromptInserted = inserted || this.repairPromptInserted;
    if (inserted && weakSteps.length >= result.capsule.steps.length / 2) {
      useStore
        .getState()
        .setStatus(
          'error',
          `${weakSteps.length} steps are missing worked math. A repair prompt was added to the chat — send it for a complete answer.`,
        );
    }
  }

  private offerRepairPrompt(result: ParseResult): void {
    const code = result.errorCode ?? result.warningCodes[0] ?? 'no_usable_content';
    const inserted =
      !this.repairPromptInserted &&
      this.adapter.insertPrompt(buildRepairPrompt({ errorCode: code }), 'append');
    this.repairPromptInserted = inserted || this.repairPromptInserted;
    const suffix = inserted ? ' A repair prompt has been added to the chatbox; send it to retry.' : '';
    useStore
      .getState()
      .setStatus('error', `stemLM couldn't read a structured answer from this response.${suffix}`);
    this.resetInjection();
    void trackEvent('extension_error', {
      platform: this.adapter.id,
      source: 'parse',
      parse_status: result.status,
      parse_error_code: code,
      warnings_count: result.warningCodes.length,
      repair_used: inserted,
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
    const store = useStore.getState();
    const topic = result.capsule.meta.topic;
    const cleanedQuestion = cleanSessionQuestion(question) || topic;
    const last = store.sessions[store.sessions.length - 1];
    const shouldReplace =
      last &&
      store.activeSessionId === last.id &&
      last.platform === this.adapter.id &&
      (cleanSessionQuestion(last.question) === cleanedQuestion || last.capsule.meta.topic === topic);

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
      useStore.setState((s) => ({
        sessions: s.sessions.map((sess) => (sess.id === last.id ? session : sess)),
        status: 'ready',
      }));
    } else {
      store.addSession(session);
    }
    this.offerQualityRepair(result);
    this.resetInjection();
    void trackEvent('question_solved', {
      platform: this.adapter.id,
      subject: result.capsule.meta.subject,
      steps: result.capsule.steps.length,
      prompt_variant: useStore.getState().settings.promptVariant,
      parse_status: result.status,
      warnings_count: result.warningCodes.length,
      step_work_ok: result.capsule.steps.every((s) => auditStepQuality(s).length === 0) ? 1 : 0,
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
    store.setStatus(
      'error',
      'No stemLM answers found in this chat. Solve a question with stemLM first.',
    );
    this.startWatching();
    return 0;
  }

  /** Single pass over the visible chat history. */
  private loadConversationOnce(): number {
    const store = useStore.getState();
    const capsules = this.adapter.extractCapsules();
    const sessions: Session[] = [];
    const seen = new Set<string>();

    for (const candidate of capsules) {
      const text = findCapsuleRaw(candidate) ?? candidate;
      const key = text.trim();
      if (!key.includes('@meta') || seen.has(key)) continue;

      const result = parse(candidate);
      const usable =
        result.status !== 'empty' && result.capsule && result.capsule.steps.length > 0;
      if (!usable) continue;

      seen.add(key);
      this.rememberCaptured(key);
      sessions.push({
        id: makeId(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        platform: this.adapter.id,
        question: result.capsule!.meta.topic,
        capsule: result.capsule!,
        reviewedStepIds: [],
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
}

let controller: StemController | null = null;

export function initController(adapter: PlatformAdapter): StemController {
  controller = new StemController(adapter);
  return controller;
}

export function getController(): StemController | null {
  return controller;
}
