import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/src/protocol/types';

const { records, set } = vi.hoisted(() => {
  const records: Record<string, unknown> = {};
  return {
    records,
    set: vi.fn(async (values: Record<string, unknown>) => { Object.assign(records, values); }),
  };
});
vi.mock('wxt/browser', () => ({ browser: {
  runtime: { sendMessage: async (message: import('./saved-session-storage').SavedSessionMutationMessage) =>
    (await import('./saved-session-storage')).handleSavedSessionMutation(message) },
  storage: { local: {
  get: async () => structuredClone(records), set,
} } } }));
vi.mock('./pdf', () => ({ downloadSessionPdf: vi.fn(), downloadSessionsPdf: vi.fn(), exportSessionPdf: vi.fn() }));

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { deleteSavedSession, getSavedSession, getSavedSessions, MAX_SAVED, MAX_SAVED_BYTES, refreshSavedSession, saveSession, SAVED_SESSION_RECORD_PREFIX } from './saved-sessions';

function session(question = 'Find the roots'): Session {
  return {
    id: 'saved-answer', platform: 'gemini', createdAt: 1, updatedAt: 1, raw: '', question,
    capsule: { meta: { version: 2, subject: 'Math', topic: 'Algebra' }, steps: [], solution: 'A complete answer', solutionDiagrams: [] },
  };
}

beforeEach(() => {
  for (const key of Object.keys(records)) delete records[key];
  set.mockReset().mockImplementation(async (values) => { Object.assign(records, values); });
});

describe('PERSIST-01 saved answers are never deleted to make room (D12)', () => {
  const seed = (count: number) => {
    records.stemlm_saved_sessions = Array.from({ length: count }, (_, i) => ({
      id: `kept-${i}`, question: `Question ${i}`, savedAt: i + 1, platform: 'gemini',
      meta: { version: 2, subject: 'Math', topic: 'Algebra' }, steps: [], solution: 'answer', solutionDiagrams: [],
    }));
    records.stemlm_saved_sessions_version = 2;
  };

  it('keeps every older answer when the library grows past the old 100-item cap', async () => {
    seed(150);
    await saveSession({ ...session(), id: 'newest' });
    const ids = (await getSavedSessions()).map((row) => row.id);
    expect(ids).toHaveLength(151);
    expect(ids[0]).toBe('newest');
    expect(ids).toContain('kept-0');
  });

  it('refuses a new save with "Library full" at the cap and loses nothing', async () => {
    seed(MAX_SAVED);
    await expect(saveSession({ ...session(), id: 'one-too-many' })).rejects.toThrow(/Library full/);
    const ids = (await getSavedSessions()).map((row) => row.id);
    expect(ids).toHaveLength(MAX_SAVED);
    expect(ids).not.toContain('one-too-many');
    expect(ids).toContain('kept-0');
  });

  it('never prunes older answers to recover from a storage quota error', async () => {
    seed(8);
    set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
    await expect(saveSession({ ...session(), id: 'blocked' })).rejects.toThrow(/storage|space|quota/i);
    expect(set).toHaveBeenCalledTimes(1);
    expect(await getSavedSessions()).toHaveLength(8);
  });

  it('asks for unlimited extension storage so a large library fits', () => {
    const config = readFileSync(resolve(process.cwd(), 'wxt.config.ts'), 'utf8');
    expect(config.match(/permissions:\s*\[([^\]]*)\]/)?.[1]).toContain("'unlimitedStorage'");
  });
});

describe('truthful saved-answer failures', () => {
  it('rejects when quota recovery would discard the answer being saved', async () => {
    set.mockRejectedValueOnce(new Error('QUOTA_BYTES quota exceeded'));
    await expect(saveSession(session())).rejects.toThrow(/storage|space|quota/i);
    expect(await getSavedSession('saved-answer')).toBeUndefined();
  });

  it('preserves the previous snapshot when its refreshed answer exceeds the byte budget', async () => {
    await saveSession(session('Original question'));
    const oversized = session();
    oversized.capsule.solution = 'x'.repeat(MAX_SAVED_BYTES + 1);
    await expect(refreshSavedSession(oversized)).rejects.toThrow(/storage|space|quota/i);
    expect((await getSavedSession('saved-answer'))?.question).toBe('Original question');
  });

  // D12 (2026-09-24): nothing is evicted any more, so the old "evicted answer must not
  // resurrect" case becomes: every answer is kept, and a deleted one stays deleted.
  it('keeps all 101 saved answers and never resurrects a deleted one', async () => {
    for (let i = 0; i <= 100; i++) {
      await saveSession({ ...session(), id: `answer-${i}` });
    }
    const retained = await getSavedSessions();
    expect(retained).toHaveLength(101);
    const deletedId = retained[0]!.id;
    await deleteSavedSession(deletedId);
    await saveSession({ ...session(), id: 'after-delete' });
    expect(await getSavedSession(deletedId)).toBeUndefined();
    expect(await getSavedSessions()).toHaveLength(101);
    const durableSnapshots = Object.entries(records).filter(([key, value]) => key.startsWith(SAVED_SESSION_RECORD_PREFIX) && (value as { kind?: string }).kind === 'snapshot');
    expect(durableSnapshots.length).toBeLessThanOrEqual(100);
  });
});
