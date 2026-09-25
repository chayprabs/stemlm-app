import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import type { Session } from '@/src/protocol/types';

const { storageData, mockLocalStorage } = vi.hoisted(() => {
  const storageData: Record<string, unknown> = {};
  return {
    storageData,
    mockLocalStorage: {
        get: vi.fn(async (key: string | null) => key === null ? { ...storageData } : { [key]: storageData[key] }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        Object.assign(storageData, items);
      }),
      remove: vi.fn(async (keys: string[]) => {
        for (const key of keys) delete storageData[key];
      }),
    },
  };
});

const { exportSessionPdfMock, downloadSessionPdfMock, tabsCreateMock, tabsSendMessageMock, windowsCreateMock } =
  vi.hoisted(() => ({
    exportSessionPdfMock: vi.fn(async () => ({ ok: true, method: 'print' as const })),
    downloadSessionPdfMock: vi.fn(async () => ({ ok: true, method: 'download' as const })),
    tabsCreateMock: vi.fn(async () => ({ id: 1 })),
    tabsSendMessageMock: vi.fn(async () => ({ ok: true })),
    windowsCreateMock: vi.fn(async () => ({ id: 9 })),
  }));

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: mockLocalStorage,
    },
    tabs: {
      create: tabsCreateMock,
      sendMessage: tabsSendMessageMock,
    },
    windows: {
      create: windowsCreateMock,
    },
    runtime: {
      sendMessage: async (message: import('@/src/lib/saved-session-storage').SavedSessionMutationMessage) =>
        (await import('@/src/lib/saved-session-storage')).handleSavedSessionMutation(message),
      getURL: (path: string) => `chrome-extension://test${path}`,
    },
  },
}));

vi.mock('./pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pdf')>();
  return {
    ...actual,
    exportSessionPdf: exportSessionPdfMock,
    downloadSessionPdf: downloadSessionPdfMock,
  };
});

