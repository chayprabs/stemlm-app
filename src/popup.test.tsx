import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { LAST_CHAT_KEY } from '@/src/lib/last-chat';
import { GEMINI_APP_URL } from '@/src/lib/tab-bridge';
import { LAUNCH_LABELS } from '@/src/lib/popup-launch';
import { OPEN_ALL_SAVED_LABEL } from '@/src/lib/saved-library';
import type { SavedSessionSnapshot } from '@/src/lib/saved-sessions';

const localStore: Record<string, unknown> = {};
const sessionStore = new Map<string, unknown>();
let activeTab: { id: number; url: string; windowId?: number } = {
  id: 1,
  url: 'https://example.com',
  windowId: 1,
};
let sendMessageImpl: (tabId: number, msg: unknown) => Promise<unknown> = async () => ({ ok: true });

const {
  tabsQuery,
  tabsCreate,
  tabsUpdate,
  tabsSendMessage,
  tabsReload,
  tabsGet,
  openOptionsPage,
  watchAndApplyToolbarIcon,
  getSavedSessions,
} = vi.hoisted(() => ({
  tabsQuery: vi.fn(),
  tabsCreate: vi.fn(),
  tabsUpdate: vi.fn(),
  tabsSendMessage: vi.fn(),
  tabsReload: vi.fn(),
  tabsGet: vi.fn(),
  openOptionsPage: vi.fn(async () => undefined),
  watchAndApplyToolbarIcon: vi.fn(() => () => {}),
  getSavedSessions: vi.fn(async () => [] as SavedSessionSnapshot[]),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
      openOptionsPage,
      id: 'test',
    },
    tabs: {
      query: tabsQuery,
      create: tabsCreate,
      update: tabsUpdate,
      sendMessage: tabsSendMessage,
      reload: tabsReload,
      get: tabsGet,
      onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    windows: {
      update: vi.fn(async () => undefined),
    },
    storage: {
      local: {
        get: vi.fn(async (key: string) =>
          localStore[key] === undefined ? {} : { [key]: localStore[key] },
        ),
        set: vi.fn(async (data: Record<string, unknown>) => {
          Object.assign(localStore, data);
        }),
      },
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
  },
}));

vi.mock('@/src/lib/saved-sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/lib/saved-sessions')>();
  return { ...actual, getSavedSessions };
});

vi.mock('@/src/lib/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/lib/settings')>();
  return { ...actual, getSettings: vi.fn(async () => DEFAULT_SETTINGS) };
});

vi.mock('@/src/lib/toolbar-icon', () => ({
  watchAndApplyToolbarIcon,
}));

