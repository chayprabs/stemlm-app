import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ deliver: vi.fn(), active: vi.fn(), remember: vi.fn() }));
vi.mock('@/src/lib/tab-bridge', () => ({ deliverStemLmMessage: mocks.deliver, getActiveTab: mocks.active }));
vi.mock('@/src/lib/last-chat', () => ({ lastChatFromUrl: () => ({}), rememberLastChat: mocks.remember }));
vi.mock('wxt/browser', () => ({ browser: {} }));
import * as launch from './popup-launch';
beforeEach(() => {
  vi.clearAllMocks();
  mocks.active.mockResolvedValue({ id: 7, url: 'https://gemini.google.com/app/original' });
  mocks.deliver.mockResolvedValue({ ok: true });
});

it('retains the popup error when recovery explicitly returns failure', async () => {
  mocks.deliver.mockResolvedValue({ ok: false });
  expect(await launch.openStudyPanel()).toEqual({ ok: false, error: expect.stringMatching(/could not|couldn't/i) });
  expect(mocks.remember).not.toHaveBeenCalled();
});

// The user explicitly retired this helper with the toolbar Solve action.
it('does not export the retired solve helper', () => {
  expect('solveWithStemLm' in launch).toBe(false);
});

it('gives an actionable startup failure while preserving the draft', async () => {
  mocks.deliver.mockRejectedValue(new Error('content-script-startup-failed'));
  const result = await launch.openStudyPanel();
  expect(result).toEqual({ ok: false, error: expect.stringMatching(/draft.*refresh/i) });
});

it('does not direct error recovery to the retired solve action', async () => {
  mocks.deliver.mockRejectedValue(new Error('stemlm-disabled'));
  const result = await launch.openStudyPanel();
  expect(result.ok).toBe(false);
  expect(JSON.stringify(result)).not.toMatch(/Solve with stemlm/i);
});
