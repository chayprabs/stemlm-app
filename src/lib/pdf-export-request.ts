/**
 * PDF export hand-off (D7). A chat tab never builds a PDF itself: the panel
 * sends its session to the background, which parks it in session storage and
 * opens the extension's pdf.html page. That page makes the same direct
 * download as the saved library, so the PDF stack never loads in a chat tab.
 */
import { browser } from 'wxt/browser';
import type { Session } from '@/src/protocol/types';
import { restorableSessions } from '@/src/content/restored-sessions';
import { extensionAssetUrl } from '@/src/lib/extension-context';

export const PDF_EXPORT_MESSAGE = 'stemlm:export-pdf' as const;

export interface PdfExportMessage {
  type: typeof PDF_EXPORT_MESSAGE;
  session: Session;
}

const JOB_PREFIX = 'stemlm_pdf_job_';
const WINDOW = { width: 420, height: 240 };

export function isPdfExportMessage(msg: unknown): msg is PdfExportMessage {
  const rec = msg as { type?: unknown; session?: unknown } | null;
  return rec?.type === PDF_EXPORT_MESSAGE && typeof rec.session === 'object' && rec.session !== null;
}

async function sendPdfRequest(session: Session): Promise<boolean> {
  try {
    const response = await browser.runtime.sendMessage({ type: PDF_EXPORT_MESSAGE, session }) as { ok?: unknown } | undefined;
    return response?.ok === true;
  } catch {
    return false;
  }
}

let pending: Promise<boolean> | null = null;

/**
 * Content script: true once the export window is open. A second request made before the first
 * has been answered (a held key, a nervous second press) joins it instead of opening a second
 * window and saving the file twice.
 */
export function requestSessionPdf(session: Session): Promise<boolean> {
  pending ??= sendPdfRequest(session).finally(() => {
    pending = null;
  });
  return pending;
}

/** Background: park the session and open pdf.html centred over the chat window. */
export async function openPdfExportWindow(session: Session, windowId?: number): Promise<boolean> {
  const job = crypto.randomUUID();
  const key = JOB_PREFIX + job;
  try {
    await browser.storage.session.set({ [key]: session });
    const url = new URL(extensionAssetUrl('/pdf.html'));
    url.searchParams.set('job', job);
    url.searchParams.set('mode', 'download');
    const near = windowId == null ? undefined : await browser.windows.get(windowId).catch(() => undefined);
    const place = near?.left != null && near.top != null && near.width != null && near.height != null
      ? {
          left: Math.round(near.left + (near.width - WINDOW.width) / 2),
          top: Math.round(near.top + Math.max(0, (near.height - WINDOW.height) / 3)),
        }
      : {};
    await browser.windows.create({ url: url.href, type: 'popup', focused: true, ...WINDOW, ...place });
    return true;
  } catch {
    await browser.storage.session.remove(key).catch(() => {});
    return false;
  }
}

/** pdf.html: the parked session, handed over once. */
export async function takePdfExportJob(job: string): Promise<Session | null> {
  if (!/^[\w-]{8,}$/.test(job)) return null;
  const key = JOB_PREFIX + job;
  const value = (await browser.storage.session.get(key))[key];
  await browser.storage.session.remove(key);
  return restorableSessions([value]).sessions[0] ?? null;
}
