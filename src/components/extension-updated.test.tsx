/**
 * stemlm was updated while this tab stayed open: the old panel is still on screen but can no longer
 * reach the extension. Save and Export PDF then say so in one line, with a Reload button, instead of
 * a "try again" that can never work. While the extension is reachable, failures read as before.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import type { Session } from '@/src/protocol/types';

const mocks = vi.hoisted(() => ({
  runtimeId: 'live' as string | undefined,
  save: vi.fn(async () => { throw new Error('Extension context invalidated.'); }),
  pdf: vi.fn(async () => false),
}));

vi.mock('wxt/browser', () => ({ browser: { runtime: { get id() { return mocks.runtimeId; }, getURL: (p: string) => p } } }));
vi.mock('@/src/lib/saved-sessions', () => ({
  saveSession: mocks.save,
  deleteSavedSession: vi.fn(),
  isSessionSaved: vi.fn(async () => false),
  refreshSavedSession: vi.fn(async () => false),
}));
vi.mock('@/src/lib/pdf-export-request', () => ({ requestSessionPdf: mocks.pdf }));

import { Panel } from './Panel';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { EXTENSION_UPDATED_NOTICE } from '@/src/lib/extension-context';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const SESSION: Session = {
  id: 's1', question: 'Find the acceleration.', platform: 'claude', raw: '', createdAt: 1, updatedAt: 1,
  capsule: {
    meta: { version: 2, subject: 'Physics', topic: 'Incline' },
    steps: [{ id: 's1', title: 'Draw the forces', body: 'Weight, normal force and friction.' }],
    solution: 'It accelerates at 3.2 m/s^2.',
    solutionDiagrams: [],
  },
} as unknown as Session;

let root: Root;
let container: HTMLElement;
const banner = () => container.querySelector('.slm-banner');
const press = async (label: string) => {
  await act(async () => {
    (container.querySelector(`button[aria-label="${label}"]`) as HTMLButtonElement).click();
    await Promise.resolve();
  });
};

beforeEach(async () => {
  mocks.runtimeId = undefined;
  useStore.setState({ settings: DEFAULT_SETTINGS, sessions: [], activeSessionId: undefined, status: 'idle', errorMessage: undefined, panelOpen: true });
  useStore.getState().addSession(SESSION);
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root.render(createElement(Panel)); });
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

describe('after stemlm was updated under this tab', () => {
  it('Save and Export PDF say so in one line with a Reload button', async () => {
    const reload = vi.fn();
    vi.spyOn(window, 'location', 'get').mockReturnValue({ ...window.location, reload } as Location);

    await press('Save question');
    expect(useStore.getState().errorMessage).toBe(EXTENSION_UPDATED_NOTICE);
    const button = [...banner()!.querySelectorAll('button')].find((b) => b.textContent === 'Reload')!;
    act(() => button.click());
    expect(reload).toHaveBeenCalledOnce();

    useStore.getState().setStatus('ready');
    await press('Export PDF');
    expect(useStore.getState().errorMessage).toBe(EXTENSION_UPDATED_NOTICE);
  });

  it('keeps the ordinary messages, and no Reload button, while the extension is reachable', async () => {
    mocks.runtimeId = 'live';
    await press('Save question');
    expect(useStore.getState().errorMessage).toBe('Could not save the question. Try again.');
    expect(banner()!.textContent).not.toContain('Reload');
  });
});
