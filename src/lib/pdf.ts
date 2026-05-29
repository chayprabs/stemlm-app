/**
 * PDF export. Builds a clean, print-styled report of a session (stemLM header,
 * each step with formula/diagram/takeaway, and the full solution) and turns it
 * into a downloadable PDF via html2pdf.js. Diagrams are pre-rendered to SVG so
 * the report is fully synchronous. The report is mounted inside the panel's
 * shadow root so KaTeX/panel styles apply, then captured.
 *
 * Falls back to the browser print dialog if html2pdf fails.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { Session } from '@/src/protocol/types';
import { Report, collectDiagrams } from '@/src/components/Report';
import { sanitizeSvg, extractSvg } from './sanitize';
import { renderMermaid } from './mermaid';
import { getReportMount } from '@/src/content/mount';
import { trackEvent } from './analytics';

export interface PdfExportResult {
  ok: boolean;
  method: 'html2pdf' | 'print' | 'failed';
}

export function reportFilename(session: Session): string {
  const topic = (session.capsule.meta.topic || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  return `stemLM-${topic || 'session'}-${date}.pdf`;
}

/** Resolve every diagram in the session to a sanitized SVG string. */
async function resolveDiagrams(session: Session): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const { key, diagram } of collectDiagrams(session)) {
    try {
      if (diagram.type === 'svg') {
        map[key] = sanitizeSvg(extractSvg(diagram.content));
      } else {
        map[key] = await renderMermaid(diagram.content, 'light');
      }
    } catch {
      map[key] = '';
    }
  }
  return map;
}

export async function exportSessionPdf(session: Session): Promise<PdfExportResult> {
  let holder: HTMLDivElement | null = null;
  try {
    const diagramSvg = await resolveDiagrams(session);
    const html = renderToStaticMarkup(createElement(Report, { session, diagramSvg }));

    holder = document.createElement('div');
    holder.className = 'slm-report-holder';
    holder.innerHTML = html;
    getReportMount().appendChild(holder);

    const reportEl = holder.firstElementChild as HTMLElement;

    const { default: html2pdf } = await import('html2pdf.js');
    await html2pdf()
      .set({
        margin: [10, 10, 12, 10],
        filename: reportFilename(session),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: '.slm-report-step' },
      })
      .from(reportEl)
      .save();

    void trackEvent('pdf_exported', { platform: session.platform, method: 'html2pdf' });
    return { ok: true, method: 'html2pdf' };
  } catch {
    const ok = printFallback();
    void trackEvent('pdf_exported', { platform: session.platform, method: ok ? 'print' : 'failed' });
    return { ok, method: ok ? 'print' : 'failed' };
  } finally {
    if (holder && holder.parentElement) holder.parentElement.removeChild(holder);
  }
}

/** Last-resort fallback: open a print window with the report markup. */
function printFallback(): boolean {
  try {
    window.print();
    return true;
  } catch {
    return false;
  }
}
