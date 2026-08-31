import { afterEach, describe, expect, it, vi } from 'vitest';

const { getLocal, setLocal, getSession, setSession } = vi.hoisted(() => ({
  getLocal: vi.fn(async () => ({})),
  setLocal: vi.fn(async () => undefined),
  getSession: vi.fn(async () => ({})),
  setSession: vi.fn(async () => undefined),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: { get: getLocal, set: setLocal },
      session: { get: getSession, set: setSession },
    },
  },
}));

import { analyticsEnabled, sanitizeEventParams, trackEvent } from './analytics';

afterEach(() => {
  vi.restoreAllMocks();
  getLocal.mockClear();
  setLocal.mockClear();
  getSession.mockClear();
  setSession.mockClear();
});

describe('analytics', () => {
  it('is disabled in the default build', () => {
    expect(analyticsEnabled()).toBe(false);
  });

  it('does not touch storage or the network when disabled', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await trackEvent('question_asked', { question: 'private study content' });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(getLocal).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
  });

  it('keeps only the documented operational fields', () => {
    expect(
      sanitizeEventParams({
        platform: 'gemini',
        source: 'answer',
        steps: 3,
        reason: 'private error text',
        question: 'private study content',
        url: 'https://example.com/chat',
      }),
    ).toEqual({ platform: 'gemini', source: 'answer', steps: 3 });
  });
});
