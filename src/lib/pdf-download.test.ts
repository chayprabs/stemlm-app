import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Session } from '@/src/protocol/types';
import type { RenderedPage } from './pdf-raster';

const downloadMock = vi.fn(async (_options?: unknown) => 17);

vi.mock('wxt/browser', () => ({
  browser: {
    downloads: {
      download: (options: unknown) => downloadMock(options),
    },
    storage: {
      local: {
        get: vi.fn(async () => ({})),
        set: vi.fn(async () => undefined),
      },
    },
    runtime: { getURL: (path: string) => path, id: 'test' },
  },
}));

/**
 * The rasteriser needs a real browser (iframe layout + canvas 2D), so it is
 * stubbed here and exercised for real in the browser harness. What this file
 * pins down is everything around it: page geometry handed to jsPDF, page count,
 * filenames, and that no print dialog is ever opened.
 */
const { renderHtmlToPageImages, BlankRenderError } = vi.hoisted(() => {
  class BlankRenderError extends Error {
    constructor() {
      super('The report rendered blank.');
      this.name = 'BlankRenderError';
    }
  }
  return { renderHtmlToPageImages: vi.fn(), BlankRenderError };
});

vi.mock('./pdf-raster', () => ({
  renderHtmlToPageImages,
  BlankRenderError,
  RENDER_CLASS: 'slm-pdf-render',
  RENDER_SCALE: 2,
}));

const addImage = vi.fn();
const addPage = vi.fn();

vi.mock('jspdf', () => {
  class MockPdf {
    addImage = addImage;
    addPage = addPage;
    output = vi.fn((kind: string) => {
      if (kind === 'blob') return new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' });
      return '%PDF-1.4 mock';
    });
  }
  return { jsPDF: MockPdf };
});

import {
  downloadSessionPdf,
  downloadSessionsPdf,
  mergedPdfFileName,
  pagesToPdfBlob,
  triggerPdfFileDownload,
} from './pdf';
import { CONTENT_WIDTH_PT, MARGIN_X_PT, MARGIN_Y_PT } from './pdf-paginate';

function session(id = 'pdf-1', question = 'What is 2 + 2?'): Session {
  return {
    id,
    createdAt: 1,
    updatedAt: 1,
    platform: 'gemini',
    question,
    raw: '',
    capsule: {
      meta: { version: 1, subject: 'Math', topic: 'Arithmetic' },
      steps: [{ id: 's1', index: 1, title: 'Add', body: '2 + 2 = 4' }],
      solution: '4',
      solutionDiagrams: [],
    },
  };
}

/** Markup only — the stylesheet mentions the same class names. */
function bodyOf(html: string): string {
  const start = html.indexOf('<body>');
  return start < 0 ? html : html.slice(start + '<body>'.length);
}

function pages(...heights: number[]): RenderedPage[] {
  let top = 0;
  return heights.map((height) => {
    const page = { slice: { top, height }, dataUrl: `data:image/png;base64,page-${top}` };
    top += height;
    return page;
  });
}

describe('PDF file download', () => {
  beforeEach(() => {
    downloadMock.mockClear();
    addImage.mockClear();
    addPage.mockClear();
    renderHtmlToPageImages.mockReset();
    renderHtmlToPageImages.mockResolvedValue(pages(1032));
    document.body.innerHTML = '';
  });

  it('sends a PDF blob to Downloads with saveAs false', async () => {
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    await triggerPdfFileDownload(blob, 'stemLM.pdf');
    expect(downloadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'stemLM.pdf',
        saveAs: false,
        conflictAction: 'uniquify',
        url: expect.stringMatching(/^(blob:|data:)/),
      }),
    );
  });

  it('appends the .pdf extension when the caller omits it', async () => {
    await triggerPdfFileDownload(new Blob(['%PDF']), 'stemLM-3-questions');
    expect(downloadMock).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'stemLM-3-questions.pdf' }),
    );
  });

  it('builds a PDF and does not open the print dialog', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const result = await downloadSessionPdf(session());
    expect(result).toEqual({ ok: true, method: 'download' });
    expect(print).not.toHaveBeenCalled();
    expect(downloadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: 'stemLM.pdf',
        saveAs: false,
      }),
    );
    print.mockRestore();
  });

  it('places every page inside the A4 margins and keeps a short last page short', async () => {
    await pagesToPdfBlob(pages(1032, 1032, 240));

    expect(addPage).toHaveBeenCalledTimes(2);
    expect(addImage).toHaveBeenCalledTimes(3);
    for (const call of addImage.mock.calls) {
      expect(call[1]).toBe('PNG');
      expect(call[2]).toBeCloseTo(MARGIN_X_PT, 5);
      expect(call[3]).toBeCloseTo(MARGIN_Y_PT, 5);
      expect(call[4]).toBeCloseTo(CONTENT_WIDTH_PT, 5);
    }
    // 1032px * 0.75 = 774pt full page; the tail page keeps its own height.
    expect(addImage.mock.calls[0]?.[5]).toBeCloseTo(774, 5);
    expect(addImage.mock.calls[2]?.[5]).toBeCloseTo(180, 5);
  });

  it('reports a blank render as a failure instead of saving the file', async () => {
    renderHtmlToPageImages.mockRejectedValue(new BlankRenderError());
    const result = await downloadSessionPdf(session());
    expect(result).toMatchObject({ ok: false, method: 'failed', reason: 'blank' });
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('reports a render crash without saving anything, and says what broke', async () => {
    renderHtmlToPageImages.mockRejectedValue(new Error('boom'));
    const result = await downloadSessionPdf(session());
    expect(result).toMatchObject({ ok: false, method: 'failed', reason: 'render' });
    // A bare "try again" is undebuggable; the cause travels with the result.
    expect(result.detail).toContain('boom');
    expect(downloadMock).not.toHaveBeenCalled();
  });

  it('distinguishes a timeout from a crash so the message can differ', async () => {
    renderHtmlToPageImages.mockRejectedValue(new Error('capture timed out'));
    const result = await downloadSessionPdf(session());
    expect(result).toMatchObject({ ok: false, method: 'failed', reason: 'timeout' });
    expect(downloadMock).not.toHaveBeenCalled();
  });
});

