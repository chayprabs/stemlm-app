/**
 * HTML → A4 page images.
 *
 * The report document is written into an isolated iframe and rasterised from
 * *inside that iframe*. html2canvas resolves `element.ownerDocument` and builds
 * its clone there, so the report's own `<style>` (print rules + KaTeX) applies
 * and the surrounding page — a chat host, the library window, either theme —
 * cannot reach the output. Handing the report body to jsPDF's `html()` helper
 * instead is what produced blank exports: that helper deep-clones the source
 * node into the *host* document, dropping the stylesheet, so light-on-dark page
 * text ended up white ink on white paper.
 *
 * Everything here needs a real browser (canvas 2D, iframe layout, fonts), so
 * the pure page arithmetic lives in `pdf-paginate.ts` and is tested there.
 */
import {
  CONTENT_HEIGHT_PX,
  CONTENT_WIDTH_PX,
  MAX_PAGES,
  chunkPages,
  pagesPerChunk,
  planPages,
  snapPages,
  type PageSlice,
  type Range,
} from './pdf-paginate';

/** 2× ≈ 192 dpi against the 96 dpi CSS grid — crisp text at a sane file size. */
export const RENDER_SCALE = 2;
export const MAX_RENDER_HEIGHT_PX = MAX_PAGES * CONTENT_HEIGHT_PX;

/** Marks the render document so screen decoration (card, shadow, grey mat) is off. */
export const RENDER_CLASS = 'slm-pdf-render';

/** Blocks that must never be cut through. */
const ATOMIC_SELECTOR = [
  '.slm-formula',
  '.slm-step-diagram',
  '.slm-report-diagram',
  '.slm-takeaway',
  '.slm-signal--flag',
  '.katex-display',
  '.slm-report-head',
  '.slm-report-entry-head',
  '.slm-report-step-intro',
  'table',
  'pre',
  'blockquote',
].join(',');

/** Headings that must keep at least a couple of lines with them. */
const KEEP_WITH_NEXT_SELECTOR = [
  '.slm-report-step-head',
  '.slm-report-entry-head',
  '.slm-report-topic',
  '.slm-formula-label',
  '.slm-step-work-label',
  '.slm-takeaway-label',
  '.slm-step-diagram-label',
].join(',');

/** Boxes whose edges are always a clean place to break. */
const BLOCK_SELECTOR =
  'p,li,h1,h2,h3,h4,h5,h6,article,section,header,footer,div,tr,ul,ol,pre,table,blockquote';

/** ~2 lines of 11pt/1.5 body text. */
const KEEP_AHEAD_PX = 46;
/** Keeps the sign-off attached to the last answer line. */
const KEEP_BEHIND_PX = 28;
/** Guard against pathological documents; long reports still measure fully. */
const MAX_TEXT_NODES = 20_000;

export interface RenderedPage {
  slice: PageSlice;
  /** `data:image/png;base64,…` for one A4 content box. */
  dataUrl: string;
}

export interface RenderProgress {
  page: number;
  total: number;
}

export interface RenderOptions {
  scale?: number;
  onProgress?: (progress: RenderProgress) => void;
  signal?: { aborted: boolean };
}

export class BlankRenderError extends Error {
  constructor() {
    super('The report rendered blank.');
    this.name = 'BlankRenderError';
  }
}

type Html2Canvas = (
  element: HTMLElement,
  options: Record<string, unknown>,
) => Promise<HTMLCanvasElement>;

async function loadHtml2Canvas(): Promise<Html2Canvas> {
  const mod = (await import('html2canvas')) as unknown as {
    default?: Html2Canvas;
  } & Html2Canvas;
  return (mod.default ?? mod) as Html2Canvas;
}

/**
 * Off-screen, but never `display:none` — a collapsed frame does not lay out, and
 * html2canvas needs to attach its own clone frame inside this one. `!important`
 * keeps a host page's `iframe {}` rules from reshaping the render surface.
 */
function frameStyle(): string {
  return [
    'position:fixed !important',
    'left:-20000px !important',
    'top:0 !important',
    `width:${CONTENT_WIDTH_PX}px !important`,
    'height:1200px !important',
    'max-width:none !important',
    'max-height:none !important',
    'min-width:0 !important',
    'min-height:0 !important',
    'margin:0 !important',
    'padding:0 !important',
    'border:0 !important',
    'display:block !important',
    'visibility:visible !important',
    'opacity:1 !important',
    'transform:none !important',
    'filter:none !important',
    'clip-path:none !important',
    'pointer-events:none !important',
    'z-index:-2147483647 !important',
  ].join(';');
}

