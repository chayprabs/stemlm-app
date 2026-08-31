import { describe, it, expect } from 'vitest';
import {
  A4_HEIGHT_PT,
  A4_WIDTH_PT,
  CONTENT_HEIGHT_PT,
  CONTENT_HEIGHT_PX,
  CONTENT_WIDTH_PT,
  CONTENT_WIDTH_PX,
  MARGIN_X_PT,
  MARGIN_Y_PT,
  MAX_PAGES,
  chunkPages,
  insideForbidden,
  pagesPerChunk,
  planPages,
  sliceRectPt,
  usableCandidates,
  type PageSlice,
  type Range,
} from './pdf-paginate';

/** Line boxes every `step` px, the way a wall of body text measures. */
function lines(from: number, to: number, step = 22): number[] {
  const out: number[] = [];
  for (let y = from; y <= to; y += step) out.push(y);
  return out;
}

function covers(pages: PageSlice[], total: number): void {
  expect(pages[0]?.top).toBe(0);
  let cursor = 0;
  for (const page of pages) {
    expect(page.top).toBeCloseTo(cursor, 5);
    expect(page.height).toBeGreaterThan(0);
    cursor += page.height;
  }
  expect(cursor).toBeCloseTo(total, 5);
}

describe('page geometry', () => {
  it('leaves 14mm side and 12mm top margins on A4', () => {
    expect(CONTENT_WIDTH_PT).toBeCloseTo(516, 5);
    expect(CONTENT_HEIGHT_PT).toBeCloseTo(774, 5);
    // 1pt = 25.4/72 mm
    expect((MARGIN_X_PT * 25.4) / 72).toBeCloseTo(14, 1);
    expect((MARGIN_Y_PT * 25.4) / 72).toBeCloseTo(12, 1);
    expect(2 * MARGIN_X_PT + CONTENT_WIDTH_PT).toBeCloseTo(A4_WIDTH_PT, 5);
    expect(2 * MARGIN_Y_PT + CONTENT_HEIGHT_PT).toBeCloseTo(A4_HEIGHT_PT, 5);
  });

  it('places a short last slice at the top margin without stretching it', () => {
    const rect = sliceRectPt({ top: 3096, height: 120 });
    expect(rect.x).toBeCloseTo(MARGIN_X_PT, 5);
    expect(rect.y).toBeCloseTo(MARGIN_Y_PT, 5);
    expect(rect.width).toBeCloseTo(CONTENT_WIDTH_PT, 5);
    expect(rect.height).toBeCloseTo(90, 5); // 120px * 0.75
  });
});

describe('insideForbidden', () => {
  const blocks: Range[] = [
    [100, 300],
    [500, 560],
  ];

  it('rejects cuts strictly inside a block and allows its edges', () => {
    expect(insideForbidden(200, blocks)).toBe(true);
    expect(insideForbidden(520, blocks)).toBe(true);
    expect(insideForbidden(100, blocks)).toBe(false);
    expect(insideForbidden(300, blocks)).toBe(false);
    expect(insideForbidden(400, blocks)).toBe(false);
  });
});

describe('usableCandidates', () => {
  it('sorts, dedupes, and drops out-of-column or blocked offsets', () => {
    const result = usableCandidates([700, 120, 700, 0, -5, 250, 999, Number.NaN], [[200, 300]], 999);
    expect(result).toEqual([120, 700]);
  });

  it('treats offsets within half a pixel as the same candidate', () => {
    expect(usableCandidates([120, 120.3, 120.9], [], 999)).toEqual([120, 120.9]);
  });
});

