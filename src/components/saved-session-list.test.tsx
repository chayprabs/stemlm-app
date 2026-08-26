import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Session } from '@/src/protocol/types';

const { storageData, mockLocalStorage, tabsCreateMock, tabsSendMessageMock, deliverStemLmMessage } =
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
  };
});

vi.mock('@/src/lib/tab-bridge', () => ({
  deliverStemLmMessage,
  getActiveTab: vi.fn(),
  isGeminiUrl: vi.fn(),
}));

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

function captureDownload() {
  const captured = { download: '', href: '' };
  const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:stemlm-report');
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    captured.download = this.download;
    captured.href = this.href;
  });
  return { captured, createObjectURL };
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
    expect(container.textContent).toContain(
      'A 2 kg mass accelerates at 3 m/s^2. What is the net force?',
    );
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
    expect(container.querySelector('button[aria-label="Filter by time"]')).toBeTruthy();

    const q = container.querySelector('.slm-library-row-q') as HTMLElement;
    expect(q.classList.contains('slm-saved-question-text')).toBe(true);
    const pagesCss = readFileSync(resolve(process.cwd(), 'assets/pages.css'), 'utf8');
    expect(pagesCss).toMatch(/\.slm-library-row-q[\s\S]*?-webkit-line-clamp:\s*2/);

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
    expect(container.textContent).toContain('Solve x^2 - 5x + 6 = 0');
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

  it('download starts a file download and open creates a viewer tab that does not auto-print', async () => {
    const list = snapshots();
    seed(list);
    const download = captureDownload();
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

    expect(download.createObjectURL).toHaveBeenCalled();
    expect(download.captured?.download).toMatch(/\.html$/);
    expect(download.captured?.href).toMatch(/^blob:/);
    expect(download.captured?.href).not.toMatch(/gemini\.google/);
    expect(onDownloaded).toHaveBeenCalledOnce();
    expect(tabsSendMessageMock).not.toHaveBeenCalled();
    expect(deliverStemLmMessage).not.toHaveBeenCalled();

    tabsCreateMock.mockClear();
    const rowOpen = container.querySelector(
      'button[aria-label="Open PDF for Find the impedance of the series RLC circuit at 60 Hz."]',
    ) as HTMLButtonElement;
    await act(async () => {
      rowOpen.click();
      await Promise.resolve();
    });
    await flush();

    expect(tabsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        url: expect.stringContaining('saved-pdf.html?id=rlc'),
        active: true,
      }),
    );
    const created = (tabsCreateMock.mock.calls as Array<[{ url?: string }?]>)[0]?.[0];
    const url = String(created?.url ?? '');
    expect(url).toMatch(/mode=view/);
    expect(url).not.toMatch(/mode=print/);
    expect(url).not.toMatch(/print=/);
    expect(url).not.toMatch(/gemini\.google/);
    expect(url).not.toContain('stemlm:load-conversation');

    act(() => {
      root?.unmount();
    });
    container.remove();
  });

  it('removes a deleted id from the list after the shipped delete', async () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);

    expect(container.textContent).toContain('Solve x^2 - 5x + 6 = 0');

    const del = container.querySelector(
      'button[aria-label="Delete Solve x^2 - 5x + 6 = 0"]',
    ) as HTMLButtonElement;
    await act(async () => {
      del.click();
      await Promise.resolve();
    });
    await flush();

    expect(container.textContent).not.toContain('Solve x^2 - 5x + 6 = 0');
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
    const download = captureDownload();
    const container = document.createElement('div');
    document.body.appendChild(container);
    let root: Root | undefined;
    act(() => {
      root = createRoot(container);
      root.render(<SavedLibraryOverlay sessions={list} onClose={() => undefined} />);
    });

    expect(container.querySelector('[role="dialog"]')).toBeTruthy();
    expect(container.querySelector('.slm-wordmark, .slm-library-dialog-title svg')).toBeTruthy();
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
    expect(download.createObjectURL).toHaveBeenCalled();
    expect(download.captured?.download).toMatch(/\.html$/);

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
    expect(onClose).toHaveBeenCalledTimes(2);

    act(() => {
      root?.unmount();
    });
    container.remove();
  });
});
