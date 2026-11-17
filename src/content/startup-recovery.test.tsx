import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { DEFAULT_SETTINGS, type Settings } from '@/src/lib/settings';
import { useStore } from '@/src/state/store';
import type { Session } from '@/src/protocol/types';

const bootMocks = vi.hoisted(() => ({
  settings: vi.fn<() => Promise<Settings>>(),
  tabId: vi.fn<() => Promise<number | undefined>>(),
  backup: vi.fn<() => Promise<unknown>>(),
  shared: vi.fn<() => Promise<unknown>>(),
  createUi: vi.fn(),
  mount: vi.fn(),
  addMessage: vi.fn(),
  removeMessage: vi.fn(),
  handleMessage: vi.fn(async () => ({ ok: true })),
  consume: vi.fn(async () => null),
  save: vi.fn(),
  mirror: vi.fn(),
  watch: vi.fn(),
  stop: vi.fn(),
  settingsWatch: vi.fn(),
  mirrorWatch: vi.fn(),
}));

vi.mock('wxt/utils/define-content-script', () => ({ defineContentScript: (options: unknown) => options }));
vi.mock('wxt/utils/content-script-ui/shadow-root', () => ({ createShadowRootUi: bootMocks.createUi }));
vi.mock('wxt/browser', () => ({ browser: { runtime: { id: 'test', onMessage: { addListener: bootMocks.addMessage, removeListener: bootMocks.removeMessage } } } }));
vi.mock('../../entrypoints/content/App', () => ({ default: () => createElement('button', { type: 'button' }, 'Study panel') }));
vi.mock('@/src/platforms/detect', () => ({ detectAdapter: () => ({ id: 'chatgpt' }) }));
vi.mock('@/src/content/controller', () => ({
  initController: () => ({ setOnAnswerStarted: vi.fn(), startWatching: bootMocks.watch }),
  getController: () => ({ stopWatching: bootMocks.stop }),
}));
vi.mock('@/src/lib/settings', async (original) => ({
  ...await original<typeof import('@/src/lib/settings')>(),
  getSettings: bootMocks.settings,
  onSettingsChanged: bootMocks.settingsWatch,
}));
vi.mock('@/src/lib/tab-workspace', () => ({
  getContentTabId: bootMocks.tabId, loadTabWorkspace: bootMocks.backup,
  saveTabWorkspace: bootMocks.save, workspaceFromStore: vi.fn(() => ({})),
}));
vi.mock('@/src/lib/panel-remote', () => ({ consumePendingPanelAction: bootMocks.consume, handleStemLmPanelMessage: bootMocks.handleMessage }));
vi.mock('@/src/lib/session-sync', async (original) => ({
  ...await original<typeof import('@/src/lib/session-sync')>(),
  loadMirroredSessions: bootMocks.shared, mirrorActiveSessions: bootMocks.mirror,
  onMirroredSessionsChanged: bootMocks.mirrorWatch,
}));
vi.mock('@/src/lib/theme', () => ({ applyTheme: vi.fn(), resolveTheme: () => 'light', resolveHostTheme: () => 'light', watchSystemTheme: () => () => {}, watchHostScheme: () => () => {} }));
vi.mock('@/src/lib/toolbar-icon', () => ({ watchAndApplyToolbarIcon: () => () => {} }));
vi.mock('@/src/lib/analytics', () => ({ trackEvent: vi.fn() }));

import content from '../../entrypoints/content/index';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const invalidations: Array<() => void> = [];
const ctx = { onInvalidated: (callback: () => void) => invalidations.push(callback) };
const boot = content as unknown as { main: (context: typeof ctx) => Promise<void> };

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function sample(id = 'restored'): Session {
  return {
    id, question: 'A previous question', platform: 'chatgpt', raw: '', createdAt: 1, updatedAt: 1,
    capsule: { meta: { version: 1, subject: 'Math', topic: 'Example' }, steps: [], solution: 'Answer', solutionDiagrams: [] },
  };
}

