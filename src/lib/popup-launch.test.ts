import { describe, it, expect, beforeEach, vi } from 'vitest';

const localStore: Record<string, unknown> = {};
const sessionStore = new Map<string, unknown>();
let activeTab: { id: number; url: string; windowId?: number } = {
  id: 1,
  url: 'https://example.com',
};
let sendMessageImpl: (tabId: number, msg: unknown) => Promise<unknown> = async () => ({ ok: true });

const tabs = vi.hoisted(() => ({
  query: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  sendMessage: vi.fn(),
  reload: vi.fn(),
  get: vi.fn(),
}));

const windows = vi.hoisted(() => ({
  create: vi.fn(),
  update: vi.fn(async () => undefined),
  getAll: vi.fn(async () => [] as Array<{ id?: number; tabs?: Array<{ url?: string }> }>),
  getCurrent: vi.fn(async () => ({ id: 1, left: 100, top: 40, width: 1400, height: 900 })),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { id: 'test', getURL: (p: string) => (p.startsWith('/') ? p : `/${p}`) },
    tabs: {
      query: tabs.query,
      create: tabs.create,
      update: tabs.update,
      sendMessage: tabs.sendMessage,
      reload: tabs.reload,
      get: tabs.get,
      onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    windows,
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

import {
  CHAT_HOST_LAUNCH,
  LIBRARY_WINDOW_HEIGHT_PX,
  LIBRARY_WINDOW_WIDTH_PX,
  SETTINGS_WINDOW_HEIGHT_PX,
  SETTINGS_WINDOW_WIDTH_PX,
  openChatHost,
  openSavedQuestionsLibrary,
  openSettingsOverlay,
  openStudyPanel,
  unsupportedHostNotice,
} from './popup-launch';

describe('popup launch helpers', () => {
  beforeEach(() => {
    for (const key of Object.keys(localStore)) delete localStore[key];
    sessionStore.clear();
    activeTab = { id: 1, url: 'https://example.com' };
    sendMessageImpl = async () => ({ ok: true, loaded: 0 });
    tabs.query.mockClear();
    tabs.create.mockClear();
    tabs.update.mockClear();
    tabs.sendMessage.mockClear();
    tabs.reload.mockClear();
    tabs.get.mockClear();
    windows.create.mockReset();
    windows.create.mockResolvedValue({ id: 3 });
    windows.getAll.mockReset();
    windows.getAll.mockResolvedValue([]);
    windows.getCurrent.mockReset();
    windows.getCurrent.mockResolvedValue({ id: 1, left: 100, top: 40, width: 1400, height: 900 });
    tabs.query.mockImplementation(async (info?: { active?: boolean }) => {
      if (info?.active) return [activeTab];
      return [activeTab];
    });
    tabs.create.mockImplementation(async (info: { url?: string }) => ({ id: 99, url: info.url }));
    tabs.update.mockImplementation(async (id: number) => ({ id, url: activeTab.url }));
    tabs.sendMessage.mockImplementation(async (tabId: number, msg: unknown) =>
      sendMessageImpl(tabId, msg),
    );
    tabs.reload.mockResolvedValue(undefined);
    tabs.get.mockImplementation(async (id: number) => ({ id, url: activeTab.url, status: 'complete' }));
  });

  it('names the four shipped chats and does not advertise a 2×2 launch grid', () => {
    expect(CHAT_HOST_LAUNCH.map((h) => h.label)).toEqual(['ChatGPT', 'Claude', 'Gemini', 'Grok']);
    expect(unsupportedHostNotice()).toMatch(/ChatGPT/);
    expect(unsupportedHostNotice()).toMatch(/Claude/);
    expect(unsupportedHostNotice()).toMatch(/Gemini/);
    expect(unsupportedHostNotice()).toMatch(/Grok/);
    expect(unsupportedHostNotice()).not.toMatch(/Start here/);
  });

  it('Open study panel delivers stemlm:open-panel, not load-conversation', async () => {
    activeTab = { id: 3, url: 'https://gemini.google.com/app/c1' };
    const result = await openStudyPanel();
    expect(result).toEqual({ ok: true });
    expect(tabs.sendMessage).toHaveBeenCalledWith(3, { type: 'stemlm:open-panel' });
    expect(tabs.sendMessage).not.toHaveBeenCalledWith(3, { type: 'stemlm:load-conversation' });
  });

  it('Open study panel on an unsupported tab returns a host notice', async () => {
    activeTab = { id: 1, url: 'https://example.com' };
    sendMessageImpl = async () => {
      throw new Error('not-supported');
    };
    const result = await openStudyPanel();
    expect(result.ok).toBe(false);
    if (!result.ok && 'error' in result) {
      expect(result.error).toMatch(/ChatGPT/);
    }
  });

  it('opens each shipped chat host in a new tab', async () => {
    for (const host of CHAT_HOST_LAUNCH) {
      tabs.create.mockClear();
      const result = await openChatHost(host.id);
      expect(result.ok).toBe(true);
      expect(tabs.create).toHaveBeenCalledWith({ url: host.url, active: true });
    }
  });

  it('opens saved questions in a sized popup window without reloading the chat tab', async () => {
    activeTab = { id: 6, url: 'https://gemini.google.com/app' };
    sendMessageImpl = async () => {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    };
    const result = await openSavedQuestionsLibrary();
    expect(result).toEqual({ ok: true });
    expect(tabs.sendMessage).not.toHaveBeenCalled();
    expect(tabs.reload).not.toHaveBeenCalled();
    expect(tabs.create).not.toHaveBeenCalled();
    expect(windows.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/saved-library.html',
        type: 'popup',
        width: LIBRARY_WINDOW_WIDTH_PX,
        height: LIBRARY_WINDOW_HEIGHT_PX,
        focused: true,
      }),
    );
    expect(LIBRARY_WINDOW_WIDTH_PX).toBeLessThanOrEqual(740);
    expect(LIBRARY_WINDOW_HEIGHT_PX).toBeLessThanOrEqual(500);
  });

  it('opens saved questions in a sized window off a chat tab, not a new tab', async () => {
    activeTab = { id: 1, url: 'https://example.com' };
    expect(await openSavedQuestionsLibrary()).toEqual({ ok: true });
    expect(tabs.create).not.toHaveBeenCalled();
    expect(windows.create).toHaveBeenCalled();

    windows.create.mockClear();
    activeTab = { id: 7, url: 'chrome://extensions' };
    expect(await openSavedQuestionsLibrary()).toEqual({ ok: true });
    expect(tabs.sendMessage).not.toHaveBeenCalled();
    expect(tabs.reload).not.toHaveBeenCalled();
  });

  it('opens settings in a compact popup window without reloading the chat tab', async () => {
    activeTab = { id: 6, url: 'https://gemini.google.com/app' };
    sendMessageImpl = async () => {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    };
    const result = await openSettingsOverlay();
    expect(result).toEqual({ ok: true });
    expect(tabs.sendMessage).not.toHaveBeenCalled();
    expect(tabs.reload).not.toHaveBeenCalled();
    expect(tabs.create).not.toHaveBeenCalled();
    expect(windows.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: '/options.html',
        type: 'popup',
        width: SETTINGS_WINDOW_WIDTH_PX,
        height: SETTINGS_WINDOW_HEIGHT_PX,
        focused: true,
      }),
    );
    expect(SETTINGS_WINDOW_WIDTH_PX).toBeLessThanOrEqual(740);
    expect(SETTINGS_WINDOW_HEIGHT_PX).toBeLessThanOrEqual(460);
    expect(SETTINGS_WINDOW_WIDTH_PX).toBeGreaterThan(SETTINGS_WINDOW_HEIGHT_PX);
  });

  it('opens settings in a sized window off a chat tab, not a new tab', async () => {
    activeTab = { id: 1, url: 'https://example.com' };
    expect(await openSettingsOverlay()).toEqual({ ok: true });
    expect(tabs.create).not.toHaveBeenCalled();
    expect(windows.create).toHaveBeenCalled();

    windows.create.mockClear();
    activeTab = { id: 7, url: 'edge://extensions/?id=test' };
    expect(await openSettingsOverlay()).toEqual({ ok: true });
    expect(tabs.sendMessage).not.toHaveBeenCalled();
    expect(tabs.reload).not.toHaveBeenCalled();
  });

  it('focuses an existing settings window instead of opening a second one', async () => {
    windows.getAll.mockResolvedValue([
      {
        id: 44,
        tabs: [{ url: '/options.html' }],
      },
    ]);
    expect(await openSettingsOverlay()).toEqual({ ok: true });
    expect(windows.update).toHaveBeenCalledWith(44, { focused: true });
    expect(windows.create).not.toHaveBeenCalled();
  });
});
