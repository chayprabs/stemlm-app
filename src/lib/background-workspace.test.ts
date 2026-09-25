import { beforeEach, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { CHAT_CONTENT_MATCHES } from '../platforms/hosts';

const mocks = vi.hoisted(() => ({
  message: vi.fn(), removed: vi.fn(), icon: vi.fn(), access: vi.fn(async () => {}), storage: new Map<string, unknown>(),
}));
vi.mock('wxt/utils/define-background', () => ({ defineBackground: (start: () => void) => start }));
vi.mock('wxt/browser', () => ({ browser: {
  runtime: { id: 'test', getURL: () => 'chrome-extension://test/',
    onInstalled: { addListener: vi.fn() }, onMessage: { addListener: mocks.message } },
  tabs: { onRemoved: { addListener: mocks.removed } },
  storage: { session: {
    setAccessLevel: mocks.access,
    get: async (key: string) => ({ [key]: mocks.storage.get(key) }),
    set: async (values: Record<string, unknown>) => { Object.entries(values).forEach(([key, value]) => mocks.storage.set(key, value)); },
    remove: async (key: string) => { mocks.storage.delete(key); },
  } },
} }));
vi.mock('./analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('./toolbar-icon', () => ({
  isToolbarIconMessage: (message: { type?: string }) => message?.type === 'stemlm:toolbar-icon',
  applyToolbarIconInBackground: mocks.icon,
}));
vi.mock('./saved-session-storage', () => ({ isSavedSessionMutationMessage: () => false, handleSavedSessionMutation: vi.fn() }));
import start from '../../entrypoints/background';

it('requests host access only for the shipped provider matches', () => {
  const config = readFileSync('wxt.config.ts', 'utf8');
  const hosts = config.match(/host_permissions:\s*\[([^\]]+)\]/)?.[1]?.match(/https:\/\/[^']+/g) ?? [];
  expect(hosts.sort()).toEqual([...CHAT_CONTENT_MATCHES].sort());
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.storage.clear();
  (start as unknown as () => void)();
});

it('enables extension content-script session recovery before returning its tab identity', async () => {
  const reply = vi.fn();
  mocks.message.mock.calls[0]![0]({ type: 'stemlm:whoami' },
    { id: 'test', url: 'https://claude.ai/chat/a', tab: { id: 4 } }, reply);
  await vi.waitFor(() => expect(reply).toHaveBeenCalledWith({ tabId: 4 }));
  expect(mocks.access).toHaveBeenCalledWith({ accessLevel: 'TRUSTED_AND_UNTRUSTED_CONTEXTS' });
});

it.each(['stemlm:whoami', 'stemlm:toolbar-icon'])('PERS-07 / SEC-03 rejects unauthorized %s', (type) => {
  for (const sender of [
    { id: 'other', url: 'https://claude.ai/chat/a', tab: { id: 4 } },
    { id: 'test', url: 'https://attacker.invalid/', tab: { id: 4 } },
    { id: 'test', url: 'chrome-extension://other/popup.html', tab: { id: 4 } },
  ]) {
    const reply = vi.fn();
    mocks.message.mock.calls[0]![0]({ type, theme: 'dark' }, sender, reply);
    expect(mocks.icon).not.toHaveBeenCalled();
    expect(reply).not.toHaveBeenCalledWith({ tabId: 4 });
  }
});

it('PERS-01 serializes claims and derives tab scope from the authenticated sender', async () => {
  mocks.storage.set('stemlm_pending_action_4', 'stemlm:open-panel');
  mocks.storage.set('stemlm_pending_action_5', 'stemlm:load-conversation');
  const replies = [vi.fn(), vi.fn()];
  for (const reply of replies) {
    expect(mocks.message.mock.calls[0]![0]({ type: 'stemlm:claim-panel-action', tabId: 5 },
      { id: 'test', url: 'https://claude.ai/chat/a', tab: { id: 4 } }, reply)).toBe(true);
  }
  await vi.waitFor(() => expect(replies.every((reply) => reply.mock.calls.length === 1)).toBe(true));
  expect(replies.map((reply) => reply.mock.calls[0]![0].action).filter(Boolean)).toEqual(['stemlm:open-panel']);
  expect(mocks.storage.get('stemlm_pending_action_5')).toBe('stemlm:load-conversation');
});

it('PERS-06 wires tab removal to session-key cleanup', async () => {
  for (const key of ['stemlm_tab_workspace_4', 'stemlm_pending_action_4', 'stemlm_pending_result_4']) mocks.storage.set(key, {});
  mocks.storage.set('stemlm_tab_workspace_5', {});
  mocks.removed.mock.calls[0]![0](4);
  await vi.waitFor(() => expect([...mocks.storage.keys()]).toEqual(['stemlm_tab_workspace_5']));
});
