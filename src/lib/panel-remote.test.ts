import { describe, it, expect, beforeEach, vi } from 'vitest';

const inject = vi.fn(async () => true);
const loadConversation = vi.fn(async () => 2);
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
  getController: () => ({ inject, loadConversation }),
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
    useStore.setState({
      panelOpen: false,
      savedLibraryOpen: false,
      settingsOpen: false,
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
    expect(useStore.getState().splitRatio).toBe(0.55);
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

  it('opens the saved-library overlay on the tab', async () => {
    const res = await handleStemLmPanelMessage('stemlm:open-saved-library', 'gemini');
    expect(res).toEqual({ ok: true });
    expect(useStore.getState().savedLibraryOpen).toBe(true);
    expect(useStore.getState().settingsOpen).toBe(false);
  });

  it('opens the settings overlay on the tab', async () => {
    useStore.setState({ savedLibraryOpen: true });
    const res = await handleStemLmPanelMessage('stemlm:open-settings', 'gemini');
    expect(res).toEqual({ ok: true });
    expect(useStore.getState().settingsOpen).toBe(true);
    expect(useStore.getState().savedLibraryOpen).toBe(false);
  });

  it('consumePendingPanelAction runs the armed launch and opens the panel', async () => {
    await setPendingPanelAction({ tabId: 81, type: 'stemlm:open-panel' });
    const res = await consumePendingPanelAction(81, 'gemini');
    expect(res).toEqual({ ok: true });
    expect(useStore.getState().panelOpen).toBe(true);
  });

  it('consumePendingPanelAction ignores stale saved-library launches after a tab reload', async () => {
    await setPendingPanelAction({ tabId: 82, type: 'stemlm:open-saved-library' });
    const res = await consumePendingPanelAction(82, 'gemini');
    expect(res).toEqual({ ok: true });
    expect(useStore.getState().savedLibraryOpen).toBe(false);
  });

  it('consumePendingPanelAction ignores stale settings launches after a tab reload', async () => {
    await setPendingPanelAction({ tabId: 83, type: 'stemlm:open-settings' });
    const res = await consumePendingPanelAction(83, 'gemini');
    expect(res).toEqual({ ok: true });
    expect(useStore.getState().settingsOpen).toBe(false);
  });
});
