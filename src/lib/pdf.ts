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
import { resolveDiagram } from './resolve-diagram';
import type { Overlay } from './figure/types';
import { PRINT_DIAGRAM_MM } from './diagram-bounds';
import { trackEvent } from './analytics';
import { FONT_CSS_HREF, FONT_MONO, FONT_SANS } from './fonts';

export interface PdfExportResult {
  ok: boolean;
  method: 'print' | 'failed';
}

/** Design tokens — current light reading canvas (IBM Plex, ink, formula wash). */
const T = {
  bg: '#ffffff',
  fg: '#171717',
  fgMuted: '#5c5c63',
  fgSubtle: '#8a8a92',
  border: '#e2e2e4',
  ink: '#171717',
  inkSoft: '#17171714',
  amber: '#b45309',
  amberDim: '#b4530914',
  bgSubtle: '#f5f5f5',
  bgMuted: '#efefef',
  formulaBg: '#efefef',
  formulaFg: '#171717',
  radiusSm: '8px',
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

async function resolveDiagrams(
  session: Session,
): Promise<{ svg: Record<string, string>; overlays: Record<string, Overlay[]> }> {
  const svg: Record<string, string> = {};
  const overlays: Record<string, Overlay[]> = {};
  for (const { key, diagram } of collectDiagrams(session)) {
    const resolved = await resolveDiagram(diagram, 'light', 'print');
    svg[key] = resolved.svg;
    overlays[key] = resolved.overlays;
  }
  return { svg, overlays };
}

export function printStyles(): string {
  return `
@import url('${FONT_CSS_HREF}');
*{box-sizing:border-box;}
@page{size:A4;margin:14mm 16mm;}
html,body{margin:0;padding:0;background:${T.bg};color:${T.fg};}
body{font:11.5pt/1.55 ${FONT_SANS};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.slm-report{max-width:680px;margin:0 auto;}
.slm-report-head{display:flex;align-items:center;justify-content:space-between;padding-bottom:12px;margin-bottom:18px;border-bottom:1px solid ${T.border};}
.slm-report-brand-wrap{display:flex;align-items:center;gap:8px;}
.slm-report-wordmark{display:inline-flex;line-height:0;}
.slm-report-wordmark svg{display:block;height:22px;width:auto;}
.slm-report-subject{font-size:9pt;font-weight:500;letter-spacing:.02em;text-transform:uppercase;color:${T.fgMuted};padding:2px 8px;border:0.5px solid ${T.border};border-radius:999px;background:${T.bgSubtle};}
.slm-report-topic{margin:0 0 16px;font-size:14pt;font-weight:500;letter-spacing:-.02em;line-height:1.35;color:${T.fg};}
.slm-report-label{display:inline-flex;align-items:center;justify-content:center;min-width:28px;height:22px;padding:0 8px;font-family:${FONT_SANS};font-weight:600;font-size:9.5pt;letter-spacing:-.02em;border-radius:${T.radiusSm};background:${T.inkSoft};color:${T.ink};}
.slm-report-q-block{display:flex;flex-direction:column;align-items:flex-start;gap:8px;margin-bottom:20px;}
.slm-report-q{width:100%;padding:12px 14px;background:${T.bgSubtle};border:0.5px solid ${T.border};border-radius:${T.radiusMd};}
.slm-report-q-text{font-weight:500;font-size:11pt;line-height:1.45;color:${T.fg};}
.slm-report-a{display:flex;flex-direction:column;align-items:flex-start;gap:10px;}
.slm-report-a-body{width:100%;}
.slm-report-step{margin:0 0 16px;padding:12px 14px;border:0.5px solid ${T.border};border-radius:${T.radiusMd};page-break-inside:avoid;break-inside:avoid;background:${T.bg};}
.slm-report-step-title{font-size:11pt;font-weight:500;margin:0 0 8px;color:${T.fg};}
.slm-report-step-no{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;margin-right:6px;padding:0;font-family:${FONT_SANS};font-size:9pt;font-weight:600;border-radius:${T.radiusSm};background:${T.bgMuted};color:${T.fgMuted};vertical-align:middle;}
.slm-report-formula{margin:6px 0 10px;padding:12px 14px;background:${T.formulaBg};border:0.5px solid ${T.border};border-radius:${T.radiusMd};overflow-x:auto;text-align:center;font-size:11pt;color:${T.formulaFg};}
.slm-report-formula .katex-display{margin:0;}
.slm-report-formula .katex{font-size:1.22em;color:${T.formulaFg};}
.slm-report-formula-label{display:block;font-size:7.5pt;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:${T.fgSubtle};margin-bottom:4px;text-align:left;}
.slm-report-work{margin:6px 0 10px;}
.slm-report-work-label{display:block;font-size:7.5pt;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:${T.fgSubtle};margin-bottom:4px;}
.slm-report-body{margin:0 0 6px;font-size:10.5pt;line-height:1.5;color:${T.fg};}
.slm-report-body p{margin:0 0 6px;orphans:3;widows:3;}
.slm-report-topic,.slm-report-step-title,.slm-report-solution-title{break-after:avoid;page-break-after:avoid;}
.slm-report-formula,.slm-report-q,.slm-report-takeaway,pre,table{break-inside:avoid;page-break-inside:avoid;}
thead{display:table-header-group;}
pre{word-break:break-word;overflow-wrap:anywhere;}
.slm-report-takeaway{font-size:10.5pt;color:${T.fg};border:0.5px solid ${T.border};padding:10px 12px;margin:10px 0 0;background:${T.bgSubtle};border-radius:${T.radiusMd};}
.slm-report-takeaway-label{display:block;font-size:7.5pt;font-weight:500;letter-spacing:.04em;text-transform:uppercase;color:${T.fgSubtle};margin-bottom:4px;}
.slm-report-takeaway p{margin:0;}
.slm-report-solution{margin-top:14px;padding:14px;border:0.5px solid ${T.border};border-radius:${T.radiusMd};background:${T.bgSubtle};}
.slm-report-solution-title{font-size:11pt;font-weight:500;margin:0 0 10px;color:${T.fg};}
.slm-report-diagram{display:flex;justify-content:center;align-items:center;width:100%;max-width:${PRINT_DIAGRAM_MM.maxW}mm;margin:6px auto;padding:2px 0;page-break-inside:avoid;break-inside:avoid;}
.slm-report-diagram svg{display:block;width:auto;max-width:100%;height:auto;max-height:${PRINT_DIAGRAM_MM.maxH}mm;}
.slm-diagram-frame{position:relative;display:inline-block;}
.slm-diagram-overlay{position:absolute;pointer-events:none;white-space:nowrap;color:${T.fg};}
.slm-report-foot{margin-top:20px;padding-top:10px;border-top:0.5px solid ${T.border};text-align:center;font-size:8.5pt;color:${T.fgSubtle};}
ul,ol{margin:0 0 6px;padding-left:20px;}
li{margin:2px 0;}
table{border-collapse:collapse;width:100%;margin:0 0 6px;font-size:10pt;}
th,td{border:1px solid ${T.border};padding:4px 8px;text-align:left;}
pre{white-space:pre-wrap;background:${T.bgMuted};border:0.5px solid ${T.border};border-radius:${T.radiusSm};padding:8px;font-size:9.5pt;overflow-x:auto;}
code{font-family:${FONT_MONO};font-size:.88em;}
.katex .katex-html{display:none!important;}
.katex .katex-mathml{position:static!important;clip:auto!important;height:auto!important;width:auto!important;overflow:visible!important;}
.katex{font:inherit;}
math{font-size:1.02em;}
.slm-step-id{display:inline-block;margin-right:6px;font-family:${FONT_MONO};font-size:8.5pt;color:${T.fgSubtle};}
.slm-signals{margin:0 0 14px;}
.slm-signal--flag{font-size:10pt;font-weight:600;color:${T.fg};background:${T.bgSubtle};border:0.5px solid ${T.border};border-radius:${T.radiusSm};padding:6px 10px;margin:0 0 8px;}
.slm-signals-title{margin:0 0 4px;font-size:8pt;font-weight:600;letter-spacing:.04em;text-transform:uppercase;color:${T.fgSubtle};}
.slm-verify,.slm-uncertainty{padding:10px 12px;margin:0 0 8px;background:${T.bgSubtle};border:0.5px solid ${T.border};border-radius:${T.radiusMd};font-size:10pt;}
`;
}

export function buildReportDocument(
  session: Session,
  diagramSvg: Record<string, string>,
  diagramOverlays: Record<string, Overlay[]> = {},
): string {
  const body = renderToStaticMarkup(createElement(Report, { session, diagramSvg, diagramOverlays }));
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
    const resolved = await resolveDiagrams(session);
    const html = buildReportDocument(session, resolved.svg, resolved.overlays);
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
