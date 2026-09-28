import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { HOST_FIXTURES, mountHostComposer } from '@/src/platforms/host-fixtures';
import { removeComposerSlot } from '@/src/lib/composer-slot';

// D34 (V-LAZY-01): the study panel is a separate script loaded on first open. If it cannot load, the + says
// so (tooltip, accessible name, live region) instead of the panel silently closing.

const loader = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/src/content/load-panel', () => ({ loadPanelHost: loader.load }));
vi.mock('@/src/content/controller', () => ({
  getController: () => ({ inject: vi.fn(async () => true), getLastQuestion: vi.fn(() => ''), resetInjection: vi.fn() }),
}));
vi.mock('@/src/platforms/detect', () => ({ detectAdapter: () => HOST_FIXTURES[0]!.adapter }));

import App from '../../entrypoints/content/App';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const UNAVAILABLE = "stemlm couldn't open its panel. Refresh this tab.";

describe('study panel that cannot load', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    document.body.innerHTML = '';
    mountHostComposer(HOST_FIXTURES[0]!, { capsule: false });
    container = document.createElement('div');
    document.body.appendChild(container);
    useStore.setState({ panelOpen: false, buttonInjected: false, status: 'idle', settings: DEFAULT_SETTINGS });
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    root = createRoot(container);
    act(() => root.render(<App />));
  });

  afterEach(() => {
    act(() => root.unmount());
    removeComposerSlot();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  const plus = () => document.querySelector<HTMLButtonElement>('[data-stemlm-inject="true"]')!;

  it('says on the + that the panel could not open, until the next try', async () => {
    loader.load.mockRejectedValueOnce(new Error('study-panel.js failed'));
    await act(async () => { useStore.getState().openPanel(); });
    await act(async () => { await Promise.resolve(); });

    expect(useStore.getState().panelOpen).toBe(false);
    expect(plus().getAttribute('title')).toBe(UNAVAILABLE);
    expect(plus().getAttribute('aria-label')).toBe(UNAVAILABLE);
    expect(document.querySelector('.slm-inject-live')?.textContent).toBe(UNAVAILABLE);

    loader.load.mockReturnValueOnce(new Promise(() => {}));
    await act(async () => { useStore.getState().openPanel(); });
    expect(plus().getAttribute('title')).not.toBe(UNAVAILABLE);
  });
});
