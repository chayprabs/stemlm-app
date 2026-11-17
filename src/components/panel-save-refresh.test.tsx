/**
 * Panel save-membership UI against the shipped saved-sessions storage path.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Panel } from './Panel';
import { useStore } from '@/src/state/store';
import type { Session } from '@/src/protocol/types';
import {
  SAVED_SESSIONS_KEY,
  isSessionSaved,
  sessionToSnapshot,
} from '@/src/lib/saved-sessions';

const { storageData, mockLocalStorage } = vi.hoisted(() => {
  const storageData: Record<string, unknown> = {};
  return {
    storageData,
    mockLocalStorage: {
      get: vi.fn(async (key: string | null) =>
        key === null ? { ...storageData } : { [key]: storageData[key] },
      ),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
      }),
    },
  };
});

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: mockLocalStorage,
    },
    runtime: {
      sendMessage: async (message: import('@/src/lib/saved-session-storage').SavedSessionMutationMessage) =>
        (await import('@/src/lib/saved-session-storage')).handleSavedSessionMutation(message),
      getURL: (path: string) => `chrome-extension://test/${path}`,
      id: 'test',
    },
    tabs: {
      create: vi.fn(),
      sendMessage: vi.fn(),
    },
  },
}));

vi.mock('@/src/lib/pdf', () => ({
  exportSessionPdf: vi.fn(async () => ({ ok: true, method: 'print' as const })),
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function studySession(
  id = 'panel-refresh-race',
  question = 'Find the net force',
  topic = 'Newton',
): Session {
  return {
    id,
    createdAt: 0,
    updatedAt: 0,
    platform: 'gemini',
    question,
    raw: '',
    capsule: {
      meta: { version: 1, subject: 'Physics', topic },
      solution: `${question} → solved`,
      solutionDiagrams: [],
      steps: [
        {
          id: 's1',
          index: 0,
          title: 'Write F = ma',
          body: 'Net force equals mass times acceleration.',
        },
      ],
    },
  };
}

function storedIds(): string[] {
  const list = storageData[SAVED_SESSIONS_KEY];
  if (!Array.isArray(list)) return [];
  return list.map((row) => (row as { id: string }).id);
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function mountPanel() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  act(() => {
    root = createRoot(container);
    root.render(<Panel />);
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

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(storageData)) {
    delete storageData[key];
  }
  mockLocalStorage.set.mockImplementation(async (items: Record<string, unknown>) => {
    Object.assign(storageData, items);
  });
  useStore.setState({
    panelOpen: false,
    status: 'idle',
    errorMessage: undefined,
    view: 'steps',
    theme: 'light',
    splitRatio: 0.5,
    splitDragging: false,
    sessions: [],
    activeSessionId: undefined,
    activeStepIndex: 0,
  });
});

afterEach(() => {
  useStore.getState().resetSessions();
  useStore.setState({ panelOpen: false, status: 'idle', view: 'steps', theme: 'light' });
});

describe('Panel save membership', () => {
  it('keeps the current answer unsaved when a different answer finishes saving', async () => {
    const a = studySession('pending-save-a', 'Question Alpha');
    const b = studySession('pending-save-b', 'Question Beta');
    useStore.getState().addSession(a);
    useStore.getState().addSession(b);
    useStore.getState().setActiveSession(a.id);
    useStore.setState({ panelOpen: true, status: 'ready' });
    const { container, unmount } = mountPanel();
    await flush();
    let release = () => {};
    const held = new Promise<void>((resolve) => { release = resolve; });
    mockLocalStorage.set.mockImplementationOnce(async (items) => {
      await held;
      Object.assign(storageData, items);
    });
    try {
      act(() => { (container.querySelector('button[aria-label="Save question"]') as HTMLButtonElement).click(); });
      await flush();
      act(() => { useStore.getState().setActiveSession(b.id); });
      await flush();
      release();
      await flush();
      expect(await isSessionSaved(a.id)).toBe(true);
      expect(await isSessionSaved(b.id)).toBe(false);
      expect(container.querySelector('button[aria-label="Save question"]')).toBeTruthy();
      expect(container.querySelector('button[aria-label="Remove from saved questions"]')).toBeNull();
    } finally {
      release();
      unmount();
    }
  });

  it('saves an answer structured from the chat as one, and keeps it so when the saved copy is refreshed', async () => {
    const plain: Session = { ...studySession('plain-answer'), raw: '1. Write F = ma.\n2. Solve for a.', origin: 'ingest' };
    useStore.getState().addSession(plain);
    useStore.setState({ panelOpen: true, status: 'ready' });
    const { container, unmount } = mountPanel();
    await flush();
    try {
      await act(async () => { (container.querySelector('button[aria-label="Save question"]') as HTMLButtonElement).click(); });
      await flush();
      const saved = () => (storageData[SAVED_SESSIONS_KEY] as Array<Record<string, unknown>>).find((row) => row.id === plain.id);
      expect(saved()).toMatchObject({ origin: 'ingest' });
      expect(saved()).not.toHaveProperty('raw');

      // The session object changes (a follow-up arrives): the panel rewrites the saved copy.
      act(() => {
        useStore.setState((s) => ({ sessions: s.sessions.map((x) => ({ ...x, question: 'Find the net force on the cart' })) }));
      });
      await flush();
      expect(saved()).toMatchObject({ question: 'Find the net force on the cart', origin: 'ingest' });
    } finally {
      unmount();
    }
  });

  it('shows Save after unsaving the active session', async () => {
    const session = studySession();
    storageData[SAVED_SESSIONS_KEY] = [sessionToSnapshot(session)];

    useStore.getState().addSession(session);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    const unsave = container.querySelector(
      'button[aria-label="Remove from saved questions"]',
    ) as HTMLButtonElement;
    expect(unsave).toBeTruthy();

    await act(async () => {
      unsave.click();
      await Promise.resolve();
    });
    await flush();

    expect(container.querySelector('button[aria-label="Save question"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Remove from saved questions"]')).toBeNull();
    expect(storedIds()).not.toContain(session.id);
    expect(await isSessionSaved(session.id)).toBe(false);
    unmount();
  });

  it('shows Save after unsaving A, switching to saved B, then back to A', async () => {
    const sessionA = studySession('sess-a', 'Question Alpha about impedance', 'RLC');
    const sessionB = studySession('sess-b', 'Question Beta about Newton', 'Newton');
    storageData[SAVED_SESSIONS_KEY] = [sessionToSnapshot(sessionA), sessionToSnapshot(sessionB)];

    useStore.getState().addSession(sessionA);
    useStore.getState().addSession(sessionB);
    useStore.getState().setActiveSession(sessionA.id);
    useStore.setState({ panelOpen: true, status: 'ready', view: 'steps', theme: 'light' });
    const { container, unmount } = mountPanel();
    await flush();

    expect(container.querySelector('.slm-topic')?.textContent).toContain('Question Alpha');
    expect(container.querySelector('button[aria-label="Remove from saved questions"]')).toBeTruthy();

    const unsave = container.querySelector(
      'button[aria-label="Remove from saved questions"]',
    ) as HTMLButtonElement;
    await act(async () => {
      unsave.click();
      await Promise.resolve();
    });
    await flush();

    expect(container.querySelector('button[aria-label="Save question"]')).toBeTruthy();
    expect(storedIds()).not.toContain(sessionA.id);
    expect(storedIds()).toContain(sessionB.id);

    act(() => {
      useStore.getState().setActiveSession(sessionB.id);
    });
    await flush();

    expect(container.querySelector('.slm-topic')?.textContent).toContain('Question Beta');
    expect(container.querySelector('button[aria-label="Remove from saved questions"]')).toBeTruthy();
    expect(await isSessionSaved(sessionB.id)).toBe(true);

    act(() => {
      useStore.getState().setActiveSession(sessionA.id);
    });
    await flush();

    expect(container.querySelector('.slm-topic')?.textContent).toContain('Question Alpha');
    expect(container.querySelector('button[aria-label="Save question"]')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Remove from saved questions"]')).toBeNull();
    expect(await isSessionSaved(sessionA.id)).toBe(false);
    expect(await isSessionSaved(sessionB.id)).toBe(true);
    expect(storedIds()).not.toContain(sessionA.id);
    expect(storedIds()).toContain(sessionB.id);

    unmount();
  });
});
