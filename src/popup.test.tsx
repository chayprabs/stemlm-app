import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import {
  CHAT_HOST_LAUNCH,
  LIBRARY_WINDOW_HEIGHT_PX,
  LIBRARY_WINDOW_WIDTH_PX,
  OPEN_STUDY_PANEL_LABEL,
  SAVED_QUESTIONS_LABEL,
} from '@/src/lib/popup-launch';
import { SAVED_SEARCH_PLACEHOLDER } from '@/src/lib/saved-library';
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
  windowsCreate,
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
  windowsCreate: vi.fn(),
  openOptionsPage: vi.fn(async () => undefined),
  watchAndApplyToolbarIcon: vi.fn(() => () => {}),
  getSavedSessions: vi.fn(async () => [] as SavedSessionSnapshot[]),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test${path.startsWith('/') ? path : `/${path}`}`,
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
      create: windowsCreate,
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

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

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
    tabsSendMessage.mockImplementation(async (tabId: number, msg: unknown) =>
      sendMessageImpl(tabId, msg),
    );
    tabsReload.mockResolvedValue(undefined);
    tabsGet.mockImplementation(async (id: number) => ({
      id,
      url: activeTab.url,
      status: 'complete',
    }));
    windowsCreate.mockReset();
    windowsCreate.mockResolvedValue({ id: 3 });
    getSavedSessions.mockResolvedValue([]);
    openOptionsPage.mockClear();
    vi.stubGlobal('close', vi.fn());
  });

  afterEach(() => {
    document.body.replaceChildren();
    vi.unstubAllGlobals();
  });

  it('renders Open study panel, Saved questions, and four host logos — not the 2×2 launch tiles', async () => {
    const { container, unmount } = await renderPopup();
    const text = container.textContent ?? '';
    expect(text).toContain(OPEN_STUDY_PANEL_LABEL);
    expect(text).toContain(SAVED_QUESTIONS_LABEL);
    expect(text).toContain('ChatGPT');
    expect(text).toContain('Claude');
    expect(text).toContain('Gemini');
    expect(text).toContain('Grok');
    expect(text).not.toContain('Start here');
    expect(text).not.toContain('Start new');
    expect(text).not.toContain('Open last');
    expect(text).not.toContain('Ask here');
    expect(text).not.toContain('Nothing saved yet.');
    expect(text).not.toContain('Open all saved questions');
    expect(container.querySelector('.slm-launch-grid')).toBeNull();
    expect(container.querySelector('.slm-popup-actions')).toBeTruthy();
    expect(container.querySelectorAll('[data-host]')).toHaveLength(4);
    for (const host of CHAT_HOST_LAUNCH) {
      const btn = container.querySelector(`[data-host="${host.id}"]`);
      expect(btn?.querySelector('svg')).toBeTruthy();
      expect(btn?.textContent).toContain(host.label);
    }
    expect(container.querySelector('.slm-popup-settings')?.getAttribute('aria-label')).toBe(
      'Settings',
    );
    unmount();
  });

  it('Open study panel on a supported tab sends stemlm:open-panel, not load-conversation', async () => {
    activeTab = { id: 4, url: 'https://gemini.google.com/app/chat-1' };
    const { container, unmount } = await renderPopup();
    await act(async () => {
      clickLaunch(container, 'open-study-panel');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsSendMessage).toHaveBeenCalledWith(4, { type: 'stemlm:open-panel' });
    expect(tabsSendMessage).not.toHaveBeenCalledWith(4, { type: 'stemlm:load-conversation' });
    unmount();
  });

  it('treats Claude, ChatGPT, and Grok tabs as supported hosts for Open study panel', async () => {
    activeTab = { id: 21, url: 'https://chatgpt.com/c/abc' };
    const first = await renderPopup();
    expect(first.container.querySelector('[data-launch="open-study-panel"]')).toBeTruthy();
    expect(first.container.textContent).not.toContain('This website is not supported');
    first.unmount();

    activeTab = { id: 22, url: 'https://claude.ai/new' };
    const second = await renderPopup();
    await act(async () => {
      clickLaunch(second.container, 'open-study-panel');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsSendMessage).toHaveBeenCalledWith(22, { type: 'stemlm:open-panel' });
    second.unmount();
  });

  it('Saved questions opens the dedicated library window', async () => {
    const { container, unmount } = await renderPopup();
    await act(async () => {
      clickLaunch(container, 'saved-questions');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(windowsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('saved-library.html'),
        type: 'popup',
        width: LIBRARY_WINDOW_WIDTH_PX,
        height: LIBRARY_WINDOW_HEIGHT_PX,
      }),
    );
    unmount();
  });

  it('Saved questions falls back to the in-popup library UI when a window cannot open', async () => {
    windowsCreate.mockRejectedValue(new Error('no window'));
    tabsCreate.mockImplementation(async (info: { url?: string }) => {
      if (String(info.url ?? '').includes('saved-library')) throw new Error('no tab');
      return { id: 99, url: info.url };
    });
    const { container, unmount } = await renderPopup();
    await act(async () => {
      clickLaunch(container, 'saved-questions');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(container.querySelector('[role="dialog"][aria-labelledby="slm-library-title"]')).toBeTruthy();
    expect(container.querySelector('input[aria-label="Search saved questions"]')).toBeTruthy();
    expect(
      (container.querySelector('input[aria-label="Search saved questions"]') as HTMLInputElement)
        .placeholder,
    ).toBe(SAVED_SEARCH_PLACEHOLDER);
    unmount();
  });

  it('each host control opens that chat website', async () => {
    const { container, unmount } = await renderPopup();
    for (const host of CHAT_HOST_LAUNCH) {
      tabsCreate.mockClear();
      const btn = container.querySelector(`[data-host="${host.id}"]`) as HTMLButtonElement;
      await act(async () => {
        btn.click();
        await Promise.resolve();
        await Promise.resolve();
      });
      expect(tabsCreate).toHaveBeenCalledWith({ url: host.url, active: true });
    }
    unmount();
  });
});
