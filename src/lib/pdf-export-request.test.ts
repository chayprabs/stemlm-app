import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Session } from '@/src/protocol/types';

const { sessionStore, sendMessage, windowsCreate, windowsGet } = vi.hoisted(() => ({
  sessionStore: new Map<string, unknown>(),
  sendMessage: vi.fn(),
  windowsCreate: vi.fn(async (_options: unknown) => ({ id: 9 })),
  windowsGet: vi.fn(async (_id: number) => ({ left: 100, top: 50, width: 1400, height: 900 })),
}));

vi.mock('wxt/browser', () => ({
  browser: {
    runtime: {
      id: 'ext',
      sendMessage,
      getURL: (path: string) => `chrome-extension://ext${path}`,
    },
    windows: { create: windowsCreate, get: windowsGet },
    storage: {
      session: {
        get: vi.fn(async (key: string) => (sessionStore.has(key) ? { [key]: sessionStore.get(key) } : {})),
        set: vi.fn(async (items: Record<string, unknown>) => {
          for (const [key, value] of Object.entries(items)) sessionStore.set(key, value);
        }),
        remove: vi.fn(async (key: string) => { sessionStore.delete(key); }),
      },
    },
  },
}));

import {
  PDF_EXPORT_MESSAGE,
  isPdfExportMessage,
  openPdfExportWindow,
  requestSessionPdf,
  takePdfExportJob,
} from './pdf-export-request';

function session(id = 's1'): Session {
  return {
    id,
    createdAt: 1,
    updatedAt: 2,
    platform: 'claude',
    question: 'A block slides down a 30° incline. Find a.',
    raw: '',
    capsule: {
      meta: { version: 1, subject: 'Physics', topic: 'Inclined plane' },
      steps: [],
      solution: 'a = g sin θ',
      solutionDiagrams: [],
    },
  } as unknown as Session;
}

describe('PDF export hand-off (content script → pdf.html)', () => {
  beforeEach(() => {
    sessionStore.clear();
    sendMessage.mockReset();
    windowsCreate.mockClear();
    windowsGet.mockClear();
  });

  it('asks the background to export the session and reports whether it started', async () => {
    sendMessage.mockResolvedValueOnce({ ok: true });
    expect(await requestSessionPdf(session())).toBe(true);
    expect(sendMessage).toHaveBeenCalledWith({ type: PDF_EXPORT_MESSAGE, session: session() });

    sendMessage.mockResolvedValueOnce({ ok: false });
    expect(await requestSessionPdf(session())).toBe(false);
    sendMessage.mockRejectedValueOnce(new Error('Extension context invalidated.'));
    expect(await requestSessionPdf(session())).toBe(false);
  });

  it('recognises only well-formed export messages', () => {
    expect(isPdfExportMessage({ type: PDF_EXPORT_MESSAGE, session: session() })).toBe(true);
    expect(isPdfExportMessage({ type: PDF_EXPORT_MESSAGE })).toBe(false);
    expect(isPdfExportMessage({ type: 'stemlm:other', session: session() })).toBe(false);
    expect(isPdfExportMessage(null)).toBe(false);
  });

  it('parks the session and opens pdf.html in download mode over the chat window', async () => {
    expect(await openPdfExportWindow(session(), 3)).toBe(true);
    expect(windowsGet).toHaveBeenCalledWith(3);
    const options = windowsCreate.mock.calls[0]?.[0] as unknown as {
      url: string; type: string; width: number; height: number; left: number; top: number;
    };
    const url = new URL(options.url);
    expect(url.pathname).toBe('/pdf.html');
    expect(url.searchParams.get('mode')).toBe('download');
    const job = url.searchParams.get('job') as string;
    expect(job).toMatch(/^[\w-]{8,}$/);
    expect(options.type).toBe('popup');
    // Centred over the chat window it came from.
    expect(options.left + options.width / 2).toBe(100 + 1400 / 2);
    expect(options.top).toBeGreaterThanOrEqual(50);
    expect(await takePdfExportJob(job)).toEqual(session());
  });

  it('hands a parked session over exactly once', async () => {
    await openPdfExportWindow(session('once'));
    const job = new URL((windowsCreate.mock.calls[0]?.[0] as unknown as { url: string }).url).searchParams.get('job') as string;
    expect((await takePdfExportJob(job))?.id).toBe('once');
    expect(await takePdfExportJob(job)).toBeNull();
    expect(sessionStore.size).toBe(0);
  });

  it('refuses unknown jobs and damaged sessions', async () => {
    expect(await takePdfExportJob('missing-job')).toBeNull();
    expect(await takePdfExportJob('')).toBeNull();
    sessionStore.set('stemlm_pdf_job_bad-job-1', { id: 'x' });
    expect(await takePdfExportJob('bad-job-1')).toBeNull();
    expect(sessionStore.size).toBe(0);
  });

  it('does not leave a parked session behind when the window cannot open', async () => {
    windowsCreate.mockRejectedValueOnce(new Error('no windows'));
    expect(await openPdfExportWindow(session())).toBe(false);
    expect(sessionStore.size).toBe(0);
  });
});