interface Frame {
  iframe: HTMLIFrameElement;
  doc: Document;
  win: Window;
  root: HTMLElement;
}

function openFrame(html: string): Frame {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.setAttribute('tabindex', '-1');
  iframe.style.cssText = frameStyle();
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    iframe.remove();
    throw new Error('no render frame');
  }

  doc.open();
  doc.write(html);
  doc.close();
  doc.documentElement.classList.add(RENDER_CLASS);

  const root = doc.querySelector<HTMLElement>('.slm-report');
  if (!root) {
    iframe.remove();
    throw new Error('no report root');
  }
  return { iframe, doc, win, root };
}

/**
 * Timers and frame callbacks are taken from *this* window, never the render
 * frame's. Chrome throttles — and can entirely stop — animation frames in an
 * iframe parked outside the viewport, so anything awaiting the frame's own
 * `requestAnimationFrame` never resumes.
 */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function withDeadline<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    work,
    delay(ms).then(() => {
      throw new Error(`${label} timed out`);
    }),
  ]);
}

async function settle(doc: Document, win: Window): Promise<void> {
  await Promise.race([
    new Promise<void>((resolve) => {
      if (doc.readyState === 'complete') {
        resolve();
        return;
      }
      win.addEventListener('load', () => resolve(), { once: true });
    }),
    // A document.write document sometimes never fires load; do not hang on it.
    delay(4_000),
  ]);

  await Promise.race([
    Promise.resolve((doc as Document & { fonts?: FontFaceSet }).fonts?.ready).catch(
      () => undefined,
    ),
    // Webfonts are a nicety; the stack falls back rather than blocking the export.
    delay(3_000),
  ]);

  // Flush layout, then give the swapped face one tick to reflow.
  void doc.documentElement.offsetHeight;
  await delay(60);
  void doc.documentElement.offsetHeight;
}

/** html2canvas measures fonts in its global document, outside the report iframe. */
function prepareCaptureFontMetrics(source: Document): () => void {
  // Its private baseline probe is a hidden nowrap div containing this exact
  // one-pixel GIF. Host resets such as img{display:block} turn it into a second
  // line and shift every drawn glyph. Normalize only this probe, never host images.
  const probe = 'body > div[style*="visibility: hidden"][style*="white-space: nowrap"]:has(> img[width="1"][height="1"][src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"])';
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(`
    ${probe} { position: static !important; display: block !important; line-height: normal !important; letter-spacing: normal !important; text-transform: none !important; }
    ${probe} > span { display: inline !important; position: static !important; float: none !important; line-height: normal !important; border: 0 !important; }
    ${probe} > img { display: inline !important; position: static !important; float: none !important; width: 1px !important; height: 1px !important; min-width: 0 !important; min-height: 0 !important; max-width: none !important; max-height: none !important; border: 0 !important; }
  `);
  // The host may not contain KaTeX at all, or may keep its fonts in a shadow
  // root. Share the report's already-loaded faces so canvas uses the same glyphs.
  const addedFaces: FontFace[] = [];
  const cleanup = () => {
    document.adoptedStyleSheets = document.adoptedStyleSheets.filter((candidate) => candidate !== sheet);
    for (const face of addedFaces) document.fonts.delete(face);
  };
  try {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
    source.fonts.forEach((face) => {
      if (face.status === 'loaded' && !document.fonts.has(face)) {
        document.fonts.add(face);
        addedFaces.push(face);
      }
    });
  } catch (error) {
    cleanup();
    throw error;
  }
  return cleanup;
}

export interface Measurement {
  totalHeight: number;
  candidates: number[];
  forbidden: Range[];
  textNodesTruncated: boolean;
}

