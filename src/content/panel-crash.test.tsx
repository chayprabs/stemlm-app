/**
 * A render crash in what the panel draws from an answer stays inside the panel's frame: the
 * composer control, which lives beside the panel in the same app, is not taken down with it.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import type { Session } from '@/src/protocol/types';

const crash = vi.hoisted(() => ({ on: false }));
vi.mock('@/src/components/StepCard', () => ({
  StepCard: () => {
    if (crash.on) throw new Error('a formula that cannot be drawn');
    return <article className="slm-step">step</article>;
  },
}));
// The real panel, without waiting on the lazy chunk.
vi.mock('@/src/content/load-panel', async () => {
  const { PanelHost } = await import('@/src/components/PanelHost');
  return { loadPanelHost: async () => PanelHost };
});
vi.mock('@/src/components/OverlayButton', () => ({
  OverlayButton: () => <button type="button" data-stemlm-inject="true">stemlm</button>,
}));
vi.mock('@/src/platforms/detect', () => ({ detectAdapter: () => null }));
vi.mock('@/src/lib/saved-sessions', () => ({
  saveSession: vi.fn(async () => ({ prunedCount: 0 })),
  deleteSavedSession: vi.fn(async () => undefined),
  isSessionSaved: vi.fn(async () => false),
  refreshSavedSession: vi.fn(async () => false),
}));
vi.mock('wxt/browser', () => ({ browser: { runtime: { getURL: (path: string) => `chrome-extension://test/${path}` } } }));

import App from '../../entrypoints/content/App';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const session: Session = {
  id: 'crash',
  createdAt: 0,
  updatedAt: 0,
  platform: 'claude',
  question: 'Solve it.',
  raw: '',
  capsule: {
    meta: { version: 2, subject: 'Math', topic: 'Crash' },
    solution: 'Done.',
    solutionDiagrams: [],
    steps: [{ id: 's1', index: 1, title: 'Step 1', body: 'Working.' }],
  },
};

let root: Root;
let host: HTMLDivElement;

beforeEach(async () => {
  crash.on = false;
  vi.spyOn(console, 'error').mockImplementation(() => {});
  host = document.createElement('div');
  document.body.append(host);
  useStore.getState().resetSessions();
  useStore.getState().addSession(session);
  useStore.setState({ panelOpen: false, status: 'ready', errorMessage: undefined, view: 'steps', settings: DEFAULT_SETTINGS });
  root = createRoot(host);
  await act(async () => { root.render(<App />); });
  await act(async () => { useStore.getState().openPanel(); });
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  useStore.getState().resetSessions();
  useStore.setState({ panelOpen: false, status: 'idle' });
  vi.restoreAllMocks();
});

describe('a crash in the panel\'s content', () => {
  it('is shown inside the panel, which still closes, and does not unmount the composer control', async () => {
    const control = host.querySelector('[data-stemlm-inject="true"]');
    expect(host.querySelector('.slm-panel .slm-step')).not.toBeNull();

    crash.on = true;
    await act(async () => { useStore.setState({ theme: 'dark' }); });

    // The same control element is still mounted, and the failure reads inside the frame.
    expect(host.querySelector('[data-stemlm-inject="true"]')).toBe(control);
    const fallback = host.querySelector('.slm-panel .slm-body .slm-error-fallback');
    expect(fallback?.getAttribute('role')).toBe('alert');
    expect(host.querySelectorAll('.slm-error-fallback')).toHaveLength(1);

    // The other view starts clean, without "Try again".
    await act(async () => { host.querySelector<HTMLElement>('#slm-tab-solution')!.click(); });
    expect(host.querySelector('.slm-error-fallback')).toBeNull();
    expect(host.querySelector('.slm-panel .slm-solution-wrap')).not.toBeNull();

    await act(async () => { host.querySelector<HTMLElement>('.slm-panel .slm-icon-btn--close')!.click(); });
    expect(useStore.getState().panelOpen).toBe(false);
    expect(host.querySelector('[data-stemlm-inject="true"]')).toBe(control);
  });
});
