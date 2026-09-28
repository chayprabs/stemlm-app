/**
 * Saved-library PDF actions. Only extension pages import this module: it loads
 * the PDF stack, which never ships in a chat tab (D7).
 */
import { browser } from 'wxt/browser';
import { downloadSessionPdf, downloadSessionsPdf, type PdfExportResult } from './pdf';
import type { RenderOptions } from './pdf-raster';
import {
  getSavedSession, getSavedSessions, snapshotToSession, type SavedSessionSnapshot,
} from './saved-session-storage';

function savedPdfUrl(id: string): string {
  const runtime = browser.runtime as typeof browser.runtime & {
    getURL: (path: string) => string;
  };
  const url = new URL(runtime.getURL('/pdf.html'));
  url.searchParams.set('id', id);
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
