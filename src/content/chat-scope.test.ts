/**
 * Questions belong to the chat they were asked in. Each stored answer carries the chat's path, the
 * panel shows the questions of the chat on screen, and a question asked in a new chat follows it to
 * the path the site gives that chat once it is sent. Answers stored before questions had a chat
 * belong to every chat.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/src/lib/file-inject', () => ({
  attachTextFile: vi.fn(async () => ({ ok: true, method: 'input' as const })),
}));

import { StemController } from './controller';
import { claudeAdapter } from '@/src/platforms/claude';
import type { PlatformAdapter } from '@/src/platforms/types';
import type { Session } from '@/src/protocol/types';
import { chatSessions, useStore } from '@/src/state/store';

class PageAdapter implements PlatformAdapter {
  id = 'claude' as const;
  label = 'Claude';
  brand = { accent: '#000000' };
  layoutRoots = ['main'];
  editorText = '';
  matches() { return true; }
  findEditor(): HTMLElement | null { return document.getElementById('composer'); }
  getEditorText() { return this.editorText; }
  insertPrompt(text: string, mode: 'replace' | 'append' = 'replace') {
    this.editorText = mode === 'append' && this.editorText.trim() ? `${this.editorText.trimEnd()}\n\n${text}` : text;
    return true;
  }
  composerHasAttachments() { return false; }
  focusComposerQuestionSlot() {}
  getComposerBox() { return this.findEditor(); }
  getComposerActionRow() { return this.findEditor(); }
  getComposerLayout() { return null; }
  getComposerAnchor() { return this.findEditor(); }
  getComposerLeadingAnchor() { return null; }
  getComposerShell() { return this.findEditor(); }
  getAssistantBlocks() { return claudeAdapter.getAssistantBlocks(); }
  getLatestAssistantText() { return claudeAdapter.getLatestAssistantText(); }
  extractCapsules() { return claudeAdapter.extractCapsules(); }
  getCapsuleSources() { return claudeAdapter.getCapsuleSources!(); }
  isStreaming() { return false; }
  getUserQuestionBefore(block: Element) { return claudeAdapter.getUserQuestionBefore!(block); }
}

function capsule(topic: string): string {
  return [
    '@meta', 'version: 2', 'subject: Physics', `topic: ${topic}`, '@endmeta',
    '@step id=s1', 'title: Start', '@body', `Start from what ${topic} gives.`, '@endbody', '@endstep',
    '@solution', `The result for ${topic}.`, '@endsolution', '@end',
  ].join('\n');
}

function session(id: string, chat?: string): Session {
  return {
    id, question: id, platform: 'claude', raw: '', createdAt: 1, updatedAt: 1, ...(chat ? { chat } : {}),
    capsule: { meta: { version: 2, subject: 'Physics', topic: id }, steps: [], solution: '', solutionDiagrams: [] },
  };
}

const thread = () => document.getElementById('thread')!;
const state = () => useStore.getState();
const visible = () => chatSessions(state()).map((s) => s.id);

function go(path: string, c?: StemController): void {
  history.pushState({}, '', path);
  if (c) c.onChatRoute();
  else state().setChat(path);
}

describe('the panel shows the questions of the chat on screen', () => {
  beforeEach(() => {
    useStore.setState({ sessions: [], activeSessionId: undefined, activeStepIndex: 0, stepBySession: {}, chat: '/chat/a' });
  });

  it('opens the newest question of the chat moved to, and keeps a question stored without a chat in every chat', () => {
    useStore.setState({ sessions: [session('a1', '/chat/a'), session('old'), session('b1', '/chat/b'), session('a2', '/chat/a')], activeSessionId: 'a2' });
    expect(visible()).toEqual(['a1', 'old', 'a2']);

    state().setChat('/chat/b');
    expect(visible()).toEqual(['old', 'b1']);
    expect(state().activeSessionId).toBe('b1');

    state().setChat('/chat/c');
    expect(visible()).toEqual(['old']);
    expect(state().activeSessionId).toBe('old');

    // A question of this chat that is open stays open.
    state().setChat('/chat/a');
    state().setActiveSession('a1');
    state().setChat('/chat/a');
    expect(state().activeSessionId).toBe('a1');
  });

  it('opens nothing in a chat that has no questions, and removing one opens the next of the same chat', () => {
    useStore.setState({ sessions: [session('a1', '/chat/a'), session('b1', '/chat/b'), session('a2', '/chat/a')], activeSessionId: 'a1' });
    state().removeSession('a1');
    expect(state().activeSessionId).toBe('a2');
    state().setChat('/chat/z');
    expect(state().activeSessionId).toBeUndefined();
  });
});

describe('a question takes the chat it was asked in', () => {
  let adapter: PageAdapter;
  let c: StemController;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<main><div id="thread"></div></main><div id="composer"></div>';
    useStore.setState({
      sessions: [], activeSessionId: undefined, activeStepIndex: 0, stepBySession: {}, status: 'idle',
      errorMessage: undefined, writingId: undefined, buttonInjected: false,
    });
    adapter = new PageAdapter();
    c = new StemController(adapter);
  });
  afterEach(() => {
    c.stopWatching();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  async function ask(question: string, topic: string): Promise<void> {
    adapter.editorText = question;
    const pressed = c.inject();
    await vi.advanceTimersByTimeAsync(300);
    expect(await pressed).toBe(true);
    const turn = document.createElement('div');
    turn.setAttribute('data-testid', 'user-message');
    turn.textContent = adapter.editorText;
    thread().append(turn);
    adapter.editorText = '';
    const reply = document.createElement('div');
    reply.setAttribute('data-testid', 'assistant-message');
    reply.innerHTML = '<pre><code class="language-stemlm"></code></pre>';
    reply.querySelector('code')!.textContent = capsule(topic);
    thread().append(reply);
    await vi.advanceTimersByTimeAsync(1_000);
  }

  it('stamps the chat, and follows a new chat to the path the site gives it once it is sent', async () => {
    go('/new');
    await ask('Find the acceleration of the block.', 'Incline');
    const [first] = state().sessions;
    expect(first!.chat).toBe('/new');

    go('/chat/abc', c);
    expect(state().sessions[0]!.chat).toBe('/chat/abc');
    expect(state()).toMatchObject({ chat: '/chat/abc', activeSessionId: first!.id });

    // Another chat, without a reload: its own questions only. And back.
    go('/chat/other', c);
    expect(visible()).toEqual([]);
    expect(state().activeSessionId).toBeUndefined();
    go('/chat/abc', c);
    expect(state().activeSessionId).toBe(first!.id);
  });

  it('keeps a question asked in a chat that already had messages where it was asked', async () => {
    go('/chat/abc');
    await ask('Find the acceleration of the block.', 'Incline');
    await ask('Find the load voltage of the divider.', 'Divider');
    expect(state().sessions.map((s) => s.chat)).toEqual(['/chat/abc', '/chat/abc']);
    go('/chat/xyz', c);
    expect(state().sessions.map((s) => s.chat)).toEqual(['/chat/abc', '/chat/abc']);
    expect(visible()).toEqual([]);
  });
});
