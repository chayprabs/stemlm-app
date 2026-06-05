/**
 * PDF export — vector, print-native, brand-aligned.
 *
 * Builds a self-contained HTML document and prints via a hidden iframe.
 * Math renders as MathML; diagrams as sanitised SVG.
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

export function printStyles(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box;}
@page{size:A4;margin:14mm 16mm;}
html,body{margin:0;padding:0;background:#fff;color:#0f1117;}
body{font:11.5pt/1.55 'Inter',ui-sans-serif,system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.slm-report{max-width:680px;margin:0 auto;}
.slm-report-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;margin-bottom:18px;border-bottom:2px solid #5b46e0;}
.slm-report-brand-wrap{display:flex;align-items:center;gap:8px;}
.slm-report-brand-dot{width:22px;height:22px;border-radius:6px;background:linear-gradient(135deg,#7c6bff,#5b46e0);}
.slm-report-brand{font-weight:800;font-size:17px;letter-spacing:-.02em;color:#0f1117;}
.slm-report-meta{font-size:9.5pt;color:#5c6370;font-weight:500;}
.slm-report-topic{margin:0 0 16px;font-size:14pt;font-weight:700;letter-spacing:-.02em;line-height:1.35;color:#0f1117;}
.slm-report-label{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:22px;padding:0 6px;font-weight:700;font-size:9pt;letter-spacing:.04em;text-transform:uppercase;border-radius:4px;background:#eeebff;color:#5b46e0;margin-right:8px;flex-shrink:0;}
.slm-report-q{display:flex;align-items:flex-start;margin-bottom:20px;padding:12px 14px;background:#f8f8fc;border:1px solid #e2e4ea;border-radius:8px;}
.slm-report-q-text{font-weight:600;font-size:11pt;line-height:1.45;}
.slm-report-a{display:flex;align-items:flex-start;}
.slm-report-a-body{flex:1;min-width:0;}
.slm-report-step{margin:0 0 16px;padding:12px 14px;border:1px solid #e2e4ea;border-radius:8px;page-break-inside:avoid;break-inside:avoid;background:#fafafb;}
.slm-report-step-title{font-size:11pt;font-weight:700;margin:0 0 8px;color:#0f1117;}
.slm-report-step-no{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;margin-right:6px;font-size:9pt;font-weight:700;border-radius:50%;background:linear-gradient(135deg,#7c6bff,#5b46e0);color:#fff;vertical-align:middle;}
.slm-report-formula{margin:6px 0 10px;padding:10px 12px;background:linear-gradient(135deg,rgba(22,163,74,.06),rgba(109,94,252,.04));border:1px solid rgba(22,163,74,.2);border-radius:6px;overflow-x:auto;}
.slm-report-formula-label{display:block;font-size:7.5pt;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#15803d;margin-bottom:4px;}
.slm-report-body{margin:0 0 6px;font-size:10.5pt;line-height:1.5;}
.slm-report-body p{margin:0 0 6px;}
.slm-report-takeaway{font-size:10pt;color:#3d4150;border-left:3px solid #6d5efc;padding:8px 12px;margin:8px 0 0;background:#f3f1ff;border-radius:0 6px 6px 0;}
.slm-report-takeaway-label{display:block;font-size:7.5pt;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#5b46e0;margin-bottom:3px;}
.slm-report-takeaway p{display:inline;margin:0;}
.slm-report-solution{margin-top:14px;padding:14px;border-top:2px solid #e2e4ea;}
.slm-report-solution-title{font-size:12pt;font-weight:700;margin:0 0 10px;color:#5b46e0;}
.slm-report-diagram{display:flex;justify-content:center;margin:10px 0;page-break-inside:avoid;break-inside:avoid;}
.slm-report-diagram svg{max-width:100%;max-height:320px;width:auto;height:auto;}
.slm-report-foot{margin-top:20px;padding-top:10px;border-top:1px solid #e2e4ea;text-align:center;font-size:8.5pt;color:#8b919d;}
ul,ol{margin:0 0 6px;padding-left:20px;}
li{margin:2px 0;}
table{border-collapse:collapse;width:100%;margin:0 0 6px;font-size:10pt;}
th,td{border:1px solid #d8dbe3;padding:4px 8px;text-align:left;}
pre{white-space:pre-wrap;background:#f3f4f6;border:1px solid #e2e4ea;border-radius:5px;padding:8px;font-size:9.5pt;overflow-x:auto;}
code{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:.88em;}
.katex .katex-html{display:none!important;}
.katex .katex-mathml{position:static!important;clip:auto!important;height:auto!important;width:auto!important;overflow:visible!important;}
.katex{font:inherit;}
math{font-size:1.02em;}
`;
}

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
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none;z-index:-1;';
    document.body.appendChild(iframe);

    const doc = iframe.contentDocument;
    const win = iframe.contentWindow;
    if (!doc || !win) throw new Error('no iframe document');

    doc.open();
    doc.write(html);
    doc.close();

    await new Promise<void>((resolve) => {
      const go = async () => {
        try {
          await (doc as Document & { fonts?: FontFaceSet }).fonts?.ready;
        } catch {
          /* ignore */
        }
        resolve();
      };
      if (doc.readyState === 'complete') setTimeout(go, 80);
      else win.addEventListener('load', () => setTimeout(go, 80), { once: true });
    });

    win.focus();
    win.print();

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
