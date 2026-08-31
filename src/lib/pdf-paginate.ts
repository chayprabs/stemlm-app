/**
 * Page planning for the PDF renderer.
 *
 * The report is laid out once as a single continuous HTML column, then sliced
 * into A4 pages. Slicing at a fixed page height would cut through a line of
 * text, a formula card, or a diagram, so the renderer measures two things in
 * the DOM and hands them here:
 *
 *  - **candidates** — offsets where a cut is visually safe (line-box edges,
 *    block-box edges), in CSS px from the top of the report column.
 *  - **forbidden** — `[start, end)` ranges a cut must never land inside
 *    (formula cards, diagrams, tables, a heading plus its first line).
 *
 * Everything here is pure arithmetic so it can be tested without a browser.
 */

/** A4 at 72pt/in. */
export const A4_WIDTH_PT = 595.28;
export const A4_HEIGHT_PT = 841.89;

/** CSS px are 96dpi; PDF points are 72dpi. */
export const PX_TO_PT = 0.75;

/**
 * Text column, in CSS px. 688px → 516pt → 182mm, which leaves 14mm side
 * margins on A4; 1032px → 774pt → 273mm leaves 12mm top/bottom. Choosing whole
 * pixels keeps the capture grid aligned so glyphs never land on a half pixel.
 */
export const CONTENT_WIDTH_PX = 688;
export const CONTENT_HEIGHT_PX = 1032;

export const CONTENT_WIDTH_PT = CONTENT_WIDTH_PX * PX_TO_PT;
export const CONTENT_HEIGHT_PT = CONTENT_HEIGHT_PX * PX_TO_PT;

export const MARGIN_X_PT = (A4_WIDTH_PT - CONTENT_WIDTH_PT) / 2;
export const MARGIN_Y_PT = (A4_HEIGHT_PT - CONTENT_HEIGHT_PT) / 2;

/** Sub-pixel slack — layout measurements are fractional. */
const EPS = 0.5;

/** Refuse absurd inputs rather than locking the browser up on a giant canvas. */
export const MAX_PAGES = 120;

export type Range = readonly [number, number];

export interface PageSlice {
  /** Offset of this page's first pixel, in CSS px from the top of the column. */
  top: number;
  /** Slice height in CSS px. Never more than the page box; the last page is short. */
  height: number;
}

function sortedUnique(values: readonly number[]): number[] {
  const out = [...values].sort((a, b) => a - b);
  let write = 0;
  for (let read = 0; read < out.length; read += 1) {
    const value = out[read] as number;
    if (write === 0 || value - (out[write - 1] as number) > EPS) {
      out[write] = value;
      write += 1;
    }
  }
  out.length = write;
  return out;
}

/** True when `at` falls strictly inside a range (touching an edge is a legal cut). */
export function insideForbidden(at: number, forbidden: readonly Range[]): boolean {
  for (const [start, end] of forbidden) {
    if (at > start + EPS && at < end - EPS) return true;
  }
  return false;
}

/** Drop candidates that land inside an unbreakable block or outside the column. */
export function usableCandidates(
  candidates: readonly number[],
  forbidden: readonly Range[],
  totalHeight: number,
): number[] {
  return sortedUnique(
    candidates.filter(
      (value) =>
        Number.isFinite(value) &&
        value > EPS &&
        value < totalHeight - EPS &&
        !insideForbidden(value, forbidden),
    ),
  );
}

