/**
 * The one-time hint at the stemlm button (finding 16): shown once after install, beside the control
 * and clear of the chat box, gone on the first press or its own close button, and gone with the control.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayButton } from './OverlayButton';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import type { ControlPlacement } from '@/src/lib/composer-anchor';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const hint = vi.hoisted(() => ({
  pending: true,
  dismiss: vi.fn(),
  dismissedElsewhere: null as null | (() => void),
  slot: { left: 90, top: 140 } as { left: number; top: number } | null,
  show: null as null | ((place: unknown) => void),
}));

vi.mock('@/src/lib/first-run-hint', () => ({
  firstRunHintPending: async () => hint.pending,
  dismissFirstRunHint: hint.dismiss,
  onFirstRunHintDismissed: (listener: () => void) => {
    hint.dismissedElsewhere = listener;
    return () => {};
  },
}));
vi.mock('@/src/lib/composer-anchor', () => ({
  trackComposerControl: (_adapter: unknown, _enabled: unknown, show: (place: unknown) => void) => {
    hint.show = show;
    show({ anchor: document.body, left: 100, top: 200, size: 32, radius: '999px', ink: '', scheme: 'light' });
    return () => {};
  },
  noteSlot: () => hint.slot,
}));
vi.mock('@/src/content/controller', () => ({
  getController: () => ({ inject: async () => true, getLastQuestion: () => '', resetInjection: () => {}, takeAttachNotice: () => null }),
}));
vi.mock('@/src/platforms/detect', () => ({
  detectAdapter: () => ({ id: 'claude', findEditor: () => document.getElementById('ed'), getEditorText: () => '' }),
}));

let root: Root;
let container: HTMLDivElement;

async function mount() {
  container = document.createElement('div');
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(<OverlayButton />));
}
const hintEl = () => container.querySelector<HTMLElement>('.slm-first-hint');

beforeEach(() => {
  Object.assign(hint, { pending: true, slot: { left: 90, top: 140 }, dismissedElsewhere: null });
  hint.dismiss.mockClear();
  const ed = document.createElement('div');
  ed.id = 'ed';
  document.body.append(ed);
  useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle', settings: DEFAULT_SETTINGS });
});

afterEach(() => {
  act(() => root.unmount());
  document.body.innerHTML = '';
});

describe('the first-run hint', () => {
  it('says how the control is used, on its measured place clear of the chat box, with its caret on the control', async () => {
    await mount();
    const note = hintEl()!;
    expect(note.textContent).toBe('Type your question, press this, then Send.');
    // Placed above the chat box here: the caret points down at the control's centre (100 + 16 - 90).
    expect(note.dataset.side).toBe('above');
    expect(note.style.left).toBe('90px');
    expect(note.style.top).toBe('140px');
    expect(note.style.getPropertyValue('--slm-inject-hint-caret')).toBe('26px');
    // It is part of the control's own shadow-root box, and the control is described by it.
    expect(note.closest('.slm-fab-wrap')?.classList.contains('has-hint')).toBe(true);
    expect(container.querySelector('.slm-inject-btn')?.getAttribute('aria-describedby')).toBe('slm-first-hint-text');
  });

  it('waits unseen where no place clear of the chat and its controls can be found', async () => {
    hint.slot = null;
    await mount();
    expect(hintEl()).toBeTruthy();
    expect(hintEl()!.dataset.side).toBeUndefined();
  });

  it('is gone for good after its close button', async () => {
    await mount();
    await act(async () => hintEl()!.querySelector<HTMLButtonElement>('button[aria-label="Close tip"]')!.click());
    expect(hintEl()).toBeNull();
    expect(hint.dismiss).toHaveBeenCalledTimes(1);
    expect(container.querySelector('.slm-fab-wrap')?.classList.contains('has-hint')).toBe(false);
  });

  it('is gone for good after the first press of the control', async () => {
    await mount();
    await act(async () => container.querySelector<HTMLButtonElement>('.slm-inject-btn')!.click());
    expect(hintEl()).toBeNull();
    expect(hint.dismiss).toHaveBeenCalledTimes(1);
  });

  it('goes when the control goes, and when another tab dismisses it', async () => {
    await mount();
    act(() => hint.show!(null));
    expect(hintEl()).toBeNull();
    act(() => hint.show!({ anchor: document.body, left: 100, top: 200, size: 32, radius: '999px', ink: '', scheme: 'light' }));
    await act(async () => {});
    expect(hintEl()).toBeTruthy();
    act(() => hint.dismissedElsewhere!());
    expect(hintEl()).toBeNull();
  });

  it('is never shown once dismissed, or on an update', async () => {
    hint.pending = false;
    await mount();
    expect(container.querySelector('.slm-inject-btn')).toBeTruthy();
    expect(hintEl()).toBeNull();
  });
});

describe('where the hint may sit', () => {
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) }) as DOMRect;

  it('below the chat box when there is room and nothing of the chat is there, else above it, never on it', async () => {
    const { noteSlot } = await vi.importActual<typeof import('@/src/lib/composer-anchor')>('@/src/lib/composer-anchor');
    document.body.innerHTML = '<div id="box"><div id="ed2"></div><button id="attach"></button></div><a id="link"></a>';
    const box = document.getElementById('box')!;
    vi.spyOn(box, 'getBoundingClientRect').mockReturnValue(rect(200, 500, 600, 120));
    Object.assign(window, { innerWidth: 1200, innerHeight: 800 });
    const place: ControlPlacement = { anchor: document.getElementById('attach')!, left: 244, top: 580, size: 32, radius: '8px', ink: '', scheme: 'light', rtl: false };
    const free = vi.fn((_x: number, _y: number) => [document.body] as Element[]);
    Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: free });

    expect(noteSlot(place, document.getElementById('ed2'), 260, 40)).toEqual({ left: 244, top: 628 });
    // A link of the chat's below the box: the hint goes above the box instead.
    free.mockImplementation((_x, y) => (y > 620 ? [document.getElementById('link')!] : [document.body]));
    expect(noteSlot(place, document.getElementById('ed2'), 260, 40)).toEqual({ left: 244, top: 452 });
    // No editor beside the button: no chat box to keep clear of, so no hint.
    expect(noteSlot(place, null, 260, 40)).toBeNull();
    Reflect.deleteProperty(document, 'elementsFromPoint');
  });
});
