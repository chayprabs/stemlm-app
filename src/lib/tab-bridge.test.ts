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

import { deliverStemLmMessage } from './tab-bridge';
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
