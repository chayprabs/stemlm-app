/**
 * PDF export — print-native, aligned with the Solution tab.
 *
 * Builds a self-contained HTML document and prints via a hidden iframe.
 * Math is the same KaTeX HTML the panel shows; diagrams are sanitised SVG.
 */
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement, type ReactElement } from 'react';
import { browser } from 'wxt/browser';
import type { Session } from '@/src/protocol/types';
import type { PlatformId } from '@/src/platforms/types';
import type { Diagram } from '@/src/protocol/types';
import {
  MergedReport,
  PlainReport,
  Report,
  collectDiagrams,
  collectMergedDiagrams,
} from '@/src/components/Report';
import { resolveDiagram } from './resolve-diagram';
import type { Overlay } from './figure/types';
import { PRINT_DIAGRAM_MM } from './diagram-bounds';
import { CONTENT_WIDTH_PX, sliceRectPt } from './pdf-paginate';
import {
  BlankRenderError,
  RENDER_CLASS,
  renderHtmlToPageImages,
  type RenderOptions,
  type RenderedPage,
} from './pdf-raster';
import { trackEvent } from './analytics';
import { FONT_CSS_HREF, FONT_MONO, FONT_SANS, KATEX_CSS_HREF } from './fonts';
import { BRAND_SIGNAL } from '@/src/components/brand';
/** Vendored from katex@0.16.25 so print math uses the same HTML+CSS as the panel. */
import katexCssRaw from './katex.min.css.txt?raw';

export type PdfExportMethod = 'print' | 'download' | 'view' | 'failed';

export interface PdfExportResult {
  ok: boolean;
  method: PdfExportMethod;
  /** Present only on failure, so the UI can say what actually went wrong. */
  reason?: PdfFailureReason;
  /** Short technical description, shown under the message and logged. */
  detail?: string;
}

/** `blank` means the page rendered but carried no ink — never ship that file. */
export type PdfFailureReason = 'blank' | 'render' | 'save' | 'empty' | 'timeout';

/**
 * Figures are resolved one at a time and some engines are slow (mermaid alone
 * can hold a 12s timeout). Past this budget the remaining figures are dropped
 * so a question with several heavy diagrams still exports.
 */
const DIAGRAM_BUDGET_MS = 20_000;

/**
 * Anything that goes wrong inside an export is recoverable — the export
 * degrades instead of failing — but it must still be visible when debugging a
 * specific saved question.
 */
function reportPdfIssue(where: string, err: unknown): void {
  try {
    // eslint-disable-next-line no-console
    console.warn(`[stemLM] pdf ${where}:`, err);
  } catch {
    /* console is not worth failing an export over */
  }
}

/** Compact, user-showable description of a failure. */
export function describePdfError(err: unknown): string {
  const raw =
    err instanceof Error ? `${err.name}: ${err.message}` : String(err ?? 'unknown error');
  return raw.replace(/\s+/g, ' ').trim().slice(0, 120);
}

/** Light reading canvas — same inks as the panel, paper white for print. */
const T = {
  bg: '#ffffff',
  fg: '#121212',
  fgMuted: '#5c5c63',
  fgSubtle: '#8a8a92',
  border: '#e2e2e4',
  borderSubtle: '#ebebed',
  signal: BRAND_SIGNAL,
  bgSubtle: '#f5f5f5',
  formulaBg: '#efefef',
  formulaFg: '#121212',
  formulaBorder: '#e2e2e4',
  radiusMd: '10px',
} as const;

