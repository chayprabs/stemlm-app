/**
 * PDF export — fast, vector, professionally branded.
 *
 * Builds a self-contained HTML document and prints via hidden iframe.
 * Math via MathML; diagrams as vector SVG.
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
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;}
@page{size:A4;margin:14mm 13mm;}
html,body{margin:0;padding:0;background:#fff;color:#0f1117;}
body{font:13px/1.6 'Inter',ui-sans-serif,system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.slm-report{max-width:680px;margin:0 auto;}
.slm-report-cover{margin-bottom:20px;padding-bottom:16px;border-bottom:2px solid #0ea5a0;}
.slm-report-brand{display:flex;align-items:baseline;gap:0;font-weight:600;font-size:20px;letter-spacing:-.03em;margin-bottom:6px;}
.slm-report-brand-stem{color:#0f1117;}
.slm-report-brand-lm{color:#0ea5a0;}
.slm-report-topic{font-size:17px;font-weight:600;letter-spacing:-.02em;margin:0 0 8px;line-height:1.35;}
.slm-report-meta{display:flex;gap:8px;align-items:center;flex-wrap:wrap;}
.slm-report-chip{display:inline-block;padding:2px 8px;border-radius:999px;background:rgba(14,165,160,.08);color:#0ea5a0;font-size:10px;font-weight:600;letter-spacing:.02em;}
.slm-report-date{font-size:11px;color:#64748b;}
.slm-report-q{margin-bottom:18px;padding:12px 14px;background:#f8f9fc;border:1px solid #e2e8f0;border-radius:8px;}
.slm-report-q-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#0ea5a0;font-family:'JetBrains Mono',monospace;margin-bottom:4px;}
.slm-report-q-text{font-weight:500;font-size:14px;line-height:1.5;}
.slm-report-a-label{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#0ea5a0;font-family:'JetBrains Mono',monospace;margin-bottom:10px;}
.slm-report-step{margin:0 0 16px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:8px;page-break-inside:avoid;break-inside:avoid;}
.slm-report-step-head{display:flex;align-items:baseline;gap:8px;margin-bottom:6px;}
.slm-report-step-no{font-family:'JetBrains Mono',monospace;font-size:11px;font-weight:500;color:#0ea5a0;background:rgba(14,165,160,.08);padding:2px 6px;border-radius:4px;flex-shrink:0;}
.slm-report-step-title{font-size:13.5px;font-weight:600;margin:0;letter-spacing:-.01em;}
.slm-report-formula{margin:6px 0 8px;padding:8px 10px;background:#f8f9fc;border:1px solid #dce5ee;border-radius:6px;overflow-x:auto;}
.slm-report-formula-label{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#94a3b8;font-family:'JetBrains Mono',monospace;margin-bottom:4px;}
.slm-report-body{margin:0 0 6px;font-size:13px;line-height:1.6;}
.slm-report-body p{margin:0 0 6px;}
.slm-report-takeaway{margin:8px 0 0;padding:8px 10px;border-left:3px solid #0ea5a0;background:rgba(14,165,160,.06);border-radius:0 6px 6px 0;font-size:12px;}
.slm-report-takeaway-label{font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.1em;color:#0ea5a0;font-family:'JetBrains Mono',monospace;display:block;margin-bottom:3px;}
.slm-report-takeaway p{display:inline;margin:0;}
.slm-report-solution{margin-top:14px;padding-top:12px;border-top:1px solid #e2e8f0;}
.slm-report-solution-title{font-size:14px;font-weight:600;margin:0 0 8px;letter-spacing:-.01em;}
.slm-report-diagram{display:flex;justify-content:center;margin:8px 0;padding:8px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;page-break-inside:avoid;break-inside:avoid;}
.slm-report-diagram svg{max-width:100%;max-height:320px;width:auto;height:auto;}
.slm-report-foot{margin-top:20px;padding-top:10px;border-top:1px solid #e2e8f0;text-align:center;font-size:10px;color:#94a3b8;}
.slm-report-foot a{color:#0ea5a0;text-decoration:none;}
.slm-prose{font-size:13px;line-height:1.6;}
.slm-prose h1,.slm-prose h2,.slm-prose h3{font-weight:600;margin:.6rem 0 .3rem;}
ul,ol{margin:0 0 6px;padding-left:18px;}
li{margin:2px 0;}
table{border-collapse:collapse;width:100%;margin:0 0 6px;font-size:12px;}
th,td{border:1px solid #e2e8f0;padding:4px 8px;text-align:left;}
pre{white-space:pre-wrap;background:#f8f9fc;border:1px solid #e2e8f0;border-radius:6px;padding:8px;font-size:12px;font-family:'JetBrains Mono',monospace;overflow-x:auto;}
code{font-family:'JetBrains Mono',monospace;font-size:.88em;}
.katex .katex-html{display:none!important;}
.katex .katex-mathml{position:static!important;clip:auto!important;height:auto!important;width:auto!important;overflow:visible!important;}
.katex{font:inherit;}
math{font-size:1.05em;}
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
      if (doc.readyState === 'complete') setTimeout(go, 300);
      else win.addEventListener('load', () => setTimeout(go, 300), { once: true });
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