import App from '@/entrypoints/popup/App';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderPopup() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  await act(async () => {
    root = createRoot(container);
    root.render(<App />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
  return {
    container,
    unmount() {
      act(() => {
        root?.unmount();
      });
      container.remove();
    },
  };
}

function clickLaunch(container: HTMLElement, id: string) {
  const btn = container.querySelector(`[data-launch="${id}"]`) as HTMLButtonElement | null;
  expect(btn).toBeTruthy();
  act(() => {
    btn!.click();
  });
  return btn!;
}

describe('popup chrome', () => {
  beforeEach(() => {
    for (const key of Object.keys(localStore)) delete localStore[key];
    sessionStore.clear();
    activeTab = { id: 1, url: 'https://example.com', windowId: 1 };
    sendMessageImpl = async () => ({ ok: true, loaded: 0 });
    tabsQuery.mockImplementation(async (info?: { active?: boolean }) => {
      if (info?.active) return [activeTab];
      return [activeTab];
    });
    tabsCreate.mockImplementation(async (info: { url?: string }) => ({ id: 99, url: info.url }));
    tabsUpdate.mockImplementation(async (id: number, info?: { url?: string; active?: boolean }) => ({
      id,
      url: info?.url ?? activeTab.url,
    }));
    tabsSendMessage.mockImplementation(async (tabId: number, msg: unknown) => sendMessageImpl(tabId, msg));
    tabsReload.mockResolvedValue(undefined);
    tabsGet.mockImplementation(async (id: number) => ({ id, url: activeTab.url, status: 'complete' }));
    getSavedSessions.mockResolvedValue([]);
    openOptionsPage.mockClear();
    vi.stubGlobal('close', vi.fn());
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('renders the 2×2 launch labels and drops the old stacked buttons and beside-send copy', async () => {
    activeTab = { id: 2, url: 'https://gemini.google.com/app' };
    const { container, unmount } = await renderPopup();
    const text = container.textContent ?? '';
    expect(text).toContain(LAUNCH_LABELS['start-here']);
    expect(text).toContain(LAUNCH_LABELS['start-new']);
    expect(text).toContain(LAUNCH_LABELS['open-last']);
    expect(text).toContain(LAUNCH_LABELS['ask-here']);
    expect(text).not.toContain('Open study panel');
    expect(text).not.toContain('Load conversation from this chat');
    expect(text).not.toContain('Open Gemini');
    expect(text).not.toContain('beside send');
    expect(text).not.toContain('Open Gemini, type your question');
    expect(container.querySelector('.slm-launch-grid')).toBeTruthy();
    expect(container.querySelector('.slm-popup-settings')?.getAttribute('aria-label')).toBe('Settings');
    unmount();
  });

  it('hides Start here and Ask here on unsupported hosts and names the four shipped chats', async () => {
    const { container, unmount } = await renderPopup();
    const text = container.textContent ?? '';
    expect(text).toContain('This website is not supported');
    expect(text).toContain('ChatGPT');
    expect(text).toContain('Claude');
    expect(text).toContain('Gemini');
    expect(text).toContain('Grok');
    expect(container.querySelector('[data-launch="start-here"]')).toBeNull();
    expect(container.querySelector('[data-launch="ask-here"]')).toBeNull();
    expect(container.querySelector('[data-launch="start-new"]')).toBeTruthy();
    expect(container.querySelector('[data-launch="open-last"]')).toBeTruthy();
    expect(container.querySelector('[data-launch="open-last"]')).toHaveProperty('disabled', true);
    unmount();
  });

  it('treats Claude, ChatGPT, and Grok tabs as supported hosts', async () => {
    activeTab = { id: 21, url: 'https://chatgpt.com/c/abc' };
    const first = await renderPopup();
    expect(first.container.querySelector('[data-launch="start-here"]')).toBeTruthy();
    expect(first.container.querySelector('[data-launch="ask-here"]')).toBeTruthy();
    expect(first.container.textContent).not.toContain('This website is not supported');
    first.unmount();

    activeTab = { id: 22, url: 'https://claude.ai/new' };
    const second = await renderPopup();
    expect(second.container.querySelector('[data-launch="start-here"]')).toBeTruthy();
    second.unmount();

    activeTab = { id: 23, url: 'https://grok.com/' };
    const third = await renderPopup();
    expect(third.container.querySelector('[data-launch="ask-here"]')).toBeTruthy();
    third.unmount();
  });

  it('Start here loads capsules when they exist and opens empty otherwise', async () => {
    activeTab = { id: 4, url: 'https://gemini.google.com/app/chat-1' };
    sendMessageImpl = async (_id, msg) => {
      const type = (msg as { type?: string }).type;
      if (type === 'stemlm:load-conversation') return { ok: true, loaded: 3 };
      return { ok: true };
    };
    const { container, unmount } = await renderPopup();
    await act(async () => {
      clickLaunch(container, 'start-here');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsSendMessage).toHaveBeenCalledWith(4, { type: 'stemlm:load-conversation' });
    expect(localStore[LAST_CHAT_KEY]).toMatchObject({
      url: 'https://gemini.google.com/app/chat-1',
      platform: 'gemini',
    });
    unmount();

    tabsSendMessage.mockClear();
    sendMessageImpl = async (_id, msg) => {
      const type = (msg as { type?: string }).type;
      if (type === 'stemlm:load-conversation') return { ok: true, loaded: 0 };
      return { ok: true };
    };
    const second = await renderPopup();
    await act(async () => {
      clickLaunch(second.container, 'start-here');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsSendMessage).toHaveBeenCalledWith(4, { type: 'stemlm:load-conversation' });
    second.unmount();
  });

  it('Start new always creates a Gemini tab and auto-starts stemLM', async () => {
    const { container, unmount } = await renderPopup();
    await act(async () => {
      clickLaunch(container, 'start-new');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsCreate).toHaveBeenCalledWith({ url: GEMINI_APP_URL, active: false });
    expect(tabsUpdate).toHaveBeenCalledWith(99, { active: true });
    expect(tabsSendMessage).toHaveBeenCalledWith(99, { type: 'stemlm:open-panel' });
    unmount();
  });

  it('Open last reopens the stored chat and loads the conversation', async () => {
    localStore[LAST_CHAT_KEY] = {
      url: 'https://gemini.google.com/app/last-chat',
      platform: 'gemini',
      savedAt: 10,
    };
    const { container, unmount } = await renderPopup();
    const tile = container.querySelector('[data-launch="open-last"]') as HTMLButtonElement;
    expect(tile.disabled).toBe(false);
    await act(async () => {
      tile.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsCreate).toHaveBeenCalledWith({
      url: 'https://gemini.google.com/app/last-chat',
      active: false,
    });
    expect(tabsUpdate).toHaveBeenCalledWith(99, { active: true });
    expect(tabsSendMessage).toHaveBeenCalledWith(99, { type: 'stemlm:load-conversation' });
    unmount();
  });

  it('Ask here injects stemLM on the current composer and opens the workspace', async () => {
    activeTab = { id: 8, url: 'https://gemini.google.com/app' };
    const { container, unmount } = await renderPopup();
    await act(async () => {
      clickLaunch(container, 'ask-here');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsSendMessage).toHaveBeenCalledWith(8, { type: 'stemlm:ask-here' });
    unmount();
  });

  it('compact saved strip lists at most 3 questions, has no search, and opens the overlay', async () => {
    const snapshots: SavedSessionSnapshot[] = [1, 2, 3, 4].map((n) => ({
      id: `q${n}`,
      question: `Question number ${n} about circuits`,
      savedAt: n * 1000,
      platform: 'gemini',
      meta: { version: 1, subject: 'Electrical', topic: `T${n}` },
      steps: [{ id: 's1', index: 1, title: 'Work', body: 'body' }],
      solution: 'done',
      solutionDiagrams: [],
    }));
    getSavedSessions.mockResolvedValue(snapshots);
    const { container, unmount } = await renderPopup();
    expect(container.querySelector('input[aria-label="Search saved questions"]')).toBeNull();
    expect(container.querySelectorAll('.slm-saved-item')).toHaveLength(3);
    expect(container.textContent).toContain('Question number 4');
    expect(container.textContent).toContain('Question number 2');
    expect(container.textContent).not.toContain('Question number 1 about circuits');
    expect(container.textContent).toContain(OPEN_ALL_SAVED_LABEL);

    await act(async () => {
      const openAll = [...container.querySelectorAll('button')].find((el) =>
        el.textContent?.includes(OPEN_ALL_SAVED_LABEL),
      ) as HTMLButtonElement;
      openAll.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('[role="dialog"][aria-labelledby="slm-library-title"]')).toBeTruthy();
    expect(container.querySelector('input[aria-label="Search saved questions"]')).toBeTruthy();
    expect(container.querySelectorAll('.slm-library-dialog .slm-saved-item')).toHaveLength(4);
    unmount();
  });
});
