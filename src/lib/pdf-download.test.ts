import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Session } from '@/src/protocol/types';

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

vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

vi.mock('jspdf', () => {
  class MockPdf {
    html = vi.fn(async (_el: unknown, options?: { callback?: () => void }) => {
      options?.callback?.();
      return this;
    });
    output = vi.fn((kind: string) => {
      if (kind === 'blob') return new Blob(['%PDF-1.4 mock'], { type: 'application/pdf' });
      return '%PDF-1.4 mock';
    });
  }
  return { jsPDF: MockPdf };
});

import { downloadSessionPdf, triggerPdfFileDownload } from './pdf';

function session(): Session {
  return {
    id: 'pdf-1',
    createdAt: 1,
    updatedAt: 1,
    platform: 'gemini',
    question: 'What is 2 + 2?',
    raw: '',
    capsule: {
      meta: { version: 1, subject: 'Math', topic: 'Arithmetic' },
      steps: [{ id: 's1', index: 1, title: 'Add', body: '2 + 2 = 4' }],
      solution: '4',
      solutionDiagrams: [],
    },
  };
}

describe('PDF file download', () => {
  beforeEach(() => {
    downloadMock.mockClear();
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
});
