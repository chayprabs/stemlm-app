/** Saved-session client. Mutations run in the shared background writer; PDF actions live in saved-session-pdf.ts. */
import { browser } from 'wxt/browser';
import type { Session } from '@/src/protocol/types';
import { StorageQuotaError } from './storage-errors';
import {
  getSavedSessions,
  type SavedSessionMutationMessage,
  type SavedSessionMutationResponse,
} from './saved-session-storage';
export {
  SAVED_SESSIONS_KEY, SAVED_SESSION_RECORD_PREFIX, MAX_SAVED, MAX_SAVED_BYTES,
  getSavedSession, getSavedSessions, sessionToSnapshot, snapshotToSession,
  normalizeStoredSession, estimateSnapshotBytes,
  type SavedSessionSnapshot,
} from './saved-session-storage';

async function mutateSavedSession(message: SavedSessionMutationMessage): Promise<SavedSessionMutationResponse & { ok: true }> {
  const response = await browser.runtime.sendMessage(message) as SavedSessionMutationResponse | undefined;
  if (!response || typeof response.ok !== 'boolean') throw new Error('Could not update saved sessions. Try again.');
  if (!response.ok) {
    if (response.quota) throw new StorageQuotaError(response.message);
    throw new Error(response.message);
  }
  return response;
}

export async function saveSession(session: Session): Promise<void> {
  await mutateSavedSession({ type: 'stemlm:saved-session-mutation', action: 'save', session });
}

export async function refreshSavedSession(session: Session): Promise<boolean> {
  const response = await mutateSavedSession({ type: 'stemlm:saved-session-mutation', action: 'refresh', session });
  return response.result === true;
}

export async function deleteSavedSession(id: string): Promise<void> {
  await mutateSavedSession({ type: 'stemlm:saved-session-mutation', action: 'delete', id });
}

export async function isSessionSaved(id: string): Promise<boolean> {
  return (await getSavedSessions()).some((s) => s.id === id);
}