describe('merged PDF download', () => {
  beforeEach(() => {
    downloadMock.mockClear();
    addImage.mockClear();
    addPage.mockClear();
    renderHtmlToPageImages.mockReset();
    renderHtmlToPageImages.mockResolvedValue(pages(1032, 1032, 300));
    document.body.innerHTML = '';
  });

  it('names the file after how many questions it holds', () => {
    expect(mergedPdfFileName(3)).toBe('stemLM-3-questions.pdf');
    expect(mergedPdfFileName(12)).toBe('stemLM-12-questions.pdf');
    expect(mergedPdfFileName(1)).toBe('stemLM.pdf');
  });

  it('renders one continuous document for several questions', async () => {
    const result = await downloadSessionsPdf([
      session('a', 'Find the impedance.'),
      session('b', 'Find the net force.'),
      session('c', 'Solve the quadratic.'),
    ]);

    expect(result).toEqual({ ok: true, method: 'download' });
    // One document, not three concatenated files.
    expect(renderHtmlToPageImages).toHaveBeenCalledOnce();
    const body = bodyOf(String(renderHtmlToPageImages.mock.calls[0]?.[0] ?? ''));
    expect(body).toContain('slm-report slm-report--merged');
    expect(body).toContain('Q1.');
    expect(body).toContain('Q2.');
    expect(body).toContain('Q3.');
    expect(body).toContain('Find the impedance.');
    expect(body).toContain('Solve the quadratic.');
    expect(body).toContain('3 questions');
    // Brand header and sign-off appear exactly once for the whole document.
    expect(body.match(/PDF made using stemLM/g)).toHaveLength(1);
    expect(body.match(/slm-report-wordmark/g)).toHaveLength(1);
    expect(body.match(/slm-report-foot"/g)).toHaveLength(1);
    // Every question keeps its own answer section.
    expect(body.match(/class="slm-report-entry"/g)).toHaveLength(3);

    expect(downloadMock).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'stemLM-3-questions.pdf', saveAs: false }),
    );
  });

  it('falls back to the single-question path for a one-item selection', async () => {
    renderHtmlToPageImages.mockResolvedValue(pages(600));
    const result = await downloadSessionsPdf([session('only', 'Just one.')]);

    expect(result).toEqual({ ok: true, method: 'download' });
    const body = bodyOf(String(renderHtmlToPageImages.mock.calls[0]?.[0] ?? ''));
    expect(body).not.toContain('slm-report--merged');
    expect(body).toContain('Just one.');
    expect(body).toContain('slm-report-label">Q.<');
    expect(downloadMock).toHaveBeenCalledWith(
      expect.objectContaining({ filename: 'stemLM.pdf' }),
    );
  });

  it('refuses an empty selection', async () => {
    const result = await downloadSessionsPdf([]);
    expect(result).toEqual({ ok: false, method: 'failed', reason: 'empty' });
    expect(renderHtmlToPageImages).not.toHaveBeenCalled();
    expect(downloadMock).not.toHaveBeenCalled();
  });
});
