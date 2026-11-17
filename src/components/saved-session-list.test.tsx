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
        get: vi.fn(async (key: string | null) =>
          key === null ? { ...storageData } : { [key]: storageData[key] },
        ),
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
      onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
    },
    tabs: {
      create: tabsCreateMock,
      sendMessage: tabsSendMessageMock,
    },
    windows: {
      create: windowsCreateMock,
    },
    runtime: {
      sendMessage: async (message: import('@/src/lib/saved-session-storage').SavedSessionMutationMessage) =>
        (await import('@/src/lib/saved-session-storage')).handleSavedSessionMutation(message),
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
    downloadSessionsPdf: vi.fn(async () => ({ ok: true, method: 'download' as const })),
  };
});

vi.mock('@/src/lib/tab-bridge', () => ({
  deliverStemLmMessage,
  getActiveTab: vi.fn(),
  isGeminiUrl: vi.fn(),
}));

import { downloadSessionPdf, downloadSessionsPdf, exportSessionPdf } from '@/src/lib/pdf';
import { SavedSessionList, savedWhenLabel } from './SavedSessionList';
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

describe('merge into one PDF', () => {
  function pickButtons(container: HTMLElement) {
    return [...container.querySelectorAll<HTMLButtonElement>('.slm-library-check')];
  }

  /** Distinct savedAt values so the recency sort — and therefore row order — is fixed. */
  function orderedSnapshots(): SavedSessionSnapshot[] {
    const now = Date.now();
    return snapshots().map((item, i) => ({ ...item, savedAt: now - i * 60_000 }));
  }

  it('offers Merge PDF only once something is saved', () => {
    const empty = mount([]);
    expect(empty.container.querySelector('[data-merge="start"]')).toBeNull();
    empty.unmount();

    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);
    const merge = container.querySelector('[data-merge="start"]') as HTMLButtonElement;
    expect(merge).toBeTruthy();
    expect(merge.textContent).toContain('Merge PDF');
    expect(container.querySelector('.slm-library-check')).toBeNull();
    unmount();
  });

  it('turns rows into a picker and swaps the button for Download', () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);

    act(() => {
      (container.querySelector('[data-merge="start"]') as HTMLButtonElement).click();
    });

    expect(container.querySelector('[data-merge="start"]')).toBeNull();
    const download = container.querySelector('[data-merge="download"]') as HTMLButtonElement;
    expect(download).toBeTruthy();
    expect(download.disabled).toBe(true);
    expect(container.querySelector('[data-merge="cancel"]')).toBeTruthy();

    // Every row gets an empty box, and the per-row actions step aside.
    expect(pickButtons(container)).toHaveLength(3);
    for (const box of pickButtons(container)) {
      expect(box.getAttribute('aria-checked')).toBe('false');
    }
    expect(container.querySelector('[data-action="download"]')).toBeNull();
    expect(container.querySelector('[data-action="delete"]')).toBeNull();
    unmount();
  });

  it('merges the picked questions into a single PDF in library order', async () => {
    const list = orderedSnapshots();
    seed(list);
    const onDownloaded = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;
    act(() => {
      root = createRoot(container);
      root.render(<SavedSessionList sessions={list} onDownloaded={onDownloaded} />);
    });

    act(() => {
      (container.querySelector('[data-merge="start"]') as HTMLButtonElement).click();
    });
    // Pick the third row first — order must still follow the list, not the clicks.
    act(() => {
      pickButtons(container)[2]?.click();
    });
    act(() => {
      pickButtons(container)[0]?.click();
    });

    const download = container.querySelector('[data-merge="download"]') as HTMLButtonElement;
    expect(download.disabled).toBe(false);
    expect(download.textContent).toContain('Download 2');
    expect(pickButtons(container)[0]?.getAttribute('aria-checked')).toBe('true');
    expect(pickButtons(container)[1]?.getAttribute('aria-checked')).toBe('false');

    await act(async () => {
      download.click();
      await Promise.resolve();
      await Promise.resolve();
    });
    await flush();

    expect(downloadSessionsPdf).toHaveBeenCalledOnce();
    expect(downloadSessionPdf).not.toHaveBeenCalled();
    const merged = (
      downloadSessionsPdf as unknown as {
        mock: { calls: Array<[Array<{ id: string }>]> };
      }
    ).mock.calls[0]![0];
    expect(merged.map((s) => s.id)).toEqual(['rlc', 'quad']);
    expect(onDownloaded).toHaveBeenCalledOnce();
    // A finished merge drops back to the normal list.
    expect(container.querySelector('[data-merge="start"]')).toBeTruthy();
    expect(container.querySelector('.slm-library-check')).toBeNull();

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('select all picks every visible row and Cancel leaves the picker', () => {
    const list = orderedSnapshots();
    seed(list);
    const { container, unmount } = mount(list);

    act(() => {
      (container.querySelector('[data-merge="start"]') as HTMLButtonElement).click();
    });
    act(() => {
      (container.querySelector('[data-merge="select-all"]') as HTMLButtonElement).click();
    });

    expect(pickButtons(container).every((b) => b.getAttribute('aria-checked') === 'true')).toBe(
      true,
    );
    expect(
      (container.querySelector('[data-merge="download"]') as HTMLButtonElement).textContent,
    ).toContain('Download 3');

    act(() => {
      (container.querySelector('[data-merge="cancel"]') as HTMLButtonElement).click();
    });
    expect(container.querySelector('.slm-library-check')).toBeNull();
    expect(container.querySelector('[data-merge="start"]')).toBeTruthy();
    expect(container.querySelector('[data-action="download"]')).toBeTruthy();
    unmount();
  });

  it('clicking anywhere on a card toggles it while picking', () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);

    act(() => {
      (container.querySelector('[data-merge="start"]') as HTMLButtonElement).click();
    });
    const row = container.querySelector('.slm-library-row') as HTMLElement;
    act(() => {
      row.click();
    });
    expect(row.getAttribute('data-selected')).toBe('true');
    act(() => {
      row.click();
    });
    expect(row.getAttribute('data-selected')).toBeNull();
    unmount();
  });

  it('surfaces a blank render instead of pretending the file saved', async () => {
    (
      downloadSessionsPdf as unknown as { mockResolvedValueOnce: (v: unknown) => void }
    ).mockResolvedValueOnce({ ok: false, method: 'failed', reason: 'blank' });
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);

    act(() => {
      (container.querySelector('[data-merge="start"]') as HTMLButtonElement).click();
    });
    act(() => {
      pickButtons(container)[0]?.click();
    });
    await act(async () => {
      (container.querySelector('[data-merge="download"]') as HTMLButtonElement).click();
      await Promise.resolve();
    });
    await flush();

    expect(container.querySelector('.slm-popup-error')?.textContent).toContain('blank');
    // The picker stays open so the user can retry or deselect.
    expect(container.querySelector('[data-merge="download"]')).toBeTruthy();
    unmount();
  });
});

