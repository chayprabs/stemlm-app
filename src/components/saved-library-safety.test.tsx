/**
 * The saved-questions library under the things that go wrong: a delete that was not meant, a
 * double click, a held key, a second export started before the first has finished, storage that
 * cannot be read, a damaged record, and a keyboard with no mouse beside it.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';

const { storageData, localGet, changeListeners, windowsCreate } = vi.hoisted(() => {
  const storageData: Record<string, unknown> = {};
  return {
    storageData,
    localGet: vi.fn(async (key: string | null) => (key === null ? { ...storageData } : { [key]: storageData[key] })),
    changeListeners: new Set<(changes: Record<string, unknown>, area: string) => void>(),
    windowsCreate: vi.fn(async () => ({ id: 9 })),
  };
});

vi.mock('wxt/browser', () => ({
  browser: {
    storage: {
      local: {
        get: localGet,
        set: vi.fn(async (items: Record<string, unknown>) => {
          Object.assign(storageData, items);
        }),
      },
      onChanged: {
        addListener: (fn: (changes: Record<string, unknown>, area: string) => void) => changeListeners.add(fn),
        removeListener: (fn: (changes: Record<string, unknown>, area: string) => void) => changeListeners.delete(fn),
      },
    },
    windows: { create: windowsCreate },
    runtime: {
      sendMessage: async (message: import('@/src/lib/saved-session-storage').SavedSessionMutationMessage) =>
        (await import('@/src/lib/saved-session-storage')).handleSavedSessionMutation(message),
      getURL: (path: string) => `chrome-extension://test${path}`,
      id: 'test',
    },
  },
}));

vi.mock('@/src/lib/pdf', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/lib/pdf')>()),
  downloadSessionPdf: vi.fn(async () => ({ ok: true, method: 'download' as const })),
  downloadSessionsPdf: vi.fn(async () => ({ ok: true, method: 'download' as const })),
}));

import { downloadSessionPdf, type PdfExportResult } from '@/src/lib/pdf';
import type { RenderOptions } from '@/src/lib/pdf-raster';
import { SavedSessionList } from './SavedSessionList';
import { SavedLibraryOverlay } from './SavedLibraryOverlay';
import { SAVED_SESSIONS_KEY, type SavedSessionSnapshot } from '@/src/lib/saved-sessions';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const NOW = Date.now();

function snap(id: string, question: string, minutesAgo: number, fields: Partial<SavedSessionSnapshot> = {}): SavedSessionSnapshot {
  return {
    id,
    question,
    savedAt: NOW - minutesAgo * 60_000,
    platform: 'gemini',
    meta: { version: 2, subject: 'Math', topic: `${id} topic` },
    steps: [{ id: 's1', index: 1, title: 'Work', body: 'show work' }],
    solution: 'done',
    solutionDiagrams: [],
    ...fields,
  };
}

/** Three questions, newest first: the order the list shows them in. */
function three(): SavedSessionSnapshot[] {
  return [snap('a', 'First question', 1), snap('b', 'Second question', 2), snap('c', 'Third question', 3)];
}

let root: Root | undefined;
let container: HTMLElement;

function seed(list: unknown[]) {
  storageData[SAVED_SESSIONS_KEY] = list;
  storageData.stemlm_saved_sessions_version = 2;
}

function mountList(list: SavedSessionSnapshot[]) {
  seed(list);
  act(() => {
    root = createRoot(container);
    root.render(<SavedSessionList sessions={list} />);
  });
}

function mountLibrary(onClose: () => void = () => undefined) {
  act(() => {
    root = createRoot(container);
    root.render(<SavedLibraryOverlay layout="page" onClose={onClose} />);
  });
}

async function flush() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });
}

/** A real click reports which click of a run it is; a keyboard activation reports 0. */
async function click(target: Element | null | undefined, detail = 1) {
  expect(target).toBeTruthy();
  act(() => {
    target!.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail }));
  });
  await flush();
}

function key(target: EventTarget, init: KeyboardEventInit): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

const rows = () => [...container.querySelectorAll<HTMLElement>('.slm-library-row')];
const rowIds = () => rows().map((row) => row.dataset.id);
const action = (id: string, name: 'download' | 'open' | 'delete') =>
  rows().find((row) => row.dataset.id === id)?.querySelector<HTMLButtonElement>(`[data-action="${name}"]`) ?? null;
const undoBar = () => container.querySelector<HTMLElement>('.slm-library-undo');
const stored = () => (storageData[SAVED_SESSIONS_KEY] as SavedSessionSnapshot[]).map((s) => s.id);