function katexPrintCss(): string {
  const fontBase = KATEX_CSS_HREF.replace(/katex\.min\.css$/, 'fonts/');
  return katexCssRaw.replace(/url\((['"]?)fonts\//g, `url($1${fontBase}`);
}

/** Basename Chrome uses for Save as PDF — not the question, topic, or chat host. */
export function reportFilename(_session?: Session): string {
  return 'stemLM';
}

/** Tab / print-job title. Keep it off the question so Save as PDF is stemLM.pdf. */
export function reportPrintTitle(_session?: Session): string {
  return 'stemLM';
}

interface ResolvedDiagrams {
  svg: Record<string, string>;
  overlays: Record<string, Overlay[]>;
}

/**
 * One unrenderable figure must never cost the whole document. Each diagram is
 * isolated: on failure it is simply absent from the map, and `ResolvedDiagram`
 * falls back to the spec source or renders nothing.
 */
async function resolveKeyedDiagrams(
  entries: readonly { key: string; diagram: Diagram }[],
): Promise<ResolvedDiagrams> {
  const svg: Record<string, string> = {};
  const overlays: Record<string, Overlay[]> = {};
  const deadline = Date.now() + DIAGRAM_BUDGET_MS;
  for (const { key, diagram } of entries) {
    if (Date.now() > deadline) {
      reportPdfIssue('diagram budget', `skipped ${key} and any figures after it`);
      break;
    }
    try {
      const resolved = await resolveDiagram(diagram, 'light', 'print');
      svg[key] = resolved.svg;
      overlays[key] = resolved.overlays;
    } catch (err) {
      reportPdfIssue(`diagram ${key}`, err);
    }
  }
  return { svg, overlays };
}

async function resolveDiagrams(session: Session): Promise<ResolvedDiagrams> {
  return resolveKeyedDiagrams(collectDiagrams(session));
}

export function printStyles(): string {
  return `
*{box-sizing:border-box;}
@page{size:A4;margin:12mm 14mm;}
html,body{margin:0;padding:0;background:${T.bg};color:${T.fg};}
body{font:11pt/1.5 ${FONT_SANS};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.slm-report{max-width:680px;margin:0 auto;}
.slm-report-head{margin:0 0 6px;}
.slm-report-head-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding-bottom:6px;margin-bottom:6px;border-bottom:2px solid ${T.signal};}
.slm-report-brand-wrap{display:flex;align-items:center;gap:8px;min-width:0;}
.slm-report-wordmark{display:inline-flex;line-height:0;}
.slm-report-wordmark svg{display:block;height:22px;width:auto;}
.slm-report-subject{font-size:9pt;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:${T.fgMuted};line-height:1;}
.slm-report-topic{margin:0;font-size:13pt;font-weight:600;letter-spacing:-.03em;line-height:1.25;color:${T.fg};}
.slm-report-q-block{display:grid;grid-template-columns:auto 1fr;gap:2px 10px;align-items:start;margin:0 0 8px;padding:4px 0 8px;border-bottom:0.5px solid ${T.border};}
.slm-report-label{margin-top:1px;font-family:${FONT_SANS};font-weight:600;font-size:10pt;letter-spacing:.02em;color:${T.fgMuted};line-height:1.5;}
.slm-report-q{min-width:0;}
.slm-report-q-text{font-weight:500;font-size:11pt;line-height:1.5;color:${T.fg};}
.slm-report-a{display:flex;flex-direction:column;width:100%;}
.slm-report-step{margin:0;padding:6px 0 8px;border:0;border-bottom:0.5px solid ${T.borderSubtle};background:transparent;}
.slm-report-step:last-of-type{border-bottom:0;padding-bottom:0;}
.slm-report-step-head{display:flex;align-items:center;gap:8px;margin:0 0 5px;}
.slm-report-step-head .slm-step-index{flex:0 0 auto;width:16px;height:16px;color:${T.fg};}
.slm-report-step-title{margin:0;flex:1;min-width:0;font-size:11pt;font-weight:600;letter-spacing:-.02em;line-height:1.3;color:${T.fg};}
.slm-formula{margin:2px 0 6px;padding:7px 12px;background:${T.formulaBg};border:0.5px solid ${T.formulaBorder};border-radius:${T.radiusMd};overflow-x:auto;text-align:center;color:${T.formulaFg};}
.slm-formula-label,.slm-step-work-label,.slm-takeaway-label,.slm-step-diagram-label{display:block;font-size:8.5pt;font-weight:600;letter-spacing:.05em;text-transform:uppercase;color:${T.fgMuted};margin-bottom:3px;text-align:left;}
.slm-formula .slm-prose{text-align:center;}
.slm-formula .katex-display{margin:0;}
.slm-formula .katex{font-size:1.22em;color:${T.formulaFg};}
.slm-step-work{margin:1px 0 6px;}
.slm-step-work-body{font-size:11pt;line-height:1.5;color:${T.fg};}
.slm-step-diagram{margin:6px 0 6px;padding:8px 10px;background:${T.formulaBg};border:0.5px solid ${T.formulaBorder};border-radius:${T.radiusMd};}
.slm-takeaway{margin:6px 0 0;padding:7px 10px;border:0.5px solid ${T.border};background:${T.bgSubtle};border-radius:${T.radiusMd};font-size:11pt;line-height:1.45;color:${T.fg};}
.slm-takeaway p{margin:0;}
.slm-report-solution{margin:0;padding:0;border:0;background:transparent;}
.slm-report-entry{display:block;}
.slm-report-entry+.slm-report-entry{margin-top:13px;padding-top:11px;border-top:0.5px solid ${T.border};}
.slm-report-entry-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 3px;}
.slm-report-entry-head .slm-report-topic{margin:0;font-size:12pt;}
.slm-report-entry-subject{flex:0 0 auto;font-size:8.5pt;font-weight:500;letter-spacing:.08em;text-transform:uppercase;color:${T.fgMuted};line-height:1.4;white-space:nowrap;}
.slm-report--merged .slm-report-q-block{padding-top:0;}
.slm-report-diagram{display:flex;justify-content:center;align-items:center;width:100%;max-width:${PRINT_DIAGRAM_MM.maxW}mm;margin:4px auto 0;padding:0;}
.slm-diagram-frame{position:relative;display:inline-block;line-height:0;max-width:100%;overflow:visible;}
.slm-diagram-svg{display:inline-block;line-height:0;max-width:100%;}
.slm-report-diagram svg{display:block;width:auto;max-width:100%;height:auto;max-height:${PRINT_DIAGRAM_MM.maxH}mm;}
.slm-diagram-overlay{position:absolute;pointer-events:none;white-space:nowrap;color:${T.fg};font-size:9.5pt;line-height:1;}
.slm-diagram-overlay .katex{font-size:1em;}
.slm-report-foot{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;padding-top:8px;border-top:0.5px solid ${T.border};font-size:8.5pt;color:${T.fgSubtle};break-inside:avoid;page-break-inside:avoid;break-before:avoid;page-break-before:avoid;}
.slm-report-foot-link{display:inline-flex;line-height:0;color:inherit;text-decoration:none;}
.slm-report-foot-link svg{display:block;}
.slm-prose{overflow-wrap:anywhere;word-wrap:break-word;}
.slm-prose p{margin:0 0 5px;orphans:3;widows:3;}
.slm-prose :first-child{margin-top:0;}
.slm-prose :last-child{margin-bottom:0;}
.slm-report-topic,.slm-report-step-head,.slm-report-step-title{break-after:avoid;page-break-after:avoid;}
.slm-formula,.slm-takeaway,.slm-step-diagram,pre,table{break-inside:avoid;page-break-inside:avoid;}
thead{display:table-header-group;}
ul,ol{margin:0 0 6px;padding-left:20px;}
li{margin:2px 0;}
table{border-collapse:collapse;width:100%;margin:0 0 6px;font-size:10.5pt;}
th,td{border:1px solid ${T.border};padding:5px 8px;text-align:left;}
pre{white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;background:${T.bgSubtle};border:0.5px solid ${T.border};border-radius:${T.radiusMd};padding:8px;font-size:10pt;overflow-x:auto;}
code{font-family:${FONT_MONO};font-size:.88em;}
.katex .katex-mathml{position:absolute!important;clip:rect(1px,1px,1px,1px)!important;padding:0!important;border:0!important;height:1px!important;width:1px!important;overflow:hidden!important;}
.slm-signals{margin:0 0 8px;}
.slm-signal--flag{font-size:10.5pt;font-weight:600;color:${T.fg};background:${T.bgSubtle};border:0.5px solid ${T.border};border-radius:${T.radiusMd};padding:6px 10px;margin:0 0 6px;}
.slm-answer-notes{margin:8px 0 0;font-size:11pt;line-height:1.5;color:${T.fg};}
@media screen{
body{padding:18px 14px 36px;background:${T.bgSubtle};}
.slm-report{background:${T.bg};padding:18px 24px 20px;border:0.5px solid ${T.border};border-radius:${T.radiusMd};box-shadow:0 8px 28px rgba(15,15,18,.08);}
}
/* Off-screen render surface: the column is exactly the A4 text box, so the
   rasteriser can slice it into pages without re-measuring margins. */
html.${RENDER_CLASS}{overflow:hidden;background:${T.bg};}
html.${RENDER_CLASS} body{width:${CONTENT_WIDTH_PX}px;margin:0;padding:0;background:${T.bg};overflow:hidden;}
html.${RENDER_CLASS} .slm-report{width:100%;max-width:none;margin:0;padding:0;border:0;border-radius:0;box-shadow:none;background:${T.bg};}
html.${RENDER_CLASS} *{animation:none!important;transition:none!important;}
`;
}

/**
 * `renderToStaticMarkup` ignores error boundaries, so a single bad node in a
 * saved answer would otherwise abort the whole export. Each attempt is isolated
 * and the caller supplies progressively simpler fallbacks.
 */
function tryRender(where: string, build: () => ReactElement): string | null {
  try {
    return renderToStaticMarkup(build());
  } catch (err) {
    reportPdfIssue(`markup ${where}`, err);
    return null;
  }
}

function reportShell(body: string, title: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><link rel="stylesheet" href="${FONT_CSS_HREF}"><style>${katexPrintCss()}${printStyles()}</style></head><body>${body}</body></html>`;
}

export function buildReportDocument(
  session: Session,
  diagramSvg: Record<string, string>,
  diagramOverlays: Record<string, Overlay[]> = {},
): string {
  const body =
    tryRender('report', () => createElement(Report, { session, diagramSvg, diagramOverlays })) ??
    // Same content, no markdown / KaTeX / figures — always renders.
    tryRender('plain report', () => createElement(PlainReport, { sessions: [session] }));
  if (body === null) throw new Error('report markup failed');
  return reportShell(body, reportPrintTitle(session));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildMergedReportDocument(
  sessions: readonly Session[],
  diagramSvg: Record<string, string>,
  diagramOverlays: Record<string, Overlay[]> = {},
): string {
  const merged = (list: readonly Session[]) =>
    createElement(MergedReport, { sessions: [...list], diagramSvg, diagramOverlays });

  let body = tryRender('merged report', () => merged(sessions));

  if (body === null) {
    // Find the offending question rather than losing the whole merge: anything
    // that cannot render on its own is dropped, and the rest merge normally.
    const usable = sessions.filter(
      (session) =>
        tryRender('merge probe', () =>
          createElement(Report, { session, diagramSvg, diagramOverlays }),
        ) !== null,
    );
    if (usable.length > 0 && usable.length < sessions.length) {
      reportPdfIssue('merge', `dropped ${sessions.length - usable.length} unrenderable question(s)`);
      body = tryRender('merged retry', () => merged(usable));
    }
  }

  body ??= tryRender('plain merged', () => createElement(PlainReport, { sessions }));
  if (body === null) throw new Error('merged markup failed');
  return reportShell(body, reportPrintTitle());
}

/** Self-contained report HTML (print-styled). Used for view + file download. */
export async function renderSessionReportHtml(session: Session): Promise<string> {
  const resolved = await resolveDiagrams(session);
  return buildReportDocument(session, resolved.svg, resolved.overlays);
}

/** One continuous document holding every selected question. */
export async function renderMergedReportHtml(sessions: readonly Session[]): Promise<string> {
  const resolved = await resolveKeyedDiagrams(collectMergedDiagrams(sessions));
  return buildMergedReportDocument(sessions, resolved.svg, resolved.overlays);
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

/* ------------------------------------------------------------------ *
 * Direct file download — real PDF bytes, no print dialog.
 * ------------------------------------------------------------------ */

type DownloadsApi = {
  download: (options: {
    url: string;
    filename?: string;
    saveAs?: boolean;
    conflictAction?: 'uniquify' | 'overwrite' | 'prompt';
  }) => Promise<number>;
};

function pdfFileName(session?: Session): string {
  return `${reportFilename(session)}.pdf`;
}

/** Basename for a merged export. Says what it is and how much is in it. */
export function mergedPdfFileName(count: number): string {
  if (count <= 1) return pdfFileName();
  return `stemLM-${count}-questions.pdf`;
}

/** Put a PDF blob in the default Downloads folder. Never opens a save/print picker. */
export async function triggerPdfFileDownload(blob: Blob, filename: string): Promise<void> {
  const name = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
  const url = URL.createObjectURL(blob);
  const downloads = (browser as typeof browser & { downloads?: DownloadsApi }).downloads;

  try {
    if (downloads && typeof downloads.download === 'function') {
      await downloads.download({
        url,
        filename: name,
        saveAs: false,
        conflictAction: 'uniquify',
      });
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
      return;
    }
  } catch {
    /* fall through to an anchor click on pages that cannot use chrome.downloads */
  }

  // Content scripts have no downloads API; an anchor click still saves the file.
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

/** Stitch rasterised A4 pages into one PDF. */
export async function pagesToPdfBlob(pages: readonly RenderedPage[]): Promise<Blob> {
  if (pages.length === 0) throw new Error('no pages');
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });

  pages.forEach((page, i) => {
    if (i > 0) pdf.addPage('a4', 'portrait');
    const rect = sliceRectPt(page.slice);
    pdf.addImage(page.dataUrl, 'PNG', rect.x, rect.y, rect.width, rect.height, undefined, 'FAST');
  });

  const blob = pdf.output('blob');
  if (!(blob instanceof Blob) || blob.size < 5) throw new Error('empty pdf');
  return blob;
}

function failureReason(err: unknown): PdfFailureReason {
  if (err instanceof BlankRenderError) return 'blank';
  if (err instanceof Error && /timed out/i.test(err.message)) return 'timeout';
  return 'render';
}

function failed(where: string, err: unknown): PdfExportResult {
  reportPdfIssue(where, err);
  return { ok: false, method: 'failed', reason: failureReason(err), detail: describePdfError(err) };
}

async function downloadHtmlAsPdf(
  html: string,
  filename: string,
  options: RenderOptions | undefined,
  platform: PlatformId,
): Promise<PdfExportResult> {
  try {
    const pages = await renderHtmlToPageImages(html, options);
    const blob = await pagesToPdfBlob(pages);
    await triggerPdfFileDownload(blob, filename);
    void trackEvent('pdf_exported', { platform, method: 'download' });
    return { ok: true, method: 'download' };
  } catch (err) {
    void trackEvent('pdf_exported', { platform, method: 'failed' });
    return failed('export', err);
  }
}

/** Build a real PDF and send it to Downloads. No print dialog. */
export async function downloadSessionPdf(
  session: Session,
  options?: RenderOptions,
): Promise<PdfExportResult> {
  let html: string;
  try {
    html = await renderSessionReportHtml(session);
  } catch (err) {
    void trackEvent('pdf_exported', { platform: session.platform, method: 'failed' });
    return failed('build', err);
  }
  return downloadHtmlAsPdf(html, pdfFileName(session), options, session.platform);
}

/**
 * One PDF for several saved questions. Each answer flows straight into the next
 * question, so the tail page of a long solve is reused instead of wasted, and
 * the brand header and sign-off appear exactly once.
 */
export async function downloadSessionsPdf(
  sessions: readonly Session[],
  options?: RenderOptions,
): Promise<PdfExportResult> {
  if (sessions.length === 0) return { ok: false, method: 'failed', reason: 'empty' };
  const first = sessions[0] as Session;
  if (sessions.length === 1) return downloadSessionPdf(first, options);

  let html: string;
  try {
    html = await renderMergedReportHtml(sessions);
  } catch (err) {
    void trackEvent('pdf_exported', { platform: first.platform, method: 'failed' });
    return failed('build merged', err);
  }
  return downloadHtmlAsPdf(html, mergedPdfFileName(sessions.length), options, first.platform);
}
