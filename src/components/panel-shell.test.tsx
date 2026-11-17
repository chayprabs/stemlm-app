/**
 * The panel's shell: where it sits, what it does with focus and keys, and its resize handle.
 * What is inside the panel has its own tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { Panel } from './Panel';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { applyLiveSettings } from '@/src/lib/live-settings';
import type { Session } from '@/src/protocol/types';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const saved = vi.hoisted(() => ({ setSettings: vi.fn() }));
vi.mock('@/src/lib/settings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/src/lib/settings')>()),
  setSettings: saved.setSettings,
}));
vi.mock('@/src/lib/saved-sessions', () => ({
  saveSession: vi.fn(async () => ({ prunedCount: 0 })),
  deleteSavedSession: vi.fn(async () => undefined),
  isSessionSaved: vi.fn(async () => false),
  refreshSavedSession: vi.fn(async () => false),
}));
vi.mock('wxt/browser', () => ({ browser: { runtime: { getURL: (path: string) => `chrome-extension://test/${path}` } } }));

const session: Session = {
  id: 'shell',
  createdAt: 0,
  updatedAt: 0,
  platform: 'claude',
  question: 'Solve it.',
  raw: '',
  capsule: {
    meta: { version: 2, subject: 'Math', topic: 'Shell' },
    solution: 'Done.',
    solutionDiagrams: [],
    steps: [1, 2, 3].map((n) => ({ id: `s${n}`, index: n, title: `Step ${n}`, body: `Working ${n}.` })),
  },
};

let root: Root | null = null;
let host: HTMLDivElement | null = null;

/** Mounted, with the panel's own start-up reads (is this answer saved?) settled. */
async function mountPanel(): Promise<HTMLElement> {
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  await act(async () => { root!.render(<Panel />); });
  return host.querySelector<HTMLElement>('.slm-panel')!;
}

const setOpen = (open: boolean) => act(() => useStore.setState({ panelOpen: open }));
const key = (target: Element, init: KeyboardEventInit, type = 'keydown') =>
  act(() => { target.dispatchEvent(new KeyboardEvent(type, { bubbles: true, cancelable: true, composed: true, ...init })); });
const pointer = (target: EventTarget, type: string, clientX: number) =>
  act(() => { target.dispatchEvent(new MouseEvent(type, { bubbles: true, cancelable: true, clientX, button: 0 })); });

function field(tag: 'textarea' | 'button', value = ''): HTMLElement {
  const el = document.createElement(tag);
  if (el instanceof HTMLTextAreaElement) el.value = value;
  document.body.append(el);
  el.focus();
  return el;
}

beforeEach(() => {
  vi.useFakeTimers();
  saved.setSettings.mockReset();
  saved.setSettings.mockImplementation(async (patch: object) => ({ ...DEFAULT_SETTINGS, ...patch }));
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
  useStore.getState().resetSessions();
  useStore.getState().addSession(session);
  useStore.setState({
    panelOpen: true, status: 'ready', errorMessage: undefined, view: 'steps', theme: 'light', settings: DEFAULT_SETTINGS,
    activeStepIndex: 0, splitRatio: DEFAULT_SETTINGS.splitRatio, splitDragging: false, hostSidebarPx: 0,
  });
});

afterEach(() => {
  act(() => root?.unmount());
  root = null;
  document.body.innerHTML = '';
  useStore.getState().resetSessions();
  useStore.setState({ panelOpen: false, status: 'idle', hostSidebarPx: 0, splitDragging: false });
  vi.useRealTimers();
});

describe('where the panel sits', () => {
  it('takes the reading-first share of a wide window, and leaves the chat its column in a smaller one', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1920 });
    expect((await mountPanel()).style.width).toBe('68vw');
    act(() => root!.unmount());
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
    // 1440 - 480 for the chat - 60 for a sidebar rail.
    expect((await mountPanel()).style.width).toBe('62.5vw');
  });

  it('gives way to a host sidebar that is still open', async () => {
    useStore.setState({ hostSidebarPx: 288 });
    expect((await mountPanel()).style.width).toBe('46.667vw');
  });

  it('covers a window too narrow for two columns, with nothing to drag', async () => {
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 740 });
    const panel = await mountPanel();
    expect(panel.style.width).toBe('100vw');
    expect(panel.querySelector('.slm-resize-handle')).toBeNull();
  });
});

describe('focus', () => {
  it('moves into the panel when it opens and back to the opener when it closes', async () => {
    useStore.setState({ panelOpen: false });
    const opener = field('button');
    const panel = await mountPanel();
    setOpen(true);
    expect(document.activeElement).toBe(panel);
    setOpen(false);
    expect(document.activeElement).toBe(opener);
  });

  it('is not taken from a chat box the student is typing in', async () => {
    useStore.setState({ panelOpen: false });
    const draft = field('textarea', 'and what if the incline is');
    await mountPanel();
    setOpen(true);
    expect(document.activeElement).toBe(draft);
    setOpen(false);
    expect(document.activeElement).toBe(draft);
  });

  it('is taken from an empty chat box, and given back to it', async () => {
    useStore.setState({ panelOpen: false });
    const empty = field('textarea');
    const panel = await mountPanel();
    setOpen(true);
    expect(document.activeElement).toBe(panel);
    setOpen(false);
    expect(document.activeElement).toBe(empty);
  });

  it('stays where the student has moved it when the panel closes', async () => {
    useStore.setState({ panelOpen: false });
    field('button');
    await mountPanel();
    setOpen(true);
    const elsewhere = field('textarea', 'typing in the chat again');
    setOpen(false);
    expect(document.activeElement).toBe(elsewhere);
  });
});

