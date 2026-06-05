/**
 * PDF export — fast, vector, textbook-style.
 *
 * The extension builds a self-contained HTML document (the Q./Ans. report with
 * step-synced **vector SVG** diagrams and math) and prints it via a hidden
 * iframe → the browser's "Save as PDF". This is dramatically faster than the
 * old html2canvas rasterisation and keeps text + diagrams crisp/selectable.
 *
 * Math is emitted as MathML (KaTeX's `htmlAndMathml` output) and rendered by the
 * browser's native MathML — so the PDF needs no KaTeX webfonts and still looks
 * like a textbook. Diagrams are pre-resolved to sanitised SVG, never raster/AI
 * images.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { Session } from '@/src/protocol/types';
import { Report, collectDiagrams } from '@/src/components/Report';
import { sanitizeSvg, extractSvg } from './sanitize';
import { renderMermaid } from './mermaid';
import { trackEvent } from './analytics';

export interface PdfExportResult {
  ok: boolean;
  method: 'print' | 'failed';
}

export function reportFilename(session: Session): string {
  const topic = (session.capsule.meta.topic || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  return `stemLM-${topic || 'session'}-${date}`;
}

/** Resolve every diagram in the session to a sanitized SVG string (vector). */
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

/**
 * Premium print stylesheet for stemLM reports. No KaTeX webfonts required: we
 * show the MathML KaTeX emits and hide the font-dependent HTML rendering.
 */
export function printStyles(): string {
  return `
*,*::before,*::after{box-sizing:border-box;}
@page{size:A4;margin:18mm 16mm;}
html,body{margin:0;padding:0;background:#fff;color:#1a1a2e;}
body{
  font:13.5px/1.65 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  -webkit-print-color-adjust:exact;
  print-color-adjust:exact;
}
.slm-report{max-width:680px;margin:0 auto;padding:0;}

/* ── Brand header ── */
.slm-report-head{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding-bottom:14px;
  margin-bottom:22px;
  border-bottom:1px solid #e4e4ef;
}
.slm-report-brand-lockup{display:flex;align-items:center;gap:10px;}
.slm-report-logo-mark{
  display:inline-block;
  width:28px;height:28px;
  border-radius:50%;
  flex-shrink:0;
  background:linear-gradient(135deg,#7c3aed 0%,#a78bfa 55%,#c4b5fd 100%);
  box-shadow:0 1px 3px rgba(124,58,237,.25);
}
.slm-report-brand{
  font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  font-weight:700;
  font-size:20px;
  letter-spacing:-.03em;
  color:#1a1a2e;
}
.slm-report-meta{
  display:flex;
  align-items:center;
  gap:6px;
  font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  font-size:11px;
  font-weight:500;
  color:#6b7280;
  text-align:right;
  line-height:1.4;
}
.slm-report-subject{color:#374151;font-weight:600;}
.slm-report-meta-sep{color:#d1d5db;}

/* ── Q. / Ans. sections ── */
.slm-report-question,
.slm-report-answer{
  display:grid;
  grid-template-columns:36px 1fr;
  gap:0 10px;
  margin-bottom:20px;
}
.slm-report-section-label,
.slm-report-label{
  font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  font-size:13px;
  font-weight:700;
  letter-spacing:.04em;
  text-transform:uppercase;
  color:#7c3aed;
  margin:0;
  padding-top:2px;
}
.slm-report-q-text{
  font-size:15px;
  font-weight:600;
  line-height:1.5;
  color:#111827;
  padding:10px 14px;
  background:#f9fafb;
  border-radius:8px;
  border:1px solid #eef0f4;
}
.slm-report-a-body{min-width:0;}

/* ── Steps ── */
.slm-report-step{
  margin:0 0 18px;
  padding:0 0 16px;
  border-bottom:1px solid #f0f0f5;
  page-break-inside:avoid;
  break-inside:avoid;
}
.slm-report-step:last-of-type{border-bottom:none;padding-bottom:0;}
.slm-report-step-head{margin-bottom:6px;}
.slm-report-step-title{
  font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  font-size:14px;
  font-weight:700;
  line-height:1.4;
  color:#1a1a2e;
  margin:0;
}
.slm-report-step-no{color:#7c3aed;font-weight:700;}

/* ── Formula blocks ── */
.slm-report-formula{
  margin:8px 0 10px;
  padding:10px 14px;
  background:#f3f4f6;
  border-radius:8px;
  border:1px solid #e5e7eb;
  overflow-x:auto;
}

/* ── Body copy ── */
.slm-report-body{margin:0 0 8px;color:#374151;}
.slm-report-body p{margin:0 0 8px;}
.slm-report-body p:last-child{margin-bottom:0;}

/* ── Takeaway boxes ── */
.slm-report-takeaway{
  font-size:12.5px;
  line-height:1.55;
  color:#4c1d95;
  background:#f5f3ff;
  border-left:3px solid #7c3aed;
  border-radius:0 8px 8px 0;
  padding:10px 14px;
  margin:10px 0 0;
}
.slm-report-takeaway-label{font-weight:700;color:#5b21b6;}
.slm-report-takeaway p{display:inline;margin:0;}

/* ── Solution section ── */
.slm-report-solution{
  margin-top:22px;
  padding-top:18px;
  border-top:2px solid #e4e4ef;
}
.slm-report-solution-head{margin-bottom:10px;}
.slm-report-solution-title{
  font-size:14px;
  font-weight:700;
  color:#1a1a2e;
  letter-spacing:.01em;
}
.slm-report-solution-body{color:#374151;}
.slm-report-solution-body p{margin:0 0 8px;}

/* ── Diagrams ── */
.slm-report-diagram{
  display:flex;
  justify-content:center;
  margin:12px 0;
  page-break-inside:avoid;
  break-inside:avoid;
}
.slm-report-diagram svg{max-width:100%;max-height:360px;width:auto;height:auto;}

/* ── Footer ── */
.slm-report-foot{
  margin-top:28px;
  padding-top:12px;
  border-top:1px solid #e4e4ef;
  text-align:center;
  font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;
  font-size:10px;
  font-weight:500;
  letter-spacing:.06em;
  text-transform:uppercase;
  color:#9ca3af;
}

/* ── Markdown extras ── */
ul,ol{margin:0 0 8px;padding-left:22px;}
li{margin:3px 0;}
table{border-collapse:collapse;width:100%;margin:0 0 8px;font-size:12.5px;}
th,td{border:1px solid #e5e7eb;padding:5px 8px;text-align:left;}
th{background:#f9fafb;font-weight:600;}
pre{
  white-space:pre-wrap;
  background:#f3f4f6;
  border:1px solid #e5e7eb;
  border-radius:8px;
  padding:10px 14px;
  font-size:12px;
  overflow-x:auto;
}
code{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.88em;}

/* Use native MathML (vector, font-independent) instead of KaTeX's HTML+webfonts. */
.katex .katex-html{display:none!important;}
.katex .katex-mathml{position:static!important;clip:auto!important;height:auto!important;width:auto!important;overflow:visible!important;}
.katex{font:inherit;}
math{font-size:1.05em;}
`;
}