describe('library chrome CSS', () => {
  const pagesCss = () => readFileSync(resolve(process.cwd(), 'assets/pages.css'), 'utf8');

  it('keeps categories on one scrolling row instead of a wrapping wall', () => {
    const css = pagesCss();
    expect(css).toMatch(/\.slm-library-chips\s*\{[^}]*flex-wrap:\s*nowrap/);
    expect(css).toMatch(/\.slm-library-chips\s*\{[^}]*overflow-x:\s*auto/);
    expect(css).not.toMatch(/\.slm-library-chips\s*\{[^}]*flex-wrap:\s*wrap/);
    expect(css).toMatch(/\.slm-library-chip\s*\{[^}]*white-space:\s*nowrap/);
  });

  it('disables category rail smooth scrolling for reduced-motion users', () => {
    const css = pagesCss();
    const reduced = css.slice(css.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.slm-library-chips\s*\{[^}]*scroll-behavior:\s*auto/);
  });

  it('disables every saved-page transition for reduced-motion users', () => {
    const css = pagesCss();
    const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    // One blanket per surface, so a control added later cannot forget to opt out.
    for (const selector of ['.slm-popup *', '.slm-library-overlay *', '.slm-settings-overlay *', '.slm-welcome-hero > *']) {
      expect(reduced, selector).toContain(selector);
    }
    expect(reduced).toMatch(/transition:\s*none/);
    expect(reduced).toMatch(/animation:\s*none/);
    // Pressed and hover transforms go too, not only the timing.
    expect(reduced).toMatch(/\.slm-library-check:active[^{]*\{[^}]*transform:\s*none/);
  });

  it('closes the gap between the time label and its caret', () => {
    const css = pagesCss();
    const btn = css.slice(css.indexOf('.slm-library-time-btn {'));
    const block = btn.slice(0, btn.indexOf('}'));
    expect(block).toMatch(/justify-content:\s*flex-start/);
    expect(block).not.toMatch(/justify-content:\s*space-between/);
    expect(block).toMatch(/width:\s*auto/);
    expect(css).toMatch(/\.slm-library-time-leading\s*\{[^}]*flex:\s*0 1 auto/);
  });

  it('draws a ruled list, and gives a row a surface only while it is live or picked', () => {
    const css = pagesCss();
    const rule = (selector: string) => {
      const from = css.indexOf(`${selector} {`);
      expect(from, selector).toBeGreaterThanOrEqual(0);
      return css.slice(from, css.indexOf('}', from));
    };
    // At rest a row is text on the page: no border, no fill, no shadow.
    const row = rule('.slm-library-row');
    expect(row).toMatch(/border:\s*none/);
    expect(row).toMatch(/background:\s*transparent/);
    expect(row).not.toMatch(/box-shadow/);
    // Rows are separated by a hairline, not boxed one by one.
    expect(rule('.slm-library-row + .slm-library-row::before')).toMatch(/background:\s*var\(--slm-border-subtle\)/);
    // Pointer and keyboard focus light the same surface, and a picked row is a step stronger.
    const live = css.slice(css.indexOf('.slm-library-row:hover,\n.slm-library-row:focus-within {'));
    expect(live.slice(0, live.indexOf('}'))).toMatch(/background:\s*var\(--slm-bg-subtle\)/);
    const picked = css.slice(css.indexOf(".slm-library-row[data-selected='true'],"));
    expect(picked.slice(0, picked.indexOf('}'))).toMatch(/background:\s*var\(--slm-bg-muted\)/);
    // The picker's box reads as checked by shape and ink, not by a colour of its own.
    expect(rule(".slm-library-check[aria-checked='true']")).toMatch(/background:\s*var\(--slm-solid\)/);
  });

  it('colours the library from tokens only, in both themes', () => {
    const css = pagesCss();
    const library = css.slice(css.indexOf('.slm-library-overlay {'), css.indexOf('.slm-settings-overlay {'));
    expect(library.length).toBeGreaterThan(2000);
    expect(library.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
    expect(library).not.toMatch(/\b(?:rgba?|hsla?)\(/);
    expect(library).not.toMatch(/--slm-accent\b/);
    // No theme forks either: the tokens carry dark mode.
    expect(library).not.toContain("[data-stemlm-theme='dark']");
  });

  it('never attaches a native tooltip to the question text', () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);

    // A `title` on the row copy pops a large OS tooltip over the list on every
    // hover, even when the question is not truncated. The text is already on
    // screen; the tooltip is pure noise.
    expect(container.querySelector('.slm-library-row-copy[title]')).toBeNull();
    expect(container.querySelector('.slm-library-row[title]')).toBeNull();
    expect(container.querySelector('.slm-library-row-q[title]')).toBeNull();

    // Icon buttons keep their short, useful labels.
    expect(
      container.querySelector('[data-action="download"]')?.getAttribute('title'),
    ).toBe('Download');
    unmount();
  });

  it('shows row actions at full contrast with a visible label on keyboard focus (LIB-ICONS-01)', () => {
    const css = pagesCss();
    const actions = css.slice(css.indexOf('.slm-library-row-actions {'));
    expect(actions.slice(0, actions.indexOf('}'))).not.toMatch(/opacity:\s*0?\.\d/);
    expect(css).toMatch(/\.slm-library-icon-btn:focus-visible::after\s*\{[^}]*content:\s*attr\(data-label\)/);

    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);
    for (const action of ['download', 'open', 'delete']) {
      const button = container.querySelector(`[data-action="${action}"]`);
      expect(button?.getAttribute('data-label'), action).toBeTruthy();
    }
    expect(container.querySelector('[data-action="delete"]')?.getAttribute('data-label')).toBe('Delete');
    unmount();
  });

  it('keeps the subject as a kicker rather than a box inside the row', () => {
    const css = pagesCss();
    const meta = css.slice(css.indexOf('.slm-library-row-meta {'));
    const block = meta.slice(0, meta.indexOf('}'));
    expect(block).toMatch(/background:\s*none/);
    expect(block).toMatch(/text-transform:\s*uppercase/);
    expect(block).not.toMatch(/border-radius:\s*var\(--radius-pill\)/);
  });
});

