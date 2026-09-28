import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
const mocks = vi.hoisted(() => ({ active: vi.fn(), open: vi.fn(), enabled: true }));
vi.mock('wxt/browser', () => ({ browser: { tabs: {
  onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
  onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
} } }));
vi.mock('@/src/lib/tab-bridge', () => ({ getActiveTab: mocks.active }));
vi.mock('@/src/lib/popup-launch', async (original) => ({
  ...await original<typeof import('@/src/lib/popup-launch')>(),
  openStudyPanel: mocks.open,
}));
vi.mock('@/src/lib/settings', async (original) => {
  const actual = await original<typeof import('@/src/lib/settings')>();
  return { ...actual, getSettings: async () => ({ ...actual.DEFAULT_SETTINGS, stemlmEnabled: mocks.enabled }), onSettingsChanged: () => () => {} };
});
vi.mock('@/src/lib/toolbar-icon', () => ({ watchAndApplyToolbarIcon: () => () => {} }));
import App from '@/entrypoints/popup/App';
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root;
let container: HTMLDivElement;
let close: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  mocks.enabled = true;
  mocks.active.mockResolvedValue({ id: 7, url: 'https://gemini.google.com/app/original' });
  close = vi.spyOn(window, 'close').mockImplementation(() => {});
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => { act(() => root.unmount()); container.remove(); close.mockRestore(); });

// The user retired the toolbar Solve feature; keep its shared launch safety coverage on Open study panel.
it('prevents duplicate panel requests and keeps a failure visible', async () => {
  let finish!: (result: { ok: false; error: string }) => void;
  mocks.open.mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
  await act(async () => root.render(<App />));
  const panel = container.querySelector<HTMLButtonElement>('[data-launch="open-study-panel"]');
  expect(panel?.textContent).toContain('Open study panel');
  act(() => { panel!.click(); panel!.click(); });
  expect(mocks.open).toHaveBeenCalledTimes(1);
  expect(panel!.disabled).toBe(true);
  expect(panel!.getAttribute('aria-busy')).toBe('true');
  await act(async () => finish({ ok: false, error: 'Keep your draft and try again.' }));
  expect(panel!.disabled).toBe(false);
  expect(container.querySelector('[role="alert"]')?.textContent).toBe('Keep your draft and try again.');
  expect(close).not.toHaveBeenCalled();
});

it('does not offer the retired solve action off a supported chat', async () => {
  mocks.active.mockResolvedValue({ id: 7, url: 'https://example.com/' });
  await act(async () => root.render(<App />));
  const solve = container.querySelector<HTMLButtonElement>('[data-launch="solve-with-stemlm"]');
  expect(solve).toBeNull();
  expect(container.textContent).not.toMatch(/Solve with stemlm/i);
});

it('restores a usable panel action when an unexpected launch rejects', async () => {
  mocks.open.mockRejectedValue(new Error('Unexpected disconnection'));
  await act(async () => root.render(<App />));
  const panel = container.querySelector<HTMLButtonElement>('[data-launch="open-study-panel"]');
  expect(panel).not.toBeNull();
  await act(async () => panel!.click());
  expect(panel!.disabled).toBe(false);
  expect(container.querySelector('[role="alert"]')?.textContent).toMatch(/try again/i);
  expect(close).not.toHaveBeenCalled();
});

it('has no retired Solve action while off and keeps Open study panel available', async () => {
  mocks.enabled = false;
  await act(async () => root.render(<App />));
  const solve = container.querySelector<HTMLButtonElement>('[data-launch="solve-with-stemlm"]');
  expect(solve).toBeNull();
  expect(container.querySelector<HTMLButtonElement>('[data-launch="open-study-panel"]')!.disabled).toBe(false);
});