describe('keys', () => {
  it('pressed in the panel do not reach the chat page', async () => {
    const panel = await mountPanel();
    const heard: string[] = [];
    const listen = (e: Event) => heard.push(`${e.type}:${(e as KeyboardEvent).key}`);
    document.addEventListener('keydown', listen);
    document.addEventListener('keyup', listen);
    const inside = panel.querySelector('.slm-stepnav-btn--next')!;
    for (const k of ['a', 'ArrowRight', '/', 'Escape']) {
      key(inside, { key: k });
      key(inside, { key: k }, 'keyup');
    }
    document.removeEventListener('keydown', listen);
    document.removeEventListener('keyup', listen);
    expect(heard).toEqual([]);
    // They still did their work in the panel.
    expect(useStore.getState().activeStepIndex).toBe(1);
    expect(useStore.getState().panelOpen).toBe(false);
  });

  it('pressed in the chat page are left to it', async () => {
    await mountPanel();
    const draft = field('textarea', 'x');
    const heard = vi.fn();
    document.addEventListener('keydown', heard);
    key(draft, { key: 'Escape' });
    document.removeEventListener('keydown', heard);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(useStore.getState().panelOpen).toBe(true);
  });

  it('Escape that ends an IME composition does not close the panel', async () => {
    const panel = await mountPanel();
    key(panel, { key: 'Escape', isComposing: true });
    expect(useStore.getState().panelOpen).toBe(true);
    key(panel, { key: 'Escape' });
    expect(useStore.getState().panelOpen).toBe(false);
  });
});

describe('resize handle', () => {
  const handle = (panel: HTMLElement) => panel.querySelector<HTMLElement>('.slm-resize-handle')!;

  it('sizes the panel with the arrow keys without turning the step page', async () => {
    useStore.setState({ splitRatio: 0.5 });
    const panel = await mountPanel();
    key(handle(panel), { key: 'ArrowRight' });
    expect(useStore.getState().splitRatio).toBeCloseTo(0.48);
    key(handle(panel), { key: 'ArrowLeft', shiftKey: true });
    expect(useStore.getState().splitRatio).toBeCloseTo(0.53);
    expect(useStore.getState().activeStepIndex).toBe(0);
  });

  it('answers the first key from a stored width the window cannot show', async () => {
    // The untouched default asks for 68%; a 1440px window shows 62.5%.
    const panel = await mountPanel();
    key(handle(panel), { key: 'ArrowRight' });
    expect(useStore.getState().splitRatio).toBeCloseTo(0.605);
    expect(panel.style.width).toBe('60.5vw');
    // And stops at the widest the chat allows instead of storing more.
    for (let i = 0; i < 12; i++) key(handle(panel), { key: 'ArrowLeft', shiftKey: true });
    expect(useStore.getState().splitRatio).toBeCloseTo(0.625);
  });

  it('saves once when a run of keys ends, and is not pulled back by an earlier save meanwhile', async () => {
    useStore.setState({ splitRatio: 0.5 });
    const panel = await mountPanel();
    key(handle(panel), { key: 'ArrowRight' });
    key(handle(panel), { key: 'ArrowRight' });
    expect(useStore.getState().splitDragging).toBe(true);
    // Another surface, or this tab's own earlier save, reports a width the keys have moved past.
    act(() => applyLiveSettings({ ...DEFAULT_SETTINGS, splitRatio: 0.5 }));
    expect(useStore.getState().splitRatio).toBeCloseTo(0.46);
    expect(saved.setSettings).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(500); });
    expect(useStore.getState().splitDragging).toBe(false);
    expect(saved.setSettings).toHaveBeenCalledTimes(1);
    expect(saved.setSettings.mock.calls[0]![0].splitRatio).toBeCloseTo(0.46);
  });

  it('a drag stores the width the layout shows and writes nothing onto the chat page', async () => {
    const panel = await mountPanel();
    const before = document.body.getAttribute('style');
    pointer(handle(panel), 'pointerdown', 720);
    expect(useStore.getState().splitDragging).toBe(true);
    expect(useStore.getState().splitRatio).toBeCloseTo(0.5);
    expect(document.body.getAttribute('style')).toBe(before);
    // Past what the chat column allows: the stored width is the one on screen.
    pointer(window, 'pointermove', 100);
    expect(useStore.getState().splitRatio).toBeCloseTo(0.625);
    pointer(window, 'pointermove', 1000);
    await act(async () => { pointer(window, 'pointerup', 1000); });
    expect(useStore.getState().splitDragging).toBe(false);
    expect(saved.setSettings).toHaveBeenCalledTimes(1);
    expect(saved.setSettings.mock.calls[0]![0].splitRatio).toBeCloseTo(1 - 1000 / 1440);
    expect(document.body.getAttribute('style')).toBe(before);
  });

  it('ends a drag that the panel closes under', async () => {
    const panel = await mountPanel();
    pointer(handle(panel), 'pointerdown', 720);
    act(() => root!.unmount());
    root = null;
    expect(useStore.getState().splitDragging).toBe(false);
    // The window no longer listens: a later move sizes nothing.
    pointer(window, 'pointermove', 300);
    expect(useStore.getState().splitRatio).toBeCloseTo(0.5);
  });

  it('reports the range the layout allows, not the stored one', async () => {
    useStore.setState({ hostSidebarPx: 288 });
    const separator = handle(await mountPanel());
    expect(separator.getAttribute('aria-valuemin')).toBe('25');
    // 1440 - 480 - 288 = 672px, 46.7% of the window.
    expect(separator.getAttribute('aria-valuemax')).toBe('47');
    expect(separator.getAttribute('aria-valuenow')).toBe('47');
  });
});
