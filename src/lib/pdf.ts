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
  localDate,
  mergedReportKicker,
  plainText,
  type DiagramNote,
} from '@/src/components/Report';
import { resolveDiagram } from './resolve-diagram';
import type { Overlay } from './figure/types';
import { PRINT_DIAGRAM_MM } from './diagram-bounds';
import {
  CONTENT_HEIGHT_PT,
  CONTENT_WIDTH_PT,
  CONTENT_WIDTH_PX,
  MARGIN_X_PT,
  MARGIN_Y_PT,
  PX_TO_PT,
  sliceRectPt,
} from './pdf-paginate';
import {
  BlankRenderError,
  RENDER_CLASS,
  RENDER_SCALE,
  renderHtmlToPageImages,
  type RenderOptions,
  type RenderedPage,
} from './pdf-raster';
import { repeatsQuestion, resolveSessionQuestion } from './session-question';
import { trackEvent } from './analytics';
import { FONT_MONO, FONT_SANS, fontFaceCss } from './fonts';
/** KaTeX layout rules; the report embeds the bundled faces of fonts.ts (no CDN, works offline). */
import katexCssRaw from './katex.min.css.txt?raw';
const embeddedFonts = {
  ...import.meta.glob<string>('/node_modules/katex/dist/fonts/*.woff2', { eager: true, query: '?inline', import: 'default' }),
  ...import.meta.glob<string>('/assets/fonts/ibm-plex/*.woff2', { eager: true, query: '?inline', import: 'default' }),
};

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
 * Figures are resolved one at a time and a slow engine can hold its 12s
 * compile timeout. Past this budget the remaining figures are dropped
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

/**
 * Paper and ink: the panel's light tokens, set for a page that is printed, often in greyscale.
 * Nothing needs colour or a tint to be read: every surface also has a rule.
 */
const T = {
  bg: '#ffffff',
  fg: '#121212',
  // Labels, captions and small print. Kept above the normal-text contrast threshold: a
  // decorative grey fades on paper.
  fgMuted: '#5c5c63',
  // Hairlines, dark enough to hold when a laser printer halftones them.
  rule: '#bdbdb6',
  tint: '#f4f4f2',
  // The signal as ink (the panel's --slm-signal-ink), on the step numerals only. Prints as dark grey.
  signal: '#c2410c',
  mat: '#ebebe8',
  radius: '3px',
} as const;

/** Reading measure: about 75 characters of body text. The rest of the column is margin for notes. */
const MEASURE_PX = 544;
/** Inset of the text from the left page margin: room to punch or bind the sheet, and for the step numerals. */
const GUTTER_PX = 40;

function embeddedFont(path: string): string {
  const name = path.slice(path.lastIndexOf('/') + 1);
  const font = Object.entries(embeddedFonts).find(([file]) => file.endsWith(`/${name}`))?.[1];
  if (!font) throw new Error(`Missing bundled font: ${name}`);
  return font;
}

function reportFontCss(): string {
  return fontFaceCss(embeddedFont) + katexCssRaw.replace(/@font-face\{[^}]*\}/g, '');
}

const PDF_NAME_MAX = 60;