async function tick() { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); }); }
async function message(type = 'stemlm:ping') {
  const sendResponse = vi.fn();
  bootMocks.addMessage.mock.calls[0]![0]({ type }, { id: 'test' }, sendResponse);
  await tick();
  return sendResponse.mock.calls[0]?.[0];
}

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState(useStore.getInitialState(), true);
  bootMocks.settings.mockResolvedValue(DEFAULT_SETTINGS);
  bootMocks.tabId.mockResolvedValue(1);
  bootMocks.backup.mockResolvedValue(null);
  bootMocks.shared.mockResolvedValue([]);
  bootMocks.settingsWatch.mockReturnValue(() => {});
  bootMocks.mirrorWatch.mockReturnValue(() => {});
  bootMocks.createUi.mockImplementation(async (context, options) => {
    const shadowHost = document.createElement('stemlm-root');
    const shadow = shadowHost.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadow.append(container);
    let rendered: { unmount: () => void } | undefined;
    const mount = () => {
      bootMocks.mount();
      const fontStyle = document.createElement('style');
      fontStyle.setAttribute('wxt-shadow-root-document-styles', 'startup-test');
      fontStyle.textContent = '@font-face { font-family: KaTeX_Main; src: url(test.woff2); }';
      document.head.append(fontStyle);
      document.documentElement.append(shadowHost);
      rendered = options.onMount(container, shadow, shadowHost);
    };
    context.onInvalidated(() => {
      options.onRemove?.(rendered);
      shadowHost.remove();
      document.querySelector('style[wxt-shadow-root-document-styles="startup-test"]')?.remove();
    });
    return { shadowHost, mount };
  });
});

afterEach(async () => {
  await act(async () => { for (const callback of invalidations.splice(0)) callback(); });
  document.querySelectorAll('stemlm-root').forEach((node) => node.remove());
  vi.useRealTimers();
});

it('mounts before the optional background tab-id response resolves', async () => {
  const pending = deferred<number>();
  bootMocks.tabId.mockReturnValue(pending.promise);
  const task = boot.main(ctx);
  await tick();
  const mounted = document.querySelector('stemlm-root');
  pending.resolve(1);
  await act(async () => { await task; });
  expect(mounted).not.toBeNull();
});

it('retains a usable UI when a restored session has no capsule', async () => {
  const stored = { sessions: [{ id: 'broken' }], activeStepIndex: 0 };
  bootMocks.backup.mockResolvedValue(stored);
  await act(async () => { await expect(boot.main(ctx)).resolves.toBeUndefined(); });
  expect(document.querySelector('stemlm-root')).not.toBeNull();
  expect(useStore.getState().sessions).toEqual([]);
  expect(useStore.getState().errorMessage).toMatch(/restore/i);
  expect(bootMocks.save).not.toHaveBeenCalled();
  expect(stored.sessions).toEqual([{ id: 'broken' }]);
});

it.each([false, true])('PERS-05 restores healthy records from a mixed batch without rewriting it, shared=%s', async (shared) => {
  const valid = sample();
  const batch = [valid, { id: 'damaged' }];
  const before = structuredClone(batch);
  bootMocks.settings.mockResolvedValue({ ...DEFAULT_SETTINGS, shareAcrossTabs: shared });
  if (shared) bootMocks.shared.mockResolvedValue(batch);
  else bootMocks.backup.mockResolvedValue({ sessions: batch, activeSessionId: valid.id, activeStepIndex: 0 });
  await act(async () => { await boot.main(ctx); });
  expect(useStore.getState().sessions).toEqual([valid]);
  expect(useStore.getState().errorMessage).toMatch(/1.*(?:damaged|invalid|malformed)/i);
  expect(batch).toEqual(before);
  expect(bootMocks.save).not.toHaveBeenCalled();
  expect(bootMocks.mirror).not.toHaveBeenCalled();
});

/** An answer structured from a plain chat reply, as a reload backup or the cross-tab mirror stores it. */
function plain(id = 'plain'): Session {
  return {
    ...sample(id), origin: 'ingest',
    capsule: { meta: { version: 2, subject: 'Physics', topic: 'Projectile range' }, solution: '', solutionDiagrams: [],
      steps: [{ id: 's1', index: 1, title: 'Resolve the velocity', body: 'Split it into components.' }] },
  };
}

it.each([false, true])('restores an answer structured from the chat as one, beside a stemLM answer, shared=%s', async (shared) => {
  // The browser hands back JSON copies of what was stored.
  const stored: unknown = JSON.parse(JSON.stringify([sample('capsule'), plain()]));
  bootMocks.settings.mockResolvedValue({ ...DEFAULT_SETTINGS, shareAcrossTabs: shared });
  if (shared) bootMocks.shared.mockResolvedValue(stored);
  else bootMocks.backup.mockResolvedValue({ sessions: stored, activeSessionId: 'plain', activeStepIndex: 0 });
  await act(async () => { await boot.main(ctx); });
  const state = useStore.getState();
  expect(state.errorMessage).toBeUndefined();
  expect(state.sessions).toEqual([sample('capsule'), plain()]);
  expect(state.sessions[0]).not.toHaveProperty('origin');
  expect(state.activeSessionId).toBe('plain');
});

