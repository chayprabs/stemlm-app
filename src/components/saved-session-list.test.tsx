import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Session } from '@/src/protocol/types';

const { storageData, mockLocalStorage, tabsCreateMock, tabsSendMessageMock, windowsCreateMock, deliverStemLmMessage } =
  vi.hoisted(() => {
    const storageData: Record<string, unknown> = {};
    return {
      storageData,
      mockLocalStorage: {
        get: vi.fn(async (key: string) => ({ [key]: storageData[key] })),
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(storageData, items);
        }),
      },
      tabsCreateMock: vi.fn(async () => ({ id: 1 })),
      tabsSendMessageMock: vi.fn(async () => ({ ok: true })),
      windowsCreateMock: vi.fn(async () => ({ id: 9 })),
      deliverStemLmMessage: vi.fn(async () => ({ ok: true })),
    };
  });

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: mockLocalStorage,
    },
    tabs: {
      create: tabsCreateMock,
      sendMessage: tabsSendMessageMock,
    },
    windows: {
      create: windowsCreateMock,
    },
    runtime: {
      getURL: (path: string) => `chrome-extension://test${path}`,
      id: 'test',
    },
  },
}));

vi.mock('@/src/lib/pdf', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/src/lib/pdf')>();
  return {
    ...actual,
    exportSessionPdf: vi.fn(async () => ({ ok: true, method: 'print' as const })),
    downloadSessionPdf: vi.fn(async () => ({ ok: true, method: 'download' as const })),
  };
});

vi.mock('@/src/lib/tab-bridge', () => ({
  deliverStemLmMessage,
  getActiveTab: vi.fn(),
  isGeminiUrl: vi.fn(),
}));

import { downloadSessionPdf, exportSessionPdf } from '@/src/lib/pdf';
import { SavedSessionList } from './SavedSessionList';
import { SavedLibraryOverlay } from './SavedLibraryOverlay';
import { SAVED_SEARCH_PLACEHOLDER, SAVED_TIME_FILTERS } from '@/src/lib/saved-library';
import {
  SAVED_SESSIONS_KEY,
  sessionToSnapshot,
  type SavedSessionSnapshot,
} from '@/src/lib/saved-sessions';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

function makeSession(overrides: Partial<Session> & { id: string; question: string }): Session {
  return {
    id: overrides.id,
    createdAt: 1,
    updatedAt: 1,
    platform: 'gemini',
    question: overrides.question,
    raw: '',
    capsule: overrides.capsule ?? {
      meta: { version: 1, subject: 'Math', topic: 'Algebra' },
      steps: [{ id: 'step-1', index: 1, title: 'Work', body: 'show work' }],
      solution: 'x = 1',
      solutionDiagrams: [],
    },
  };
}

function snapshots(): SavedSessionSnapshot[] {
  return [
    sessionToSnapshot(
      makeSession({
        id: 'rlc',
        question: 'Find the impedance of the series RLC circuit at 60 Hz.',
        capsule: {
          meta: { version: 1, subject: 'Electrical', topic: 'RLC impedance' },
          steps: [{ id: 's1', index: 1, title: 'Z', body: 'R + jX' }],
          solution: 'Z = 12 Ω',
          solutionDiagrams: [],
        },
      }),
    ),
    sessionToSnapshot(
      makeSession({
        id: 'newton',
        question: 'A 2 kg mass accelerates at 3 m/s^2. What is the net force?',
        capsule: {
          meta: { version: 1, subject: 'Physics', topic: 'Newton second law' },
          steps: [{ id: 's1', index: 1, title: 'F=ma', body: '2 * 3' }],
          solution: 'F = 6 N',
          solutionDiagrams: [],
        },
      }),
    ),
    sessionToSnapshot(
      makeSession({
        id: 'quad',
        question: 'Solve x^2 - 5x + 6 = 0',
        capsule: {
          meta: { version: 1, subject: 'Math', topic: 'Quadratic formula' },
          steps: [{ id: 's1', index: 1, title: 'Factor', body: '(x-2)(x-3)' }],
          solution: 'x = 2 or x = 3',
          solutionDiagrams: [],
        },
      }),
    ),
  ];
}

function seed(list: SavedSessionSnapshot[]) {
  storageData[SAVED_SESSIONS_KEY] = list;
}

function installLibraryStyles() {
  let style = document.getElementById('slm-pages-css') as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = 'slm-pages-css';
    document.head.appendChild(style);
  }
  style.textContent = readFileSync(resolve(process.cwd(), 'assets/pages.css'), 'utf8');
}

