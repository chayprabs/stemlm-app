/**
 * Orchestration controller (content-script side).
 *
 * Wires the active platform adapter to the store: handles prompt injection,
 * watches the page for the assistant's completed capsule, parses it, and pushes
 * sessions into the store. Also powers "Load conversation" (rebuild from the
 * chatbot's own history) and the quote-reply follow-up flow.
 */
import type { PlatformAdapter } from '@/src/platforms/types';
import { buildInjectionPrompt, buildFollowupPrompt } from '@/src/protocol/builder';
import { parse, looksComplete } from '@/src/protocol/parser';
import type { Session, Subject } from '@/src/protocol/types';
import { useStore } from '@/src/state/store';
import { trackEvent } from '@/src/lib/analytics';

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

export class StemController {
  private adapter: PlatformAdapter;
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private stabilityTimer: ReturnType<typeof setTimeout> | null = null;
  private capturedRaw = new Set<string>();
  private lastQuestion = '';
  private watching = false;

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

  /** Inject the structured-answer prompt for whatever is currently typed. */
  inject(subjectOverride?: Subject | 'Auto'): boolean {
    const store = useStore.getState();
    if (store.buttonInjected) return false; // single injection until reset

    const question = this.adapter.getEditorText().trim();
    this.lastQuestion = question;

    const { prompt, subject } = buildInjectionPrompt(question, { subject: subjectOverride });
    const ok = this.adapter.insertPrompt(prompt);
    if (!ok) {
      store.setStatus('error', 'Could not find the chat input to add the stemLM prompt.');
      store.openPanel();
      return false;
    }

    store.setButtonInjected(true);
    store.setStatus('loading');
    this.armAnswerDetection();
    void trackEvent('question_asked', { platform: this.adapter.id, subject });

    this.startWatching();
    return true;
  }

  /** Inject a quote-reply that drills into selected text and re-arm capture. */
  followUp(selection: string, stepTitle: string | undefined, subject: Subject): boolean {
    const prompt = buildFollowupPrompt({ selection, stepTitle, subject });
    const ok = this.adapter.insertPrompt(prompt);
    if (!ok) return false;
    useStore.getState().setStatus('loading');
    this.armAnswerDetection();
    void trackEvent('followup_used', { platform: this.adapter.id });
    this.startWatching();
    return true;
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
        this.capturedRaw.add(key);
        useStore
          .getState()
          .setStatus('error', "stemLM couldn't read a structured answer from this response.");
      }
      return;
    }

    this.capturedRaw.add(key);
    this.captureFromText(candidate, this.lastQuestion);
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

  private captureFromText(text: string, question: string): void {
    const result = parse(text);
    if (result.status === 'empty' || !result.capsule) {
      useStore.getState().setStatus('error', "stemLM couldn't read a structured answer from this response.");
      return;
    }
    const session: Session = {
      id: makeId(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      platform: this.adapter.id,
      question: question || result.capsule.meta.topic,
      capsule: result.capsule,
      reviewedStepIds: [],
      raw: result.raw,
    };
    useStore.getState().addSession(session);
    void trackEvent('question_solved', {
      platform: this.adapter.id,
      subject: result.capsule.meta.subject,
      steps: result.capsule.steps.length,
    });
  }

  /**
   * Rebuild sessions from the chatbot's own visible history (no server). Used
   * when the panel was lost (tab closed) but the chat history remains.
   */
  loadConversation(): number {
    const store = useStore.getState();
    const capsules = this.adapter.extractCapsules();
    const sessions: Session[] = [];
    for (const text of capsules) {
      if (!looksComplete(text)) continue;
      const result = parse(text);
      if (result.status !== 'empty' && result.capsule) {
        this.capturedRaw.add(text);
        sessions.push({
          id: makeId(),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          platform: this.adapter.id,
          question: result.capsule.meta.topic,
          capsule: result.capsule,
          reviewedStepIds: [],
          raw: result.raw,
        });
      }
    }
    if (sessions.length) {
      store.setSessions(sessions);
      void trackEvent('conversation_loaded', { platform: this.adapter.id, count: sessions.length });
    }
    // Keep watching for any further answers.
    this.startWatching();
    return sessions.length;
  }

  /** Allow the user to inject again (e.g. after starting a new question). */
  resetInjection(): void {
    useStore.getState().setButtonInjected(false);
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
