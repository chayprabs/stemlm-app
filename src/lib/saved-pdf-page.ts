/**
 * pdf.html entry logic. Default mode renders the report.
 * `mode=download` / `mode=print` open the print dialog (Save as PDF).
 */
import { getSavedSession, snapshotToSession } from '@/src/lib/saved-sessions';
import { exportSessionPdf, renderSessionReportHtml } from '@/src/lib/pdf';

export type SavedPdfMode = 'view' | 'download' | 'print';

export function parseSavedPdfMode(value: string | null | undefined): SavedPdfMode {
  if (value === 'download' || value === 'print') return value;
  return 'view';
}

function setStatus(message: string, isError = false) {
  const root = document.getElementById('app');
  if (!root) return;
  root.innerHTML = `<p class="slm-saved-pdf-status${isError ? ' is-error' : ''}">${message}</p>`;
}

export async function runSavedPdfPage(
  search: string = typeof location === 'undefined' ? '' : location.search,
): Promise<{ ok: boolean; mode: SavedPdfMode }> {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const id = params.get('id')?.trim();
  const mode = parseSavedPdfMode(params.get('mode'));

  if (!id) {
    setStatus('Missing saved session id.', true);
    return { ok: false, mode };
  }

  const snapshot = await getSavedSession(id);
  if (!snapshot) {
    setStatus('Saved session not found. It may have been deleted.', true);
    return { ok: false, mode };
  }

  const session = snapshotToSession(snapshot);

  if (mode === 'print' || mode === 'download') {
    setStatus('Opening print dialog — choose “Save as PDF”.');
    const result = await exportSessionPdf(session);
    if (result.ok) {
      setStatus('Print dialog opened. Choose “Save as PDF”, then you can close this window.');
      return { ok: true, mode };
    }
    setStatus('Could not prepare the PDF. Try again from the extension.', true);
    return { ok: false, mode };
  }

  try {
    const html = await renderSessionReportHtml(session);
    document.open();
    document.write(html);
    document.close();
    document.title = 'stemLM';
    return { ok: true, mode };
  } catch {
    setStatus('Could not open the saved report. Try again from the extension.', true);
    return { ok: false, mode };
  }
}
