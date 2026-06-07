import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Session } from '@/src/protocol/types';

const { storageData, mockLocalStorage } = vi.hoisted(() => {
  const storageData: Record<string, unknown> = {};
  return {
    storageData,
    mockLocalStorage: {
      get: vi.fn(async (key: string) => ({ [key]: storageData[key] })),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
      }),
    },
  };
});

const { exportSessionPdfMock, tabsCreateMock } = vi.hoisted(() => ({
  exportSessionPdfMock: vi.fn(async () => ({ ok: true, method: 'print' as const })),
  tabsCreateMock: vi.fn(async () => ({ id: 1 })),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: mockLocalStorage,
    },
    tabs: {
      create: tabsCreateMock,
    },
    runtime: {
      getURL: (path: string) => `chrome-extension://test${path}`,
    },
  },
}));

vi.mock('./pdf', () => ({
  exportSessionPdf: exportSessionPdfMock,
}));

import {
  SAVED_SESSIONS_KEY,
  getSavedSessions,
  getSavedSession,
  saveSession,
  deleteSavedSession,
  isSessionSaved,
  downloadSavedSessionPdf,
  sessionToSnapshot,
  snapshotToSession,
  normalizeStoredSession,
} from './saved-sessions';

function makeSession(overrides: Partial<Session> & { id: string }): Session {
  const now = overrides.updatedAt ?? overrides.createdAt ?? 1_000;
  return {
    id: overrides.id,
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    platform: overrides.platform ?? 'gemini',
    question: overrides.question ?? `Question for ${overrides.id}`,
    capsule: overrides.capsule ?? {
      meta: { version: 1, subject: 'Math', topic: 'Algebra' },
      steps: [
        {
          id: 'step-1',
          index: 1,
          title: 'First step',
          body: 'Step body',
        },
      ],
      solution: 'x = 1',
      solutionDiagrams: [],
    },
    reviewedStepIds: overrides.reviewedStepIds ?? [],
    raw: overrides.raw ?? 'raw',
  };
}

function seedStorage(sessions: unknown[]): void {
  storageData[SAVED_SESSIONS_KEY] = sessions;
}

function storedSnapshots(): unknown[] {
  return storageData[SAVED_SESSIONS_KEY] as unknown[];
}

