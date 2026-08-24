import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LAST_CHAT_KEY } from './last-chat';
import { GEMINI_APP_URL } from './tab-bridge';

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

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { id: 'test', getURL: (p: string) => p },
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
    windows: { update: vi.fn(async () => undefined) },
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
  launchTiles,
  openSavedQuestionsLibrary,
  runLaunchAction,
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

  it('builds a 2×2 grid on supported hosts and hides current-tab tiles otherwise', () => {
    const supported = launchTiles({ supported: true, hasLastChat: true });
    expect(supported.filter((t) => t.visible).map((t) => t.label)).toEqual([
      'Start here',
      'Start new',
      'Open last',
      'Ask here',
    ]);
    const unsupported = launchTiles({ supported: false, hasLastChat: false });
    expect(unsupported.find((t) => t.id === 'start-here')?.visible).toBe(false);
    expect(unsupported.find((t) => t.id === 'ask-here')?.visible).toBe(false);
    expect(unsupported.find((t) => t.id === 'open-last')?.disabled).toBe(true);
    expect(unsupportedHostNotice()).toBe(
      'This website is not supported. stemLM currently only works on ChatGPT, Claude, Gemini, Grok.',
    );
    expect(unsupportedHostNotice()).toMatch(/ChatGPT/);
    expect(unsupportedHostNotice()).toMatch(/Claude/);
    expect(unsupportedHostNotice()).toMatch(/Grok/);
  });

  it('Start here loads when capsules exist and still succeeds when the chat is empty', async () => {
    activeTab = { id: 3, url: 'https://gemini.google.com/app/c1' };
    sendMessageImpl = async (_id, msg) => {
      if ((msg as { type?: string }).type === 'stemlm:load-conversation') {
        return { ok: true, loaded: 2 };
      }
      return { ok: true };
    };
    const loaded = await runLaunchAction('start-here');
    expect(loaded).toEqual({ ok: true, loaded: 2 });
    expect(localStore[LAST_CHAT_KEY]).toMatchObject({
      url: 'https://gemini.google.com/app/c1',
      platform: 'gemini',
    });

    sendMessageImpl = async (_id, msg) => {
      if ((msg as { type?: string }).type === 'stemlm:load-conversation') {
        return { ok: true, loaded: 0 };
      }
      return { ok: true };
    };
    const empty = await runLaunchAction('start-here');
    expect(empty).toEqual({ ok: true, loaded: 0 });
  });

  it('Start new opens a new Gemini tab and auto-starts the panel', async () => {
    const result = await runLaunchAction('start-new');
    expect(result).toEqual({ ok: true });
    expect(tabs.create).toHaveBeenCalledWith({ url: GEMINI_APP_URL, active: false });
    expect(tabs.update).toHaveBeenCalledWith(99, { active: true });
    expect(tabs.sendMessage).toHaveBeenCalledWith(99, { type: 'stemlm:open-panel' });
  });

  it('Open last is a quiet empty when nothing is stored', async () => {
    const result = await runLaunchAction('open-last');
    expect(result).toEqual({ ok: false, empty: true });
    expect(tabs.create).not.toHaveBeenCalled();
    expect(tabs.sendMessage).not.toHaveBeenCalled();
  });

  it('Open last focuses the stored URL and loads the conversation', async () => {
    localStore[LAST_CHAT_KEY] = {
      url: 'https://gemini.google.com/app/keep',
      platform: 'gemini',
      savedAt: 9,
    };
    const result = await runLaunchAction('open-last');
    expect(result.ok).toBe(true);
    expect(tabs.create).toHaveBeenCalledWith({
      url: 'https://gemini.google.com/app/keep',
      active: false,
    });
    expect(tabs.update).toHaveBeenCalledWith(99, { active: true });
    expect(tabs.sendMessage).toHaveBeenCalledWith(99, { type: 'stemlm:load-conversation' });
  });

  it('Ask here on ChatGPT, Claude, and Grok is a supported host path', async () => {
    for (const url of [
      'https://chatgpt.com/c/1',
      'https://claude.ai/chat/1',
      'https://grok.com/chat',
    ]) {
      tabs.sendMessage.mockClear();
      activeTab = { id: 11, url };
      const result = await runLaunchAction('ask-here');
      expect(result.ok).toBe(true);
      expect(tabs.sendMessage).toHaveBeenCalledWith(11, { type: 'stemlm:ask-here' });
      expect(localStore[LAST_CHAT_KEY]).toMatchObject({ url });
    }
  });

  it('Ask here delivers the composer inject message', async () => {
    activeTab = { id: 5, url: 'https://gemini.google.com/app' };
    const result = await runLaunchAction('ask-here');
    expect(result.ok).toBe(true);
    expect(tabs.sendMessage).toHaveBeenCalledWith(5, { type: 'stemlm:ask-here' });
  });

  it('opens the saved library on a Gemini tab and falls back on restricted pages', async () => {
    activeTab = { id: 6, url: 'https://gemini.google.com/app' };
    expect(await openSavedQuestionsLibrary()).toBe('tab');
    expect(tabs.sendMessage).toHaveBeenCalledWith(6, { type: 'stemlm:open-saved-library' });

    activeTab = { id: 7, url: 'chrome://extensions' };
    expect(await openSavedQuestionsLibrary()).toBe('fallback');
  });
});
