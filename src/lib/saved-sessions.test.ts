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

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: mockLocalStorage,
    },
  },
}));

import {
  SAVED_SESSIONS_KEY,
  getSavedSessions,
  getSavedSession,
  saveSession,
  deleteSavedSession,
  isSessionSaved,
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
      steps: [],
      solution: 'x = 1',
      solutionDiagrams: [],
    },
    reviewedStepIds: overrides.reviewedStepIds ?? [],
    raw: overrides.raw ?? 'raw',
  };
}

function seedStorage(sessions: Session[]): void {
  storageData[SAVED_SESSIONS_KEY] = sessions;
}

function storedSessions(): Session[] {
  return storageData[SAVED_SESSIONS_KEY] as Session[];
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

  describe('getSavedSessions', () => {
    it('returns an empty array when storage is empty', async () => {
      expect(await getSavedSessions()).toEqual([]);
    });

    it('returns an empty array when the stored value is missing or not an array', async () => {
      storageData[SAVED_SESSIONS_KEY] = undefined;
      expect(await getSavedSessions()).toEqual([]);

      storageData[SAVED_SESSIONS_KEY] = { not: 'an array' };
      expect(await getSavedSessions()).toEqual([]);
    });

    it('returns an empty array when storage read throws', async () => {
      mockLocalStorage.get.mockRejectedValueOnce(new Error('storage unavailable'));
      expect(await getSavedSessions()).toEqual([]);
    });

    it('sorts sessions by updatedAt descending', async () => {
      seedStorage([
        makeSession({ id: 'old', updatedAt: 100 }),
        makeSession({ id: 'mid', updatedAt: 200 }),
        makeSession({ id: 'new', updatedAt: 300 }),
      ]);

      const sessions = await getSavedSessions();
      expect(sessions.map((s) => s.id)).toEqual(['new', 'mid', 'old']);
    });

    it('normalizes platform to gemini on read', async () => {
      seedStorage([
        {
          ...makeSession({ id: 'a' }),
          platform: 'other' as Session['platform'],
        },
      ]);

      const sessions = await getSavedSessions();
      expect(sessions[0]?.platform).toBe('gemini');
    });
  });

  describe('saveSession', () => {
    it('overwrites storage with only the new session when a read fails (known bug)', async () => {
      seedStorage([makeSession({ id: 'existing' })]);
      mockLocalStorage.get.mockRejectedValueOnce(new Error('storage unavailable'));

      await saveSession(makeSession({ id: 'replacement' }));

      expect(storedSessions().map((s) => s.id)).toEqual(['replacement']);
    });

    it('adds a new session to storage', async () => {
      const session = makeSession({ id: 'new' });
      await saveSession(session);

      expect(mockLocalStorage.set).toHaveBeenCalledOnce();
      const saved = storedSessions();
      expect(saved).toHaveLength(1);
      expect(saved[0]?.id).toBe('new');
      expect(saved[0]?.question).toBe('Question for new');
    });

    it('prepends a new session so the most recent appears first', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(5_000);

      seedStorage([makeSession({ id: 'existing', updatedAt: 4_000 })]);
      await saveSession(makeSession({ id: 'fresh', updatedAt: 1_000 }));

      const saved = storedSessions();
      expect(saved.map((s) => s.id)).toEqual(['fresh', 'existing']);
      expect(saved[0]?.updatedAt).toBe(5_000);
    });

    it('updates an existing session instead of duplicating it', async () => {
      vi.useFakeTimers();
      vi.setSystemTime(9_000);

      seedStorage([makeSession({ id: 'dup', question: 'Old question', updatedAt: 1_000 })]);
      await saveSession(makeSession({ id: 'dup', question: 'New question', updatedAt: 2_000 }));

      const saved = storedSessions();
      expect(saved).toHaveLength(1);
      expect(saved[0]?.question).toBe('New question');
      expect(saved[0]?.updatedAt).toBe(9_000);
    });

    it('normalizes platform to gemini on write', async () => {
      await saveSession({
        ...makeSession({ id: 'platform' }),
        platform: 'other' as Session['platform'],
      });

      expect(storedSessions()[0]?.platform).toBe('gemini');
    });

    it('enforces the MAX_SAVED limit of 100 sessions', async () => {
      vi.useFakeTimers();

      const existing = Array.from({ length: 100 }, (_, i) =>
        makeSession({ id: `s-${i}`, updatedAt: i + 1 }),
      );
      seedStorage(existing);

      vi.setSystemTime(10_000);
      await saveSession(makeSession({ id: 'overflow', updatedAt: 0 }));

      const saved = storedSessions();
      expect(saved).toHaveLength(100);
      expect(saved.some((s) => s.id === 'overflow')).toBe(true);
      expect(saved.some((s) => s.id === 's-0')).toBe(false);
      expect(saved[0]?.id).toBe('overflow');
    });
  });

  describe('deleteSavedSession', () => {
    it('removes a session by id', async () => {
      seedStorage([
        makeSession({ id: 'keep', updatedAt: 200 }),
        makeSession({ id: 'drop', updatedAt: 100 }),
      ]);

      await deleteSavedSession('drop');

      expect(storedSessions().map((s) => s.id)).toEqual(['keep']);
    });

    it('is a no-op when the id does not exist', async () => {
      seedStorage([makeSession({ id: 'only', updatedAt: 100 })]);

      await deleteSavedSession('missing');

      expect(storedSessions().map((s) => s.id)).toEqual(['only']);
    });
  });

  describe('isSessionSaved', () => {
    it('returns true when the session exists', async () => {
      seedStorage([makeSession({ id: 'saved' })]);
      expect(await isSessionSaved('saved')).toBe(true);
    });

    it('returns false when the session does not exist', async () => {
      seedStorage([makeSession({ id: 'saved' })]);
      expect(await isSessionSaved('other')).toBe(false);
    });

    it('returns false when storage is empty', async () => {
      expect(await isSessionSaved('any')).toBe(false);
    });
  });

  describe('getSavedSession', () => {
    it('returns the session matching the id', async () => {
      const target = makeSession({ id: 'target', question: 'Find me' });
      seedStorage([makeSession({ id: 'other' }), target]);

      const found = await getSavedSession('target');
      expect(found?.id).toBe('target');
      expect(found?.question).toBe('Find me');
      expect(found?.platform).toBe('gemini');
    });

    it('returns undefined when no session matches', async () => {
      seedStorage([makeSession({ id: 'other' })]);
      expect(await getSavedSession('missing')).toBeUndefined();
    });
  });
});