/** Largest value in a sorted list that is `<= limit` and `> floor`, if any. */
function largestBelow(sorted: readonly number[], limit: number, floor: number): number | null {
  let lo = 0;
  let hi = sorted.length - 1;
  let found: number | null = null;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const value = sorted[mid] as number;
    if (value <= limit + EPS) {
      if (value > floor + EPS) found = value;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

/**
 * When nothing safe fits, cut at the page boundary — but if that boundary sits
 * inside an unbreakable block, back up to the block's top so the block starts a
 * fresh page. A block taller than one page still has to be split.
 */
function hardCut(limit: number, top: number, forbidden: readonly Range[]): number {
  let cut = limit;
  for (const [start] of forbidden) {
    if (limit > start + EPS && start > top + EPS && start < cut) cut = start;
  }
  return cut;
}

export interface PlanPagesInput {
  /** Full height of the report column, CSS px. */
  totalHeight: number;
  /** Usable height of one page, CSS px. */
  pageHeight: number;
  candidates?: readonly number[];
  forbidden?: readonly Range[];
}

/**
 * Split the column into pages, preferring the lowest safe break on each page so
 * paper is filled as far down as the content allows.
 */
export function planPages({
  totalHeight,
  pageHeight,
  candidates = [],
  forbidden = [],
}: PlanPagesInput): PageSlice[] {
  const total = Number.isFinite(totalHeight) ? Math.max(0, totalHeight) : 0;
  const page = Number.isFinite(pageHeight) && pageHeight > 1 ? pageHeight : CONTENT_HEIGHT_PX;
  if (total <= EPS) return [{ top: 0, height: 0 }];
  if (total <= page + EPS) return [{ top: 0, height: total }];

  const safe = usableCandidates(candidates, forbidden, total);
  const pages: PageSlice[] = [];
  let top = 0;

  while (top < total - EPS) {
    if (pages.length >= MAX_PAGES) {
      pages.push({ top, height: total - top });
      break;
    }
    const limit = top + page;
    if (limit >= total - EPS) {
      pages.push({ top, height: total - top });
      break;
    }
    const cut = largestBelow(safe, limit, top) ?? hardCut(limit, top, forbidden);
    // Never stall: a cut that made no progress falls back to the page boundary.
    const next = cut > top + EPS ? cut : limit;
    pages.push({ top, height: next - top });
    top = next;
  }

  return pages;
}

/**
 * Round slices onto whole pixels so a capture never lands on a half pixel
 * (which would soften glyph edges) while still tiling the column exactly.
 */
export function snapPages(pages: readonly PageSlice[], totalHeight: number): PageSlice[] {
  if (pages.length === 0) return [];
  const total = Math.max(0, Math.round(totalHeight));
  const tops = pages.map((page) => Math.max(0, Math.min(total, Math.round(page.top))));
  const out: PageSlice[] = [];
  for (let i = 0; i < tops.length; i += 1) {
    const top = tops[i] as number;
    const end = i + 1 < tops.length ? (tops[i + 1] as number) : total;
    if (end - top <= 0) continue;
    out.push({ top, height: end - top });
  }
  return out.length > 0 ? out : [{ top: 0, height: total }];
}

/** Where a page slice lands on the A4 sheet, in points. */
export function sliceRectPt(slice: PageSlice): {
  x: number;
  y: number;
  width: number;
  height: number;
} {
  return {
    x: MARGIN_X_PT,
    y: MARGIN_Y_PT,
    width: CONTENT_WIDTH_PT,
    height: Math.max(0, slice.height) * PX_TO_PT,
  };
}

/**
 * Pages captured per html2canvas pass. Each pass rasterises
 * `CONTENT_WIDTH_PX * scale` by `pageHeight * scale * chunk` pixels, so this
 * caps peak canvas memory (~2.8 MPx per page at scale 2) regardless of how many
 * questions were merged.
 */
export function pagesPerChunk(scale: number, pageHeight = CONTENT_HEIGHT_PX): number {
  const budget = 24_000_000;
  const perPage = Math.max(1, CONTENT_WIDTH_PX * scale * pageHeight * scale);
  return Math.max(1, Math.floor(budget / perPage));
}

/** Group planned pages into contiguous capture chunks. */
export function chunkPages(pages: readonly PageSlice[], perChunk: number): PageSlice[][] {
  const size = Math.max(1, Math.floor(perChunk));
  const chunks: PageSlice[][] = [];
  for (let i = 0; i < pages.length; i += size) {
    chunks.push(pages.slice(i, i + size));
  }
  return chunks;
}
