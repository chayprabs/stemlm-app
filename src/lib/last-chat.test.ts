import { describe, it, expect, beforeEach, vi } from 'vitest';

const localStore: Record<string, unknown> = {};

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: vi.fn(async (key: string) =>
          localStore[key] === undefined ? {} : { [key]: localStore[key] },
        ),
        set: vi.fn(async (data: Record<string, unknown>) => {
          Object.assign(localStore, data);
        }),
      },
    },
  },
}));

import {
  LAST_CHAT_KEY,
  getLastChat,
  isLastChatRecord,
  lastChatFromUrl,
  rememberLastChat,
} from './last-chat';

describe('last chat persistence', () => {
  beforeEach(() => {
    for (const key of Object.keys(localStore)) delete localStore[key];
  });

  it('accepts a Gemini chat URL and rejects unsupported hosts', () => {
    expect(
      isLastChatRecord({
        url: 'https://gemini.google.com/app/abc',
        platform: 'gemini',
        savedAt: 1,
      }),
    ).toBe(true);
    expect(lastChatFromUrl('https://chatgpt.com/c/1', 'gemini')).toBeNull();
    expect(lastChatFromUrl('chrome://extensions', 'gemini')).toBeNull();
  });

  it('round-trips through storage.local so it survives a restart', async () => {
    const record = lastChatFromUrl('https://gemini.google.com/app/stay', 'gemini', 42);
    expect(record).toBeTruthy();
    await rememberLastChat(record!);
    expect(localStore[LAST_CHAT_KEY]).toEqual(record);
    expect(await getLastChat()).toEqual(record);
  });

  it('returns null when nothing is stored', async () => {
    expect(await getLastChat()).toBeNull();
  });
});