beforeEach(() => {
  vi.clearAllMocks();
  for (const name of Object.keys(storageData)) delete storageData[name];
  changeListeners.clear();
  container = document.createElement('div');
  document.body.appendChild(container);
});

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  container.remove();
  vi.restoreAllMocks();
});

describe('deleting a saved question', () => {
  it('deletes at once and leaves an Undo that puts it back exactly as it was', async () => {
    const list = three();
    mountList(list);
    expect(undoBar()).toBeNull();

    await click(action('b', 'delete'));
    expect(rowIds()).toEqual(['a', 'c']);
    expect(stored()).toEqual(['a', 'c']);
    expect(undoBar()?.textContent).toContain('1 question deleted');
    expect(container.querySelector('[role="status"].slm-sr-only')?.textContent).toMatch(/deleted\. Undo is available/);

    await click(undoBar()!.querySelector('[data-library="undo"]'));
    // Same place in the list and the same saved time: nothing about it says it was ever gone.
    expect(rowIds()).toEqual(['a', 'b', 'c']);
    expect((storageData[SAVED_SESSIONS_KEY] as SavedSessionSnapshot[]).find((s) => s.id === 'b')).toEqual(list[1]);
    expect(undoBar()).toBeNull();
  });

  it('collects every delete since the bar appeared, and one Undo restores them all', async () => {
    mountList(three());
    await click(action('a', 'delete'));
    await click(action('c', 'delete'));
    expect(undoBar()?.textContent).toContain('2 questions deleted');
    expect(stored()).toEqual(['b']);
    await click(undoBar()!.querySelector('[data-library="undo"]'));
    expect(rowIds()).toEqual(['a', 'b', 'c']);
  });

  it('keeps the delete when the bar is dismissed', async () => {
    mountList(three());
    await click(action('a', 'delete'));
    await click(undoBar()!.querySelector('[data-library="undo-dismiss"]'));
    expect(undoBar()).toBeNull();
    expect(stored()).toEqual(['b', 'c']);
    // Nothing left to undo: the shortcut is inert.
    key(document.body, { key: 'z', ctrlKey: true });
    await flush();
    expect(rowIds()).toEqual(['b', 'c']);
  });

  it('ignores the second click of a double click, which would land on the row that moved up', async () => {
    mountList(three());
    await click(action('a', 'delete'), 1);
    await click(action('b', 'delete'), 2);
    expect(rowIds()).toEqual(['b', 'c']);
  });

  it('does not let a held Enter or Space run down the list', () => {
    mountList(three());
    const held = key(action('a', 'delete')!, { key: 'Enter', repeat: true });
    expect(held.defaultPrevented).toBe(true);
    const pressed = key(action('a', 'delete')!, { key: 'Enter' });
    expect(pressed.defaultPrevented).toBe(false);
  });

  it('moves focus to the row that took the deleted row\'s place, then to Undo when none is left', async () => {
    mountList(three());
    action('b', 'delete')!.focus();
    await click(action('b', 'delete'), 0);
    expect(document.activeElement).toBe(action('c', 'delete'));
    await click(action('c', 'delete'), 0);
    // The last row has no row below it: the one above takes focus.
    expect(document.activeElement).toBe(action('a', 'delete'));
    await click(action('a', 'delete'), 0);
    expect(rows()).toHaveLength(0);
    expect(document.activeElement).toBe(undoBar()!.querySelector('[data-library="undo"]'));
  });

  it('undoes with Ctrl+Z, but leaves the key alone while a search is being typed', async () => {
    mountList(three());
    await click(action('a', 'delete'));
    const search = container.querySelector<HTMLInputElement>('input[aria-label="Search saved questions"]')!;
    const typed = key(search, { key: 'z', ctrlKey: true });
    await flush();
    expect(typed.defaultPrevented).toBe(false);
    expect(rowIds()).toEqual(['b', 'c']);

    const pressed = key(document.body, { key: 'z', ctrlKey: true });
    await flush();
    expect(pressed.defaultPrevented).toBe(true);
    expect(rowIds()).toEqual(['a', 'b', 'c']);
  });

  it('says so and keeps the Undo when a question cannot be brought back', async () => {
    mountList(three());
    await click(action('a', 'delete'));
    const storage = await import('@/src/lib/saved-session-storage');
    vi.spyOn(storage, 'handleSavedSessionMutation').mockResolvedValueOnce({ ok: false, quota: false, message: 'no' });
    await click(undoBar()!.querySelector('[data-library="undo"]'));
    expect(container.querySelector('[role="alert"]')?.textContent).toContain('Could not bring that question back');
    expect(undoBar()).not.toBeNull();
    await click(undoBar()!.querySelector('[data-library="undo"]'));
    expect(rowIds()).toEqual(['a', 'b', 'c']);
  });
});

