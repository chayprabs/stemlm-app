import { describe, it, expect, beforeEach, vi } from 'vitest';

const { getSavedSession, exportSessionPdf, renderSessionReportHtml, downloadSessionPdf, takePdfExportJob } = vi.hoisted(() => ({
  getSavedSession: vi.fn(),
  exportSessionPdf: vi.fn(async () => ({ ok: true, method: 'print' as const })),
  renderSessionReportHtml: vi.fn(async () => '<html><body>VIEW-REPORT</body></html>'),
  downloadSessionPdf: vi.fn(async (): Promise<{ ok: boolean; method: string; reason?: string }> => ({ ok: true, method: 'download' })),
  takePdfExportJob: vi.fn(),
}));

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

vi.mock('@/src/lib/pdf-export-request', () => ({ takePdfExportJob }));

vi.mock('@/src/lib/pdf', () => ({
  exportSessionPdf,
  renderSessionReportHtml,
  downloadSessionPdf,
  reportFilename: () => 'stemLM',
  reportPrintTitle: () => 'stemLM',
}));

import { parseSavedPdfMode, runSavedPdfPage } from './saved-pdf-page';

describe('saved-pdf page', () => {
  beforeEach(() => {
    getSavedSession.mockReset();
    exportSessionPdf.mockClear();
    renderSessionReportHtml.mockClear();
    downloadSessionPdf.mockClear();
    takePdfExportJob.mockReset();
    document.body.innerHTML = '<main id="app"></main>';
    vi.spyOn(window, 'print').mockImplementation(() => undefined);
    vi.spyOn(window, 'close').mockImplementation(() => undefined);
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
    const result = await runSavedPdfPage('id=lib-1');
    expect(result).toEqual({ ok: true, mode: 'view' });
    expect(exportSessionPdf).not.toHaveBeenCalled();
    expect(window.print).not.toHaveBeenCalled();
    expect(document.body.textContent).toContain('VIEW-REPORT');
    expect(document.title).toBe('stemlm');
  });

  // D7: "download" saves a real PDF file (it used to open the print dialog).
  it('download mode saves a real PDF file, never the print dialog', async () => {
    vi.useFakeTimers();
    try {
      getSavedSession.mockResolvedValue(savedSnapshot());
      const result = await runSavedPdfPage('id=lib-1&mode=download');
      expect(result).toEqual({ ok: true, mode: 'download' });
      expect(downloadSessionPdf).toHaveBeenCalledOnce();
      expect((downloadSessionPdf.mock.calls[0] as unknown[])[0]).toMatchObject({ id: 'lib-1', question: 'Saved Q' });
      expect(exportSessionPdf).not.toHaveBeenCalled();
      expect(renderSessionReportHtml).not.toHaveBeenCalled();
      expect(window.print).not.toHaveBeenCalled();
      expect(document.getElementById('app')?.textContent).toContain('PDF saved');
      expect(window.close).not.toHaveBeenCalled();
      vi.runAllTimers();
      expect(window.close).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });

  it('exports the session a chat tab handed over, with page progress', async () => {
    takePdfExportJob.mockResolvedValue({ ...handedOver(), id: 'tab-session' });
    downloadSessionPdf.mockImplementationOnce(async (...args: unknown[]) => {
      const options = args[1] as { onProgress?: (p: { page: number; total: number }) => void };
      options.onProgress?.({ page: 2, total: 3 });
      expect(document.getElementById('app')?.textContent).toContain('page 2 of 3');
      return { ok: true, method: 'download' };
    });
    const result = await runSavedPdfPage('job=job-12345678&mode=download');
    expect(result).toEqual({ ok: true, mode: 'download' });
    expect(takePdfExportJob).toHaveBeenCalledWith('job-12345678');
    expect(getSavedSession).not.toHaveBeenCalled();
    expect((downloadSessionPdf.mock.calls[0] as unknown[])[0]).toMatchObject({ id: 'tab-session' });
    expect(window.print).not.toHaveBeenCalled();
  });

  it('keeps a failed or expired export on screen with a plain reason', async () => {
    takePdfExportJob.mockResolvedValueOnce(null);
    expect(await runSavedPdfPage('job=job-12345678&mode=download')).toEqual({ ok: false, mode: 'download' });
    expect(downloadSessionPdf).not.toHaveBeenCalled();
    expect(document.getElementById('app')?.textContent).toContain('Export the PDF again');

    takePdfExportJob.mockResolvedValueOnce(handedOver());
    downloadSessionPdf.mockResolvedValueOnce({ ok: false, method: 'failed', reason: 'blank' });
    expect(await runSavedPdfPage('job=job-87654321&mode=download')).toEqual({ ok: false, mode: 'download' });
    expect(document.getElementById('app')?.textContent).toContain('rendered blank');
    expect(document.getElementById('app')?.querySelector('.is-error')).not.toBeNull();
    expect(window.close).not.toHaveBeenCalled();
  });

  it('print mode still opens the print dialog', async () => {
    getSavedSession.mockResolvedValue(savedSnapshot());
    const result = await runSavedPdfPage('id=lib-1&mode=print');
    expect(result).toEqual({ ok: true, mode: 'print' });
    expect(exportSessionPdf).toHaveBeenCalledOnce();
    expect(downloadSessionPdf).not.toHaveBeenCalled();
  });
});

describe('what the export window shows and offers', () => {
  const app = () => document.getElementById('app') as HTMLElement;
  const buttons = () => [...app().querySelectorAll<HTMLButtonElement>('button')];

  beforeEach(() => {
    getSavedSession.mockReset();
    downloadSessionPdf.mockClear();
    takePdfExportJob.mockReset();
    document.body.innerHTML = '<main id="app" role="status"></main>';
    vi.spyOn(window, 'close').mockImplementation(() => undefined);
  });

  it('draws how far the build has got, and nothing of the kind once it is over', async () => {
    takePdfExportJob.mockResolvedValue(handedOver());
    downloadSessionPdf.mockImplementationOnce(async (...args: unknown[]) => {
      const fill = () => app().querySelector<HTMLElement>('.slm-saved-pdf-progress-fill');
      expect(fill()?.style.width).toBe('0%');
      (args[1] as { onProgress: (p: { page: number; total: number }) => void }).onProgress({ page: 3, total: 4 });
      expect(fill()?.style.width).toBe('75%');
      expect(app().getAttribute('role')).toBe('status');
      return { ok: true, method: 'download' };
    });
    await runSavedPdfPage('job=job-12345678&mode=download');
    expect(app().dataset.state).toBe('done');
    expect(app().querySelector('.slm-saved-pdf-progress')).toBeNull();
    expect(buttons()).toHaveLength(0);
    expect(document.title).toBe('PDF saved - stemlm');
  });

  it('a failed build interrupts, can be run again from the same window, and can be closed', async () => {
    takePdfExportJob.mockResolvedValueOnce(handedOver());
    downloadSessionPdf.mockResolvedValueOnce({ ok: false, method: 'failed', reason: 'timeout' });
    await runSavedPdfPage('job=job-12345678&mode=download');
    expect(app().getAttribute('role')).toBe('alert');
    expect(app().dataset.state).toBe('error');
    // One question was being exported: the advice is not the library's "merge fewer".
    expect(app().textContent).toContain('Rendering took too long. Try again.');
    expect(buttons().map((b) => b.textContent)).toEqual(['Try again', 'Close window']);
    expect(document.activeElement).toBe(buttons()[0]);

    // The session was handed over once; trying again must not ask for it a second time.
    buttons()[0]!.click();
    await vi.waitFor(() => expect(app().dataset.state).toBe('done'));
    expect(downloadSessionPdf).toHaveBeenCalledTimes(2);
    expect((downloadSessionPdf.mock.calls[1] as unknown[])[0]).toMatchObject({ id: 'tab-session' });
    expect(takePdfExportJob).toHaveBeenCalledTimes(1);
  });

  it('says in plain words what is missing, and always leaves a way out', async () => {
    const cases: Array<[string, RegExp]> = [
      ['', /opened without a question/],
      ['id=gone', /no longer in your saved questions/],
      ['job=job-12345678&mode=download', /expired/],
    ];
    takePdfExportJob.mockResolvedValue(null);
    getSavedSession.mockResolvedValue(undefined);
    for (const [search, words] of cases) {
      expect((await runSavedPdfPage(search)).ok, search).toBe(false);
      expect(app().textContent, search).toMatch(words);
      expect(app().textContent, search).not.toMatch(/session|capsule|protocol|!/i);
      expect(app().getAttribute('role'), search).toBe('alert');
      expect(buttons().map((b) => b.textContent), search).toEqual(['Close window']);
    }
    buttons()[0]!.click();
    expect(window.close).toHaveBeenCalledOnce();
  });
});

function savedSnapshot() {
  return {
    id: 'lib-1',
    question: 'Saved Q',
    savedAt: 1,
    platform: 'gemini',
    meta: { version: 1, subject: 'Math', topic: 'Algebra' },
    steps: [],
    solution: 'done',
    solutionDiagrams: [],
  };
}

function handedOver() {
  return {
    id: 'tab-session',
    createdAt: 1,
    updatedAt: 1,
    platform: 'claude',
    question: 'Unsaved Q',
    raw: '',
    capsule: { meta: { version: 1, subject: 'Math', topic: 'Algebra' }, steps: [], solution: 'done', solutionDiagrams: [] },
  };
}
