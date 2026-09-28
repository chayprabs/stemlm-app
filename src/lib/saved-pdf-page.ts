/**
 * pdf.html entry logic. Default mode renders a saved report.
 * `mode=download` saves a real PDF to Downloads (D7): a saved question by `id`,
 * or the session a chat tab handed over by `job`. The window closes itself once
 * the file is saved; a failure stays on screen. `mode=print` opens the print dialog.
 */
import type { Session } from '@/src/protocol/types';
import { getSavedSession, snapshotToSession } from '@/src/lib/saved-sessions';
import { downloadSessionPdf, exportSessionPdf, renderSessionReportHtml } from '@/src/lib/pdf';
import { takePdfExportJob } from '@/src/lib/pdf-export-request';
import { pdfFailureMessage } from '@/src/lib/saved-library';

export type SavedPdfMode = 'view' | 'download' | 'print';

/** Long enough to read "PDF saved"; the file is already in Downloads. */
const CLOSE_AFTER_SAVE_MS = 1_200;

export function parseSavedPdfMode(value: string | null | undefined): SavedPdfMode {
  if (value === 'download' || value === 'print') return value;
  return 'view';
}

function show(title: string, detail: string, state: 'busy' | 'done' | 'error' = 'busy') {
  const root = document.getElementById('app');
  if (!root) return;
  const heading = document.createElement('p');
  heading.className = 'slm-saved-pdf-title';
  heading.textContent = title;
  const status = document.createElement('p');
  status.className = `slm-saved-pdf-status${state === 'error' ? ' is-error' : ''}`;
  status.textContent = detail;
  root.dataset.state = state;
  root.replaceChildren(heading, status);
}

async function download(session: Session): Promise<boolean> {
  show('Exporting PDF', 'Preparing the report…');
  const result = await downloadSessionPdf(session, {
    onProgress: ({ page, total }) => show('Exporting PDF', `Rendering page ${page} of ${total}…`),
  });
  if (!result.ok) {
    show('PDF not saved', pdfFailureMessage(result.reason ?? 'render'), 'error');
    return false;
  }
  show('PDF saved', 'It is in your Downloads folder. This window closes itself.', 'done');
  setTimeout(() => window.close(), CLOSE_AFTER_SAVE_MS);
  return true;
}

export async function runSavedPdfPage(
  search: string = typeof location === 'undefined' ? '' : location.search,
): Promise<{ ok: boolean; mode: SavedPdfMode }> {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const job = params.get('job')?.trim();
  const id = params.get('id')?.trim();
  const mode = parseSavedPdfMode(params.get('mode'));

  if (!job && !id) {
    show('PDF not available', 'Missing saved session id.', 'error');
    return { ok: false, mode };
  }

  let session: Session | null = null;
  try {
    if (job) session = await takePdfExportJob(job);
    else if (id) {
      const snapshot = await getSavedSession(id);
      session = snapshot ? snapshotToSession(snapshot) : null;
    }
  } catch {
    session = null;
  }
  if (!session) {
    show('PDF not available', job
      ? 'This export has expired. Export the PDF again from the panel.'
      : 'Saved session not found. It may have been deleted.', 'error');
    return { ok: false, mode };
  }

  if (mode === 'download') return { ok: await download(session), mode };

  if (mode === 'print') {
    show('Printing', 'Opening the print dialog. Choose “Save as PDF”.');
    const result = await exportSessionPdf(session);
    if (result.ok) {
      show('Print dialog open', 'Choose “Save as PDF”, then close this window.', 'done');
      return { ok: true, mode };
    }
    show('PDF not available', 'Could not prepare the PDF. Try again from the extension.', 'error');
    return { ok: false, mode };
  }

  try {
    const html = await renderSessionReportHtml(session);
    document.open();
    document.write(html);
    document.close();
    document.title = 'stemlm';
    return { ok: true, mode };
  } catch {
    show('PDF not available', 'Could not open the saved report. Try again from the extension.', 'error');
    return { ok: false, mode };
  }
}