/** ASCII lowercase-hyphen words, cut at a word boundary to fit `max`. */
function slug(text: string, max: number): string {
  const words = text
    .normalize('NFKD')
    .replace(/[^\x00-\x7f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
  let out = '';
  for (const word of words) {
    const next = out ? `${out}-${word}` : word;
    if (next.length > max) break;
    out = next;
  }
  return out;
}

/**
 * Download basename: `stemlm - <topic> - <yyyy-mm-dd>`, at most 60 characters with `.pdf`.
 * The topic comes from the answer, never the question text or the chat host.
 */
export function reportFilename(session?: Session): string {
  const date = localDate(session && session.createdAt > 0 ? session.createdAt : Date.now());
  const room = PDF_NAME_MAX - `stemLM -  - ${date}.pdf`.length;
  const topic = slug(session?.capsule.meta.topic ?? '', room);
  return topic ? `stemLM - ${topic} - ${date}` : `stemLM - ${date}`;
}

/** Tab / print-job title. Short and off the question. */
export function reportPrintTitle(_session?: Session): string {
  return 'stemLM';
}

interface ResolvedDiagrams {
  svg: Record<string, string>;
  overlays: Record<string, Overlay[]>;
  notes: Record<string, DiagramNote>;
}

/**
 * One unrenderable figure must never cost the whole document. Each diagram is
 * isolated: on failure it is simply absent from the map, and `ResolvedDiagram`
 * renders nothing, including its section heading and surrounding box.
 */
async function resolveKeyedDiagrams(
  entries: readonly { key: string; diagram: Diagram }[],
): Promise<ResolvedDiagrams> {
  const svg: Record<string, string> = {};
  const overlays: Record<string, Overlay[]> = {};
  const notes: Record<string, DiagramNote> = {};
  const deadline = Date.now() + DIAGRAM_BUDGET_MS;
  for (const { key, diagram } of entries) {
    if (Date.now() > deadline) {
      reportPdfIssue('diagram budget', `skipped ${key} and any figures after it`);
      break;
    }
    try {
      const resolved = await resolveDiagram(diagram, 'light', 'print');
      if (!resolved.ok) {
        reportPdfIssue(`diagram ${key}`, resolved.diagnostic);
        continue;
      }
      svg[key] = resolved.svg;
      overlays[key] = resolved.overlays;
      if (resolved.corrected || resolved.caption) {
        notes[key] = { corrected: resolved.corrected, caption: resolved.caption };
      }
    } catch (err) {
      reportPdfIssue(`diagram ${key}`, err);
    }
  }
  return { svg, overlays, notes };
}

async function resolveDiagrams(session: Session): Promise<ResolvedDiagrams> {
  return resolveKeyedDiagrams(collectDiagrams(session));
}

/** The instrument voice: small mono capitals for the name of an object on the page. */
const LABEL = `font:500 7.5pt/1.6 ${FONT_MONO};letter-spacing:.07em;text-transform:uppercase;`;

/**
 * The print sheet. Type sizes are points that land on whole CSS pixels (7.5pt = 10px, 10.5pt = 14px,
 * 12pt = 16px), so the rasteriser never sets a line on a half pixel. Colour carries nothing: the
 * answer is a ruled box, the key relation a tinted well with a hairline, a takeaway a ruled note.
 *
 * A page can end at the edge of any block the paginator keeps whole, and that edge is rounded to a
 * pixel. A rule drawn exactly on it would be cut in two, leaving a ghost line on the page before.
 * So no kept block carries a rule on its own top or bottom edge: the rule sits on a child, a pixel
 * inside (the answer box, the formula well, a code block, a table's rows), or under a label.
 */
export function printStyles(): string {
  return `
*{box-sizing:border-box;}
@page{size:A4;margin:12mm 14mm;}
html,body{margin:0;padding:0;background:${T.bg};color:${T.fg};}
body{font:10.5pt/1.5 ${FONT_SANS};-webkit-print-color-adjust:exact;print-color-adjust:exact;}
.slm-report{max-width:${CONTENT_WIDTH_PX}px;margin:0 auto;padding-left:${GUTTER_PX}px;}
.slm-report-head{margin:0 0 20px;}
.slm-report-head-row{display:flex;align-items:center;padding-bottom:9px;border-bottom:1px solid ${T.fg};}
.slm-report-wordmark{display:inline-flex;line-height:0;}
.slm-report-wordmark svg{display:block;height:18px;width:auto;}
.slm-report-title{margin:22px 0 0;font-size:18pt;font-weight:600;letter-spacing:-.02em;line-height:1.2;}
.slm-report-meta{display:flex;flex-wrap:wrap;gap:0 14px;margin:8px 0 0;font:400 7.5pt/1.6 ${FONT_MONO};color:${T.fgMuted};}
.slm-report-contents{list-style:none;max-width:${MEASURE_PX}px;margin:16px 0 0;padding:0;}
.slm-report-contents li{display:flex;align-items:baseline;gap:10px;margin:0;padding:3px 0;line-height:1.4;}
.slm-report-contents .slm-report-label{flex:0 0 24px;}
.slm-report-contents .slm-prose{flex:1;min-width:0;}
.slm-report-entry-head{display:flex;align-items:baseline;gap:8px;margin:0 0 6px;font:400 7.5pt/1.6 ${FONT_MONO};color:${T.fgMuted};}
.slm-report--merged .slm-report-entry-head{margin:30px 0 12px;padding-bottom:7px;border-bottom:1px solid ${T.fg};}
.slm-report-label{flex:0 0 auto;${LABEL}color:${T.fg};}
.slm-report-subject{flex:0 0 auto;${LABEL}color:${T.fgMuted};white-space:nowrap;}
.slm-report-sep{color:${T.rule};}
.slm-report-topic{min-width:0;margin:0;font:inherit;color:inherit;}
.slm-report-topic .katex{font-size:1em;}
.slm-report-q-block{max-width:${MEASURE_PX}px;margin:0 0 22px;}
.slm-report-q-text{font-size:13.5pt;font-weight:500;line-height:1.4;letter-spacing:-.008em;}
.slm-report-q-text .katex{font-size:1.1em;}
.slm-signals{display:flex;flex-wrap:wrap;gap:8px;margin:0 0 18px;}
.slm-signal--flag{padding:2px 8px;border:1px solid ${T.fg};border-radius:${T.radius};${LABEL}}
.slm-report-a{max-width:${MEASURE_PX}px;}
.slm-report-step{margin:0 0 22px;}
.slm-report-step-head{position:relative;margin:0 0 6px;}
.slm-report-step-n{position:absolute;left:-29px;top:0;line-height:0;}
.slm-report-step-n .slm-step-index{display:block;width:20px;height:20px;color:${T.signal};}
.slm-report-step-title{margin:0;font-size:12pt;font-weight:600;letter-spacing:-.012em;line-height:1.3;}
.slm-report-step-title .katex{font-size:1.05em;}
.slm-formula{margin:8px 0 10px;padding:1px 0;}
.slm-formula .slm-prose{padding:10px 14px;background:${T.tint};border:1px solid ${T.rule};border-radius:${T.radius};text-align:center;}
.slm-formula .katex-display{margin:0;}
.slm-formula .katex{font-size:1.15em;}
.slm-step-work{margin:0 0 8px;}
.slm-step-diagram{margin:14px 0 16px;}
.slm-report-diagram{display:flex;justify-content:center;align-items:center;width:100%;max-width:${PRINT_DIAGRAM_MM.maxW}mm;margin:0 auto;padding:0;}
.slm-diagram-frame{position:relative;display:inline-block;line-height:0;max-width:100%;overflow:visible;}
.slm-diagram-svg{display:inline-block;line-height:0;max-width:100%;}
/* The figure's own drawing only: a math label on it holds KaTeX's SVGs (a radical, a brace), which size themselves. */
.slm-report-diagram .slm-diagram-svg>svg{display:block;width:auto;max-width:100%;height:auto;max-height:${PRINT_DIAGRAM_MM.maxH}mm;}
.slm-report-diagram-caption,.slm-report-diagram-note{max-width:${PRINT_DIAGRAM_MM.maxW}mm;margin:6px auto 0;text-align:center;font-size:9pt;line-height:1.4;color:${T.fgMuted};}
.slm-report-diagram-note{margin-top:3px;font-size:8.25pt;}
.slm-diagram-overlay{position:absolute;pointer-events:none;white-space:nowrap;color:${T.fg};font-size:9.5pt;line-height:1;}
.slm-diagram-overlay .katex{font-size:1em;}
.slm-takeaway{margin:12px 0 0;padding:1px 0 2px 12px;border-left:2px solid ${T.fg};line-height:1.45;}
.slm-takeaway-label{display:block;margin:0 0 2px;${LABEL}color:${T.fgMuted};}
.slm-takeaway .slm-prose,.slm-takeaway p{font-weight:500;}
.slm-takeaway p{margin:0;}
.slm-report-answer{margin:0 0 26px;padding:1px 0;border:0;}
.slm-report-answer-box{padding:10px 14px 12px;border:1px solid ${T.fg};border-radius:${T.radius};}
.slm-report-answer .slm-step-diagram{margin:10px 0 4px;}
.slm-report-check{margin-top:14px;padding:0 0 1px;border-left:0;}
.slm-report-check-head{display:flex;align-items:baseline;justify-content:space-between;gap:12px;margin:0 0 2px;}
.slm-report-check-head .slm-takeaway-label{margin:0;color:${T.fg};}
.slm-report-check-hint{font-size:8.25pt;font-weight:400;line-height:1.4;color:${T.fgMuted};}
.slm-report-check .slm-prose{padding-bottom:26px;border-bottom:1px dotted ${T.fgMuted};}
.slm-report-solution{margin:0 0 22px;}
.slm-answer-notes{margin:0 0 16px;padding-left:12px;border-left:1px solid ${T.rule};font-size:9pt;line-height:1.45;color:${T.fgMuted};}
.slm-answer-note + .slm-answer-note{margin-top:8px;}
.slm-answer-note-label{display:block;margin:0 0 2px;${LABEL}color:${T.fgMuted};}
.slm-answer-note-failed{margin:0 0 2px;font-weight:600;color:${T.fg};}
.slm-report-check-answers{margin:0 0 16px;font-size:9pt;line-height:1.45;color:${T.fgMuted};}
.slm-report-check-answers .slm-takeaway-label{margin:0 0 6px;padding-bottom:4px;border-bottom:1px solid ${T.rule};}
.slm-report-check-answer{display:flex;align-items:baseline;gap:10px;margin:3px 0 0;}
.slm-report-check-n{flex:0 0 14px;font:500 7.5pt/1.6 ${FONT_MONO};color:${T.fg};}
.slm-report-check-answer .slm-prose{flex:1;min-width:0;}
.slm-report-origin{margin:0;font-size:8.25pt;line-height:1.45;color:${T.fgMuted};}
.slm-report-foot{margin-top:28px;padding-top:9px;border-top:1px solid ${T.fg};font-size:8.25pt;line-height:1.45;color:${T.fgMuted};break-inside:avoid;page-break-inside:avoid;break-before:avoid;page-break-before:avoid;}
.slm-report-smallprint{max-width:${MEASURE_PX}px;margin:0 0 3px;}
.slm-report-made{display:flex;gap:14px;margin:0;font:400 7.5pt/1.6 ${FONT_MONO};}
.slm-report-foot-link{color:inherit;text-decoration:none;}
.slm-prose{overflow-wrap:anywhere;word-wrap:break-word;}
.slm-prose p{margin:0 0 7px;orphans:3;widows:3;}
.slm-prose :first-child{margin-top:0;}
.slm-prose :last-child{margin-bottom:0;}
.slm-prose strong,.slm-prose b{font-weight:600;}
.slm-prose h1,.slm-prose h2,.slm-prose h3,.slm-prose h4,.slm-prose h5,.slm-prose h6{margin:10px 0 4px;font-size:10.5pt;font-weight:600;line-height:1.35;}
.slm-prose .katex-display{margin:9px 0;}
.slm-report-entry-head,.slm-report-topic,.slm-report-step-head,.slm-report-step-title,.slm-takeaway-label{break-after:avoid;page-break-after:avoid;}
.slm-report-step-intro{break-inside:avoid;page-break-inside:avoid;}
.slm-step-work{break-before:avoid;page-break-before:avoid;}
.slm-step-work-body{break-before:avoid;page-break-before:avoid;}
.slm-report-head,.slm-formula,.slm-takeaway,.slm-step-diagram,pre,table{break-inside:avoid;page-break-inside:avoid;}
thead{display:table-header-group;}
ul,ol{margin:0 0 7px;padding-left:20px;}
li{margin:2px 0;}
table{border-collapse:separate;border-spacing:0;width:100%;margin:8px 0 10px;padding:1px 0;font-size:9.75pt;line-height:1.4;}
th,td{padding:4px 12px 4px 0;text-align:left;vertical-align:top;}
th:last-child,td:last-child{padding-right:0;}
th{border-top:1.5px solid ${T.fg};border-bottom:1px solid ${T.fg};font-weight:600;}
tbody tr:last-child td{border-bottom:1.5px solid ${T.fg};}
pre{white-space:pre-wrap;word-break:break-word;overflow-wrap:anywhere;margin:8px 0 10px;padding:1px 0;font:9pt/1.45 ${FONT_MONO};}
code{font-family:${FONT_MONO};font-size:.9em;}
pre code{display:block;padding:8px 10px;background:${T.tint};border:1px solid ${T.rule};border-radius:${T.radius};font-size:1em;}
blockquote{margin:8px 0;padding:0 0 0 12px;border-left:1px solid ${T.rule};color:${T.fgMuted};}
hr{margin:12px 0;border:0;border-top:1px solid ${T.rule};}
a{color:inherit;}
.katex-error{font-family:${FONT_MONO};font-size:.88em;color:${T.fg}!important;background:${T.tint};padding:0 3px;border-radius:${T.radius};overflow-wrap:anywhere;}
.katex .katex-mathml{position:absolute!important;clip:rect(1px,1px,1px,1px)!important;padding:0!important;border:0!important;height:1px!important;width:1px!important;overflow:hidden!important;}
/* On screen the report is one continuous A4-wide sheet with the page's own margins. */
@media screen{
html,body{background:${T.mat};}
body{padding:24px 16px 48px;}
.slm-report{width:794px;max-width:100%;padding:45px 53px 48px ${53 + GUTTER_PX}px;background:${T.bg};box-shadow:0 1px 2px rgba(16,16,18,.05),0 8px 28px rgba(16,16,18,.08);}
}
/* Off-screen render surface: the column is exactly the A4 text box, so the
   rasteriser can slice it into pages without re-measuring margins. */
html.${RENDER_CLASS}{overflow:hidden;background:${T.bg};}
html.${RENDER_CLASS} body{width:${CONTENT_WIDTH_PX}px;margin:0;padding:0;background:${T.bg};overflow:hidden;}
html.${RENDER_CLASS} .slm-report{width:100%;max-width:none;margin:0;padding:0 0 0 ${GUTTER_PX}px;box-shadow:none;background:${T.bg};}
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
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${reportFontCss()}${printStyles()}</style></head><body>${body}</body></html>`;
}

export function buildReportDocument(
  session: Session,
  diagramSvg: Record<string, string>,
  diagramOverlays: Record<string, Overlay[]> = {},
  diagramNotes: Record<string, DiagramNote> = {},
): string {
  const body =
    tryRender('report', () => createElement(Report, { session, diagramSvg, diagramOverlays, diagramNotes })) ??
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
  diagramNotes: Record<string, DiagramNote> = {},
): string {
  const merged = (list: readonly Session[]) =>
    createElement(MergedReport, { sessions: [...list], diagramSvg, diagramOverlays, diagramNotes });

  let body = tryRender('merged report', () => merged(sessions));

  if (body === null) {
    // Find the offending question rather than losing the whole merge: anything
    // that cannot render on its own is dropped, and the rest merge normally.
    const usable = sessions.filter(
      (session) =>
        tryRender('merge probe', () =>
          createElement(Report, { session, diagramSvg, diagramOverlays, diagramNotes }),
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
  return buildReportDocument(session, resolved.svg, resolved.overlays, resolved.notes);
}

/** One continuous document holding every selected question. */
export async function renderMergedReportHtml(sessions: readonly Session[]): Promise<string> {
  const resolved = await resolveKeyedDiagrams(collectMergedDiagrams(sessions));
  return buildMergedReportDocument(sessions, resolved.svg, resolved.overlays, resolved.notes);
}

const PRINT_FRAME_TIMEOUT_MS = 15_000;

async function waitForPrintFrame(doc: Document, win: Window): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      win.removeEventListener('load', onLoad);
      if (error) reject(error);
      else resolve();
    };
    const go = async () => {
      if (settled) return;
      try {
        await Promise.race([
          Promise.resolve((doc as Document & { fonts?: FontFaceSet }).fonts?.ready),
          new Promise<void>((fontResolve) => setTimeout(fontResolve, 3_000)),
        ]);
      } catch {
        /* font readiness is optional; the print frame still has fallback fonts */
      }
      finish();
    };
    const onLoad = () => setTimeout(() => void go(), 80);
    timer = setTimeout(() => finish(new Error('print frame timed out')), PRINT_FRAME_TIMEOUT_MS);
    if (doc.readyState === 'complete') setTimeout(() => void go(), 80);
    else win.addEventListener('load', onLoad, { once: true });
  });
}

export async function exportSessionPdf(session: Session): Promise<PdfExportResult> {
  let iframe: HTMLIFrameElement | null = null;
  try {
    const resolved = await resolveDiagrams(session);
    const html = buildReportDocument(session, resolved.svg, resolved.overlays, resolved.notes);
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

    await waitForPrintFrame(doc, win);

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

/** Basename for a merged export. Says what it is, how much is in it, and when. */
export function mergedPdfFileName(count: number): string {
  if (count <= 1) return pdfFileName();
  return `stemLM - ${count} questions - ${localDate(Date.now())}.pdf`;
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

/** The running footer: one line of small mono type in the bottom margin of every page. */
const FOOTER_HEIGHT_PX = 14;
/** Clear space between the page's content box and the footer line. */
const FOOTER_GAP_PT = 9;
const FOOTER_FONT = `10px ${FONT_MONO}`;

/** A canvas draws only faces that are already loaded; the page's stylesheet merely declares them. */
async function loadFooterFaces(): Promise<void> {
  try {
    await Promise.all(['400', '500'].map((weight) => document.fonts.load(`${weight} ${FOOTER_FONT}`)));
  } catch {
    /* the footer falls back to the system mono face rather than blocking the export */
  }
}

/**
 * The footer of one page, as an image the width of the page column: the brand and what the report
 * is about at the text's left edge, the folio at the right margin. The pages are images, so the
 * line is drawn on a canvas in the report's own mono face instead of one of jsPDF's built-in
 * fonts. Null where there is no 2D canvas to draw on.
 */
function footerImage(label: string, page: number, total: number): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = CONTENT_WIDTH_PX * RENDER_SCALE;
  canvas.height = FOOTER_HEIGHT_PX * RENDER_SCALE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(RENDER_SCALE, RENDER_SCALE);
  ctx.fillStyle = T.bg;
  ctx.fillRect(0, 0, CONTENT_WIDTH_PX, FOOTER_HEIGHT_PX);
  ctx.textBaseline = 'middle';
  const y = FOOTER_HEIGHT_PX / 2;

  const folio = `page ${page} of ${total}`;
  ctx.font = `400 ${FOOTER_FONT}`;
  ctx.fillStyle = T.fgMuted;
  ctx.textAlign = 'right';
  ctx.fillText(folio, CONTENT_WIDTH_PX, y);
  const folioLeft = CONTENT_WIDTH_PX - ctx.measureText(folio).width;

  ctx.textAlign = 'left';
  ctx.font = `500 ${FOOTER_FONT}`;
  ctx.fillStyle = T.fg;
  ctx.fillText('stemLM', GUTTER_PX, y);
  const labelLeft = GUTTER_PX + ctx.measureText('stemLM').width + 12;

  ctx.font = `400 ${FOOTER_FONT}`;
  ctx.fillStyle = T.fgMuted;
  let text = label;
  // A long topic is cut to the room left of the folio, never drawn under it.
  while (text.length > 1 && labelLeft + ctx.measureText(text).width > folioLeft - 24) {
    text = `${text.slice(0, -2).trimEnd()}…`;
  }
  ctx.fillText(text, labelLeft, y);
  return canvas.toDataURL('image/png');
}

/** What the footer names beside the brand: the answer's topic, when it is a title of its own. */
function footerLabel(session: Session): string {
  const topic = plainText(session.capsule.meta.topic);
  // A canvas line cannot typeset TeX, and a topic that only opens the question is not a title.
  if (topic.includes('\\') || repeatsQuestion(topic, resolveSessionQuestion(session))) return '';
  return topic;
}

/**
 * Stitch rasterised A4 pages into one PDF. Each page image sits inside the margins; the running
 * footer is added below it, in the bottom margin, so the paginator's page box is untouched.
 */
export async function pagesToPdfBlob(pages: readonly RenderedPage[], label = ''): Promise<Blob> {
  if (pages.length === 0) throw new Error('no pages');
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait', compress: true });
  await loadFooterFaces();

  pages.forEach((page, i) => {
    if (i > 0) pdf.addPage('a4', 'portrait');
    const rect = sliceRectPt(page.slice);
    pdf.addImage(page.dataUrl, 'PNG', rect.x, rect.y, rect.width, rect.height, undefined, 'FAST');
    const footer = footerImage(label, i + 1, pages.length);
    if (footer) {
      pdf.addImage(
        footer, 'PNG', MARGIN_X_PT, MARGIN_Y_PT + CONTENT_HEIGHT_PT + FOOTER_GAP_PT,
        CONTENT_WIDTH_PT, FOOTER_HEIGHT_PX * PX_TO_PT, undefined, 'FAST',
      );
    }
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
  footer: string,
): Promise<PdfExportResult> {
  try {
    const pages = await renderHtmlToPageImages(html, options);
    const blob = await pagesToPdfBlob(pages, footer);
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
  let footer: string;
  try {
    html = await renderSessionReportHtml(session);
    footer = footerLabel(session);
  } catch (err) {
    void trackEvent('pdf_exported', { platform: session.platform, method: 'failed' });
    return failed('build', err);
  }
  return downloadHtmlAsPdf(html, pdfFileName(session), options, session.platform, footer);
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
  return downloadHtmlAsPdf(
    html, mergedPdfFileName(sessions.length), options, first.platform, mergedReportKicker(sessions.length),
  );
}