function mount(list: SavedSessionSnapshot[]) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  act(() => {
    root = createRoot(container);
    root.render(<SavedSessionList sessions={list} />);
  });
  return {
    container,
    unmount() {
      act(() => {
        root?.unmount();
      });
      container.remove();
    },
  };
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

function setInputValue(el: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  act(() => {
    setter?.call(el, value);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(storageData)) {
    delete storageData[key];
  }
  installLibraryStyles();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('SavedSessionList', () => {
  it('empty library shows the bookmark mark, not a tap-to-download hint', () => {
    const { container, unmount } = mount([]);
    expect(container.textContent).toContain('Nothing saved yet.');
    expect(container.textContent).not.toContain('Tap a question to download its PDF.');
    expect(container.textContent).not.toContain('No saved questions yet.');
    expect(container.querySelector('.slm-saved-empty-mark')).toBeTruthy();
    expect(container.querySelector('.slm-icon-save')).toBeTruthy();
    expect(container.querySelector('button[aria-label="Filter by subject"]')).toBeNull();
    unmount();
  });

  it('renders question text as written, search copy, categories, and no filter icon on search', () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);

    expect(container.textContent).toContain(
      'Find the impedance of the series RLC circuit at 60 Hz.',
    );
    expect(container.textContent).toContain('Electrical');
    expect(container.textContent).toContain('2 kg mass');
    expect(container.textContent).toContain('net force');
    expect(container.textContent).toContain('Physics');
    expect(container.querySelector('.slm-saved-question-text')?.textContent).not.toBe(
      'RLC impedance',
    );
    expect(container.querySelector('select')).toBeNull();
    expect(container.querySelector('button[aria-label="Filter by subject"]')).toBeNull();
    expect(container.querySelector('.slm-library-search-wrap .slm-saved-filter')).toBeNull();
    const search = container.querySelector(
      'input[aria-label="Search saved questions"]',
    ) as HTMLInputElement;
    expect(search.placeholder).toBe(SAVED_SEARCH_PLACEHOLDER);
    expect(container.textContent).toContain('All categories');
    const timeBtn = container.querySelector('button[aria-label="Filter by time"]') as HTMLButtonElement;
    expect(timeBtn).toBeTruthy();
    expect(timeBtn.querySelector('.slm-library-time-clock')).toBeTruthy();
    expect(timeBtn.querySelector('.slm-library-time-chevron')).toBeTruthy();

    const q = container.querySelector('.slm-library-row-q') as HTMLElement;
    expect(q.classList.contains('slm-saved-question-text')).toBe(true);
    const pagesCss = readFileSync(resolve(process.cwd(), 'assets/pages.css'), 'utf8');
    expect(pagesCss).toMatch(/\.slm-library-row-q[\s\S]*?-webkit-line-clamp:\s*2/);
    expect(pagesCss).toMatch(/\.slm-library-row-q[\s\S]*?max-height:\s*calc\(1\.5em \* 2\)/);
    expect(pagesCss).not.toMatch(/width:\s*max\(100%,\s*12\.5rem\)/);
    expect(pagesCss).toMatch(/\.slm-library-time-menu\s*\{[^}]*overflow:\s*hidden/);
    expect(pagesCss).toMatch(/\.slm-library-time-menu\s*\{[^}]*position:\s*fixed/);
    expect(pagesCss).toMatch(/\.slm-library-toolbar\s*\{[^}]*overflow:\s*visible/);
    expect(pagesCss).not.toContain('slm-library-nav-label');

    unmount();
  });

  it('renders saved LaTeX with KaTeX the same way the study panel does', () => {
    const list = [
      sessionToSnapshot(
        makeSession({
          id: 'theta',
          question:
            'A particle is rotating in a circular path and at any instant its motion can be described as \\theta = \\frac{5t^4}{40} - \\frac{t^3}{3}. The angular acceleration of the particle after 10 seconds is ______ rad/s^2.',
          capsule: {
            meta: { version: 1, subject: 'Physics', topic: 'Angular acceleration' },
            steps: [{ id: 's1', index: 1, title: 'alpha', body: 'd^2 theta / dt^2' }],
            solution: 'alpha = 5 rad/s^2',
            solutionDiagrams: [],
          },
        }),
      ),
    ];
    seed(list);
    const { container, unmount } = mount(list);

    const q = container.querySelector('.slm-library-row-q') as HTMLElement;
    expect(q).toBeTruthy();
    expect(q.classList.contains('slm-prose')).toBe(true);
    expect(q.querySelector('.katex')).toBeTruthy();
    expect(q.querySelector('.katex-mathml')).toBeTruthy();
    expect(q.querySelector('.katex-html')).toBeTruthy();
    expect(q.querySelector('.frac-line, .mfrac, .vlist-t')).toBeTruthy();
    expect(q.textContent).toContain('circular path');
    expect(q.textContent).toContain('angular acceleration');
    const visible = (q.querySelector('.katex-html')?.textContent ?? '').replace(/\s+/g, '');
    expect(visible).not.toContain('\\frac');
    expect(visible).not.toContain('\\theta');
    const pagesCss = readFileSync(resolve(process.cwd(), 'assets/pages.css'), 'utf8');
    expect(pagesCss).toMatch(/\.slm-library-row\s*\{[^}]*border:\s*none/);
    expect(pagesCss).toMatch(/\.slm-library-icon-btn\s*\{[^}]*border:\s*none/);
    expect(readFileSync(resolve(process.cwd(), 'entrypoints/saved-library/main.tsx'), 'utf8')).toContain(
      "katex/dist/katex.min.css",
    );

    unmount();
  });

  it('filters by category chips and a fuzzy query', async () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);

    const physics = [...container.querySelectorAll('.slm-library-chip')].find((el) =>
      el.textContent?.includes('Physics'),
    ) as HTMLButtonElement;
    act(() => {
      physics.click();
    });
    expect(container.textContent).toContain('net force');
    expect(container.textContent).not.toContain('series RLC');
    expect(container.textContent).not.toContain('x^2 - 5x + 6');

    const all = [...container.querySelectorAll('.slm-library-chip')].find((el) =>
      el.textContent?.includes('All categories'),
    ) as HTMLButtonElement;
    act(() => {
      all.click();
    });

    const search = container.querySelector(
      'input[aria-label="Search saved questions"]',
    ) as HTMLInputElement;
    setInputValue(search, 'Quadratic formula');
    expect(
      container.querySelector('button[aria-label="Download PDF for Solve x^2 - 5x + 6 = 0"]'),
    ).toBeTruthy();
    expect(container.textContent).not.toContain('series RLC');
    expect(container.textContent).not.toContain('net force');

    setInputValue(search, 'impednace of RLC circut');
    expect(container.textContent).toContain('series RLC');
    expect(container.textContent).not.toContain('net force');

    setInputValue(search, 'organic stereochemistry');
    expect(container.textContent).toContain('No questions match.');
    expect(container.querySelectorAll('.slm-library-row')).toHaveLength(0);

    unmount();
  });

  it('time filter menu lists the four windows and hides older savedAt items', () => {
    const now = Date.now();
    const list = snapshots().map((item, i) => ({
      ...item,
      savedAt: i === 0 ? now - 60 * 60 * 1000 : now - 40 * 24 * 60 * 60 * 1000,
    }));
    seed(list);
    const { container, unmount } = mount(list);

    const timeBtn = container.querySelector(
      'button[aria-label="Filter by time"]',
    ) as HTMLButtonElement;
    act(() => {
      timeBtn.click();
    });
    const labels = [...container.querySelectorAll('[role="option"]')].map(
      (el) => el.textContent ?? '',
    );
    for (const filter of SAVED_TIME_FILTERS) {
      expect(labels.some((text) => text.includes(filter.label))).toBe(true);
    }

    const lastDay = [...container.querySelectorAll('[role="option"]')].find((el) =>
      el.textContent?.includes('Last 24 hours'),
    ) as HTMLButtonElement;
    act(() => {
      lastDay.click();
    });
    expect(container.textContent).toContain('series RLC');
    expect(container.textContent).not.toContain('net force');
    expect(container.textContent).not.toContain('x^2 - 5x + 6');
    unmount();
  });

  it('download saves a PDF file and open creates a viewer window that does not auto-print', async () => {
    const list = snapshots();
    seed(list);
    const onDownloaded = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;
    act(() => {
      root = createRoot(container);
      root.render(<SavedSessionList sessions={list} onDownloaded={onDownloaded} />);
    });

    const rowDownload = container.querySelector(
      'button[aria-label="Download PDF for Find the impedance of the series RLC circuit at 60 Hz."]',
    ) as HTMLButtonElement;
    expect(rowDownload).toBeTruthy();

    await act(async () => {
      rowDownload.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flush();

    expect(downloadSessionPdf).toHaveBeenCalledOnce();
    expect(exportSessionPdf).not.toHaveBeenCalled();
    expect(onDownloaded).toHaveBeenCalledOnce();
    expect(tabsSendMessageMock).not.toHaveBeenCalled();
    expect(deliverStemLmMessage).not.toHaveBeenCalled();

    windowsCreateMock.mockClear();
    const rowOpen = container.querySelector(
      'button[aria-label="Open PDF for Find the impedance of the series RLC circuit at 60 Hz."]',
    ) as HTMLButtonElement;
    await act(async () => {
      rowOpen.click();
      await Promise.resolve();
    });
    await flush();

    expect(windowsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('pdf.html?id=rlc'),
        type: 'popup',
        focused: true,
      }),
    );
    const created = (windowsCreateMock.mock.calls as Array<[{ url?: string }?]>)[0]?.[0];
    const url = String(created?.url ?? '');
    expect(url).not.toMatch(/mode=/);
    expect(url).not.toMatch(/print=/);
    expect(url).not.toMatch(/gemini\.google/);
    expect(url).not.toContain('stemlm:load-conversation');
    expect(tabsCreateMock).not.toHaveBeenCalled();

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('removes a deleted id from the list after the shipped delete', async () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);

    expect(
      container.querySelector('button[aria-label="Download PDF for Solve x^2 - 5x + 6 = 0"]'),
    ).toBeTruthy();

    const del = container.querySelector(
      'button[aria-label="Delete Solve x^2 - 5x + 6 = 0"]',
    ) as HTMLButtonElement;
    await act(async () => {
      del.click();
      await Promise.resolve();
    });
    await flush();

    expect(
      container.querySelector('button[aria-label="Download PDF for Solve x^2 - 5x + 6 = 0"]'),
    ).toBeNull();
    expect(container.textContent).toContain('series RLC');
    const stored = storageData[SAVED_SESSIONS_KEY] as Array<{ id: string }>;
    expect(stored.map((s) => s.id).sort()).toEqual(['newton', 'rlc']);

    unmount();
  });
});

