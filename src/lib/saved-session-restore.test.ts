/** Undo of a delete in the saved library, and the reads that must survive a damaged record. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { records, get } = vi.hoisted(() => {
  const records: Record<string, unknown> = {};
  return { records, get: vi.fn(async () => structuredClone(records)) };
});
vi.mock('wxt/browser', () => ({ browser: {
  runtime: { sendMessage: async (message: import('./saved-session-storage').SavedSessionMutationMessage) =>
    (await import('./saved-session-storage')).handleSavedSessionMutation(message) },
  storage: { local: {
    get,
    set: async (values: Record<string, unknown>) => { Object.assign(records, structuredClone(values)); },
  } } } }));
vi.mock('./pdf', () => ({ downloadSessionPdf: vi.fn(), downloadSessionsPdf: vi.fn(), exportSessionPdf: vi.fn() }));

import {
  MAX_SAVED, deleteSavedSession, getSavedSessions, normalizeStoredSession, readSavedSessions,
  restoreSavedSession, saveSession, type SavedSessionSnapshot,
} from './saved-sessions';
import { isSavedSessionMutationMessage } from './saved-session-storage';
import { pdfFailureMessage } from './saved-library';

function snapshot(id: string, savedAt: number, fields: Partial<SavedSessionSnapshot> = {}): SavedSessionSnapshot {
  return {
    id, question: `Question ${id}`, savedAt, platform: 'claude',
    meta: { version: 2, subject: 'Math', topic: 'Algebra' },
    steps: [{ id: 's1', index: 1, title: 'Work', body: 'show work' }],
    solution: 'answer', solutionDiagrams: [], ...fields,
  };
}

function seed(list: unknown[]) {
  records.stemlm_saved_sessions = list;
  records.stemlm_saved_sessions_version = 2;
}

beforeEach(() => {
  for (const key of Object.keys(records)) delete records[key];
  get.mockClear();
});

describe('restoring a deleted saved question', () => {
  it('puts the snapshot back as it was, in its old place by date', async () => {
    const [newest, middle, oldest] = [snapshot('n', 300), snapshot('m', 200, { origin: 'ingest' }), snapshot('o', 100)];
    seed([newest, middle, oldest]);
    await deleteSavedSession('m');
    expect((await getSavedSessions()).map((row) => row.id)).toEqual(['n', 'o']);

    await restoreSavedSession(middle);
    const rows = await getSavedSessions();
    expect(rows.map((row) => row.id)).toEqual(['n', 'm', 'o']);
    // Not saved again: the date it was saved on, and that it came from a plain chat answer, are kept.
    expect(rows[1]).toEqual(middle);
  });

  it('keeps the newer copy when the question was saved again in the meantime', async () => {
    const old = snapshot('q', 100, { solution: 'old answer' });
    seed([old]);
    await deleteSavedSession('q');
    await saveSession({
      id: 'q', createdAt: 1, updatedAt: 1, platform: 'claude', question: 'Question q', raw: '',
      capsule: { meta: old.meta, steps: old.steps, solution: 'new answer', solutionDiagrams: [] },
    });
    await restoreSavedSession(old);
    const rows = await getSavedSessions();
    expect(rows).toHaveLength(1);
    expect(rows[0]?.solution).toBe('new answer');
  });

  it('refuses something that is not a saved question, before touching storage', async () => {
    expect(isSavedSessionMutationMessage({ type: 'stemlm:saved-session-mutation', action: 'restore', snapshot: { id: 'x' } })).toBe(false);
    expect(isSavedSessionMutationMessage({ type: 'stemlm:saved-session-mutation', action: 'restore' })).toBe(false);
    expect(isSavedSessionMutationMessage({ type: 'stemlm:saved-session-mutation', action: 'restore', snapshot: snapshot('ok', 1) })).toBe(true);
    await expect(restoreSavedSession({ id: 'x' } as SavedSessionSnapshot)).rejects.toThrow();
    expect(get).not.toHaveBeenCalled();
  });

  it('does not grow the library past its limit, and loses nothing when it refuses', async () => {
    seed(Array.from({ length: MAX_SAVED }, (_, i) => snapshot(`kept-${i}`, i + 1)));
    await expect(restoreSavedSession(snapshot('extra', 5))).rejects.toThrow(/Library full/);
    expect(await getSavedSessions()).toHaveLength(MAX_SAVED);
  });
});

describe('reading the library', () => {
  it('tells a failed read from an empty library, for the page that must not call it empty', async () => {
    get.mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(readSavedSessions()).rejects.toThrow('storage unavailable');
    get.mockRejectedValueOnce(new Error('storage unavailable'));
    // Everywhere else a missing library is simply no saved questions.
    expect(await getSavedSessions()).toEqual([]);
    expect(await readSavedSessions()).toEqual([]);
  });

  it('gives a record a usable saved time when the stored one is not a time', () => {
    const before = Date.now();
    for (const savedAt of [Number.NaN, Infinity, 1e300, '2024-01-01', null]) {
      const read = normalizeStoredSession({ ...snapshot('odd', 1), savedAt });
      expect(read?.savedAt, String(savedAt)).toBeGreaterThanOrEqual(before);
      expect(Number.isFinite(new Date(read!.savedAt).getTime())).toBe(true);
    }
    expect(normalizeStoredSession({ ...snapshot('fine', 1), savedAt: 1234 })?.savedAt).toBe(1234);
    expect(normalizeStoredSession({ ...snapshot('legacy', 1), savedAt: undefined, updatedAt: 99 })?.savedAt).toBe(99);
  });

  it('drops entries that are not records and keeps the ones beside them', async () => {
    seed(['not a record', { id: 7, question: 'wrong types', meta: null }, null, snapshot('good', 10)]);
    expect((await getSavedSessions()).map((row) => row.id)).toEqual(['good']);
  });
});

describe('why a PDF was not made', () => {
  it('gives advice that fits one question or several', () => {
    expect(pdfFailureMessage('empty')).toBe('That question is no longer saved.');
    expect(pdfFailureMessage('empty', true)).toBe('Pick at least one question first.');
    expect(pdfFailureMessage('timeout')).not.toMatch(/merge/);
    expect(pdfFailureMessage('timeout', true)).toMatch(/merge fewer questions/);
    for (const reason of ['blank', 'empty', 'save', 'timeout', 'render'] as const) {
      for (const merged of [false, true]) {
        const message = pdfFailureMessage(reason, merged);
        expect(message, reason).toMatch(/\.$/);
        expect(message, reason).not.toMatch(/!|session|capsule|protocol/i);
      }
    }
  });
});
