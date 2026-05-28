/**
 * PDF export. Builds a clean, print-styled report of a session (stemLM header,
 * each step with formula/diagram/takeaway, and the full solution) and turns it
 * into a downloadable PDF. Fully implemented in M6; this module owns the
 * report-building contract.
 */
import type { Session } from '@/src/protocol/types';

export interface PdfExportResult {
  ok: boolean;
  method: 'html2pdf' | 'print' | 'failed';
}

let counter = 0;
export function reportFilename(session: Session): string {
  const topic = (session.capsule.meta.topic || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  return `stemLM-${topic || 'session'}-${date}-${++counter}.pdf`;
}

// Implemented in M6.
export async function exportSessionPdf(_session: Session): Promise<PdfExportResult> {
  return { ok: false, method: 'failed' };
}
