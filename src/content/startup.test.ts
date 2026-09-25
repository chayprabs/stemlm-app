import { it, expect, vi } from 'vitest';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';

const startup = vi.hoisted(() => ({
  mount: vi.fn(),
  consume: vi.fn(async () => { throw new Error('Queued upload failed'); }),
}));
vi.mock('wxt/utils/define-content-script', () => ({ defineContentScript: (value: unknown) => value }));
vi.mock('wxt/utils/content-script-ui/shadow-root', () => ({ createShadowRootUi: vi.fn(async () => ({ mount: startup.mount })) }));
vi.mock('wxt/browser', () => ({ browser: { runtime: { onMessage: { addListener: vi.fn(), removeListener: vi.fn() } } } }));
vi.mock('../../entrypoints/content/App', () => ({ default: () => null }));
vi.mock('@/src/platforms/detect', () => ({ detectAdapter: () => ({ id: 'chatgpt' }) }));
vi.mock('@/src/content/controller', () => ({ initController: () => ({ setOnAnswerStarted: vi.fn(), startWatching: vi.fn() }), getController: () => null }));
vi.mock('@/src/lib/settings', async (original) => ({
  ...await original<typeof import('@/src/lib/settings')>(),
  getSettings: async () => DEFAULT_SETTINGS,
  onSettingsChanged: () => () => {},
}));
vi.mock('@/src/lib/tab-workspace', () => ({
  getContentTabId: async () => 1,
  loadTabWorkspace: async () => null,
  saveTabWorkspace: vi.fn(),
  workspaceFromStore: vi.fn(),
}));
vi.mock('@/src/lib/panel-remote', () => ({ consumePendingPanelAction: startup.consume, handleStemLmPanelMessage: vi.fn() }));
vi.mock('@/src/lib/session-sync', () => ({
  loadMirroredSessions: async () => [], mergeMirroredSessions: vi.fn(), mirrorActiveSessions: vi.fn(),
  onMirroredSessionsChanged: () => () => {}, sessionsMirrorFingerprint: vi.fn(),
}));
vi.mock('@/src/lib/theme', () => ({ applyTheme: vi.fn(), resolveTheme: () => 'light', watchSystemTheme: () => () => {} }));
vi.mock('@/src/lib/toolbar-icon', () => ({ watchAndApplyToolbarIcon: () => () => {} }));
vi.mock('@/src/lib/analytics', () => ({ trackEvent: vi.fn() }));

import content from '../../entrypoints/content/index';

it('mounts the provider UI even when a queued startup action rejects', async () => {
  const boot = content as unknown as { main: (ctx: { onInvalidated: (callback: () => void) => void }) => Promise<void> };
  await expect(boot.main({ onInvalidated: vi.fn() })).resolves.toBeUndefined();
  expect(startup.mount).toHaveBeenCalledTimes(1);
  expect(startup.mount.mock.invocationCallOrder[0]).toBeLessThan(startup.consume.mock.invocationCallOrder[0]!);
});