it('takes an answer structured in another tab from the mirror with its origin, and keeps its own Markdown', async () => {
  bootMocks.settings.mockResolvedValue({ ...DEFAULT_SETTINGS, shareAcrossTabs: true });
  await act(async () => { await boot.main(ctx); });
  const callback = bootMocks.mirrorWatch.mock.calls[0]![0];
  act(() => callback(JSON.parse(JSON.stringify([plain('from-other-tab')]))));
  expect(useStore.getState().sessions).toEqual([plain('from-other-tab')]);

  // The same answer, structured here with its text, then echoed back newer and without it.
  const own = { ...plain('own'), raw: '1. Resolve the velocity.\n2. Find the range.', createdAt: 5 };
  act(() => useStore.getState().addSession(own));
  act(() => callback(JSON.parse(JSON.stringify([plain('from-other-tab'), { ...own, raw: '', updatedAt: 9 }]))));
  expect(useStore.getState().sessions.find((session) => session.id === 'own')).toEqual({ ...own, updatedAt: 9 });
});

it('reports starting instead of false success while settings are pending', async () => {
  const pending = deferred<Settings>();
  bootMocks.settings.mockReturnValue(pending.promise);
  const task = boot.main(ctx);
  const response = await message();
  pending.resolve(DEFAULT_SETTINGS);
  await act(async () => { await task; });
  expect(response).toEqual({ ok: false, error: 'content-script-starting' });
  expect(bootMocks.handleMessage).not.toHaveBeenCalled();
});

it('reports a failed mount without acknowledging panel actions', async () => {
  bootMocks.createUi.mockRejectedValue(new Error('Mount failed'));
  await act(async () => { await boot.main(ctx).catch(() => {}); });
  expect(await message('stemlm:open-panel')).toEqual({ ok: false, error: 'content-script-startup-failed' });
  expect(bootMocks.handleMessage).not.toHaveBeenCalled();
});

it('reattaches the same shadow host without recreating its React root', async () => {
  await act(async () => { await boot.main(ctx); });
  const host = document.querySelector('stemlm-root')!;
  const button = host.shadowRoot!.querySelector('button');
  host.remove();
  await tick();
  expect(document.querySelector('stemlm-root')).toBe(host);
  expect(host.shadowRoot!.querySelector('button')).toBe(button);
  expect(bootMocks.mount).toHaveBeenCalledTimes(1);
});

it('does not mount or run queued actions after invalidation during settings load', async () => {
  const pending = deferred<Settings>();
  bootMocks.settings.mockReturnValue(pending.promise);
  const task = boot.main(ctx);
  await tick();
  for (const callback of invalidations.splice(0)) callback();
  pending.resolve(DEFAULT_SETTINGS);
  await act(async () => { await task; });
  expect(bootMocks.mount).not.toHaveBeenCalled();
  expect(bootMocks.consume).not.toHaveBeenCalled();
});

it('does not restore another route or run its queued action after delayed hydration', async () => {
  const pending = deferred<unknown>();
  bootMocks.backup.mockReturnValue(pending.promise);
  const task = boot.main(ctx);
  await tick();
  history.pushState({}, '', '/c/different-conversation');
  pending.resolve({ sessions: [sample()], activeStepIndex: 0 });
  await act(async () => { await task; });
  expect(useStore.getState().sessions).toEqual([]);
  expect(bootMocks.consume).not.toHaveBeenCalled();
});

it('does not replace a new answer with a late shared-session restore', async () => {
  bootMocks.settings.mockResolvedValue({ ...DEFAULT_SETTINGS, shareAcrossTabs: true });
  const pending = deferred<unknown>();
  bootMocks.shared.mockReturnValue(pending.promise);
  const task = boot.main(ctx);
  await tick();
  useStore.getState().addSession(sample('new-answer'));
  pending.resolve([sample('old-answer')]);
  await act(async () => { await task; });
  expect(useStore.getState().sessions.map((session) => session.id)).toEqual(['new-answer']);
});

