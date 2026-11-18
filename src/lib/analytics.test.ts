import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getLocal: vi.fn(async (): Promise<Record<string, unknown>> => ({})),
  setLocal: vi.fn(async () => undefined),
  sendMessage: vi.fn(async () => undefined),
  manifest: { version: '9.9.9', update_url: 'https://clients2.google.com/service/update2/crx' } as Record<string, string>,
  settings: { shareUsage: true },
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: { getManifest: () => mocks.manifest, sendMessage: mocks.sendMessage },
    storage: { local: { get: mocks.getLocal, set: mocks.setLocal } },
  },
}));
vi.mock('./settings', () => ({ getSettings: async () => mocks.settings }));

const STORE_INSTALL = { version: '9.9.9', update_url: 'https://clients2.google.com/service/update2/crx' };
const PRIVATE = { platform: 'gemini', steps: 3, question: 'private study content', reason: 'Error: x at https://chat/1' };

/** A fresh module: the install id is remembered per context. */
const load = async () => {
  vi.resetModules();
  return import('./analytics');
};

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn(async () => new Response('{"status":"Ok"}'));
  vi.stubGlobal('fetch', fetchMock);
  vi.stubGlobal('location', { protocol: 'chrome-extension:' });
  vi.stubEnv('WXT_POSTHOG_KEY', 'phc_test');
  mocks.manifest = { ...STORE_INSTALL };
  mocks.settings = { shareUsage: true };
  mocks.getLocal.mockResolvedValue({});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('analytics', () => {
  it('sends a store install one content-free event to PostHog under a random install id', async () => {
    const { trackEvent } = await load();
    await trackEvent('question_asked', PRIVATE);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://us.i.posthog.com/i/v0/e/');
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ api_key: 'phc_test', event: 'question_asked' });
    expect(body.properties).toEqual({ platform: 'gemini', steps: 3, version: '9.9.9', $process_person_profile: false });
    expect(String(init.body)).not.toMatch(/private|https:\/\/chat/);
    expect(body.distinct_id).toMatch(/^[0-9a-f-]{36}$/);
    expect(mocks.setLocal).toHaveBeenCalledWith({ stemlm_analytics_id: body.distinct_id });
  });

  it('keeps the stored install id', async () => {
    mocks.getLocal.mockResolvedValue({ stemlm_analytics_id: 'install-1' });
    const { trackEvent } = await load();
    await trackEvent('panel_opened', {});
    await trackEvent('pdf_exported', {});

    expect(fetchMock.mock.calls.map(([, init]) => JSON.parse(String((init as RequestInit).body)).distinct_id))
      .toEqual(['install-1', 'install-1']);
    expect(mocks.setLocal).not.toHaveBeenCalled();
  });

  it.each([
    ['a build without a project key', () => vi.stubEnv('WXT_POSTHOG_KEY', '')],
    ['a copy loaded unpacked', () => { mocks.manifest = { version: '9.9.9' }; }],
    ['Share usage statistics turned off', () => { mocks.settings = { shareUsage: false }; }],
  ])('sends nothing for %s', async (_name, arrange) => {
    arrange();
    const { trackEvent } = await load();
    await trackEvent('question_asked', PRIVATE);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.sendMessage).not.toHaveBeenCalled();
    expect(mocks.setLocal).not.toHaveBeenCalled();
  });

  it('hands a content script event to the background, cleaned, instead of fetching from the chat page', async () => {
    vi.stubGlobal('location', { protocol: 'https:' });
    const { trackEvent, isTrackMessage } = await load();
    await trackEvent('question_solved', PRIVATE);

    expect(fetchMock).not.toHaveBeenCalled();
    expect(mocks.sendMessage).toHaveBeenCalledWith({
      type: 'stemlm:track',
      name: 'question_solved',
      properties: { platform: 'gemini', steps: 3 },
    });
    expect(isTrackMessage((mocks.sendMessage.mock.calls[0] as unknown[])[0])).toBe(true);
  });

  it('never throws when the network fails', async () => {
    fetchMock.mockRejectedValue(new TypeError('offline'));
    const { trackEvent } = await load();
    await expect(trackEvent('extension_error', { where: 'background' })).resolves.toBeUndefined();
  });

  it('accepts only known events as background messages', async () => {
    const { isTrackMessage } = await load();
    expect(isTrackMessage({ type: 'stemlm:track', name: 'panel_opened', properties: {} })).toBe(true);
    expect(isTrackMessage({ type: 'stemlm:track', name: 'anything', properties: {} })).toBe(false);
    expect(isTrackMessage({ type: 'stemlm:track', name: 'panel_opened' })).toBe(false);
  });

  it('keeps only the documented operational fields', async () => {
    const { sanitizeEventParams } = await load();
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
