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
 * Clean, textbook-plain print stylesheet. No KaTeX webfonts required: we show
 * the MathML KaTeX emits and hide the font-dependent HTML rendering.
 */
export function printStyles(): string {
  return `
*{box-sizing:border-box;}
@page{size:A4;margin:16mm 15mm;}
html,body{margin:0;padding:0;background:#fff;color:#111;}
body{font:13px/1.55 Georgia,'Times New Roman',serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.slm-report{max-width:720px;margin:0 auto;padding:6px 2px;}
.slm-report-head{display:flex;align-items:baseline;justify-content:space-between;border-bottom:1.5px solid #111;padding-bottom:6px;margin-bottom:14px;}
.slm-report-brand{font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:18px;letter-spacing:-.02em;}
.slm-report-meta{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#555;}
.slm-report-label{font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:14px;margin-right:6px;}
.slm-report-q{display:flex;gap:4px;margin-bottom:16px;}
.slm-report-q-text{font-weight:600;}
.slm-report-a-body{margin-top:6px;}
.slm-report-step{margin:0 0 14px;page-break-inside:avoid;break-inside:avoid;}
.slm-report-step-title{font-family:Arial,Helvetica,sans-serif;font-size:13.5px;font-weight:700;margin:0 0 5px;}
.slm-report-step-no{color:#000;}
.slm-report-formula{margin:4px 0 6px;padding:2px 0;overflow-x:auto;}
.slm-report-body{margin:0 0 6px;}
.slm-report-body p{margin:0 0 6px;}
.slm-report-takeaway{font-size:12px;color:#333;border-left:2px solid #999;padding-left:8px;margin:6px 0;}
.slm-report-takeaway p{display:inline;margin:0;}
.slm-report-solution{margin-top:10px;padding-top:8px;border-top:1px solid #ddd;}
.slm-report-diagram{display:flex;justify-content:center;margin:8px 0;page-break-inside:avoid;break-inside:avoid;}
.slm-report-diagram svg{max-width:100%;max-height:360px;width:auto;height:auto;}
.slm-report-foot{margin-top:16px;padding-top:6px;border-top:1px solid #ddd;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:10px;color:#777;}
ul,ol{margin:0 0 6px;padding-left:20px;}
li{margin:2px 0;}
table{border-collapse:collapse;width:100%;margin:0 0 6px;font-size:12px;}
th,td{border:1px solid #ccc;padding:3px 6px;text-align:left;}
pre{white-space:pre-wrap;background:#f5f5f5;border:1px solid #e2e2e2;border-radius:4px;padding:6px;font-size:12px;overflow-x:auto;}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.9em;}
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
