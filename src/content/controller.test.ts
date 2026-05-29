import { describe, it, expect, beforeEach, vi } from 'vitest';
import { StemController } from './controller';
import { useStore } from '@/src/state/store';
import type { PlatformAdapter } from '@/src/platforms/types';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';

const CAPSULE_BODY = FENCED_ELECTRICAL.replace(/```stemlm\n/, '').replace(/\n```$/, '');

class MockAdapter implements PlatformAdapter {
  id = 'chatgpt' as const;
  label = 'ChatGPT';
  brand = { accent: '#10a37f', neutral: true };
  layoutRoots = ['main'];
  editorText = '';
  inserted = '';
  capsules: string[] = [];
  streaming = false;

  matches() {
    return true;
  }
  findEditor() {
    return document.body;
  }
  getEditorText() {
    return this.editorText;
  }
  insertPrompt(text: string) {
    this.inserted = text;
    return true;
  }
  getComposerAnchor() {
    return document.body;
  }
  getAssistantBlocks() {
    return [];
  }
  getLatestAssistantText() {
    return this.capsules[this.capsules.length - 1] ?? '';
  }
  extractCapsules() {
    return this.capsules;
  }
  isStreaming() {
    return this.streaming;
  }
}

function resetStore() {
  useStore.setState({
    panelOpen: false,
    status: 'idle',
    view: 'steps',
    buttonInjected: false,
    sessions: [],
    activeSessionId: undefined,
    activeStepIndex: 0,
  });
}

describe('StemController.inject', () => {
  beforeEach(resetStore);

  it('builds + injects a prompt and enters loading', () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const c = new StemController(adapter);

    const ok = c.inject('Auto');
    expect(ok).toBe(true);
    expect(adapter.inserted).toContain('Solve this circuit');
    expect(adapter.inserted).toContain('OUTPUT CONTRACT');
    expect(adapter.inserted).toContain('ELECTRICAL / CIRCUITS PLAYBOOK');
    expect(useStore.getState().buttonInjected).toBe(true);
    expect(useStore.getState().status).toBe('loading');
    c.stopWatching();
  });

  it('does not inject twice (single injection)', () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'something';
    const c = new StemController(adapter);
    expect(c.inject()).toBe(true);
    expect(c.inject()).toBe(false);
    c.stopWatching();
  });
});

describe('StemController capture loop', () => {
  beforeEach(resetStore);

  it('captures a completed capsule after the debounce', () => {
    vi.useFakeTimers();
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [CAPSULE_BODY];

    c.startWatching();
    vi.advanceTimersByTime(500);

    const state = useStore.getState();
    expect(state.sessions).toHaveLength(1);
    expect(state.status).toBe('ready');
    expect(state.sessions[0]!.capsule.meta.subject).toBe('Electrical');
    c.stopWatching();
    vi.useRealTimers();
  });

  it('captures a complete capsule even if a stop/streaming indicator lingers', () => {
    // A terminating @end means the answer is finished regardless of whether a
    // "stop" button is still in the DOM — this is the fix for stuck-loading.
    vi.useFakeTimers();
    const adapter = new MockAdapter();
    adapter.streaming = true;
    adapter.capsules = [CAPSULE_BODY];
    const c = new StemController(adapter);

    c.startWatching();
    vi.advanceTimersByTime(500);

    expect(useStore.getState().sessions).toHaveLength(1);
    expect(useStore.getState().status).toBe('ready');
    c.stopWatching();
    vi.useRealTimers();
  });

  it('does not capture a partial capsule until it has been stable', () => {
    vi.useFakeTimers();
    const adapter = new MockAdapter();
    // Partial capsule: has @meta + a step but no terminating @end.
    const partial = '@meta\nsubject: Physics\ntopic: Motion\n@endmeta\n@step\ntitle: Setup\n@body\nstart\n@endbody\n@endstep';
    adapter.streaming = true;
    adapter.capsules = [partial];
    const c = new StemController(adapter);

    c.startWatching();
    // After the debounce but before the stability window: no capture yet.
    vi.advanceTimersByTime(500);
    expect(useStore.getState().sessions).toHaveLength(0);

    // Once the text has been completely stable past the stability window it is
    // captured tolerantly — without ever needing the streaming flag to clear.
    vi.advanceTimersByTime(1600);
    expect(useStore.getState().sessions).toHaveLength(1);
    expect(useStore.getState().sessions[0]!.capsule.meta.subject).toBe('Physics');
    c.stopWatching();
    vi.useRealTimers();
  });

  it('fires the answer-started callback when an assistant capsule appears', () => {
    vi.useFakeTimers();
    const adapter = new MockAdapter();
    adapter.capsules = [CAPSULE_BODY];
    const c = new StemController(adapter);
    let started = 0;
    c.setOnAnswerStarted(() => (started += 1));

    c.startWatching();
    vi.advanceTimersByTime(500);
    expect(started).toBe(1);
    c.stopWatching();
    vi.useRealTimers();
  });
});

describe('StemController.loadConversation', () => {
  beforeEach(resetStore);

  it('rebuilds sessions from history capsules', () => {
    const adapter = new MockAdapter();
    adapter.capsules = [CAPSULE_BODY, CAPSULE_BODY];
    const c = new StemController(adapter);
    const n = c.loadConversation();
    expect(n).toBe(2);
    expect(useStore.getState().sessions).toHaveLength(2);
    c.stopWatching();
  });
});
