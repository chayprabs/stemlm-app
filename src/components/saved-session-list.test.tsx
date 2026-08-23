import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
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

vi.mock('@/src/lib/pdf', () => ({
  exportSessionPdf: vi.fn(async () => ({ ok: true, method: 'print' as const })),
}));

vi.mock('@/src/lib/tab-bridge', () => ({
  deliverStemLmMessage,
  getActiveTab: vi.fn(),
  isGeminiUrl: vi.fn(),
}));

import { SavedSessionList } from './SavedSessionList';
import { SavedLibraryOverlay } from './SavedLibraryOverlay';
import { OPEN_ALL_SAVED_LABEL } from '@/src/lib/saved-library';
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

function mount(
  list: SavedSessionSnapshot[],
  props?: { variant?: 'compact' | 'full'; onOpenAll?: () => void },
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root | undefined;
  act(() => {
    root = createRoot(container);
    root.render(
      <SavedSessionList sessions={list} variant={props?.variant} onOpenAll={props?.onOpenAll} />,
    );
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
});

describe('SavedSessionList', () => {
  it('empty library shows the bookmark mark and help, not a tap-to-download hint', () => {
    const { container, unmount } = mount([]);
    expect(container.textContent).toContain('Nothing saved yet.');
    expect(container.textContent).not.toContain('Tap a question to download its PDF.');
    expect(container.textContent).not.toContain('No saved questions yet.');
    expect(container.querySelector('.slm-saved-empty-mark')).toBeTruthy();
    expect(container.querySelector('.slm-icon-save')).toBeTruthy();
    const help = container.querySelector('.slm-saved-help-btn') as HTMLButtonElement;
    expect(help?.getAttribute('aria-label')).toContain('Bookmark it in the panel');
    expect(container.querySelector('#slm-saved-help-tip')?.textContent).toContain('PDF');
    unmount();
  });

  it('renders question text and subject, not topic-only rows', () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);

    expect(container.textContent).toContain('Find the impedance of the series RLC circuit at 60 Hz.');
    expect(container.textContent).toContain('Electrical');
    expect(container.textContent).toContain('A 2 kg mass accelerates at 3 m/s^2. What is the net force?');
    expect(container.textContent).toContain('Physics');
    expect(container.querySelector('.slm-saved-question-text')?.textContent).not.toBe('RLC impedance');
    expect(container.textContent).not.toContain('Tap a question to download its PDF.');
    expect(container.querySelector('select')).toBeNull();
    expect(container.querySelector('button[aria-label="Filter by subject"]')).toBeTruthy();
    expect((container.querySelector('.slm-saved-search') as HTMLInputElement).placeholder).toBe(
      'Search',
    );

    unmount();
  });

  it('hides non-matching subjects and queries', async () => {
    const list = snapshots();
    seed(list);
    const { container, unmount } = mount(list);

    const filterBtn = container.querySelector(
      'button[aria-label="Filter by subject"]',
    ) as HTMLButtonElement;
    act(() => {
      filterBtn.click();
    });
    const physics = [...container.querySelectorAll('[role="option"]')].find(
      (el) => el.textContent?.includes('Physics'),
    ) as HTMLButtonElement;
    act(() => {
      physics.click();
    });
    expect(container.textContent).toContain('net force');
    expect(container.textContent).not.toContain('series RLC');
    expect(container.textContent).not.toContain('x^2 - 5x + 6');

    act(() => {
      filterBtn.click();
    });
    const allSubjects = [...container.querySelectorAll('[role="option"]')].find(
      (el) => el.textContent?.includes('All subjects'),
    ) as HTMLButtonElement;
    act(() => {
      allSubjects.click();
    });

    const search = container.querySelector(
      'input[aria-label="Search saved questions"]',
    ) as HTMLInputElement;
    setInputValue(search, 'Quadratic formula');
    expect(container.textContent).toContain('Solve x^2 - 5x + 6 = 0');
    expect(container.textContent).not.toContain('series RLC');
    expect(container.textContent).not.toContain('net force');

    setInputValue(search, 'organic stereochemistry');
    expect(container.textContent).toContain('No questions match.');
    expect(container.querySelectorAll('.slm-saved-item')).toHaveLength(0);

    unmount();
  });

  it('downloads the stored snapshot PDF and does not load the Gemini conversation', async () => {
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

    const row = container.querySelector(
      'button[aria-label="Download PDF for Find the impedance of the series RLC circuit at 60 Hz."]',
    ) as HTMLButtonElement;
    expect(row).toBeTruthy();

    await act(async () => {
      row.click();
      await Promise.resolve();
    });
    await flush();

    expect(tabsCreateMock).toHaveBeenCalledOnce();
    expect(tabsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('saved-pdf.html?id=rlc') }),
    );
    const created = (tabsCreateMock.mock.calls as Array<[{ url?: string }?]>)[0]?.[0];
    const url = String(created?.url ?? '');
    expect(url).not.toMatch(/gemini\.google/);
    expect(url).not.toContain('stemlm:load-conversation');
    expect(url).not.toContain('stemlm:open-panel');
    expect(tabsSendMessageMock).not.toHaveBeenCalled();
    expect(deliverStemLmMessage).not.toHaveBeenCalled();
    expect(onDownloaded).toHaveBeenCalledOnce();

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

  it('compact mode shows the latest 3, hides search, and offers open-all', () => {
    const fourth = sessionToSnapshot(
      makeSession({
        id: 'extra',
        question: 'Fourth saved question about inductance',
        capsule: {
          meta: { version: 1, subject: 'Electrical', topic: 'Inductance' },
          steps: [{ id: 's1', index: 1, title: 'L', body: 'L' }],
          solution: 'done',
          solutionDiagrams: [],
        },
      }),
    );
    const list = [...snapshots(), fourth].map((item, i) => ({ ...item, savedAt: i + 1 }));
    seed(list);
    const onOpenAll = vi.fn();
    const { container, unmount } = mount(list, { variant: 'compact', onOpenAll });

    expect(container.querySelector('input[aria-label="Search saved questions"]')).toBeNull();
    expect(container.querySelectorAll('.slm-saved-item')).toHaveLength(3);
    expect(container.textContent).toContain('Fourth saved question');
    expect(container.textContent).not.toContain('Find the impedance of the series RLC');
    const openAll = [...container.querySelectorAll('button')].find((el) =>
      el.textContent?.includes(OPEN_ALL_SAVED_LABEL),
    );
    expect(openAll).toBeTruthy();
    act(() => {
      openAll!.click();
    });
    expect(onOpenAll).toHaveBeenCalledOnce();
    unmount();
  });
});

describe('SavedLibraryOverlay', () => {
  it('lists every saved question with search and still downloads PDFs', async () => {
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
    expect(container.querySelector('input[aria-label="Search saved questions"]')).toBeTruthy();
    expect(container.querySelectorAll('.slm-saved-item')).toHaveLength(3);

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
    });
    await flush();
    expect(tabsCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: expect.stringContaining('saved-pdf.html?id=rlc') }),
    );

    act(() => {
      root?.unmount();
    });
    container.remove();
  });
});
