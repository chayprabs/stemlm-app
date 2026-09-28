/**
 * UPDATE-01 (D13): after install or update, stemLM reaches chat tabs that were already
 * open (MV3 does not re-inject declared content scripts into them).
 */
import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';

const mocks = vi.hoisted(() => ({
  installed: vi.fn(),
  query: vi.fn(),
  execute: vi.fn(async () => [{ result: undefined }]),
  create: vi.fn(async () => ({ id: 1 })),
}));
vi.mock('wxt/utils/define-background', () => ({ defineBackground: (start: () => void) => start }));
vi.mock('wxt/browser', () => ({ browser: {
  runtime: { id: 'test', getURL: (path: string) => `chrome-extension://test${path}`,
    onInstalled: { addListener: mocks.installed }, onMessage: { addListener: vi.fn() } },
  tabs: { onRemoved: { addListener: vi.fn() }, create: mocks.create, query: mocks.query },
  scripting: { executeScript: mocks.execute },
  storage: { session: { setAccessLevel: vi.fn(async () => {}) } },
} }));
vi.mock('./analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('./toolbar-icon', () => ({ isToolbarIconMessage: () => false, applyToolbarIconInBackground: vi.fn() }));
vi.mock('./saved-session-storage', () => ({ isSavedSessionMutationMessage: () => false, handleSavedSessionMutation: vi.fn() }));
import start from '../../entrypoints/background';

const OPEN_TABS = [
  { id: 1, url: 'https://claude.ai/chat/a', status: 'complete' },
  { id: 2, url: 'https://gemini.google.com/app/b', status: 'complete', discarded: true },
  { id: 3, url: 'https://grok.com/c/d', status: 'complete' },
];

beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.mockResolvedValue(OPEN_TABS);
  (start as unknown as () => void)();
});

function installed(details: { reason: string }) {
  for (const [listener] of mocks.installed.mock.calls) (listener as (d: typeof details) => void)(details);
}

it.each(['update', 'install'])('re-injects the content script into open chat tabs after %s', async (reason) => {
  installed({ reason });
  await vi.waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(2));
  expect(mocks.query).toHaveBeenCalledWith({ url: expect.arrayContaining(['https://claude.ai/*', 'https://grok.com/*']) });
  for (const tabId of [1, 3]) {
    expect(mocks.execute).toHaveBeenCalledWith({ target: { tabId }, files: ['content-scripts/content.js'] });
  }
});

it('leaves open tabs alone after a browser update (the browser reloads them itself)', async () => {
  installed({ reason: 'chrome_update' });
  await new Promise((r) => setTimeout(r, 0));
  expect(mocks.execute).not.toHaveBeenCalled();
});

it('keeps going when one tab refuses the script', async () => {
  mocks.execute.mockRejectedValueOnce(new Error('Cannot access contents of the page'));
  installed({ reason: 'update' });
  await vi.waitFor(() => expect(mocks.execute).toHaveBeenCalledTimes(2));
});

it('declares the scripting permission it needs (D13)', () => {
  const permissions = readFileSync('wxt.config.ts', 'utf8').match(/permissions:\s*\[([^\]]*)\]/)?.[1] ?? '';
  expect(permissions).toContain("'scripting'");
});
