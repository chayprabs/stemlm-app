import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  addListener: vi.fn(),
  handle: vi.fn(async () => ({ ok: true, result: { prunedCount: 0 } })),
}));

vi.mock('wxt/utils/define-background', () => ({ defineBackground: (start: () => void) => start }));
vi.mock('wxt/browser', () => ({ browser: { runtime: {
  id: 'stemlm-test', getURL: (path: string) => `chrome-extension://stemlm-test${path}`,
  onInstalled: { addListener: vi.fn() }, onMessage: { addListener: mocks.addListener },
} } }));
vi.mock('./analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('./toolbar-icon', () => ({ isToolbarIconMessage: () => false, applyToolbarIconInBackground: vi.fn() }));
vi.mock('./tab-workspace', () => ({ isWhoamiMessage: () => false, handleWhoamiRequest: vi.fn() }));
vi.mock('./background-launch', () => ({
  isBackgroundLaunchMessage: () => false, isAuthorizedBackgroundSender: () => false,
  performBackgroundLaunch: vi.fn(),
}));
vi.mock('./saved-session-storage', () => ({
  isSavedSessionMutationMessage: (msg: { type?: string }) => msg?.type === 'stemlm:saved-session-mutation',
  handleSavedSessionMutation: mocks.handle,
}));

import startBackground from '../../entrypoints/background';

describe('background saved-session routing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.handle.mockResolvedValue({ ok: true, result: { prunedCount: 0 } });
    (startBackground as unknown as () => void)();
  });

  const request = { type: 'stemlm:saved-session-mutation', action: 'delete', id: 'saved-1' };

  it.each([
    'https://claude.ai/chat/example',
    'https://gemini.google.com/app/example', 'https://grok.com/c/example',
    'chrome-extension://stemlm-test/saved-library.html',
  ])('keeps the channel open and replies to the shared writer for %s', async (url) => {
    const listener = mocks.addListener.mock.calls[0]![0];
    const reply = vi.fn();
    expect(listener(request, { id: 'stemlm-test', url }, reply)).toBe(true);
    await vi.waitFor(() => expect(reply).toHaveBeenCalledWith({ ok: true, result: { prunedCount: 0 } }));
    expect(mocks.handle).toHaveBeenCalledExactlyOnceWith(request);
  });

  it.each([
    { id: 'stemlm-test', url: 'https://chatgpt.com/c/example' },
    { id: 'another-extension', url: 'https://chatgpt.com/' },
    { id: 'stemlm-test', url: 'https://chatgpt.com.attacker.test/' },
    { id: 'stemlm-test', url: 'http://chatgpt.com/' },
    { id: 'stemlm-test', url: 'chrome-extension://another-extension/popup.html' },
    { id: 'stemlm-test' },
    { url: 'https://chatgpt.com/' },
  ])('rejects unauthorized senders %j', (sender) => {
    const reply = vi.fn();
    mocks.addListener.mock.calls[0]![0](request, sender, reply);
    expect(mocks.handle).not.toHaveBeenCalled();
    expect(reply).toHaveBeenCalledWith(expect.objectContaining({ ok: false }));
  });
});