import {
  SAVED_SESSIONS_KEY,
  SAVED_SESSION_RECORD_PREFIX,
  getSavedSessions,
  getSavedSession,
  saveSession,
  deleteSavedSession,
  isSessionSaved,
  downloadSavedSessionPdf,
  openSavedSessionPdf,
  refreshSavedSession,
  sessionToSnapshot,
  snapshotToSession,
  normalizeStoredSession,
  estimateSnapshotBytes,
  MAX_SAVED_BYTES,
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
  // D12 (2026-09-24): migration keeps every legacy record (it used to prune past 100
  // items / 4 MB); each migrated per-record key is cleaned up once the aggregate commits.
  it.each([false, true])('PERS-03 migrates every legacy record without pruning (over the old byte budget: %s)', async (overBytes) => {
    const count = overBytes ? 10 : 150;
    const legacy = Array.from({ length: count }, (_, i) => {
      const session = makeSession({ id: `legacy-${i}` });
      if (overBytes) session.capsule.steps[0]!.body = 'x'.repeat(Math.ceil(MAX_SAVED_BYTES / 7));
      const snapshot = { ...sessionToSnapshot(session), savedAt: i + 1 };
      const key = `${SAVED_SESSION_RECORD_PREFIX}${encodeURIComponent(snapshot.id)}`;
      storageData[key] = { kind: 'snapshot', snapshot };
      return { key, snapshot };
    });
    await saveSession(makeSession({ id: 'newest' }));
    const aggregate = await getSavedSessions();
    expect(aggregate).toHaveLength(count + 1);
    for (const { key, snapshot } of legacy) {
      expect(aggregate.some((row) => row.id === snapshot.id)).toBe(true);
      expect(storageData[key]).toBeUndefined();
    }
    console.log(`PERS-03 legacy=${count} visible=${aggregate.length}`);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(storageData)) {
      delete storageData[key];
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
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
      await expect(saveSession(makeSession({ id: 'new', question: 'Integrate x' }))).resolves.toBeUndefined();

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

    it('overwrites the stored solution and steps with the latest capsule', async () => {
      await saveSession(
        makeSession({
          id: 'dup',
          question: 'Find x',
          capsule: {
            meta: { version: 1, subject: 'Math', topic: 'Algebra' },
            steps: [{ id: 'step-1', index: 1, title: 'Guess', body: 'try x = 1' }],
            solution: 'x = 1',
            solutionDiagrams: [],
          },
        }),
      );

      await saveSession(
        makeSession({
          id: 'dup',
          question: 'Find x',
          capsule: {
            meta: { version: 1, subject: 'Math', topic: 'Algebra' },
            steps: [
              { id: 'step-1', index: 1, title: 'Write the equation', body: 'x + 1 = 43' },
              { id: 'step-2', index: 2, title: 'Isolate x', body: 'x = 42' },
            ],
            solution: 'x = 42',
            solutionDiagrams: [],
          },
        }),
      );

      const stored = storedSnapshots() as Array<{
        id: string;
        solution: string;
        steps: Array<{ title: string }>;
      }>;
      expect(stored).toHaveLength(1);
      expect(stored[0]?.id).toBe('dup');
      expect(stored[0]?.solution).toBe('x = 42');
      expect(stored[0]?.steps.map((s) => s.title)).toEqual(['Write the equation', 'Isolate x']);
    });

    // D12: the 101st save used to evict the oldest; now every save is kept.
    it('keeps the oldest saved answer when the 101st is saved', async () => {
      const existing = Array.from({ length: 100 }, (_, i) => ({
        ...sessionToSnapshot(makeSession({ id: `s-${i}` })),
        savedAt: i + 1,
      }));
      seedStorage(existing);

      await saveSession(makeSession({ id: 'overflow' }));

      const stored = storedSnapshots() as Array<{ id: string }>;
      expect(stored).toHaveLength(101);
      expect(stored[0]?.id).toBe('overflow');
      expect(stored.some((s) => s.id === 's-0')).toBe(true);
    });

    // D12: a legacy per-record snapshot the old 100-item limit hid is a real saved
    // answer; with nothing evicted any more, migration keeps it.
    it('keeps a legacy durable record the old aggregate limit had hidden', async () => {
      const aggregate = Array.from({ length: 100 }, (_, i) => ({
        ...sessionToSnapshot(makeSession({ id: `s-${i}` })),
        savedAt: i + 1,
      }));
      const pruned = { ...sessionToSnapshot(makeSession({ id: 'pruned' })), savedAt: 0 };
      storageData[SAVED_SESSIONS_KEY] = aggregate;
      storageData[`${SAVED_SESSION_RECORD_PREFIX}${encodeURIComponent(pruned.id)}`] = {
        kind: 'snapshot',
        snapshot: pruned,
      };

      await saveSession(makeSession({ id: 'newest' }));

      expect((await getSavedSessions()).some((session) => session.id === 'pruned')).toBe(true);
    });
  });

  it('merges durable per-record snapshots so independent contexts cannot lose a save', async () => {
    const a = sessionToSnapshot(makeSession({ id: 'a', question: 'alpha' }));
    const b = sessionToSnapshot(makeSession({ id: 'b', question: 'beta' }));
    storageData[SAVED_SESSIONS_KEY] = [a];
    storageData['stemlm_saved_session_record_a-v1'] = { kind: 'snapshot', snapshot: a };
    storageData['stemlm_saved_session_record_b-v1'] = { kind: 'snapshot', snapshot: b };

    expect((await getSavedSessions()).map((session) => session.id).sort()).toEqual(['a', 'b']);
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

  describe('refreshSavedSession', () => {
    it('overwrites an already-saved snapshot with the latest capsule', async () => {
      await saveSession(
        makeSession({
          id: 'keep',
          question: 'Find the current',
          capsule: {
            meta: { version: 1, subject: 'Electrical', topic: 'Ohm' },
            steps: [{ id: 'step-1', index: 1, title: 'Draft', body: 'I = V/R?' }],
            solution: 'I = 1 A',
            solutionDiagrams: [],
          },
        }),
      );

      const ok = await refreshSavedSession(
        makeSession({
          id: 'keep',
          question: 'Find the current',
          capsule: {
            meta: { version: 1, subject: 'Electrical', topic: 'Ohm' },
            steps: [{ id: 'step-1', index: 1, title: 'Ohm’s law', body: 'I = V/R' }],
            solution: 'I = 2 A',
            solutionDiagrams: [],
          },
        }),
      );

      expect(ok).toBe(true);
      const found = await getSavedSession('keep');
      expect(found?.solution).toBe('I = 2 A');
      expect(found?.steps[0]?.title).toBe('Ohm’s law');
      expect(await getSavedSessions()).toHaveLength(1);
    });

    it('does not create a snapshot when the id is not saved', async () => {
      expect(await refreshSavedSession(makeSession({ id: 'ghost' }))).toBe(false);
      expect(await getSavedSessions()).toEqual([]);
    });

    it('does not resurrect a snapshot when delete runs during an in-flight refresh write', async () => {
      await saveSession(makeSession({ id: 'keep', question: 'Keep me?' }));

      let releaseWrite = () => {};
      const holdWrite = new Promise<void>((resolve) => {
        releaseWrite = resolve;
      });
      let notifyHeld = () => {};
      const held = new Promise<void>((resolve) => {
        notifyHeld = resolve;
      });

      mockLocalStorage.set.mockImplementation(async (items: Record<string, unknown>) => {
        const list = items[SAVED_SESSIONS_KEY];
        if (Array.isArray(list) && list.some((row) => (row as { id?: string }).id === 'keep')) {
          notifyHeld();
          await holdWrite;
        }
        Object.assign(storageData, items);
      });

      try {
        const pendingRefresh = refreshSavedSession(
          makeSession({ id: 'keep', question: 'Resurrect?' }),
        );
        await held;
        const pendingDelete = deleteSavedSession('keep');
        releaseWrite();
        await pendingRefresh;
        await pendingDelete;
        expect(await getSavedSession('keep')).toBeUndefined();
        expect(await isSessionSaved('keep')).toBe(false);
      } finally {
        releaseWrite();
        mockLocalStorage.set.mockImplementation(async (items: Record<string, unknown>) => {
          Object.assign(storageData, items);
        });
      }
    });
  });

  describe('downloadSavedSessionPdf', () => {
    it('saves a PDF file for a stored snapshot, without printing', async () => {
      seedStorage([sessionToSnapshot(makeSession({ id: 'lib-1', question: 'Saved Q' }))]);
      const createObjectURL = vi.spyOn(URL, 'createObjectURL');
      const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);

      const result = await downloadSavedSessionPdf('lib-1');
      expect(result).toEqual({ ok: true, method: 'download' });
      expect(downloadSessionPdfMock).toHaveBeenCalledOnce();
      expect(exportSessionPdfMock).not.toHaveBeenCalled();
      expect(print).not.toHaveBeenCalled();
      expect(createObjectURL).not.toHaveBeenCalled();
      expect(tabsCreateMock).not.toHaveBeenCalled();
      expect(tabsSendMessageMock).not.toHaveBeenCalled();
      vi.unstubAllGlobals();
    });

    it('returns failed when the id is missing', async () => {
      const result = await downloadSavedSessionPdf('missing');
      expect(result.ok).toBe(false);
      expect(tabsCreateMock).not.toHaveBeenCalled();
      expect(exportSessionPdfMock).not.toHaveBeenCalled();
      expect(downloadSessionPdfMock).not.toHaveBeenCalled();
    });
  });

  describe('openSavedSessionPdf', () => {
    it('opens a viewer window that does not auto-print', async () => {
      seedStorage([sessionToSnapshot(makeSession({ id: 'lib-1', question: 'Saved Q' }))]);
      const result = await openSavedSessionPdf('lib-1');
      expect(result).toEqual({ ok: true, method: 'view' });
      expect(windowsCreateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          url: expect.stringContaining('pdf.html?id=lib-1'),
          type: 'popup',
          focused: true,
        }),
      );
      const created = (windowsCreateMock.mock.calls as Array<[{ url?: string }?]>)[0]?.[0];
      const url = String(created?.url ?? '');
      expect(url).not.toMatch(/mode=/);
      expect(url).not.toMatch(/gemini\.google/);
      expect(url).not.toContain('stemlm:load-conversation');
      expect(exportSessionPdfMock).not.toHaveBeenCalled();
      expect(tabsCreateMock).not.toHaveBeenCalled();
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