describe('SavedLibraryOverlay', () => {
  it('lists every saved question with logo, search, categories, and still downloads', async () => {
    const list = snapshots();
    seed(list);
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;
    act(() => {
      root = createRoot(container);
      root.render(<SavedLibraryOverlay sessions={list} onClose={() => undefined} />);
    });

    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(container.querySelector('.slm-wordmark, .slm-library-dialog-title svg')).toBeTruthy();
    expect(container.querySelector('.slm-library-kicker')?.textContent).toBe('Saved questions');
    expect(container.querySelector('input[aria-label="Search saved questions"]')).toBeTruthy();
    expect(container.querySelectorAll('.slm-library-row')).toHaveLength(3);
    expect(container.textContent).toContain('All categories');

    const search = container.querySelector(
      'input[aria-label="Search saved questions"]',
    ) as HTMLInputElement;
    setInputValue(search, 'net force');
    expect(container.textContent).toContain('net force');
    expect(container.textContent).not.toContain('series RLC');

    setInputValue(search, '');
    const row = container.querySelector(
      'button[aria-label="Download PDF for Find the impedance of the series RLC circuit at 60 Hz."]',
    ) as HTMLButtonElement;
    await act(async () => {
      row.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flush();
    expect(downloadSessionPdf).toHaveBeenCalledOnce();
    expect(exportSessionPdf).not.toHaveBeenCalled();

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('closes from the header X and the backdrop', () => {
    const onClose = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;
    act(() => {
      root = createRoot(container);
      root.render(<SavedLibraryOverlay sessions={[]} onClose={onClose} />);
    });

    expect(container.querySelector('.slm-library-overlay-backdrop')).toBeTruthy();
    act(() => {
      (container.querySelector('.slm-library-close') as HTMLButtonElement).click();
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      (container.querySelector('.slm-library-overlay-backdrop') as HTMLButtonElement).click();
    });
    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('Escape closes the time menu without closing the library', () => {
    const onClose = vi.fn();
    const list = snapshots();
    seed(list);
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;
    act(() => {
      root = createRoot(container);
      root.render(<SavedLibraryOverlay sessions={list} onClose={onClose} />);
    });

    const timeBtn = container.querySelector(
      'button[aria-label="Filter by time"]',
    ) as HTMLButtonElement;
    act(() => {
      timeBtn.click();
    });
    expect(container.querySelector('[role="listbox"]')).toBeTruthy();

    act(() => {
      timeBtn.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    act(() => {
      container.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }),
      );
    });
    expect(onClose).toHaveBeenCalledTimes(1);

    act(() => {
      root?.unmount();
    });
    container.remove();
  });
});
