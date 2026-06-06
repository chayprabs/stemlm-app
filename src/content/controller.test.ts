import { describe, it, expect, beforeEach } from 'vitest';
import { StemController } from './controller';
import { useStore } from '@/src/state/store';
import type { PlatformAdapter } from '@/src/platforms/types';
import type { InjectionPayload } from '@/src/protocol/builder';
import { FENCED_ELECTRICAL } from '@/src/protocol/__fixtures__';

const CAPSULE_BODY = FENCED_ELECTRICAL.replace(/```stemlm\n/, '').replace(/\n```$/, '');

class MockAdapter implements PlatformAdapter {
  id = 'gemini' as const;
  label = 'Gemini';
  brand = { accent: '#4285f4' };
  layoutRoots = ['main'];
  editorText = '';
  inserted = '';
  lastPayload: InjectionPayload | null = null;
  capsules: string[] = [];
  streaming = false;
  fileInjectOk = true;

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
  async injectWithProtocolFile(payload: InjectionPayload) {
    this.lastPayload = payload;
    if (!this.fileInjectOk) return { ok: false, method: 'file' as const };
    this.inserted = payload.composerText;
    return { ok: this.insertPrompt(payload.composerText), method: 'file' as const };
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

  it('attaches protocol file and injects short composer stub only', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'Solve this circuit with a 12V source and resistor (Kirchhoff)';
    const c = new StemController(adapter);

    const ok = await c.inject('Auto');
    expect(ok).toBe(true);
    expect(adapter.inserted).toContain('Solve this circuit');
    expect(adapter.inserted).toContain('stemlm-protocol.txt');
    expect(adapter.inserted).not.toContain('OUTPUT:');
    expect(adapter.lastPayload?.fileContent).toContain('OUTPUT:');
    expect(adapter.lastPayload?.fileContent).toContain('ELECTRICAL:');
    expect(useStore.getState().buttonInjected).toBe(true);
    expect(useStore.getState().status).toBe('loading');
    c.stopWatching();
  });

  it('does not inject twice (single injection)', async () => {
    const adapter = new MockAdapter();
    adapter.editorText = 'something';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(true);
    expect(await c.inject()).toBe(false);
    c.stopWatching();
  });

  it('surfaces error when file attach fails', async () => {
    const adapter = new MockAdapter();
    adapter.fileInjectOk = false;
    adapter.editorText = 'question';
    const c = new StemController(adapter);
    expect(await c.inject()).toBe(false);
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
});
