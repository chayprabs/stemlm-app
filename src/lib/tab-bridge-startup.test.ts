import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ send: vi.fn(), reload: vi.fn(), get: vi.fn(), pending: vi.fn(), result: vi.fn() }));
vi.mock('wxt/browser', () => ({ browser: { tabs: { sendMessage: mocks.send, reload: mocks.reload, get: mocks.get } } }));
vi.mock('@/src/lib/tab-workspace', () => ({ setPendingPanelAction: mocks.pending, takePanelActionResult: mocks.result }));
import { deliverStemLmMessageToTab } from './tab-bridge';

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  mocks.get.mockResolvedValue({ id: 7, status: 'complete', url: 'https://chatgpt.com/c/original' });
  mocks.result.mockResolvedValue(null);
});
afterEach(() => vi.useRealTimers());

it('waits for startup with pings without reloading or accepting the action twice', async () => {
  let ready = false;
  let actions = 0;
  mocks.send.mockImplementation(async (_id, message) => {
    if (!ready) return { ok: false, error: 'content-script-starting' };
    if (message.type !== 'stemlm:ping') actions++;
    return { ok: true };
  });
  const result = deliverStemLmMessageToTab(7, 'stemlm:ask-here');
  const settled = result.then((value) => value, (error) => error);
  await vi.advanceTimersByTimeAsync(500);
  ready = true;
  await vi.advanceTimersByTimeAsync(500);
  expect(await settled).toEqual({ ok: true });
  expect(actions).toBe(1);
  expect(mocks.reload).not.toHaveBeenCalled();
  expect(mocks.pending).not.toHaveBeenCalled();
});

it('preserves a terminal startup failure without reload', async () => {
  mocks.send.mockResolvedValue({ ok: false, error: 'content-script-startup-failed' });
  await expect(deliverStemLmMessageToTab(7, 'stemlm:open-panel')).rejects.toThrow('content-script-startup-failed');
  expect(mocks.reload).not.toHaveBeenCalled();
});

it('does not treat an absent acknowledgement as successful mounted UI', async () => {
  mocks.send.mockResolvedValue(undefined);
  await expect(deliverStemLmMessageToTab(7, 'stemlm:open-panel')).rejects.toThrow('content-script-no-acknowledgement');
});

it('bounds a continually starting receiver without reloading or queueing', async () => {
  mocks.send.mockResolvedValue({ ok: false, error: 'content-script-starting' });
  const settled = deliverStemLmMessageToTab(7, 'stemlm:open-panel').catch((error) => error);
  await vi.advanceTimersByTimeAsync(26_000);
  expect((await settled).message).toBe('content-script-timeout');
  expect(mocks.reload).not.toHaveBeenCalled();
  expect(mocks.pending).not.toHaveBeenCalled();
});

it('does not queue or reload an explicit solve when the receiver stays missing', async () => {
  mocks.send.mockRejectedValue(new Error('Receiving end does not exist'));
  const settled = deliverStemLmMessageToTab(7, 'stemlm:ask-here', {
    reloadIfMissing: false, queueIfMissing: false, expectedUrl: 'https://chatgpt.com/c/original',
  }).catch((error) => error);
  await vi.advanceTimersByTimeAsync(26_000);
  expect((await settled).message).toBe('content-script-timeout');
  expect(mocks.pending).not.toHaveBeenCalled();
  expect(mocks.reload).not.toHaveBeenCalled();
});

it('does not deliver a delayed explicit solve after the chat URL changes', async () => {
  let ready = false;
  let actions = 0;
  mocks.send.mockImplementation(async (_id, message) => {
    if (!ready) throw new Error('Receiving end does not exist');
    if (message.type !== 'stemlm:ping') actions++;
    return { ok: true };
  });
  const settled = deliverStemLmMessageToTab(7, 'stemlm:ask-here', {
    reloadIfMissing: false, queueIfMissing: false, expectedUrl: 'https://chatgpt.com/c/original',
  }).catch((error) => error);
  await vi.advanceTimersByTimeAsync(500);
  ready = true;
  mocks.get.mockResolvedValue({ id: 7, status: 'complete', url: 'https://chatgpt.com/c/different' });
  await vi.advanceTimersByTimeAsync(26_000);
  expect((await settled).message).toBe('content-chat-changed');
  expect(actions).toBe(0);
  expect(mocks.pending).not.toHaveBeenCalled();
  expect(mocks.reload).not.toHaveBeenCalled();
});
