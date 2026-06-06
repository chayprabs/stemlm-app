import { describe, it, expect, beforeEach } from 'vitest';
import { StemController } from './controller';
import { useStore } from '@/src/state/store';
import type { PlatformAdapter } from '@/src/platforms/types';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';
import { TEN_STEP_ELECTRICAL } from '@/src/protocol/__fixtures-long-steps';

const CAPSULE_BODY = FENCED_ELECTRICAL.replace(/```stemlm\n/, '').replace(/\n```$/, '');
const TEN_STEP_BODY = TEN_STEP_ELECTRICAL.replace(/```stemlm\n/, '').replace(/\n```$/, '');

class MockAdapter implements PlatformAdapter {
  id = 'gemini' as const;
  label = 'Gemini';
  brand = { accent: '#4285f4' };
  layoutRoots = ['main'];
  editorText = '';
  inserted = '';
  insertOk = true;
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
    this.editorText = text;
    return this.insertOk;
  }
  getComposerBox() {
    return document.body;
  }
  getComposerActionRow() {
    return document.body;
  }
  getComposerLayout() {
    return { box: document.body, actionRow: document.body };
  }
  getComposerShell() {
    return document.body;
  }
  getComposerAnchor() {
    return document.body;
  }
  getComposerLeadingAnchor() {
    return null;
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

  it('pastes the full protocol prompt into the composer', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(adapter.inserted).toContain('Solve this circuit');
    expect(adapter.inserted).toContain('OUTPUT:');
    expect(adapter.inserted).toContain('ELECTRICAL');
    expect(adapter.inserted).toContain('stemLM instructions');
    expect(adapter.inserted).not.toContain('stemlm-protocol.txt');
    expect(useStore.getState().buttonInjected).toBe(true);
    expect(useStore.getState().status).toBe('loading');
    c.stopWatching();
  });

  it('auto-classifies the subject from the question text', async () => {
    const question = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const adapter = new MockAdapter();
    adapter.editorText = question;
    const c = new StemController(adapter);

    const ok = await c.inject();
    expect(ok).toBe(true);
    expect(adapter.inserted).toContain('ELECTRICAL');
    c.stopWatching();
  });

  it('does not inject twice while the protocol is still in the composer', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'something';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    expect(await c.inject()).toBe(false);
    c.stopWatching();
  });

  it('allows a second injection after capture resets the button', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Find the range of a projectile at 45 degrees';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    expect(useStore.getState().buttonInjected).toBe(true);

    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().buttonInjected).toBe(false);

    adapter.editorText = 'Another projectile question';
    expect(await c.inject()).toBe(true);
    c.stopWatching();
  });

  it('surfaces error when composer insert fails', async () => {
    const adapter = new MockAdapter();
    adapter.insertOk = false;
    adapter.editorText = 'question';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(false);
    expect(useStore.getState().status).toBe('error');
    c.stopWatching();
  });
});

describe('StemController.loadConversation', () => {
  beforeEach(resetStore);

  it('loads sessions from visible chat capsules', async () => {
    const adapter = new MockAdapter();
    adapter.capsules = [CAPSULE_BODY];
    const c = new StemController(adapter);

    const count = await c.loadConversation({ maxWaitMs: 0 });
    expect(count).toBe(1);
    expect(useStore.getState().sessions).toHaveLength(1);
    expect(useStore.getState().status).toBe('ready');
    c.stopWatching();
  });

  it('polls until capsules appear in the chat', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);

    setTimeout(() => {
      adapter.capsules = [CAPSULE_BODY];
    }, 400);

    const count = await c.loadConversation({ maxWaitMs: 1200 });
    expect(count).toBe(1);
    expect(useStore.getState().sessions).toHaveLength(1);
    c.stopWatching();
  });

  it('surfaces an error when no stemLM answers are on the page', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);

    const count = await c.loadConversation({ maxWaitMs: 0 });
    expect(count).toBe(0);
    expect(useStore.getState().sessions).toHaveLength(0);
    expect(useStore.getState().status).toBe('error');
    c.stopWatching();
  });
});

describe('StemController capture', () => {
  beforeEach(resetStore);

  it('captures a complete capsule into the store', async () => {
    const adapter = new MockAdapter();
    const c = new StemController(adapter);
    adapter.capsules = [CAPSULE_BODY];
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions.length).toBe(1);
    expect(useStore.getState().status).toBe('ready');
    expect(useStore.getState().buttonInjected).toBe(false);
    c.stopWatching();
  });

  it('captures a complete capsule even when streaming indicator is present', async () => {
    const adapter = new MockAdapter();
    adapter.streaming = true;
    adapter.capsules = [CAPSULE_BODY];
    const c = new StemController(adapter);
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    expect(useStore.getState().sessions.length).toBe(1);
    expect(useStore.getState().status).toBe('ready');
    c.stopWatching();
  });

  it('captures a ten-step capsule with all steps intact', async () => {
    const adapter = new MockAdapter();
    adapter.capsules = [TEN_STEP_BODY];
    const c = new StemController(adapter);
    c.startWatching();
    await new Promise((r) => setTimeout(r, 500));
    const session = useStore.getState().sessions[0];
    expect(session?.capsule.steps).toHaveLength(10);
    expect(session?.capsule.steps[9]?.index).toBe(10);
    expect(useStore.getState().activeStepIndex).toBe(0);
    expect(useStore.getState().status).toBe('ready');
    c.stopWatching();
  });
});