describe('finding and reading saved questions', () => {
  const searchOf = (container: HTMLElement) =>
    container.querySelector('input[aria-label="Search saved questions"]') as HTMLInputElement;

  it('says when each question was saved: relative while recent, a date after a week', () => {
    const now = new Date(2026, 10, 16, 12, 0, 0).getTime();
    expect(savedWhenLabel(now - 20_000, now)).toBe('Just now');
    expect(savedWhenLabel(now - 5 * 60_000, now)).toBe('5 min ago');
    expect(savedWhenLabel(now - 3 * 3_600_000, now)).toBe('3 h ago');
    expect(savedWhenLabel(now - 2 * 86_400_000, now)).toBe('2 d ago');
    expect(savedWhenLabel(now - 20 * 86_400_000, now)).toMatch(/27/);
    expect(savedWhenLabel(now - 20 * 86_400_000, now)).not.toMatch(/2026/);
    expect(savedWhenLabel(now - 400 * 86_400_000, now)).toMatch(/2025/);
    // A clock that ran backwards must not print a negative age.
    expect(savedWhenLabel(now + 60_000, now)).toBe('Just now');
  });

  it('gives every row one meta line: subject, chat, length and date', () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);
    const meta = container.querySelector('.slm-library-row-meta') as HTMLElement;
    expect(meta.querySelector('.slm-library-row-subject')?.textContent).toBe('Electrical');
    expect(meta.querySelector('.slm-library-row-host')?.textContent).toBe('Gemini');
    expect(meta.querySelector('.slm-library-row-host svg')).toBeTruthy();
    expect(meta.textContent).toContain('1 step');
    expect(meta.textContent).not.toContain('1 steps');
    expect(meta.querySelector('time')?.getAttribute('datetime')).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    unmount();
  });

  it('counts the questions on each subject chip', () => {
    const list = [...snapshots(), { ...snapshots()[1]!, id: 'newton-2' }];
    seed(list);
    const { container, unmount } = mount(list);
    const chips = [...container.querySelectorAll('.slm-library-chip')].map((chip) =>
      (chip.textContent ?? '').replace(/\s+/g, ' ').trim());
    expect(chips).toEqual(['All categories4', 'Physics2', 'Math1', 'Electrical1']);
    unmount();
  });

  it('focuses search on "/" but never steals the key from a field being typed in', () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);
    const search = searchOf(container);
    expect(document.activeElement).not.toBe(search);
    const slash = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    act(() => {
      document.body.dispatchEvent(slash);
    });
    expect(document.activeElement).toBe(search);
    expect(slash.defaultPrevented).toBe(true);

    // Typed into the field itself, "/" is just a character of the query.
    const typed = new KeyboardEvent('keydown', { key: '/', bubbles: true, cancelable: true });
    act(() => {
      search.dispatchEvent(typed);
    });
    expect(typed.defaultPrevented).toBe(false);
    unmount();
  });

  it('clears a search from its own button and brings the list back', () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);
    expect(container.querySelector('[aria-label="Clear search"]')).toBeNull();
    expect(container.querySelector('.slm-library-search-key')?.textContent).toBe('/');
    setInputValue(searchOf(container), 'Quadratic formula');
    expect(container.querySelectorAll('.slm-library-row')).toHaveLength(1);
    expect(container.querySelector('.slm-library-summary')?.textContent).toContain('1 of 3 questions');
    const clear = container.querySelector('[aria-label="Clear search"]') as HTMLButtonElement;
    act(() => {
      clear.click();
    });
    expect(searchOf(container).value).toBe('');
    expect(container.querySelectorAll('.slm-library-row')).toHaveLength(3);
    expect(container.querySelector('.slm-library-summary')).toBeNull();
    unmount();
  });

  it('a search with no match says what was searched and offers to clear it', () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);
    setInputValue(searchOf(container), 'organic stereochemistry');
    const state = container.querySelector('.slm-library-empty--filtered') as HTMLElement;
    expect(state.getAttribute('role')).toBe('status');
    expect(state.textContent).toContain('No questions match.');
    expect(state.textContent).toContain('organic stereochemistry');
    // Not the first-use state: nothing here suggests the library is empty.
    expect(state.textContent).not.toContain('Nothing saved yet.');
    act(() => {
      (state.querySelector('[data-library="clear-filters"]') as HTMLButtonElement).click();
    });
    expect(container.querySelectorAll('.slm-library-row')).toHaveLength(3);
    expect(searchOf(container).value).toBe('');
    unmount();
  });

  it('an empty library explains saving and offers the four chats, with no search to operate', () => {
    const { container, unmount } = mount([]);
    expect(container.querySelector('.slm-library-empty-text')?.textContent).toMatch(/bookmark/);
    const hosts = [...container.querySelectorAll<HTMLAnchorElement>('.slm-library-empty-host')];
    expect(hosts.map((a) => a.textContent)).toEqual(['ChatGPT', 'Claude', 'Gemini', 'Grok']);
    for (const link of hosts) {
      expect(link.href).toMatch(/^https:\/\//);
      expect(link.target).toBe('_blank');
      expect(link.rel).toContain('noopener');
    }
    expect(searchOf(container)).toBeNull();
    expect(container.querySelector('.slm-library-chip')).toBeNull();
    unmount();
  });

  it('states the selection while merging and keeps the way out in the same bar', () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);
    expect(container.querySelector('.slm-library-select')).toBeNull();
    act(() => {
      (container.querySelector('[data-merge="start"]') as HTMLButtonElement).click();
    });
    const bar = container.querySelector('.slm-library-select') as HTMLElement;
    const status = bar.querySelector('[role="status"]') as HTMLElement;
    expect(status.textContent).toContain('Pick questions to merge');
    act(() => {
      (container.querySelector('.slm-library-check') as HTMLButtonElement).click();
    });
    expect(status.textContent).toContain('1 selected');
    expect(bar.querySelector('[data-merge="cancel"]')).toBeTruthy();
    expect(bar.querySelector('[data-merge="select-all"]')).toBeTruthy();
    expect(bar.querySelector('[data-merge="download"]')).toBeTruthy();
    // Search and filters stay usable while picking.
    expect(searchOf(container)).toBeTruthy();
    unmount();
  });

  it('Escape empties a search before it is allowed to close the library', () => {
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
    expect(container.querySelector('.slm-library-count')?.textContent).toBe('3');
    const search = searchOf(container);
    setInputValue(search, 'RLC');
    act(() => {
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(search.value).toBe('');
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => {
      root?.unmount();
    });
    container.remove();
  });
});
