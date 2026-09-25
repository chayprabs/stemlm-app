import { beforeEach, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({ inject: vi.fn(), current: vi.fn(), reset: vi.fn(), pending: vi.fn(), result: vi.fn() }));
vi.mock('@/src/content/controller', () => ({ getController: () => ({ inject: calls.inject, isCurrentDraftInjected: calls.current, resetInjection: calls.reset }) }));
vi.mock('@/src/lib/tab-workspace', () => ({ takePendingPanelAction: calls.pending, setPanelActionResult: calls.result }));
vi.mock('@/src/lib/analytics', () => ({ trackEvent: vi.fn() }));
vi.mock('@/src/lib/last-chat', () => ({ rememberCurrentChat: vi.fn() }));
vi.mock('wxt/browser', () => ({ browser: { storage: { local: { get: vi.fn(async () => ({})), set: vi.fn() } } } }));
import { handleStemLmPanelMessage, consumePendingPanelAction } from './panel-remote';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';

beforeEach(() => {
  vi.clearAllMocks();
  useStore.setState({ buttonInjected: true, panelOpen: false, status: 'idle', settings: DEFAULT_SETTINGS });
  calls.current.mockReturnValue(false);
  calls.reset.mockImplementation(() => useStore.getState().setButtonInjected(false));
  calls.inject.mockImplementation(async () => {
    useStore.getState().setButtonInjected(true);
    calls.current.mockReturnValue(true);
    return true;
  });
});

it('stages a changed draft despite the old injected flag and leaves the same staged draft alone', async () => {
  expect(await handleStemLmPanelMessage('stemlm:ask-here', 'chatgpt')).toEqual({ ok: true });
  expect(calls.reset).toHaveBeenCalledTimes(1);
  expect(calls.inject).toHaveBeenCalledTimes(1);
  expect(await handleStemLmPanelMessage('stemlm:ask-here', 'chatgpt')).toEqual({ ok: true });
  expect(calls.inject).toHaveBeenCalledTimes(1);
});

it('does not acknowledge a changed draft when its attachment fails', async () => {
  calls.inject.mockResolvedValue(false);
  expect(await handleStemLmPanelMessage('stemlm:ask-here', 'chatgpt')).toEqual({ ok: false });
  expect(calls.inject).toHaveBeenCalledTimes(1);
});

it('does not attach while stemLM is disabled and explains how to enable it', async () => {
  useStore.setState({ buttonInjected: false, settings: { ...DEFAULT_SETTINGS, stemlmEnabled: false } });
  expect(await handleStemLmPanelMessage('stemlm:ask-here', 'chatgpt')).toEqual({ ok: false, error: 'stemlm-disabled' });
  expect(calls.inject).not.toHaveBeenCalled();
});

it('rejects a pending ask claimed after navigation invalidates its startup context', async () => {
  let claim!: (value: string) => void;
  let current = true;
  calls.pending.mockImplementation(() => new Promise((resolve) => { claim = resolve; }));
  useStore.setState({ buttonInjected: false });
  const result = consumePendingPanelAction(7, 'chatgpt', () => current);
  current = false;
  claim('stemlm:ask-here');
  expect(await result).toEqual({ ok: false });
  expect(calls.result).toHaveBeenCalledWith(7, { ok: false });
  expect(calls.inject).not.toHaveBeenCalled();
  expect(useStore.getState().panelOpen).toBe(false);
});
