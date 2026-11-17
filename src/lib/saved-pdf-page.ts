/**
 * pdf.html entry logic. Default mode renders a saved report.
 * `mode=download` saves a real PDF to Downloads (D7): a saved question by `id`,
 * or the session a chat tab handed over by `job`. The window closes itself once
 * the file is saved; a failure stays on screen with a way to try again.
 * `mode=print` opens the print dialog.
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

interface Action {
  label: string;
  run: () => void;
}

interface Notice {
  title: string;
  detail: string;
  state?: 'busy' | 'done' | 'error';
  /** Share of the pages rendered so far, 0 to 1. The bar is drawn only while a build is running. */
  progress?: number;
  /** What the student can do from this window once something has gone wrong; the first is the main one. */
  actions?: readonly Action[];
}

const CLOSE: Action = { label: 'Close window', run: () => window.close() };

function element(tag: string, className: string, text = ''): HTMLElement {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function show({ title, detail, state = 'busy', progress, actions = [] }: Notice) {
  const root = document.getElementById('app');
  if (!root) return;
  const parts = [
    element('p', 'slm-saved-pdf-title', title),
    element('p', `slm-saved-pdf-status${state === 'error' ? ' is-error' : ''}`, detail),
  ];
  if (progress !== undefined) {
    const bar = element('div', 'slm-saved-pdf-progress');
    bar.setAttribute('aria-hidden', 'true');
    const fill = element('span', 'slm-saved-pdf-progress-fill');
    fill.style.width = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
    bar.append(fill);
    parts.push(bar);
  }
  const buttons = actions.map(({ label, run }, i) => {
    const button = element('button', `slm-saved-pdf-btn${i === 0 ? ' is-primary' : ''}`, label) as HTMLButtonElement;
    button.type = 'button';
    button.addEventListener('click', run);
    return button;
  });
  if (buttons.length > 0) {
    const row = element('div', 'slm-saved-pdf-actions');
    row.append(...buttons);
    parts.push(row);
  }
  root.dataset.state = state;
  // A failure interrupts; progress is only ever read out politely.
  root.setAttribute('role', state === 'error' ? 'alert' : 'status');
  root.replaceChildren(...parts);
  buttons[0]?.focus();
  document.title = `${title} - stemlm`;
}

async function download(session: Session): Promise<boolean> {
  show({ title: 'Exporting PDF', detail: 'Preparing the report…', progress: 0 });
  const result = await downloadSessionPdf(session, {
    onProgress: ({ page, total }) =>
      show({ title: 'Exporting PDF', detail: `Rendering page ${page} of ${total}…`, progress: page / total }),
  });
  if (!result.ok) {
    show({
      title: 'PDF not saved',
      detail: pdfFailureMessage(result.reason ?? 'render'),
      state: 'error',
      // The session was handed over once and is still in memory: the export can run again from here.
      actions: [{ label: 'Try again', run: () => void download(session) }, CLOSE],
    });
    return false;
  }
  show({ title: 'PDF saved', detail: 'It is in your Downloads folder. This window closes itself.', state: 'done' });
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
    show({
      title: 'Nothing to open',
      detail: 'This window was opened without a question. Close it and open the question from stemlm again.',
      state: 'error',
      actions: [CLOSE],
    });
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
    show(job
      ? {
          title: 'PDF not exported',
          detail: 'This export has expired. Export the PDF again from the panel.',
          state: 'error',
          actions: [CLOSE],
        }
      : {
          title: 'Saved question not found',
          detail: 'It is no longer in your saved questions. It may have been deleted.',
          state: 'error',
          actions: [CLOSE],
        });
    return { ok: false, mode };
  }

  if (mode === 'download') return { ok: await download(session), mode };

  if (mode === 'print') {
    show({ title: 'Printing', detail: 'Opening the print dialog. Choose “Save as PDF”.' });
    const result = await exportSessionPdf(session);
    if (result.ok) {
      show({ title: 'Print dialog open', detail: 'Choose “Save as PDF”, then close this window.', state: 'done' });
      return { ok: true, mode };
    }
    show({
      title: 'Could not print',
      detail: 'The print dialog did not open. Close this window and try again from stemlm.',
      state: 'error',
      actions: [CLOSE],
    });
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
    show({
      title: 'Could not open this saved answer',
      detail: 'Close this window and open it again from your saved questions.',
      state: 'error',
      actions: [CLOSE],
    });
    return { ok: false, mode };
  }
}