describe('planPages', () => {
  it('returns a single slice when the column fits one page', () => {
    const pages = planPages({ totalHeight: 640, pageHeight: CONTENT_HEIGHT_PX });
    expect(pages).toEqual([{ top: 0, height: 640 }]);
  });

  it('handles an empty column without looping', () => {
    expect(planPages({ totalHeight: 0, pageHeight: 1032 })).toEqual([{ top: 0, height: 0 }]);
  });

  it('breaks on the lowest line box that still fits, never mid-line', () => {
    const total = 2400;
    const candidates = lines(22, total - 22);
    const pages = planPages({ totalHeight: total, pageHeight: 1000, candidates });

    covers(pages, total);
    expect(pages).toHaveLength(3);
    for (const page of pages.slice(0, -1)) {
      expect(page.height).toBeLessThanOrEqual(1000);
      // A whole page of 22px lines fills to within one line of the boundary.
      expect(page.height).toBeGreaterThan(1000 - 22);
      expect(candidates.some((c) => Math.abs(c - (page.top + page.height)) < 1e-6)).toBe(true);
    }
  });

  it('pushes an unbreakable block that straddles the boundary onto the next page', () => {
    // A diagram card occupies 950..1150; the page boundary at 1000 falls inside it.
    const forbidden: Range[] = [[950, 1150]];
    const candidates = [...lines(22, 946), 950, 1150, ...lines(1172, 2380)];
    const pages = planPages({ totalHeight: 2400, pageHeight: 1000, candidates, forbidden });

    covers(pages, 2400);
    const firstBreak = pages[0]!.height;
    expect(firstBreak).toBeLessThanOrEqual(950);
    expect(firstBreak).toBeGreaterThan(900);
    for (const page of pages) {
      const cut = page.top + page.height;
      if (cut < 2400) expect(insideForbidden(cut, forbidden)).toBe(false);
    }
  });

  it('starts a block on a fresh page when no line box is available before it', () => {
    // Nothing breakable between 40 and the block at 700..1400, so the page ends
    // early and the whole block lands intact at the top of page two.
    const forbidden: Range[] = [[700, 1400]];
    const pages = planPages({
      totalHeight: 1800,
      pageHeight: 1000,
      candidates: [40, 700, 1400],
      forbidden,
    });

    covers(pages, 1800);
    expect(pages).toEqual([
      { top: 0, height: 700 },
      { top: 700, height: 700 },
      { top: 1400, height: 400 },
    ]);
  });

  it('splits a block taller than a page rather than stalling', () => {
    const forbidden: Range[] = [[0, 3000]];
    const pages = planPages({ totalHeight: 3000, pageHeight: 1000, candidates: [], forbidden });

    covers(pages, 3000);
    expect(pages).toHaveLength(3);
    expect(pages.map((p) => p.height)).toEqual([1000, 1000, 1000]);
  });

  it('never emits a slice taller than the page box', () => {
    const total = 9000;
    const pages = planPages({
      totalHeight: total,
      pageHeight: 1032,
      candidates: lines(19, total - 19, 19),
    });
    covers(pages, total);
    for (const page of pages) expect(page.height).toBeLessThanOrEqual(1032 + 1e-6);
  });

  it('ignores candidates beyond the column and still reaches the end', () => {
    const pages = planPages({
      totalHeight: 1500,
      pageHeight: 1000,
      candidates: [1400, 2400, 9999],
    });
    covers(pages, 1500);
    expect(pages).toEqual([
      { top: 0, height: 1000 },
      { top: 1000, height: 500 },
    ]);
  });

  it('caps runaway input at MAX_PAGES', () => {
    const pages = planPages({ totalHeight: 1_000_000, pageHeight: 100, candidates: [] });
    expect(pages.length).toBeLessThanOrEqual(MAX_PAGES + 1);
    covers(pages, 1_000_000);
  });
});

describe('capture chunking', () => {
  it('keeps one pass under the canvas budget at scale 2', () => {
    const per = pagesPerChunk(2);
    expect(per).toBeGreaterThanOrEqual(1);
    expect(CONTENT_WIDTH_PX * 2 * CONTENT_HEIGHT_PX * 2 * per).toBeLessThanOrEqual(24_000_000);
    // A typical 1-3 page report must never need more than one pass.
    expect(per).toBeGreaterThanOrEqual(3);
  });

  it('allows more pages per pass at a lower scale', () => {
    expect(pagesPerChunk(1)).toBeGreaterThan(pagesPerChunk(2));
  });

  it('groups pages into contiguous chunks that cover every page once', () => {
    const pages = planPages({ totalHeight: 7000, pageHeight: 1000, candidates: lines(20, 6980) });
    const chunks = chunkPages(pages, 3);
    expect(chunks.flat()).toEqual(pages);
    expect(chunks[0]).toHaveLength(3);
    expect(chunkPages(pages, 0)[0]).toHaveLength(1);
  });
});
