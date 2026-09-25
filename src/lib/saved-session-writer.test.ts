import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '@/src/protocol/types';

const { records, sendMessage, remove } = vi.hoisted(() => {
  const records: Record<string, unknown> = {};
  return {
    records,
    sendMessage: vi.fn(),
    remove: vi.fn(async (keys: string[]) => { for (const key of keys) delete records[key]; }),
  };
});
vi.mock('wxt/browser', () => ({ browser: {
  runtime: { sendMessage },
  storage: { local: {
    get: async () => structuredClone(records),
    set: async (values: Record<string, unknown>) => { Object.assign(records, structuredClone(values)); },
    remove,
  } },
} }));
vi.mock('./pdf', () => ({ downloadSessionPdf: vi.fn(), downloadSessionsPdf: vi.fn(), exportSessionPdf: vi.fn() }));

import { saveSession, refreshSavedSession, deleteSavedSession, getSavedSessions, sessionToSnapshot, SAVED_SESSIONS_KEY, SAVED_SESSION_RECORD_PREFIX } from './saved-sessions';

function session(id: string): Session {
  return {
    id, platform: 'gemini', createdAt: 1, updatedAt: 1, raw: '', question: id,
    capsule: { meta: { version: 2, subject: 'Math', topic: 'Algebra' }, steps: [], solution: 'A complete answer', solutionDiagrams: [] },
  };
}

beforeEach(() => {
  for (const key of Object.keys(records)) delete records[key];
  sendMessage.mockReset().mockResolvedValue({ ok: true, result: { prunedCount: 0 } });
  remove.mockClear();
});

describe('shared saved-answer writer', () => {
  it('routes save, refresh, and delete through the extension background', async () => {
    await saveSession(session('a'));
    sendMessage.mockResolvedValueOnce({ ok: true, result: true });
    await refreshSavedSession(session('a'));
    sendMessage.mockResolvedValueOnce({ ok: true, result: null });
    await deleteSavedSession('a');
    expect(sendMessage.mock.calls.map(([message]) => message.action)).toEqual(['save', 'refresh', 'delete']);
    expect(records).toEqual({});
  });

  it('propagates the background quota failure without attempting another local write', async () => {
    sendMessage.mockResolvedValueOnce({ ok: false, quota: true, message: 'Storage is full' });
    await expect(saveSession(session('a'))).rejects.toThrow(/Storage is full/);
    expect(records).toEqual({});
  });

  it('migrates legacy durable records and removes their physical storage keys after commit', async () => {
    const writer = await import('./saved-session-storage');
    const snapshot = sessionToSnapshot(session('legacy'));
    const key = `${SAVED_SESSION_RECORD_PREFIX}legacy`;
    records[key] = { kind: 'snapshot', snapshot };
    sendMessage.mockImplementation(writer.handleSavedSessionMutation);
    await saveSession(session('new'));
    expect((await getSavedSessions()).map((row) => row.id).sort()).toEqual(['legacy', 'new']);
    expect(records[key]).toBeUndefined();
    expect(remove).toHaveBeenCalledWith([key]);
    expect((records[SAVED_SESSIONS_KEY] as unknown[])).toHaveLength(2);
  });

  it('serializes independently dispatched saves and deletion followed by refresh', async () => {
    const writer = await import('./saved-session-storage');
    sendMessage.mockImplementation(writer.handleSavedSessionMutation);
    await Promise.all([saveSession(session('a')), saveSession(session('b'))]);
    expect(sendMessage).toHaveBeenCalledTimes(2);
    expect((await getSavedSessions()).map((row) => row.id).sort()).toEqual(['a', 'b']);
    const [, refreshed] = await Promise.all([deleteSavedSession('a'), refreshSavedSession(session('a'))]);
    expect(refreshed).toBe(false);
    expect((await getSavedSessions()).map((row) => row.id)).toEqual(['b']);
  });

  it('rejects malformed mutation payloads before storage access', async () => {
    const writer = await import('./saved-session-storage');
    expect(writer.isSavedSessionMutationMessage({ type: 'stemlm:saved-session-mutation', action: 'save', session: { id: 'a' } })).toBe(false);
    expect(writer.isSavedSessionMutationMessage({ type: 'stemlm:saved-session-mutation', action: 'delete', id: '' })).toBe(false);
    expect(writer.isSavedSessionMutationMessage({ type: 'stemlm:saved-session-mutation', action: 'save', session: session('valid') })).toBe(true);
    expect(records).toEqual({});
  });
});
