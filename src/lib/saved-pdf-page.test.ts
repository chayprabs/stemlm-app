import { describe, it, expect, beforeEach, vi } from 'vitest';

const { getSavedSession, exportSessionPdf, renderSessionReportHtml, downloadTextFile } = vi.hoisted(
  () => ({
    getSavedSession: vi.fn(),
    exportSessionPdf: vi.fn(async () => ({ ok: true, method: 'print' as const })),
    renderSessionReportHtml: vi.fn(async () => '<html><body>VIEW-REPORT</body></html>'),
    downloadTextFile: vi.fn(),
  }),
);

vi.mock('wxt/browser', () => ({
  browser: {
    storage: { local: { get: vi.fn(), set: vi.fn() } },
    runtime: { getURL: (p: string) => p, id: 'test' },
  },
}));

vi.mock('@/src/lib/saved-sessions', () => ({
  getSavedSession,
  snapshotToSession: (snapshot: { id: string; question: string }) => ({
    id: snapshot.id,
    createdAt: 1,
    updatedAt: 1,
    platform: 'gemini',
    question: snapshot.question,
    raw: '',
    capsule: {
      meta: { version: 1, subject: 'Math', topic: 'Algebra' },
      steps: [],
      solution: 'done',
      solutionDiagrams: [],
    },
  }),
}));

vi.mock('@/src/lib/pdf', () => ({
  exportSessionPdf,
  renderSessionReportHtml,
  reportFilename: () => 'stemLM-algebra-2026-08-24',
}));

vi.mock('@/src/lib/file-download', () => ({
  downloadTextFile,
}));

import { parseSavedPdfMode, runSavedPdfPage } from './saved-pdf-page';

describe('saved-pdf page', () => {
  beforeEach(() => {
    getSavedSession.mockReset();
    exportSessionPdf.mockClear();
    renderSessionReportHtml.mockClear();
    downloadTextFile.mockClear();
    document.body.innerHTML = '<main id="app"></main>';
    vi.spyOn(window, 'print').mockImplementation(() => undefined);
  });

  it('defaults to view, never print', () => {
    expect(parseSavedPdfMode(null)).toBe('view');
    expect(parseSavedPdfMode('view')).toBe('view');
    expect(parseSavedPdfMode('print')).toBe('print');
  });

  it('view mode writes the report and does not print or download', async () => {
    getSavedSession.mockResolvedValue({
      id: 'lib-1',
      question: 'Saved Q',
      savedAt: 1,
      platform: 'gemini',
      meta: { version: 1, subject: 'Math', topic: 'Algebra' },
      steps: [],
      solution: 'done',
      solutionDiagrams: [],
    });
    const result = await runSavedPdfPage('id=lib-1&mode=view');
    expect(result).toEqual({ ok: true, mode: 'view' });
    expect(exportSessionPdf).not.toHaveBeenCalled();
    expect(downloadTextFile).not.toHaveBeenCalled();
    expect(window.print).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('VIEW-REPORT');
  });

  it('download mode starts a file download without printing', async () => {
    getSavedSession.mockResolvedValue({
      id: 'lib-1',
      question: 'Saved Q',
      savedAt: 1,
      platform: 'gemini',
      meta: { version: 1, subject: 'Math', topic: 'Algebra' },
      steps: [],
      solution: 'done',
      solutionDiagrams: [],
    });
    const result = await runSavedPdfPage('id=lib-1&mode=download');
    expect(result).toEqual({ ok: true, mode: 'download' });
    expect(downloadTextFile).toHaveBeenCalledWith(
      '<html><body>VIEW-REPORT</body></html>',
      'stemLM-algebra-2026-08-24.html',
    );
    expect(exportSessionPdf).not.toHaveBeenCalled();
    expect(window.print).not.toHaveBeenCalled();
  });
});