describe('opening and exporting from a row', () => {
  it('opens the saved answer from the question itself, once per double click', async () => {
    mountList(three());
    const copy = rows()[0]!.querySelector('.slm-library-row-copy');
    await click(copy, 1);
    await click(copy, 2);
    expect(windowsCreate).toHaveBeenCalledTimes(1);
    expect(windowsCreate).toHaveBeenCalledWith(expect.objectContaining({ url: expect.stringContaining('pdf.html?id=a') }));
  });

  it('does not open when the click ends a text selection, or while questions are being picked', async () => {
    mountList(three());
    vi.spyOn(window, 'getSelection').mockReturnValue({ toString: () => 'First' } as Selection);
    await click(rows()[0]!.querySelector('.slm-library-row-copy'));
    expect(windowsCreate).not.toHaveBeenCalled();
    vi.restoreAllMocks();

    await click(container.querySelector('[data-merge="start"]'));
    await click(rows()[0]!.querySelector('.slm-library-row-copy'));
    expect(windowsCreate).not.toHaveBeenCalled();
    expect(rows()[0]!.dataset.selected).toBe('true');
  });

  it('never opens a window taller than the screen', async () => {
    vi.stubGlobal('screen', { availHeight: 700 });
    mountList(three());
    await click(action('a', 'open'));
    const [{ height }] = windowsCreate.mock.calls[0] as unknown as [{ height: number }];
    expect(height).toBeLessThanOrEqual(700);
    vi.unstubAllGlobals();
  });

  it('builds one PDF at a time and says where it is, in the row and to a screen reader', async () => {
    mountList(three());
    let finish: (result: PdfExportResult) => void = () => undefined;
    vi.mocked(downloadSessionPdf).mockImplementationOnce((_session, options?: RenderOptions) => {
      options?.onProgress?.({ page: 1, total: 3 });
      return new Promise((resolve) => {
        finish = resolve;
      });
    });
    await click(action('a', 'download'));
    expect(rows()[0]!.querySelector('.slm-library-row-note')?.textContent).toBe('Building PDF, page 1 of 3');
    expect(rows()[0]!.querySelector('time')).toBeNull();
    // The other rows wait, and say why.
    expect(action('b', 'download')!.disabled).toBe(true);
    expect(action('b', 'download')!.title).toBe('Another PDF is being built');
    expect(container.querySelector<HTMLButtonElement>('[data-merge="start"]')).toBeTruthy();
    await click(action('b', 'download'));
    expect(downloadSessionPdf).toHaveBeenCalledTimes(1);

    await act(async () => finish({ ok: true, method: 'download' }));
    await flush();
    expect(rows()[0]!.querySelector('.slm-library-row-note')?.textContent).toBe('Saved to Downloads');
    expect(action('b', 'download')!.disabled).toBe(false);
    expect(container.querySelector('[role="status"].slm-sr-only')?.textContent).toBe('PDF saved to your Downloads folder.');
  });

  it('says a question is no longer saved when it was deleted elsewhere before the export', async () => {
    mountList(three());
    seed([]);
    await click(action('a', 'download'));
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe('That question is no longer saved.');
    expect(downloadSessionPdf).not.toHaveBeenCalled();
  });
});