/** Line boxes and block edges, relative to the top of the report column. */
export function measureBreaks(root: HTMLElement): Measurement {
  const originRect = root.getBoundingClientRect();
  const originTop = originRect.top;
  const totalHeight = originRect.height;
  const rel = (value: number) => value - originTop;

  const candidates: number[] = [0, totalHeight];
  const forbidden: Range[] = [];

  for (const el of root.querySelectorAll<HTMLElement>(ATOMIC_SELECTOR)) {
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) continue;
    if (rect.height <= CONTENT_HEIGHT_PX) forbidden.push([rel(rect.top), rel(rect.bottom)]);
    candidates.push(rel(rect.top), rel(rect.bottom));
  }

  for (const el of root.querySelectorAll<HTMLElement>(KEEP_WITH_NEXT_SELECTOR)) {
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) continue;
    forbidden.push([rel(rect.top), rel(rect.bottom) + KEEP_AHEAD_PX]);
  }

  // Keep each step heading, formula, and first work block together, but do not
  // make continuation paragraphs or the entire long step atomic.
  for (const step of root.querySelectorAll<HTMLElement>('.slm-report-step')) {
    const head = step.querySelector<HTMLElement>('.slm-report-step-head');
    const body = step.querySelector<HTMLElement>('.slm-step-work-body .slm-prose');
    const firstWork = body?.firstElementChild instanceof HTMLElement ? body.firstElementChild : body;
    if (!head || !firstWork) continue;
    const headRect = head.getBoundingClientRect();
    const workRect = firstWork.getBoundingClientRect();
    if (headRect.height <= 0 || workRect.height <= 0) continue;
    const start = rel(headRect.top);
    const end = Math.max(rel(headRect.bottom), rel(workRect.top) + Math.min(workRect.height, KEEP_AHEAD_PX));
    if (end > start + 0.5) forbidden.push([start, end]);
  }

  const foot = root.querySelector<HTMLElement>('.slm-report-foot');
  if (foot) {
    const rect = foot.getBoundingClientRect();
    if (rect.height > 0) forbidden.push([rel(rect.top) - KEEP_BEHIND_PX, rel(rect.bottom)]);
  }

  for (const el of root.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)) {
    const rect = el.getBoundingClientRect();
    if (rect.height <= 0) continue;
    candidates.push(rel(rect.top), rel(rect.bottom));
  }

  // SVG text ranges can differ from the ink bounds used when the SVG is
  // rasterised. Keep the measured labels (including math overlays) together
  // when a tall figure spans pages, with room for pixel rounding at each edge.
  for (const label of root.querySelectorAll('.slm-diagram-svg svg text, .slm-diagram-overlay')) {
    const rect = label.getBoundingClientRect();
    if (rect.height <= 0 || rect.height + 4 > CONTENT_HEIGHT_PX) continue;
    const top = Math.max(0, rel(rect.top) - 2);
    const bottom = Math.min(totalHeight, rel(rect.bottom) + 2);
    forbidden.push([top, bottom]);
    candidates.push(top, bottom);
  }

  const doc = root.ownerDocument;
  const walker = doc.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = doc.createRange();
  let seen = 0;
  let textNodesTruncated = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.nodeValue?.trim()) continue;
    if (seen >= MAX_TEXT_NODES) {
      textNodesTruncated = true;
      break;
    }
    // KaTeX keeps a clipped MathML copy of every formula; its boxes are not lines.
    if ((node.parentElement as HTMLElement | null)?.closest('.katex-mathml')) continue;
    seen += 1;
    range.selectNodeContents(node);
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.height <= 0) continue;
      if (rect.height <= CONTENT_HEIGHT_PX) forbidden.push([rel(rect.top), rel(rect.bottom)]);
      candidates.push(rel(rect.bottom));
    }
  }

  return { totalHeight, candidates, forbidden, textNodesTruncated };
}

/** Cheap all-white detector so a broken capture is reported instead of shipped. */
export function hasInk(canvas: HTMLCanvasElement): boolean {
  try {
    const width = Math.max(1, Math.min(96, canvas.width));
    const height = Math.max(1, Math.min(160, canvas.height));
    const probe = document.createElement('canvas');
    probe.width = width;
    probe.height = height;
    const ctx = probe.getContext('2d', { willReadFrequently: true });
    if (!ctx) return true;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height);
    const { data } = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < data.length; i += 4) {
      if ((data[i] as number) < 245 || (data[i + 1] as number) < 245 || (data[i + 2] as number) < 245) {
        return true;
      }
    }
    return false;
  } catch {
    // Tainted or unsupported canvas — cannot prove it is blank, so let it through.
    return true;
  }
}

