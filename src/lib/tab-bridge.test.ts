import { describe, it, expect, vi, beforeEach } from 'vitest';

const sessionStore = new Map<string, unknown>();
let sendMessageImpl: (tabId: number, msg: unknown) => Promise<unknown>;
let reloadCalls = 0;

vi.mock('wxt/browser', () => ({
  browser: {
    tabs: {
      query: vi.fn(async () => [{ id: 7, url: 'https://gemini.google.com/app' }]),
      reload: vi.fn(async () => {
        reloadCalls += 1;
      }),
      update: vi.fn(async (id: number) => ({ id })),
      create: vi.fn(async (info: { url?: string }) => ({ id: 99, url: info.url })),
      sendMessage: vi.fn(async (tabId: number, msg: unknown) => sendMessageImpl(tabId, msg)),
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    storage: {
      session: {
        get: vi.fn(async (key: string) => {
          const value = sessionStore.get(key);
          return value === undefined ? {} : { [key]: value };
        }),
        set: vi.fn(async (data: Record<string, unknown>) => {
          for (const [k, v] of Object.entries(data)) {
            sessionStore.set(k, v);
          }
        }),
        remove: vi.fn(async (key: string) => {
          sessionStore.delete(key);
        }),
      },
    },
  },
}));

import { browser } from 'wxt/browser';
import { deliverStemLmMessage, GEMINI_APP_URL, openGeminiTab } from './tab-bridge';
import { setPanelActionResult } from './tab-workspace';

describe('deliverStemLmMessage', () => {
  beforeEach(() => {
    sessionStore.clear();
    reloadCalls = 0;
    sendMessageImpl = async () => {
      throw new Error('Could not establish connection. Receiving end does not exist.');
    };
  });

  it('reloads once and returns pending panel action result without duplicate send', async () => {
    let pingCount = 0;
    sendMessageImpl = async (_tabId, msg) => {
      const type = (msg as { type?: string }).type;
      if (type === 'stemlm:ping') {
        pingCount += 1;
        if (pingCount >= 2) return { ok: true, loaded: 2 };
      }
      throw new Error('Receiving end does not exist');
    };

    const delivery = deliverStemLmMessage('stemlm:open-panel');
    await new Promise((r) => setTimeout(r, 50));
    await setPanelActionResult(7, { ok: true });

    const res = await delivery;
    expect(reloadCalls).toBe(1);
    expect(res).toEqual({ ok: true });
  });

  it('returns direct result when content script is already connected', async () => {
    sendMessageImpl = async () => ({ ok: true, loaded: 3 });
    const res = await deliverStemLmMessage('stemlm:load-conversation');
    expect(reloadCalls).toBe(0);
    expect(res).toEqual({ ok: true, loaded: 3 });
  });
});

describe('openGeminiTab', () => {
  beforeEach(() => {
    vi.mocked(browser.tabs.update).mockClear();
    vi.mocked(browser.tabs.create).mockClear();
  });

  it('navigates the active tab to Gemini', async () => {
    await openGeminiTab();
    expect(browser.tabs.update).toHaveBeenCalledWith(7, { url: GEMINI_APP_URL });
    expect(browser.tabs.create).not.toHaveBeenCalled();
  });

  it('opens a new tab when the current one cannot be updated', async () => {
    vi.mocked(browser.tabs.update).mockRejectedValueOnce(new Error('restricted'));
    await openGeminiTab();
    expect(browser.tabs.create).toHaveBeenCalledWith({ url: GEMINI_APP_URL });
  });
});
