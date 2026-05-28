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

const DEBOUNCE_MS = 400;

function makeId(): string {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export class StemController {
  private adapter: PlatformAdapter;
  private observer: MutationObserver | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private capturedRaw = new Set<string>();
  private lastQuestion = '';
  private watching = false;

  constructor(adapter: PlatformAdapter) {
    this.adapter = adapter;
  }

  get platformId() {
    return this.adapter.id;
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
    if (store.settings.autoOpenOnInject) store.openPanel();
    void trackEvent('question_asked', { platform: this.adapter.id, subject });
    void trackEvent('panel_opened', { platform: this.adapter.id });

    this.startWatching();
    return true;
  }

  /** Inject a quote-reply that drills into selected text and re-arm capture. */
  followUp(selection: string, stepTitle: string | undefined, subject: Subject): boolean {
    const prompt = buildFollowupPrompt({ selection, stepTitle, subject });
    const ok = this.adapter.insertPrompt(prompt);
    if (!ok) return false;
    useStore.getState().setStatus('loading');
    void trackEvent('followup_used', { platform: this.adapter.id });
    this.startWatching();
    return true;
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
  }

  private scheduleCheck(): void {
    if (this.debounceTimer) clearTimeout(this.debounceTimer);
    this.debounceTimer = setTimeout(() => this.checkForCapsule(), DEBOUNCE_MS);
  }

  private checkForCapsule(): void {
    if (this.adapter.isStreaming()) {
      // Still generating; wait for the next mutation.
      return;
    }
    const capsules = this.adapter.extractCapsules();
    const latest = capsules[capsules.length - 1];
    if (!latest) return;
    if (this.capturedRaw.has(latest)) return;
    if (!looksComplete(latest)) return;

    this.capturedRaw.add(latest);
    this.captureFromText(latest, this.lastQuestion);
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