describe('saved-sessions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(storageData)) {
      delete storageData[key];
    }
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('sessionToSnapshot', () => {
    it('keeps question, steps, and solution for PDF export', () => {
      const snapshot = sessionToSnapshot(makeSession({ id: 'a', question: 'What is x?' }));
      expect(snapshot.question).toBe('What is x?');
      expect(snapshot.solution).toBe('x = 1');
      expect(snapshot.meta.topic).toBe('Algebra');
      expect(snapshot.steps).toHaveLength(1);
      expect(snapshot.steps[0]?.title).toBe('First step');
      expect(snapshot).not.toHaveProperty('capsule');
    });
  });

  describe('snapshotToSession', () => {
    it('rebuilds a session with steps for PDF export', () => {
      const snapshot = sessionToSnapshot(makeSession({ id: 'pdf' }));
      const session = snapshotToSession(snapshot);
      expect(session.capsule.steps).toHaveLength(1);
      expect(session.question).toBe('Question for pdf');
      expect(session.capsule.solution).toBe('x = 1');
    });
  });

  describe('normalizeStoredSession', () => {
    it('reads compact snapshots', () => {
      const normalized = normalizeStoredSession({
        id: 'snap',
        question: 'Q',
        savedAt: 100,
        platform: 'gemini',
        meta: { version: 1, subject: 'Math', topic: 'Topic' },
        solution: 'A',
        solutionDiagrams: [],
      });
      expect(normalized?.id).toBe('snap');
      expect(normalized?.solution).toBe('A');
    });

    it('migrates legacy full sessions', () => {
      const normalized = normalizeStoredSession(makeSession({ id: 'legacy' }));
      expect(normalized?.id).toBe('legacy');
      expect(normalized?.solution).toBe('x = 1');
      expect(normalized?.question).toBe('Question for legacy');
    });
  });

  describe('getSavedSessions', () => {
    it('returns an empty array when storage is empty', async () => {
      expect(await getSavedSessions()).toEqual([]);
    });

    it('sorts sessions by savedAt descending', async () => {
      seedStorage([
        { ...sessionToSnapshot(makeSession({ id: 'old' })), savedAt: 100 },
        { ...sessionToSnapshot(makeSession({ id: 'new' })), savedAt: 300 },
      ]);

      const sessions = await getSavedSessions();
      expect(sessions.map((s) => s.id)).toEqual(['new', 'old']);
    });
  });

  describe('saveSession', () => {
    it('stores a compact snapshot with steps', async () => {
      await saveSession(makeSession({ id: 'new', question: 'Integrate x' }));

      const stored = storedSnapshots()[0] as Record<string, unknown>;
      expect(stored.id).toBe('new');
      expect(stored.question).toBe('Integrate x');
      expect(stored.solution).toBe('x = 1');
      expect(stored).not.toHaveProperty('capsule');
      expect(Array.isArray(stored.steps)).toBe(true);
      expect((stored.steps as unknown[]).length).toBe(1);
    });

    it('updates an existing snapshot instead of duplicating it', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(9_000);

      seedStorage([sessionToSnapshot(makeSession({ id: 'dup', question: 'Old question' }))]);
      await saveSession(makeSession({ id: 'dup', question: 'New question' }));

      const stored = storedSnapshots() as Array<{ question: string; savedAt: number }>;
      expect(stored).toHaveLength(1);
      expect(stored[0]?.question).toBe('New question');
      expect(stored[0]?.savedAt).toBe(9_000);
    });

    it('enforces the MAX_SAVED limit of 100 sessions', async () => {
      const existing = Array.from({ length: 100 }, (_, i) => ({
        ...sessionToSnapshot(makeSession({ id: `s-${i}` })),
        savedAt: i + 1,
      }));
      seedStorage(existing);

      await saveSession(makeSession({ id: 'overflow' }));

      const stored = storedSnapshots() as Array<{ id: string }>;
      expect(stored).toHaveLength(100);
      expect(stored.some((s) => s.id === 'overflow')).toBe(true);
      expect(stored.some((s) => s.id === 's-0')).toBe(false);
    });
  });

  describe('deleteSavedSession', () => {
    it('removes a session by id', async () => {
      seedStorage([
        sessionToSnapshot(makeSession({ id: 'keep' })),
        sessionToSnapshot(makeSession({ id: 'drop' })),
      ]);

      await deleteSavedSession('drop');

      const ids = (storedSnapshots() as Array<{ id: string }>).map((s) => s.id);
      expect(ids).toEqual(['keep']);
    });
  });

  describe('isSessionSaved', () => {
    it('returns true when the session exists', async () => {
      seedStorage([sessionToSnapshot(makeSession({ id: 'saved' }))]);
      expect(await isSessionSaved('saved')).toBe(true);
    });

    it('returns false after deleteSavedSession', async () => {
      seedStorage([sessionToSnapshot(makeSession({ id: 'saved' }))]);
      await deleteSavedSession('saved');
      expect(await isSessionSaved('saved')).toBe(false);
    });
  });

  describe('downloadSavedSessionPdf', () => {
    it('opens the saved-pdf export tab for a stored snapshot', async () => {
      seedStorage([sessionToSnapshot(makeSession({ id: 'lib-1', question: 'Saved Q' }))]);

      const result = await downloadSavedSessionPdf('lib-1');
      expect(result.ok).toBe(true);
      expect(tabsCreateMock).toHaveBeenCalledOnce();
      expect(tabsCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({ url: expect.stringContaining('saved-pdf.html?id=lib-1') }),
      );
      expect(exportSessionPdfMock).not.toHaveBeenCalled();
    });

    it('returns failed when the id is missing', async () => {
      const result = await downloadSavedSessionPdf('missing');
      expect(result.ok).toBe(false);
      expect(tabsCreateMock).not.toHaveBeenCalled();
      expect(exportSessionPdfMock).not.toHaveBeenCalled();
    });
  });

  describe('getSavedSession', () => {
    it('returns the snapshot matching the id', async () => {
      seedStorage([
        sessionToSnapshot(makeSession({ id: 'other' })),
        sessionToSnapshot(makeSession({ id: 'target', question: 'Find me' })),
      ]);

      const found = await getSavedSession('target');
      expect(found?.id).toBe('target');
      expect(found?.question).toBe('Find me');
    });
  });
});
