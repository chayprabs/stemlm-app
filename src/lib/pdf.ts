/**
 * PDF export — vector, print-native, brand-aligned with the extension theme.
 *
 * Builds a self-contained HTML document and prints via a hidden iframe.
 * Math renders as MathML; diagrams as sanitised SVG.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import type { Session } from '@/src/protocol/types';
import { Report, collectDiagrams } from '@/src/components/Report';
import { resolveDiagramSvg } from './resolve-diagram';
import { PRINT_DIAGRAM_MM } from './diagram-bounds';
import { trackEvent } from './analytics';

export interface PdfExportResult {
  ok: boolean;
  method: 'print' | 'failed';
}

/** Design tokens — aligned with assets/tailwind.css / panel theme. */
const T = {
  bg: '#ffffff',
  fg: '#0f1117',
  fgMuted: '#64748b',
  fgSubtle: '#8a8a9a',
  border: '#e2e8f0',
  accent: '#0ea5a0',
  accentSoft: '#0ea5a015',
  amber: '#f59e0b',
  bgSubtle: '#f8f9fc',
  bgMuted: '#f1f5f5',
  radiusSm: '6px',
  radiusMd: '10px',
} as const;

export function reportFilename(session: Session): string {
  const topic = (session.capsule.meta.topic || 'session')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  const date = new Date().toISOString().slice(0, 10);
  return `stemLM-${topic || 'session'}-${date}`;
}

/** Short document title for print — no dates (avoids browser header clutter). */
export function reportPrintTitle(session: Session): string {
  const topic = (session.capsule.meta.topic || '').trim();
  return topic || 'stemLM';
}

async function resolveDiagrams(session: Session): Promise<Record<string, string>> {
  const map: Record<string, string> = {};
  for (const { key, diagram } of collectDiagrams(session)) {
    map[key] = await resolveDiagramSvg(diagram, 'light', 'print');
  }
  return map;
}