function sliceToDataUrl(
  source: HTMLCanvasElement,
  offsetPx: number,
  slice: PageSlice,
  scale: number,
): string {
  const width = Math.max(1, Math.round(CONTENT_WIDTH_PX * scale));
  const height = Math.max(1, Math.round(slice.height * scale));
  const page = document.createElement('canvas');
  page.width = width;
  page.height = height;
  const ctx = page.getContext('2d');
  if (!ctx) throw new Error('no 2d context');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  // A zero-sized source makes drawImage throw IndexSizeError; a white page is
  // the better outcome, and the ink check still catches a wholly empty export.
  if (source.width < 1 || source.height < 1) return page.toDataURL('image/png');
  ctx.drawImage(
    source,
    0,
    Math.round(offsetPx * scale),
    width,
    height,
    0,
    0,
    width,
    height,
  );
  return page.toDataURL('image/png');
}

/**
 * Lay the report out once, then rasterise it a few pages at a time. Chunking
 * caps peak canvas memory, so merging twenty questions costs the same working
 * set as exporting one.
 */
export async function renderHtmlToPageImages(
  html: string,
  options: RenderOptions = {},
): Promise<RenderedPage[]> {
  if (html.length > 2_000_000) throw new Error('report HTML exceeds the export limit');
  const scale = options.scale ?? RENDER_SCALE;
  const html2canvas = await loadHtml2Canvas();
  const frame = openFrame(html);
  let cleanupFontMetrics: (() => void) | undefined;

  try {
    await settle(frame.doc, frame.win);
    // KaTeX positions stretchy SVGs against inline layout. Freeze the measured
    // local geometry before html2canvas clones it into a different document.
    for (const svg of frame.root.querySelectorAll<SVGSVGElement>('.katex svg')) {
      const parent = svg.parentElement;
      if (!parent) continue;
      const bounds = svg.getBoundingClientRect();
      const anchor = parent.getBoundingClientRect();
      parent.style.position = 'relative';
      svg.style.left = `${bounds.left - anchor.left}px`;
      svg.style.top = `${bounds.top - anchor.top}px`;
      svg.style.width = `${bounds.width}px`;
      svg.style.height = `${bounds.height}px`;
    }
    cleanupFontMetrics = prepareCaptureFontMetrics(frame.doc);

    const { totalHeight, candidates, forbidden, textNodesTruncated } = measureBreaks(frame.root);
    if (textNodesTruncated) throw new Error('report text exceeds the export limit');
    if (!(totalHeight > 0)) throw new BlankRenderError();
    if (totalHeight > MAX_RENDER_HEIGHT_PX) throw new Error('report exceeds the maximum page count');

    // Give the frame the full column so html2canvas' clone never scrolls.
    frame.iframe.style.setProperty(
      'height',
      `${Math.max(1200, Math.ceil(totalHeight) + 64)}px`,
      'important',
    );

    const pages = snapPages(
      planPages({ totalHeight, pageHeight: CONTENT_HEIGHT_PX, candidates, forbidden }),
      totalHeight,
    );
    const chunks = chunkPages(pages, pagesPerChunk(scale));

    const rendered: RenderedPage[] = [];
    let checkedInk = false;

    for (const chunk of chunks) {
      if (options.signal?.aborted) throw new Error('aborted');
      const chunkTop = chunk[0]?.top ?? 0;
      const chunkHeight = chunk.reduce((sum, page) => sum + page.height, 0);
      if (chunkHeight <= 0) continue;

      const canvas = await withDeadline(
        html2canvas(frame.root, {
        x: 0,
        y: chunkTop,
        width: CONTENT_WIDTH_PX,
        height: chunkHeight,
        windowWidth: CONTENT_WIDTH_PX,
        windowHeight: Math.ceil(totalHeight) + 64,
        scale,
        backgroundColor: '#ffffff',
        useCORS: true,
        allowTaint: false,
        logging: false,
        imageTimeout: 20_000,
        removeContainer: true,
        }),
        90_000,
        'capture',
      );

      if (!checkedInk) {
        checkedInk = true;
        if (!hasInk(canvas)) throw new BlankRenderError();
      }

      for (const slice of chunk) {
        rendered.push({
          slice,
          dataUrl: sliceToDataUrl(canvas, slice.top - chunkTop, slice, scale),
        });
        options.onProgress?.({ page: rendered.length, total: pages.length });
      }

      // Release the chunk bitmap before laying out the next one.
      canvas.width = 0;
      canvas.height = 0;
    }

    if (rendered.length === 0) throw new BlankRenderError();
    return rendered;
  } finally {
    cleanupFontMetrics?.();
    frame.iframe.remove();
  }
}