/** Build the full, self-contained HTML document we print. */
export function buildReportDocument(session: Session, diagramSvg: Record<string, string>): string {
  const body = renderToStaticMarkup(createElement(Report, { session, diagramSvg }));
  const title = reportFilename(session);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>${printStyles()}</style></head><body>${body}</body></html>`;
}

export async function exportSessionPdf(session: Session): Promise<PdfExportResult> {
  let iframe: HTMLIFrameElement | null = null;
  try {
    const diagramSvg = await resolveDiagrams(session);
    const html = buildReportDocument(session, diagramSvg);

    iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    // Offscreen but laid out (print uses @page, not on-screen size).
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none;z-index:-1;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) throw new Error('no iframe document');

    doc.open();
    doc.write(html);
    doc.close();

    // Wait for layout + any webfonts the doc might use, then print just the
    // iframe. The print dialog's "Save as PDF" yields a vector PDF.
    await new Promise<void>((resolve) => {
      const go = async () => {
        try {
          await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
        } catch {
          /* ignore */
        }
        resolve();
      };
      if (doc.readyState === 'complete') setTimeout(go, 50);
      else win.addEventListener('load', () => setTimeout(go, 50), { once: true });
    });

    win.focus();
    win.print();

    // Remove the iframe shortly after; print() is synchronous w.r.t. the dialog.
    const toRemove = iframe;
    iframe = null;
    setTimeout(() => toRemove.remove(), 1000);

    void trackEvent('pdf_exported', { platform: session.platform, method: 'print' });
    return { ok: true, method: 'print' };
  } catch {
    iframe?.remove();
    void trackEvent('pdf_exported', { platform: session.platform, method: 'failed' });
    return { ok: false, method: 'failed' };
  }
}