describe('the library from the keyboard', () => {
  it('opens the time menu on the current choice, walks it with the arrows and returns focus on close', async () => {
    mountList(three());
    const control = container.querySelector<HTMLButtonElement>('button[aria-label="Filter by time"]')!;
    control.focus();
    key(control, { key: 'ArrowDown' });
    const options = () => [...container.querySelectorAll<HTMLButtonElement>('[role="option"]')];
    expect(options()).toHaveLength(5);
    expect(document.activeElement).toBe(options()[0]);
    key(options()[0]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options()[1]);
    key(options()[1]!, { key: 'End' });
    expect(document.activeElement).toBe(options()[4]);
    key(options()[4]!, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(options()[0]);

    key(options()[0]!, { key: 'Escape' });
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(control);

    key(control, { key: 'ArrowDown' });
    await click(options()[1]);
    expect(container.querySelector('[role="listbox"]')).toBeNull();
    expect(document.activeElement).toBe(control);
    expect(control.textContent).toContain('Last 24 hours');
  });

  it('moves along the subject chips with the left and right arrows', () => {
    mountList([snap('a', 'First', 1), snap('b', 'Second', 2, { meta: { version: 2, subject: 'Physics', topic: 't' } })]);
    const chips = [...container.querySelectorAll<HTMLButtonElement>('.slm-library-chip')];
    expect(chips.length).toBe(3);
    chips[0]!.focus();
    key(chips[0]!, { key: 'ArrowRight' });
    expect(document.activeElement).toBe(chips[1]);
    key(chips[1]!, { key: 'ArrowLeft' });
    expect(document.activeElement).toBe(chips[0]);
  });

  it('Escape leaves the merge picker before it is allowed to close the library', async () => {
    seed(three());
    const onClose = vi.fn();
    mountLibrary(onClose);
    await flush();
    await click(container.querySelector('[data-merge="start"]'));
    await click(container.querySelector('.slm-library-check'));
    expect(container.querySelector('.slm-library-select')).not.toBeNull();

    key(document.body, { key: 'Escape' });
    expect(container.querySelector('.slm-library-select')).toBeNull();
    expect(onClose).not.toHaveBeenCalled();
    key(document.body, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe('records and storage that are not what they should be', () => {
  it('names a record that has neither a question nor a topic, so it can still be opened or deleted', async () => {
    mountList([snap('blank', '', 1, { meta: { version: 2, subject: '', topic: '' } as unknown as SavedSessionSnapshot['meta'] })]);
    expect(rows()[0]!.textContent).toContain('Untitled question');
    expect(action('blank', 'delete')!.getAttribute('aria-label')).toBe('Delete Untitled question');
    await click(action('blank', 'delete'));
    expect(rows()).toHaveLength(0);
  });

  it('lists a record whose stored time is not a time, and skips entries that are not records at all', async () => {
    seed([snap('odd', 'Odd record', 1, { savedAt: 1e300 }), snap('nan', 'NaN record', 1, { savedAt: Number.NaN }), 'not a record', { id: 7 }, snap('fine', 'Fine record', 5)]);
    mountLibrary();
    await flush();
    expect(rowIds().sort()).toEqual(['fine', 'nan', 'odd']);
    // Every row still has a date a browser can format: the page does not fail on the damaged ones.
    for (const time of container.querySelectorAll('time')) expect(Number.isNaN(Date.parse(time.dateTime))).toBe(false);
    expect(container.querySelectorAll('time')).toHaveLength(3);
  });

  it('does not call the library empty while storage has not answered', async () => {
    seed(three());
    mountLibrary();
    expect(container.textContent).not.toContain('Nothing saved yet.');
    expect(container.querySelector('.slm-library-main')?.getAttribute('aria-busy')).toBe('true');
    await flush();
    expect(rows()).toHaveLength(3);
    expect(container.querySelector('.slm-library-count')?.textContent).toBe('3');
  });

  it('says the library could not be read instead of looking empty, and reads it again on request', async () => {
    seed(three());
    localGet.mockImplementationOnce(async () => {
      throw new Error('storage unavailable');
    });
    mountLibrary();
    await flush();
    expect(container.textContent).not.toContain('Nothing saved yet.');
    const failed = container.querySelector('[role="alert"]');
    expect(failed?.textContent).toContain('could not be read');
    expect(failed?.textContent).toContain('Nothing has been deleted');
    expect(container.querySelector('.slm-library-count')).toBeNull();

    await click(container.querySelector('[data-library="retry"]'));
    expect(rows()).toHaveLength(3);
    expect(container.querySelector('[data-library="retry"]')).toBeNull();
  });

  it('follows the library while its window stays open: a question saved from a chat tab appears', async () => {
    seed(three());
    mountLibrary();
    await flush();
    expect(rows()).toHaveLength(3);

    seed([snap('new', 'Saved from the panel', 0), ...three()]);
    act(() => {
      for (const listener of changeListeners) listener({ [SAVED_SESSIONS_KEY]: {} }, 'local');
    });
    await flush();
    expect(rowIds()).toEqual(['new', 'a', 'b', 'c']);

    // Other keys, and other storage areas, are not the library's business.
    localGet.mockClear();
    act(() => {
      for (const listener of changeListeners) listener({ stemlm_settings: {} }, 'local');
      for (const listener of changeListeners) listener({ [SAVED_SESSIONS_KEY]: {} }, 'session');
    });
    await flush();
    expect(localGet).not.toHaveBeenCalledWith(null);
  });
});
