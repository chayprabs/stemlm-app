/**
 * The panel says so while it shows an answer the chat has not finished writing, and stops saying
 * so when the whole answer is there. A partial answer cannot be saved.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Panel } from '@/src/components/Panel';
import { getController, initController } from './controller';
import { geminiAdapter } from '@/src/platforms/gemini';
import { NO_ANSWER_NOTICE, useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import type { Session } from '@/src/protocol/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@/src/lib/saved-sessions', () => ({
  saveSession: vi.fn(async () => ({ prunedCount: 0 })),
  deleteSavedSession: vi.fn(async () => undefined),
  isSessionSaved: vi.fn(async () => false),
  refreshSavedSession: vi.fn(async () => false),
}));
vi.mock('wxt/browser', () => ({ browser: { runtime: { getURL: (path: string) => `chrome-extension://test/${path}` } } }));

function answer(steps: number, patch: Partial<Session> = {}): Session {
  return {
    id: 'a', createdAt: 0, updatedAt: 0, platform: 'claude', question: 'Find the acceleration.', raw: '',
    capsule: {
      meta: { version: 2, subject: 'Physics', topic: 'Incline' },
      solution: steps > 2 ? 'Done.' : '',
      solutionDiagrams: [],
      steps: Array.from({ length: steps }, (_, i) => ({ id: `s${i + 1}`, index: i + 1, title: `Step title ${i + 1}`, body: 'Working.' })),
    },
    ...patch,
  };
}

let root: Root | null = null;
let host: HTMLDivElement | null = null;
const writingLine = () => [...host!.querySelectorAll('.slm-banner')].find((el) => /still writing/i.test(el.textContent ?? ''));

beforeEach(() => {
  useStore.getState().resetSessions();
  useStore.setState({ panelOpen: true, status: 'ready', errorMessage: undefined, view: 'steps', theme: 'light', settings: DEFAULT_SETTINGS, writingId: undefined });
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  useStore.getState().resetSessions();
  useStore.setState({ panelOpen: false, status: 'idle', writingId: undefined });
});

describe('an answer the chat is still writing', () => {
  it('is marked as still being written, shows only its finished steps and cannot be saved', () => {
    act(() => {
      useStore.getState().addSession(answer(2, { cutOff: true }));
      useStore.setState({ writingId: 'a' });
      root!.render(<Panel />);
    });
    expect(writingLine()?.getAttribute('role')).toBe('status');
    expect(host!.querySelectorAll('.slm-step-rail-item')).toHaveLength(2);
    expect(host!.querySelector<HTMLButtonElement>('.slm-icon-btn--save')!.disabled).toBe(true);
  });

  it('loses the mark when the whole answer takes its place', () => {
    act(() => {
      useStore.getState().addSession(answer(2, { cutOff: true }));
      useStore.setState({ writingId: 'a' });
      root!.render(<Panel />);
    });
    act(() => useStore.setState({ sessions: [answer(4)], writingId: undefined }));
    expect(writingLine()).toBeUndefined();
    expect(host!.querySelectorAll('.slm-step-rail-item')).toHaveLength(4);
    expect(host!.querySelector<HTMLButtonElement>('.slm-icon-btn--save')!.disabled).toBe(false);
  });

  it('is not marked on another question the student has switched to', () => {
    act(() => {
      useStore.getState().addSession(answer(3, { id: 'earlier' }));
      useStore.getState().addSession(answer(2, { cutOff: true }));
      useStore.setState({ writingId: 'a' });
      useStore.getState().setActiveSession('earlier');
      root!.render(<Panel />);
    });
    expect(writingLine()).toBeUndefined();
  });
});

describe('a reply that is not an answer', () => {
  it('is a neutral note over a short empty panel, not a red error over the how-to', () => {
    act(() => {
      useStore.getState().setStatus('idle', NO_ANSWER_NOTICE);
      root!.render(<Panel />);
    });
    const banner = host!.querySelector('.slm-banner')!;
    expect(banner.textContent).toContain('This reply has no stemlm answer.');
    expect(banner.classList.contains('slm-banner-info')).toBe(true);
    expect(banner.getAttribute('role')).toBe('status');
    expect(host!.querySelector('.slm-banner-details')).toBeNull();
    expect(host!.querySelector('.slm-empty')).not.toBeNull();
    expect(host!.querySelector('.slm-empty-steps')).toBeNull();
  });

  it('does not offer to load stemlm answers from a chat whose reply was not one', () => {
    // The student's sent message carries stemLM's lines, which reads as "answers may be here".
    initController({ ...geminiAdapter, getAssistantBlocks: () => [], extractCapsules: () => [], isStreaming: () => false });
    document.body.insertAdjacentHTML('beforeend', '<main id="chat"><user-query>Find it.\n--- stemLM ---</user-query></main>');
    try {
      act(() => {
        useStore.getState().setStatus('idle', NO_ANSWER_NOTICE);
        root!.render(<Panel />);
      });
      expect(getController()!.conversationToLoad()).toBe('capsules');
      expect(host!.querySelector('.slm-empty-load')).toBeNull();
    } finally {
      document.getElementById('chat')!.remove();
    }
  });

  it('leaves the how-to in an empty panel that has nothing to say', () => {
    act(() => root!.render(<Panel />));
    expect(host!.querySelector('.slm-empty-steps')).not.toBeNull();
  });
});