it('ignores malformed shared updates without changing the current answer', async () => {
  bootMocks.settings.mockResolvedValue({ ...DEFAULT_SETTINGS, shareAcrossTabs: true });
  await act(async () => { await boot.main(ctx); });
  useStore.getState().addSession(sample('current'));
  const callback = bootMocks.mirrorWatch.mock.calls[0]![0];
  expect(() => callback([null])).not.toThrow();
  expect(useStore.getState().sessions.map((session) => session.id)).toEqual(['current']);
});

it('does not overwrite a stored backup merely by restoring it', async () => {
  bootMocks.backup.mockResolvedValue({ sessions: [sample()], activeStepIndex: 0 });
  await act(async () => { await boot.main(ctx); });
  expect(useStore.getState().sessions[0]?.id).toBe('restored');
  expect(bootMocks.save).not.toHaveBeenCalled();
});

it('opens the panel again on the restored answer when it was open before the reload, leaving the keyboard alone', async () => {
  bootMocks.backup.mockResolvedValue({ sessions: [sample()], activeStepIndex: 0, panelOpen: true });
  await act(async () => { await boot.main(ctx); });
  expect(useStore.getState()).toMatchObject({ panelOpen: true, panelTakesFocus: false, activeSessionId: 'restored' });

  invalidations.splice(0).forEach((callback) => callback());
  useStore.setState(useStore.getInitialState(), true);
  bootMocks.backup.mockResolvedValue({ sessions: [sample()], activeStepIndex: 0 });
  await act(async () => { await boot.main(ctx); });
  expect(useStore.getState().panelOpen).toBe(false);
});

it('PERS-06 reports failed workspace writes and retries on the next answer change', async () => {
  vi.useFakeTimers();
  bootMocks.save.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
  await act(async () => { await boot.main(ctx); });
  useStore.getState().addSession(sample('unsaved-workspace'));
  await act(async () => { await vi.advanceTimersByTimeAsync(400); });
  expect(useStore.getState().errorMessage).toContain('Could not preserve');
  expect(useStore.getState().sessions[0]?.id).toBe('unsaved-workspace');
  useStore.getState().addSession(sample('next-answer'));
  await act(async () => { await vi.advanceTimersByTimeAsync(400); });
  expect(bootMocks.save).toHaveBeenCalledTimes(2);
});

it('still restores saved answers when the panel is opened during recovery', async () => {
  const pending = deferred<unknown>();
  bootMocks.backup.mockReturnValue(pending.promise);
  const task = boot.main(ctx);
  await tick();
  expect(await message('stemlm:open-panel')).toEqual({ ok: true });
  pending.resolve({ sessions: [sample()], activeStepIndex: 0 });
  await act(async () => { await task; });
  expect(useStore.getState().sessions[0]?.id).toBe('restored');
  expect(bootMocks.watch).toHaveBeenCalled();
});

it('does not consume a queued action after a new answer arrives during recovery', async () => {
  const pending = deferred<unknown>();
  bootMocks.backup.mockReturnValue(pending.promise);
  const task = boot.main(ctx);
  await tick();
  useStore.getState().addSession(sample('new-answer'));
  pending.resolve({ sessions: [sample('old-answer')], activeStepIndex: 0 });
  await act(async () => { await task; });
  expect(bootMocks.consume).not.toHaveBeenCalled();
});

it('can finish mounting when settings take longer than optional services', async () => {
  vi.useFakeTimers();
  const pending = deferred<Settings>();
  bootMocks.settings.mockReturnValue(pending.promise);
  const task = boot.main(ctx);
  await act(async () => { await vi.advanceTimersByTimeAsync(6_000); });
  pending.resolve(DEFAULT_SETTINGS);
  await act(async () => { await task; });
  expect(document.querySelector('stemlm-root')).not.toBeNull();
});

it('recovers its font registrations and React tree after document children are rebuilt', async () => {
  await act(async () => { await boot.main(ctx); });
  const host = document.querySelector('stemlm-root')!;
  const fontStyle = document.querySelector('style[wxt-shadow-root-document-styles="startup-test"]')!;
  const oldHead = document.head;
  const oldBody = document.body;
  try {
    document.documentElement.replaceChildren(document.createElement('head'), document.createElement('body'));
    await tick();
    expect(host.isConnected).toBe(true);
    expect(fontStyle.isConnected).toBe(true);
    expect(document.head.contains(fontStyle)).toBe(true);
    expect(bootMocks.mount).toHaveBeenCalledTimes(1);
  } finally {
    document.documentElement.replaceChildren(oldHead, oldBody);
    await tick();
  }
});
