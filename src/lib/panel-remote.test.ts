import { describe, it, expect, beforeEach, vi } from 'vitest';

const inject = vi.fn(async () => true);
const loadConversation = vi.fn(async (_opt?: { maxWaitMs?: number; quiet?: boolean }) => 2);
const conversationToLoad = vi.fn<() => 'capsules' | 'answer' | null>(() => null);
const sessionStore = new Map<string, unknown>();

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: { get: vi.fn(async () => ({})), set: vi.fn(async () => undefined) },
      session: {
        get: vi.fn(async (key: string) => {
          const value = sessionStore.get(key);
          return value === undefined ? {} : { [key]: value };
        }),
        set: vi.fn(async (data: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(data)) sessionStore.set(k, v);
        }),
        remove: vi.fn(async (key: string) => {
          sessionStore.delete(key);
        }),
      },
    },
    runtime: { id: 'test' },
  },
}));

vi.mock('@/src/content/controller', () => ({
  getController: () => ({ inject, loadConversation, conversationToLoad }),
}));

vi.mock('@/src/lib/analytics', () => ({
  trackEvent: vi.fn(async () => undefined),
}));

import { consumePendingPanelAction, handleStemLmPanelMessage } from './panel-remote';
import { setPendingPanelAction } from '@/src/lib/tab-workspace';
import { useStore } from '@/src/state/store';

describe('handleStemLmPanelMessage', () => {
  beforeEach(() => {
    sessionStore.clear();
    inject.mockClear();
    loadConversation.mockClear();
    conversationToLoad.mockReset();
    conversationToLoad.mockReturnValue(null);
    useStore.setState({
      panelOpen: false,
      buttonInjected: false,
      sessions: [],
      status: 'idle',
    });
  });

  it('opens the panel for the toolbar open action at the 55/45 default', async () => {
    useStore.setState({ splitRatio: 0.75, panelOpen: false });
    const res = await handleStemLmPanelMessage('stemlm:open-panel', 'gemini');
    expect(res).toEqual({ ok: true });
    expect(useStore.getState().panelOpen).toBe(true);
    expect(useStore.getState().splitRatio).toBe(0.68);
  });

  it('opens a chat that only has a plain answer on that answer, structured', async () => {
    conversationToLoad.mockReturnValue('answer');
    loadConversation.mockResolvedValueOnce(1);
    const res = await handleStemLmPanelMessage('stemlm:open-panel', 'gemini');
    expect(loadConversation).toHaveBeenCalledWith(expect.objectContaining({ quiet: true }));
    expect(res).toEqual({ ok: true, loaded: 1 });
    expect(useStore.getState().panelOpen).toBe(true);
  });

  it('leaves a chat with stemlm answers to its Load conversation offer', async () => {
    conversationToLoad.mockReturnValue('capsules');
    const res = await handleStemLmPanelMessage('stemlm:open-panel', 'gemini');
    expect(loadConversation).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
  });

  it.each([
    ['an answer is being waited for', { status: 'loading' as const }],
    ['the guide is attached to the draft', { buttonInjected: true }],
  ])('loads nothing on open while %s', async (_label, state) => {
    conversationToLoad.mockReturnValue('answer');
    useStore.setState(state);
    const res = await handleStemLmPanelMessage('stemlm:open-panel', 'gemini');
    expect(loadConversation).not.toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
    expect(useStore.getState().panelOpen).toBe(true);
  });

  it('reports a plain answer that could not be opened as a plain open, without an error', async () => {
    conversationToLoad.mockReturnValue('answer');
    loadConversation.mockResolvedValueOnce(0);
    const res = await handleStemLmPanelMessage('stemlm:open-panel', 'gemini');
    expect(res).toEqual({ ok: true });
    expect(useStore.getState().status).toBe('idle');
  });

  it('loads the conversation then opens the workspace', async () => {
    const res = await handleStemLmPanelMessage('stemlm:load-conversation', 'gemini');
    expect(loadConversation).toHaveBeenCalled();
    expect(res).toEqual({ ok: true, loaded: 2 });
    expect(useStore.getState().panelOpen).toBe(true);
  });

  it('Ask here injects then opens the panel', async () => {
    const res = await handleStemLmPanelMessage('stemlm:ask-here', 'gemini');
    expect(inject).toHaveBeenCalled();
    expect(res).toEqual({ ok: true });
    expect(useStore.getState().panelOpen).toBe(true);
  });

  it('consumePendingPanelAction runs the armed launch and opens the panel', async () => {
    await setPendingPanelAction({ tabId: 81, type: 'stemlm:open-panel' });
    const res = await consumePendingPanelAction(81, 'gemini');
    expect(res).toEqual({ ok: true });
    expect(useStore.getState().panelOpen).toBe(true);
  });
});
