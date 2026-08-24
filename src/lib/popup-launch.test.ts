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
  openChatHost,
  openSavedQuestionsLibrary,
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

  it('opens the saved library in a dedicated window large enough for the new chrome', async () => {
    const target = await openSavedQuestionsLibrary();
    expect(target).toBe('window');
    expect(windows.create).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('saved-library.html'),
        type: 'popup',
        width: LIBRARY_WINDOW_WIDTH_PX,
        height: LIBRARY_WINDOW_HEIGHT_PX,
        focused: true,
      }),
    );
    expect(LIBRARY_WINDOW_WIDTH_PX).toBeGreaterThanOrEqual(Math.round(36 * 16 * 1.4));
    expect(LIBRARY_WINDOW_HEIGHT_PX).toBeGreaterThanOrEqual(Math.round(40 * 16 * 1.4));
  });

  it('falls back to a library tab, then the chat overlay, then in-popup', async () => {
    windows.create.mockRejectedValue(new Error('no window'));
    expect(await openSavedQuestionsLibrary()).toBe('tab');
    expect(tabs.create).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('saved-library.html'), active: true }),
    );

    tabs.create.mockRejectedValue(new Error('no tab'));
    activeTab = { id: 6, url: 'https://gemini.google.com/app' };
    expect(await openSavedQuestionsLibrary()).toBe('tab');
    expect(tabs.sendMessage).toHaveBeenCalledWith(6, { type: 'stemlm:open-saved-library' });

    activeTab = { id: 7, url: 'chrome://extensions' };
    expect(await openSavedQuestionsLibrary()).toBe('fallback');
  });
});
