import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { ENABLED_BOOT_KEY } from '@/src/lib/settings';
import {
  CHAT_HOST_LAUNCH,
  LIBRARY_WINDOW_HEIGHT_PX,
  LIBRARY_WINDOW_WIDTH_PX,
  OPEN_STUDY_PANEL_LABEL,
  SAVED_QUESTIONS_LABEL,
  SETTINGS_WINDOW_HEIGHT_PX,
  SETTINGS_WINDOW_WIDTH_PX,
  STEMLM_TOGGLE_LABEL,
} from '@/src/lib/popup-launch';
import type { SavedSessionSnapshot } from '@/src/lib/saved-sessions';
import { STEMLM_SENTINEL, buildInjectionPrompt } from '@/src/protocol/builder';

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
  windowsGetAll,
  windowsGetCurrent,
  windowsUpdate,
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
  windowsGetAll: vi.fn(async () => []),
  windowsGetCurrent: vi.fn(async () => ({ id: 1, left: 100, top: 40, width: 1400, height: 900 })),
  windowsUpdate: vi.fn(async () => undefined),
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
      update: windowsUpdate,
      getAll: windowsGetAll,
      getCurrent: windowsGetCurrent,
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
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
}));

vi.mock('@/src/lib/saved-sessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/lib/saved-sessions')>();
  return { ...actual, getSavedSessions };
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
    windowsGetAll.mockReset();
    windowsGetAll.mockResolvedValue([]);
    windowsGetCurrent.mockReset();
    windowsGetCurrent.mockResolvedValue({ id: 1, left: 100, top: 40, width: 1400, height: 900 });
    windowsUpdate.mockClear();
    getSavedSessions.mockResolvedValue([]);
    openOptionsPage.mockClear();
    localStorage.removeItem(ENABLED_BOOT_KEY);
    vi.stubGlobal('close', vi.fn());
  });

  afterEach(() => {
    document.body.replaceChildren();
    localStorage.removeItem(ENABLED_BOOT_KEY);
    vi.unstubAllGlobals();
  });

  it('renders Open study panel, Saved questions, and the four shipped host logos', async () => {
    const { container, unmount } = await renderPopup();
    const text = container.textContent ?? '';
    expect(text).toContain(OPEN_STUDY_PANEL_LABEL);
    expect(text).toContain(SAVED_QUESTIONS_LABEL);
    expect(text).toContain('ChatGPT');
    expect(text).not.toMatch(/Solve with stemlm/i);
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
    expect([...container.querySelectorAll('[data-host]')].map((btn) => btn.getAttribute('data-host'))).toEqual(
      ['chatgpt', 'claude', 'gemini', 'grok'],
    );
    expect(container.querySelector('[data-host="chatgpt"]')?.innerHTML).toContain('M22.2819 9.8211');
    expect(container.querySelector('[data-launch="solve-with-stemlm"]')).toBeNull();
    expect(container.querySelector('[data-host="claude"]')?.innerHTML).toContain('#D97757');
    expect(container.querySelector('[data-host="gemini"]')?.innerHTML).toContain('linearGradient');
    expect(container.querySelector('[data-host="grok"]')?.innerHTML).toContain('M13.2371 21.0407');
    expect(container.querySelector('.slm-popup-settings')?.getAttribute('aria-label')).toBe(
      'Settings',
    );
    expect(container.querySelector('[data-launch="settings"]')).toBeTruthy();
    expect(container.querySelector('.slm-popup')?.className).not.toContain('is-sheet');
    const toggle = container.querySelector('[data-launch="stemlm-enabled"]') as HTMLButtonElement;
    expect(toggle).toBeTruthy();
    expect(toggle.getAttribute('role')).toBe('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(toggle.getAttribute('aria-label')).toBe(STEMLM_TOGGLE_LABEL);
    expect(toggle.className).toContain('is-on');
    expect(toggle.textContent).toContain(STEMLM_TOGGLE_LABEL);
    expect(toggle.textContent).not.toMatch(/\bOn\b|\bOff\b/);
    expect(toggle.querySelector('.slm-popup-switch')).toBeTruthy();
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

  it('stemlm toggle is on by default and turning it off does not close the popup', async () => {
    const { container, unmount } = await renderPopup();
    const toggle = container.querySelector('[data-launch="stemlm-enabled"]') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    await act(async () => {
      toggle.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(toggle.className).not.toContain('is-on');
    expect(toggle.getAttribute('title')).toBe('Turn stemLM on');
    expect(window.close).not.toHaveBeenCalled();
    expect(localStore.stemlm_settings).toMatchObject({ stemlmEnabled: false });
    expect(localStore.stemlm_enabled).toBe(false);
    unmount();
  });

  it('keeps stemlm off after the popup is closed and opened again until it is turned on', async () => {
    const first = await renderPopup();
    const firstToggle = first.container.querySelector(
      '[data-launch="stemlm-enabled"]',
    ) as HTMLButtonElement;
    await act(async () => {
      firstToggle.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(firstToggle.getAttribute('aria-checked')).toBe('false');
    first.unmount();

    const second = await renderPopup();
    const secondToggle = second.container.querySelector(
      '[data-launch="stemlm-enabled"]',
    ) as HTMLButtonElement;
    expect(secondToggle.getAttribute('aria-checked')).toBe('false');
    expect(secondToggle.className).not.toContain('is-on');
    expect(window.close).not.toHaveBeenCalled();

    await act(async () => {
      secondToggle.click();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(secondToggle.getAttribute('aria-checked')).toBe('true');
    second.unmount();

    const third = await renderPopup();
    const thirdToggle = third.container.querySelector(
      '[data-launch="stemlm-enabled"]',
    ) as HTMLButtonElement;
    expect(thirdToggle.getAttribute('aria-checked')).toBe('true');
    expect(thirdToggle.className).toContain('is-on');
    third.unmount();
  });

  it('opens the study panel on ChatGPT, Claude and Grok tabs and rejects unsupported tabs', async () => {
    tabsSendMessage.mockClear();
    activeTab = { id: 20, url: 'https://example.com/' };
    // Off a chat the button is not on offer, and the reason is on the page before anything is pressed.
    const rejected = await renderPopup();
    const unavailable = rejected.container.querySelector('[data-launch="open-study-panel"]') as HTMLButtonElement;
    expect(unavailable.disabled).toBe(true);
    const why = rejected.container.querySelector(`#${unavailable.getAttribute('aria-describedby')}`);
    expect(why?.textContent).toBe('Open a chat tab (ChatGPT, Claude, Gemini, Grok) to use the study panel.');
    expect(rejected.container.querySelector('[role="alert"]')).toBeNull();
    await act(async () => {
      unavailable.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsSendMessage).not.toHaveBeenCalled();
    expect(window.close).not.toHaveBeenCalled();
    rejected.unmount();

    activeTab = { id: 21, url: 'https://chatgpt.com/c/abc' };
    const first = await renderPopup();
    await act(async () => {
      clickLaunch(first.container, 'open-study-panel');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsSendMessage).toHaveBeenCalledWith(21, { type: 'stemlm:open-panel' });
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

    activeTab = { id: 23, url: 'https://grok.com/' };
    const third = await renderPopup();
    await act(async () => {
      clickLaunch(third.container, 'open-study-panel');
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsSendMessage).toHaveBeenCalledWith(23, { type: 'stemlm:open-panel' });
    third.unmount();
  });

  it('Saved questions opens a sized window on the first click without reloading the chat tab', async () => {
    activeTab = { id: 4, url: 'https://gemini.google.com/app/chat-1' };
    sendMessageImpl = async () => {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    };
    const { container, unmount } = await renderPopup();
    tabsSendMessage.mockClear();
    tabsReload.mockClear();
    windowsCreate.mockClear();
    tabsCreate.mockClear();
    await act(async () => {
      clickLaunch(container, 'saved-questions');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsSendMessage).not.toHaveBeenCalled();
    expect(tabsReload).not.toHaveBeenCalled();
    expect(tabsCreate).not.toHaveBeenCalled();
    expect(openOptionsPage).not.toHaveBeenCalled();
    expect(windowsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('saved-library.html'),
        type: 'popup',
        width: LIBRARY_WINDOW_WIDTH_PX,
        height: LIBRARY_WINDOW_HEIGHT_PX,
      }),
    );
    expect(window.close).toHaveBeenCalled();
    expect(container.querySelector('.slm-popup')?.className).not.toContain('is-sheet');
    expect(container.querySelector('.slm-popup-head')).toBeTruthy();
    expect(container.querySelector('[role="dialog"][aria-labelledby="slm-library-title"]')).toBeNull();
    unmount();
  });

  it('Saved questions opens a sized window off a chat tab, not a new tab', async () => {
    const { container, unmount } = await renderPopup();
    await act(async () => {
      clickLaunch(container, 'saved-questions');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsCreate).not.toHaveBeenCalled();
    expect(windowsCreate).toHaveBeenCalled();
    expect(window.close).toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"][aria-labelledby="slm-library-title"]')).toBeNull();
    unmount();
  });

  it('Settings opens a compact window on the first click without reloading the chat tab', async () => {
    activeTab = { id: 4, url: 'https://gemini.google.com/app/chat-1' };
    sendMessageImpl = async () => {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    };
    const { container, unmount } = await renderPopup();
    tabsSendMessage.mockClear();
    tabsReload.mockClear();
    windowsCreate.mockClear();
    tabsCreate.mockClear();
    openOptionsPage.mockClear();
    await act(async () => {
      clickLaunch(container, 'settings');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(tabsSendMessage).not.toHaveBeenCalled();
    expect(tabsReload).not.toHaveBeenCalled();
    expect(openOptionsPage).not.toHaveBeenCalled();
    expect(tabsCreate).not.toHaveBeenCalled();
    expect(windowsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('options.html'),
        type: 'popup',
        width: SETTINGS_WINDOW_WIDTH_PX,
        height: SETTINGS_WINDOW_HEIGHT_PX,
      }),
    );
    expect(window.close).toHaveBeenCalled();
    expect(container.querySelector('.slm-popup')?.className).not.toContain('is-sheet');
    expect(container.querySelector('.slm-popup-head')).toBeTruthy();
    expect(container.querySelector('[role="dialog"][aria-labelledby="slm-settings-title"]')).toBeNull();
    expect(container.textContent).not.toContain('Appearance');
    unmount();
  });

  it('Settings opens a sized window off a chat tab, not a new tab or options page', async () => {
    const { container, unmount } = await renderPopup();
    await act(async () => {
      clickLaunch(container, 'settings');
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(openOptionsPage).not.toHaveBeenCalled();
    expect(tabsCreate).not.toHaveBeenCalled();
    expect(windowsCreate).toHaveBeenCalled();
    expect(window.close).toHaveBeenCalled();
    expect(container.querySelector('[role="dialog"][aria-labelledby="slm-settings-title"]')).toBeNull();
    expect(container.querySelector('.slm-popup-head')).toBeTruthy();
    unmount();
  });

  it('links to the How to use stemLM page (ONBOARD-01)', async () => {
    const { container, unmount } = await renderPopup();
    const link = clickLaunch(container, 'welcome');
    expect(link.textContent).toContain('How to use stemLM');
    await act(async () => { await Promise.resolve(); });
    expect(tabsCreate).toHaveBeenCalledWith({ url: 'chrome-extension://test/welcome.html', active: true });
    unmount();
  });

  it('says which chat it is ready on and leads with Open study panel there', async () => {
    activeTab = { id: 4, url: 'https://chatgpt.com/c/abc' };
    const { container, unmount } = await renderPopup();
    const status = container.querySelector('.slm-popup-status');
    expect(status?.textContent).toBe('Ready on ChatGPT');
    expect(status?.innerHTML).toContain('M22.2819 9.8211');
    expect(container.querySelector('.slm-popup')?.getAttribute('data-tab')).toBe('chat');
    const first = container.querySelector('.slm-popup-body')?.firstElementChild;
    expect(first?.querySelector('[data-launch="open-study-panel"]')?.className).toContain('is-primary');
    unmount();
  });

  it('off a chat it says so and leads with the four launchers instead', async () => {
    for (const url of ['https://example.com/', 'https://grok.com/imagine', 'chrome://extensions']) {
      activeTab = { id: 5, url };
      const { container, unmount } = await renderPopup();
      expect(container.querySelector('.slm-popup-status')?.textContent, url).toBe('Open a chat to start');
      expect(container.querySelector('.slm-popup')?.getAttribute('data-tab')).toBe('other');
      const first = container.querySelector('.slm-popup-body')?.firstElementChild;
      expect(first?.querySelectorAll('[data-host]'), url).toHaveLength(4);
      // The panel action stays reachable, but it is no longer the solid primary.
      expect(container.querySelector('[data-launch="open-study-panel"]')?.className).not.toContain('is-primary');
      unmount();
    }
  });

  it('shows the saved count once the library answers, and no number for an empty library', async () => {
    const empty = await renderPopup();
    expect(empty.container.querySelector('.slm-popup-count')).toBeNull();
    empty.unmount();

    getSavedSessions.mockResolvedValue(
      Array.from({ length: 12 }, (_, i) => ({ id: `s${i}` }) as SavedSessionSnapshot),
    );
    const { container, unmount } = await renderPopup();
    const row = container.querySelector('[data-launch="saved-questions"]');
    expect(row?.querySelector('.slm-popup-count')?.textContent).toBe('12');
    expect(row?.textContent).toContain(SAVED_QUESTIONS_LABEL);
    unmount();
  });

  it('explains what turning stemlm off does, as the description of the switch', async () => {
    const { container, unmount } = await renderPopup();
    const toggle = container.querySelector('[data-launch="stemlm-enabled"]') as HTMLButtonElement;
    const hint = document.getElementById(toggle.getAttribute('aria-describedby') ?? '');
    expect(hint?.textContent).toMatch(/hide the stemLM button/);
    expect(hint?.textContent).toMatch(/saved questions still work/);
    unmount();
  });

  it('describes the switch as it now stands once stemlm is off', async () => {
    const { container, unmount } = await renderPopup();
    const toggle = container.querySelector('[data-launch="stemlm-enabled"]') as HTMLButtonElement;
    await act(async () => {
      toggle.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    const hint = document.getElementById(toggle.getAttribute('aria-describedby') ?? '');
    expect(hint?.textContent).toBe('The stemLM button is hidden in the chat box. The panel and your saved questions still work.');
    unmount();
  });

  it('puts the switch back and says why when the change cannot be saved', async () => {
    const { browser } = await import('wxt/browser');
    const { container, unmount } = await renderPopup();
    const toggle = container.querySelector('[data-launch="stemlm-enabled"]') as HTMLButtonElement;
    vi.mocked(browser.storage.local.set).mockRejectedValue(new Error('storage unavailable'));
    try {
      await act(async () => {
        toggle.click();
        await new Promise((r) => setTimeout(r, 0));
      });
    } finally {
      vi.mocked(browser.storage.local.set).mockImplementation(async (data: Record<string, unknown>) => {
        Object.assign(localStore, data);
      });
    }
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    expect(container.querySelector('[role="alert"]')?.textContent).toBe('Could not turn stemLM off. Try again.');
    expect(localStorage.getItem(ENABLED_BOOT_KEY)).toBe('1');

    // The next change clears the message.
    await act(async () => {
      toggle.click();
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    expect(container.querySelector('[role="alert"]')).toBeNull();
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

  it('shows on a chat that the panel can be opened, with nothing to explain', async () => {
    activeTab = { id: 4, url: 'https://claude.ai/chat/abc' };
    const { container, unmount } = await renderPopup();
    const open = container.querySelector('[data-launch="open-study-panel"]') as HTMLButtonElement;
    expect(open.disabled).toBe(false);
    expect(open.hasAttribute('aria-describedby')).toBe(false);
    expect(container.querySelector('.slm-popup-open-hint')).toBeNull();
    unmount();
  });

  it('Copy the guide puts the compact guide on the clipboard, as the builder writes it, and stays open', async () => {
    const writeText = vi.fn(async (_text: string) => undefined);
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const { container, unmount } = await renderPopup();
    const row = container.querySelector('[data-launch="copy-guide"]') as HTMLButtonElement;
    expect(row.querySelector('.slm-popup-row-title')?.textContent).toBe('Copy the guide');
    expect(container.querySelector(`#${row.getAttribute('aria-describedby')}`)?.textContent).toMatch(/paste it under your question/);
    await act(async () => {
      row.click();
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(writeText).toHaveBeenCalledTimes(1);
    const copied = writeText.mock.calls[0]![0];
    // The builder's own text for a chat that takes no file: nothing is retyped in the popup.
    expect(copied).toBe(buildInjectionPrompt('').prompt);
    expect(copied.startsWith(STEMLM_SENTINEL)).toBe(true);
    expect(copied).toContain('@meta');
    expect(copied.length).toBeGreaterThan(2000);
    expect(row.querySelector('.slm-popup-row-title')?.textContent).toBe('Guide copied');
    expect(container.querySelector('[role="status"]')?.textContent).toMatch(/on the clipboard/);
    expect(window.close).not.toHaveBeenCalled();
    unmount();
  });

  it('says so on the row when the clipboard refuses the guide', async () => {
    Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => { throw new Error('denied'); }) }, configurable: true });
    const { container, unmount } = await renderPopup();
    const row = container.querySelector('[data-launch="copy-guide"]') as HTMLButtonElement;
    await act(async () => {
      row.click();
      await new Promise((r) => setTimeout(r, 50));
    });
    expect(row.querySelector('.slm-popup-row-title')?.textContent).toBe('Could not copy the guide');
    expect(row.dataset.state).toBe('failed');
    unmount();
  });
});
