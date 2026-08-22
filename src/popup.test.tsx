import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';

const {
  getActiveTab,
  isGeminiUrl,
  deliverStemLmMessage,
  openGeminiTab,
  openOptionsPage,
  watchAndApplyToolbarIcon,
} = vi.hoisted(() => ({
  getActiveTab: vi.fn(async () => ({ id: 1, url: 'https://example.com' })),
  isGeminiUrl: vi.fn((url?: string) => Boolean(url?.includes('gemini.google.com'))),
  deliverStemLmMessage: vi.fn(async () => ({ ok: true })),
  openGeminiTab: vi.fn(async () => undefined),
  openOptionsPage: vi.fn(async () => undefined),
  watchAndApplyToolbarIcon: vi.fn(() => () => {}),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      getURL: (path: string) => `chrome-extension://test/${path}`,
      openOptionsPage,
      id: 'test',
    },
    tabs: {
      onActivated: { addListener: vi.fn(), removeListener: vi.fn() },
      onUpdated: { addListener: vi.fn(), removeListener: vi.fn() },
    },
  },
}));

vi.mock('@/src/lib/saved-sessions', () => ({
  getSavedSessions: vi.fn(async () => []),
}));

vi.mock('@/src/lib/settings', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/lib/settings')>();
  return { ...actual, getSettings: vi.fn(async () => DEFAULT_SETTINGS) };
});

vi.mock('@/src/lib/tab-bridge', () => ({
  getActiveTab,
  isGeminiUrl,
  deliverStemLmMessage,
  openGeminiTab,
}));

vi.mock('@/src/lib/toolbar-icon', () => ({
  watchAndApplyToolbarIcon,
}));

vi.mock('@/src/components/SavedSessionList', () => ({
  SavedSessionList: () => <div data-testid="saved-list" />,
}));

import App from '@/entrypoints/popup/App';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

async function renderPopup() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  await act(async () => {
    root = createRoot(container);
    root.render(<App />);
  });
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
  });
  return {
    container,
    unmount() {
      act(() => {
        root?.unmount();
      });
      container.remove();
    },
  };
}

describe('popup chrome', () => {
  beforeEach(() => {
    getActiveTab.mockResolvedValue({ id: 1, url: 'https://example.com' });
    deliverStemLmMessage.mockClear();
    openGeminiTab.mockClear();
    openOptionsPage.mockClear();
  });

  afterEach(() => {
    document.body.replaceChildren();
  });

  it('drops marketing copy and the Gemini-ready pill, enlarges the lockup, and puts settings in the header', async () => {
    const { container, unmount } = await renderPopup();
    const html = container.innerHTML;
    expect(html).not.toContain('Structured STEM study overlay');
    expect(html).not.toContain('Injects the stemLM protocol');
    expect(html).not.toContain('On Gemini');
    expect(html).not.toContain('Settings →');
    expect(container.querySelector('.slm-popup-foot')).toBeNull();
    expect(container.querySelector('.slm-popup-settings')?.getAttribute('aria-label')).toBe('Settings');
    const svg = container.querySelector('.slm-wordmark svg');
    expect(svg?.getAttribute('height')).toBe('30');
    expect(html).toContain('Open Gemini');
    unmount();
  });

  it('uses Open study panel when the active tab is Gemini', async () => {
    getActiveTab.mockResolvedValue({ id: 2, url: 'https://gemini.google.com/app' });
    const { container, unmount } = await renderPopup();
    expect(container.textContent).toContain('Open study panel');
    expect(container.textContent).not.toContain('Open Gemini');
    unmount();
  });
});
