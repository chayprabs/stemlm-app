/** Saved-session client and PDF actions. Mutations run in the shared background writer. */
import { browser } from 'wxt/browser';
import type { Session } from '@/src/protocol/types';
import { downloadSessionPdf, downloadSessionsPdf, exportSessionPdf, type PdfExportResult } from './pdf';
import type { RenderOptions } from './pdf-raster';
import { StorageQuotaError } from './storage-errors';
import {
  getSavedSession, getSavedSessions, snapshotToSession,
  type SavedSessionSnapshot, type SavedSessionMutationMessage,
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

function savedPdfUrl(id: string, mode?: 'print' | 'download'): string {
  const runtime = browser.runtime as typeof browser.runtime & {
    getURL: (path: string) => string;
  };
  const url = new URL(runtime.getURL('/pdf.html'));
  url.searchParams.set('id', id);
  if (mode) url.searchParams.set('mode', mode);
  return url.href;
}

/** Download a real PDF into the default Downloads folder. No print dialog. */
export async function downloadSavedSessionPdf(
  id: string,
  options?: RenderOptions,
): Promise<PdfExportResult> {
  const snapshot = await getSavedSession(id);
  if (!snapshot) return { ok: false, method: 'failed', reason: 'empty' };
  return downloadSessionPdf(snapshotToSession(snapshot), options);
}

/**
 * Merge several saved questions into one PDF, in the order given. Ids that are
 * no longer in the library are skipped rather than failing the whole export.
 */
export async function downloadSavedSessionsPdf(
  ids: readonly string[],
  options?: RenderOptions,
): Promise<PdfExportResult> {
  const byId = new Map((await getSavedSessions()).map((s) => [s.id, s]));
  const chosen = ids
    .map((id) => byId.get(id))
    .filter((s): s is SavedSessionSnapshot => s !== undefined)
    .map(snapshotToSession);
  if (chosen.length === 0) return { ok: false, method: 'failed', reason: 'empty' };
  return downloadSessionsPdf(chosen, options);
}

/** Open the saved report in a popup window (no chat tab, no omnibox URL). */
export async function openSavedSessionPdf(id: string): Promise<PdfExportResult> {
  const snapshot = await getSavedSession(id);
  if (!snapshot) return { ok: false, method: 'failed' };

  try {
    await browser.windows.create({
      url: savedPdfUrl(id),
      type: 'popup',
      width: 820,
      height: 1040,
      focused: true,
    });
    return { ok: true, method: 'view' };
  } catch {
    return { ok: false, method: 'failed' };
  }
}

/** Print a saved snapshot in the current page (panel export path). */
export async function printSavedSessionPdf(id: string): Promise<PdfExportResult> {
  const snapshot = await getSavedSession(id);
  if (!snapshot) return { ok: false, method: 'failed' };
  return exportSessionPdf(snapshotToSession(snapshot));
}

export async function isSessionSaved(id: string): Promise<boolean> {
  return (await getSavedSessions()).some((s) => s.id === id);
}
