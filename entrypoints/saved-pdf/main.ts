import { getSavedSession, snapshotToSession } from '@/src/lib/saved-sessions';
import { exportSessionPdf } from '@/src/lib/pdf';
import '../../assets/tailwind.css';
import '../../assets/pages.css';

function setStatus(message: string, isError = false) {
  const root = document.getElementById('app');
  if (!root) return;
  root.innerHTML = `<p class="slm-saved-pdf-status${isError ? ' is-error' : ''}">${message}</p>`;
}

async function main() {
  const id = new URLSearchParams(location.search).get('id')?.trim();
  if (!id) {
    setStatus('Missing saved session id.', true);
    return;
  }

  const snapshot = await getSavedSession(id);
  if (!snapshot) {
    setStatus('Saved session not found. It may have been deleted.', true);
    return;
  }

  setStatus('Opening print dialog — choose “Save as PDF”.');
  const result = await exportSessionPdf(snapshotToSession(snapshot));

  if (result.ok) {
    setStatus('Print dialog opened. Choose “Save as PDF”, then you can close this tab.');
    return;
  }

  setStatus('Could not prepare the PDF. Try again from the extension popup.', true);
}

void main();
