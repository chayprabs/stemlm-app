/** ONBOARD-01: a fresh install opens the bundled "How to use stemLM" page once; an update never does. */
import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ installed: vi.fn(), create: vi.fn(async () => ({ id: 9 })) }));
vi.mock('wxt/utils/define-background', () => ({ defineBackground: (start: () => void) => start }));
vi.mock('wxt/browser', () => ({ browser: {
  runtime: { id: 'test', getURL: (path: string) => `chrome-extension://test${path}`,
    onInstalled: { addListener: mocks.installed }, onMessage: { addListener: vi.fn() } },
  tabs: { onRemoved: { addListener: vi.fn() }, create: mocks.create },
  storage: { session: { setAccessLevel: vi.fn(async () => {}) } },
} }));
vi.mock('./analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('./toolbar-icon', () => ({ isToolbarIconMessage: () => false, applyToolbarIconInBackground: vi.fn() }));
vi.mock('./saved-session-storage', () => ({ isSavedSessionMutationMessage: () => false, handleSavedSessionMutation: vi.fn() }));
import start from '../../entrypoints/background';

beforeEach(() => {
  vi.clearAllMocks();
  (start as unknown as () => void)();
});

function installed(details: { reason: string; previousVersion?: string }) {
  for (const [listener] of mocks.installed.mock.calls) (listener as (d: typeof details) => void)(details);
}

it('opens the welcome page in a new tab after a fresh install', async () => {
  installed({ reason: 'install' });
  await vi.waitFor(() => expect(mocks.create).toHaveBeenCalledWith({ url: 'chrome-extension://test/welcome.html', active: true }));
  expect(mocks.create).toHaveBeenCalledTimes(1);
});

it('does not open it after an update or a browser update', async () => {
  installed({ reason: 'update', previousVersion: '0.9.0' });
  installed({ reason: 'chrome_update' });
  await new Promise((r) => setTimeout(r, 0));
  expect(mocks.create).not.toHaveBeenCalled();
});