export function printStyles(): string {
  return `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap');
*{box-sizing:border-box;}
@page{size:A4;margin:14mm 16mm;}
html,body{margin:0;padding:0;background:${T.bg};color:${T.fg};}
body{font:11.5pt/1.55 'Inter',ui-sans-serif,system-ui,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.slm-report{max-width:680px;margin:0 auto;}
.slm-report-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;margin-bottom:18px;border-bottom:2px solid ${T.accent};}
.slm-report-brand-wrap{display:flex;align-items:center;gap:8px;}
.slm-report-mark{display:inline-flex;flex-shrink:0;}
.slm-report-wordmark{font-weight:500;font-size:17px;letter-spacing:-.02em;}
.slm-report-wordmark .slm-wordmark-stem{color:${T.fg};}
.slm-report-wordmark .slm-wordmark-lm{color:${T.accent};}
.slm-report-subject{font-size:9pt;font-weight:500;letter-spacing:.02em;text-transform:uppercase;color:${T.fgMuted};padding:2px 8px;border:0.5px solid ${T.border};border-radius:999px;background:${T.bgSubtle};}
.slm-report-topic{margin:0 0 16px;font-size:14pt;font-weight:500;letter-spacing:-.02em;line-height:1.35;color:${T.fg};}
.slm-report-label{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:22px;padding:0 8px;font-family:'JetBrains Mono',ui-monospace,monospace;font-weight:500;font-size:9pt;letter-spacing:.04em;text-transform:uppercase;border-radius:${T.radiusSm};background:${T.accentSoft};color:${T.accent};}
.slm-report-q-block{display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin-bottom:20px;}
.slm-report-q{width:100%;padding:12px 14px;background:${T.bgSubtle};border:0.5px solid ${T.border};border-radius:${T.radiusMd};}
.slm-report-q-text{font-weight:500;font-size:11pt;line-height:1.45;color:${T.fg};}
.slm-report-a{display:flex;flex-direction:column;align-items:flex-start;gap:10px;}
.slm-report-a-body{width:100%;}
.slm-report-step{margin:0 0 16px;padding:12px 14px;border:0.5px solid ${T.border};border-radius:${T.radiusSm};page-break-inside:avoid;break-inside:avoid;background:${T.bgSubtle};}
.slm-report-step-title{font-size:11pt;font-weight:500;margin:0 0 8px;color:${T.fg};}
.slm-report-step-no{display:inline-flex;align-items:center;justify-content:center;min-width:22px;height:18px;margin-right:6px;padding:0 4px;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:8pt;font-weight:500;border-radius:${T.radiusSm};background:${T.accentSoft};color:${T.accent};vertical-align:middle;}
.slm-report-formula{margin:6px 0 10px;padding:10px 12px;background:${T.bgMuted};border:0.5px solid ${T.border};border-radius:${T.radiusSm};overflow-x:auto;text-align:center;font-size:10.5pt;color:${T.accent};}
.slm-report-formula .katex-display{margin:0;}
.slm-report-formula .katex{font-size:1.05em;color:${T.accent};}
.slm-report-formula-label{display:block;font-size:7.5pt;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:${T.fgMuted};margin-bottom:4px;}
.slm-report-work{margin:6px 0 10px;}
.slm-report-work-label{display:block;font-size:7.5pt;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:${T.fgMuted};margin-bottom:4px;}
.slm-report-body{margin:0 0 6px;font-size:10.5pt;line-height:1.5;color:${T.fg};}
.slm-report-body p{margin:0 0 6px;orphans:3;widows:3;}
.slm-report-topic,.slm-report-step-title,.slm-report-solution-title{break-after:avoid;page-break-after:avoid;}
.slm-report-formula,.slm-report-q,.slm-report-takeaway,pre,table{break-inside:avoid;page-break-inside:avoid;}
thead{display:table-header-group;}
pre{word-break:break-word;overflow-wrap:anywhere;}
.slm-report-takeaway{font-size:10pt;color:${T.fgMuted};border-left:2px solid ${T.amber};padding:8px 12px;margin:8px 0 0;background:${T.bg};border-radius:0 ${T.radiusSm} ${T.radiusSm} 0;}
.slm-report-takeaway-label{display:block;font-size:7.5pt;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:${T.amber};margin-bottom:3px;}
.slm-report-takeaway p{display:inline;margin:0;}
.slm-report-solution{margin-top:14px;padding:14px;border-top:0.5px solid ${T.border};}
.slm-report-solution-title{font-size:12pt;font-weight:500;margin:0 0 10px;color:${T.accent};}
.slm-report-diagram{display:flex;justify-content:center;align-items:center;width:100%;max-width:${PRINT_DIAGRAM_MM.maxW}mm;margin:6px auto;padding:2px 0;page-break-inside:avoid;break-inside:avoid;}
.slm-report-diagram svg{display:block;width:auto;max-width:100%;height:auto;max-height:${PRINT_DIAGRAM_MM.maxH}mm;}
.slm-report-foot{margin-top:20px;padding-top:10px;border-top:0.5px solid ${T.border};text-align:center;font-size:8.5pt;color:${T.fgSubtle};}
ul,ol{margin:0 0 6px;padding-left:20px;}
li{margin:2px 0;}
table{border-collapse:collapse;width:100%;margin:0 0 6px;font-size:10pt;}
th,td{border:1px solid ${T.border};padding:4px 8px;text-align:left;}
pre{white-space:pre-wrap;background:${T.bgMuted};border:0.5px solid ${T.border};border-radius:${T.radiusSm};padding:8px;font-size:9.5pt;overflow-x:auto;}
code{font-family:'JetBrains Mono',ui-monospace,Menlo,Consolas,monospace;font-size:.88em;}
.katex .katex-html{display:none!important;}
.katex .katex-mathml{position:static!important;clip:auto!important;height:auto!important;width:auto!important;overflow:visible!important;}
.katex{font:inherit;}
math{font-size:1.02em;}
`;
}

export function buildReportDocument(session: Session, diagramSvg: Record<string, string>): string {
  const body = renderToStaticMarkup(createElement(Report, { session, diagramSvg }));
  const title = reportPrintTitle(session);
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${printStyles()}</style></head><body>${body}</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportSessionPdf(session: Session): Promise<PdfExportResult> {
  let iframe: HTMLIFrameElement | null = null;
  try {
    const diagramSvg = await resolveDiagrams(session);
    const html = buildReportDocument(session, diagramSvg);
    const printTitle = reportPrintTitle(session);

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

    // Short title reduces browser print header noise (date/URL still depend on print settings).
    doc.title = printTitle;
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
