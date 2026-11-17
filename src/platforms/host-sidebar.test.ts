/**
 * The host-sidebar rules, against doubles built from the live recon of 2026-11-17: the same
 * elements, attributes, labels and sizes, with a control that folds over a few frames.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformId } from './types';

let platform: PlatformId | null = 'chatgpt';
vi.mock('@/src/platforms/detect', () => ({ detectAdapter: () => (platform ? { id: platform } : null) }));

type Sync = typeof import('./host-sidebar').syncHostSidebar;
let sync: Sync;

/* ---------- a layout the test DOM does not compute ---------- */

interface Box { left: number; top: number; width: number; height: number }
const boxes = new Map<Element, Box>();
/** Paint order: later entries are on top. */
let stack: Element[] = [];

function place(el: Element, left: number, top: number, width: number, height: number) {
  if (!boxes.has(el)) stack.push(el);
  boxes.set(el, { left, top, width, height });
  el.getBoundingClientRect = () => {
    const b = boxes.get(el)!;
    return { left: b.left, top: b.top, right: b.left + b.width, bottom: b.top + b.height, width: b.width, height: b.height, x: b.left, y: b.top, toJSON: () => ({}) };
  };
}

function elementAt(x: number, y: number): Element {
  const hit = [...stack].reverse().find((el) => {
    const b = boxes.get(el)!;
    return el.isConnected && b.width > 0 && b.height > 0 && x >= b.left && x < b.left + b.width && y >= b.top && y < b.top + b.height;
  });
  return hit ?? document.documentElement;
}

const observers: { notify: () => void; el: Element }[] = [];
class FakeResizeObserver {
  private readonly notify: () => void;
  constructor(cb: ResizeObserverCallback) {
    this.notify = () => cb([], this as unknown as ResizeObserver);
  }
  observe(el: Element) {
    observers.push({ notify: this.notify, el });
    this.notify();
  }
  disconnect() {
    for (let i = observers.length - 1; i >= 0; i--) if (observers[i]!.notify === this.notify) observers.splice(i, 1);
  }
  unobserve() {}
}
const resized = (el: Element) => observers.filter((o) => o.el === el).forEach((o) => o.notify());

/* ---------- the four hosts ---------- */

interface Host {
  box: HTMLElement;
  presses: string[];
  width: () => number;
  /** The student, or the site, folding or unfolding it by other means. */
  set: (open: boolean) => void;
}

/** Resize `box` to `to` over four frames, as the hosts animate it. */
function animate(box: HTMLElement, to: number, done?: () => void) {
  const from = boxes.get(box)!.width;
  for (let i = 1; i <= 4; i++) {
    setTimeout(() => {
      place(box, 0, 0, Math.round(from + ((to - from) * i) / 4), 732);
      resized(box);
      if (i === 4) done?.();
    }, i * 60);
  }
}

/**
 * ChatGPT: two controls for one sidebar, each labelled by what it will do. The rail's "Open
 * sidebar" stays laid out underneath the open sidebar.
 */
function chatgpt(labels: [string, string] = ['Open sidebar', 'Close sidebar']): Host {
  document.body.innerHTML = `
    <div><button id="open" aria-label="${labels[0]}" aria-controls="ds-sidebar" aria-expanded="true"></button></div>
    <nav id="ds-sidebar" aria-label="Sidebar shortcuts">
      <button id="close" aria-label="${labels[1]}" aria-controls="ds-sidebar"></button>
      <nav aria-label="Sidebar"><button aria-label="New chat"></button></nav>
    </nav>
    <main><button aria-label="Add files and more"></button></main>`;
  const box = document.getElementById('ds-sidebar')!;
  const open = document.getElementById('open')!;
  const close = document.getElementById('close')!;
  const presses: string[] = [];
  place(open, 8, 8, 40, 36);
  place(box, 0, 0, 259, 732);
  place(close, 210, 4, 44, 44);
  const set = (toOpen: boolean) => {
    if (toOpen) animate(box, 259, () => place(close, 210, 4, 44, 44));
    else {
      place(close, 0, 0, 0, 0);
      animate(box, 0);
    }
  };
  close.addEventListener('click', () => { presses.push('close'); set(false); });
  open.addEventListener('click', () => { presses.push('open'); set(true); });
  return { box, presses, width: () => boxes.get(box)!.width, set };
}

/** One control that flips: Claude, Gemini and Grok. */
function single(html: string, boxSelector: string, toggleSelector: string, openWidth: number, rail: number, relabel?: [string, string]): Host {
  document.body.innerHTML = html;
  const box = document.querySelector<HTMLElement>(boxSelector)!;
  const toggle = document.querySelector<HTMLElement>(toggleSelector)!;
  const presses: string[] = [];
  place(box, 0, 0, openWidth, 732);
  place(toggle, 12, 8, 28, 28);
  let isOpen = true;
  const set = (toOpen: boolean) => {
    isOpen = toOpen;
    if (relabel) toggle.setAttribute('aria-label', relabel[toOpen ? 1 : 0]);
    animate(box, toOpen ? openWidth : rail);
  };
  toggle.addEventListener('click', () => { presses.push(isOpen ? 'fold' : 'unfold'); set(!isOpen); });
  return { box, presses, width: () => boxes.get(box)!.width, set };
}

const claude = () =>
  single('<aside aria-label="Sidebar"><button aria-label="Hide sidebar"></button></aside><main></main>', 'aside', 'button', 288, 52, ['Show sidebar', 'Hide sidebar']);
const gemini = () =>
  single('<bard-sidenav aria-label="Side Navigation"><button aria-label="Close sidebar" aria-expanded="true"></button><button aria-label="Show more" aria-expanded="false"></button></bard-sidenav><main></main>', 'bard-sidenav', 'button', 288, 72, ['Open sidebar', 'Close sidebar']);
const grok = () =>
  single('<div data-state="expanded"><div data-sidebar="sidebar"></div></div><main><button data-sidebar="trigger"><span class="sr-only">Toggle Sidebar</span></button></main>', '[data-sidebar="sidebar"]', '[data-sidebar="trigger"]', 256, 48);

/* ---------- harness ---------- */

const widths: number[] = [];
const onWidth = (px: number) => { widths.push(px); };
const settle = (ms = 1000) => vi.advanceTimersByTimeAsync(ms);
const show = (fold = true) => sync(true, fold, onWidth);
const hide = (fold = true) => sync(false, fold, onWidth);

beforeEach(async () => {
  vi.useFakeTimers();
  vi.resetModules();
  platform = 'chatgpt';
  boxes.clear();
  stack = [];
  observers.length = 0;
  widths.length = 0;
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
  document.elementFromPoint = elementAt;
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
  sync = (await import('./host-sidebar')).syncHostSidebar;
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('folding the host sidebar while the panel is shown', () => {
  it('folds an open ChatGPT sidebar with the control that closes it, and opens it again afterwards', async () => {
    const host = chatgpt();
    show();
    await settle();
    expect(host.presses).toEqual(['close']);
    expect(host.width()).toBe(0);
    hide();
    await settle();
    expect(host.presses).toEqual(['close', 'open']);
    expect(host.width()).toBe(259);
  });

  it.each([
    ['claude', claude, 52],
    ['gemini', gemini, 72],
    ['grok', grok, 48],
  ] as const)('folds and restores on %s', async (id, build, rail) => {
    platform = id;
    const host = build();
    show();
    await settle();
    expect(host.presses).toEqual(['fold']);
    expect(host.width()).toBe(rail);
    hide();
    await settle();
    expect(host.presses).toEqual(['fold', 'unfold']);
    expect(host.width()).toBeGreaterThan(250);
  });

  it('works from structure alone where the interface is not in English', async () => {
    const host = chatgpt(['Ouvrir la barre latérale', 'Fermer la barre latérale']);
    show();
    await settle();
    expect(host.presses).toEqual(['close']);
    hide();
    await settle();
    expect(host.presses).toEqual(['close', 'open']);

    platform = 'grok';
    const unlabelled = grok();
    show();
    await settle();
    expect(unlabelled.presses).toEqual(['fold']);
  });

  it('unfolds with the control that folded it, whatever that control is called once folded', async () => {
    platform = 'claude';
    const host = single('<aside aria-label="Sidebar"><button aria-label="Hide sidebar"></button></aside><main></main>', 'aside', 'button', 288, 52, ['Navigation', 'Hide sidebar']);
    show();
    await settle();
    hide();
    await settle();
    expect(host.presses).toEqual(['fold', 'unfold']);
  });

  it('unfolds a sidebar the host took out of the page while it was folded', async () => {
    platform = 'claude';
    document.body.innerHTML = '<aside aria-label="Sidebar"></aside><main><button aria-label="Hide sidebar"></button></main>';
    const box = document.querySelector('aside')!;
    const toggle = document.querySelector('button')!;
    const main = document.querySelector('main')!;
    place(box, 0, 0, 288, 732);
    place(toggle, 300, 8, 28, 28);
    const presses: string[] = [];
    toggle.addEventListener('click', () => {
      presses.push(box.isConnected ? 'fold' : 'unfold');
      if (box.isConnected) box.remove();
      else main.before(box);
      toggle.setAttribute('aria-label', box.isConnected ? 'Hide sidebar' : 'Show sidebar');
    });
    show();
    await settle();
    expect(box.isConnected).toBe(false);
    hide();
    await settle();
    expect(presses).toEqual(['fold', 'unfold']);
    expect(box.isConnected).toBe(true);
  });

  it('presses the labelled control only: never another button in the sidebar', async () => {
    platform = 'gemini';
    const host = gemini();
    const more = document.querySelector('[aria-label="Show more"]')!;
    place(more, 12, 300, 200, 32);
    const pressed = vi.fn();
    more.addEventListener('click', pressed);
    show();
    await settle();
    hide();
    await settle();
    expect(host.presses).toEqual(['fold', 'unfold']);
    expect(pressed).not.toHaveBeenCalled();
  });

  it('never presses a control that says it does the opposite', async () => {
    const host = chatgpt();
    // Only the "Open sidebar" control is reachable although the sidebar is open.
    document.getElementById('close')!.remove();
    place(document.getElementById('open')!, 300, 8, 40, 36);
    show();
    await settle(4000);
    expect(host.presses).toEqual([]);
  });

  it('does nothing when the sidebar is already folded', async () => {
    platform = 'claude';
    const host = claude();
    host.set(false);
    await settle();
    show();
    await settle(4000);
    hide();
    await settle();
    expect(host.presses).toEqual([]);
    expect(host.width()).toBe(52);
  });

  it('does nothing on a page without a sidebar, or on a host it does not know', async () => {
    platform = 'grok';
    document.body.innerHTML = '<main><button aria-label="Add files, skills, and connectors"></button></main>';
    show();
    await settle(4000);
    hide();
    platform = null;
    chatgpt();
    show();
    await settle(4000);
    expect(widths.every((px) => px === 0)).toBe(true);
  });

  it('does nothing when the host has hidden its sidebar on a narrow window', async () => {
    const host = chatgpt();
    place(host.box, -259, 0, 259, 732);
    show();
    await settle(4000);
    expect(host.presses).toEqual([]);
  });

  it('does nothing when the setting is off, and reports the open sidebar so the chat keeps its room', async () => {
    const host = chatgpt();
    show(false);
    await settle();
    expect(host.presses).toEqual([]);
    expect(widths.at(-1)).toBe(259);
  });

  it('follows the setting while the panel stays open', async () => {
    const host = chatgpt();
    show(false);
    await settle();
    show(true);
    await settle();
    expect(host.presses).toEqual(['close']);
    show(false);
    await settle();
    expect(host.presses).toEqual(['close', 'open']);
  });

  it('reports the sidebar as it folds, so the panel takes the room it gives up and no more', async () => {
    platform = 'claude';
    claude();
    show();
    // Before the fold has moved, the panel is laid out beside the open sidebar.
    expect(widths.at(-1)).toBe(288);
    await settle();
    // Every width on the way down to the rail, never a guess ahead of the sidebar.
    const seen = widths.filter((px, i) => px !== widths[i - 1]);
    expect(seen).toEqual([288, 229, 170, 111, 52]);
    // Closing says nothing more: the panel fades where it stood while the sidebar unfolds.
    hide();
    await settle();
    expect(widths.at(-1)).toBe(52);
  });

  it('gives up silently when the press does not narrow the sidebar, and never presses again on this page', async () => {
    platform = 'claude';
    const host = claude();
    const toggle = document.querySelector('button')!;
    const dead = vi.fn((event: Event) => event.stopImmediatePropagation());
    toggle.addEventListener('click', dead, { capture: true });
    show();
    await settle(2000);
    expect(dead).toHaveBeenCalledTimes(1);
    expect(host.width()).toBe(288);
    // The layout is told the sidebar is still there.
    expect(widths.at(-1)).toBe(288);
    hide();
    await settle();
    show();
    await settle(4000);
    hide();
    await settle();
    expect(dead).toHaveBeenCalledTimes(1);
    expect(host.presses).toEqual([]);
  });

  it('leaves the sidebar alone once the student opens it again, however they leave it', async () => {
    platform = 'gemini';
    const host = gemini();
    show();
    await settle();
    expect(host.presses).toEqual(['fold']);
    host.set(true);
    await settle();
    expect(widths.at(-1)).toBe(288);
    // Not folded again while the panel stays open: stemLM does not fight the student.
    await settle(4000);
    expect(host.presses).toEqual(['fold']);
    // They fold it themselves: it is still theirs, and closing the panel does not open it.
    host.set(false);
    await settle();
    hide();
    await settle();
    expect(host.presses).toEqual(['fold']);
    expect(host.width()).toBe(72);
  });

  it('takes a sidebar that widens under the pointer for a peek, until the pointer has left', async () => {
    platform = 'gemini';
    const host = gemini();
    let hovered = false;
    const matches = host.box.matches.bind(host.box);
    host.box.matches = (selector: string) => (selector === ':hover' ? hovered : matches(selector));
    show();
    await settle();
    expect(widths.at(-1)).toBe(72);

    // Hovering the folded rail spreads it over the page and lets it go again: the panel does not
    // move, and the sidebar is still stemLM's to unfold.
    hovered = true;
    place(host.box, 0, 0, 288, 732);
    resized(host.box);
    expect(widths.at(-1)).toBe(72);
    hovered = false;
    place(host.box, 0, 0, 72, 732);
    resized(host.box);
    host.box.dispatchEvent(new MouseEvent('mouseleave'));
    expect(widths.at(-1)).toBe(72);
    hide();
    await settle();
    expect(host.presses).toEqual(['fold', 'unfold']);

    // Opened for good with the pointer on it: seen as open, and the student's, once the pointer leaves.
    show();
    await settle();
    hovered = true;
    host.set(true);
    await settle();
    expect(widths.at(-1)).toBe(72);
    hovered = false;
    host.box.dispatchEvent(new MouseEvent('mouseleave'));
    expect(widths.at(-1)).toBe(288);
    hide();
    await settle();
    expect(host.presses).toEqual(['fold', 'unfold', 'fold']);
  });

  it('does not open a sidebar the student already opened themselves', async () => {
    const host = chatgpt();
    show();
    await settle();
    host.set(true);
    await settle();
    hide();
    await settle();
    expect(host.presses).toEqual(['close']);
    expect(host.width()).toBe(259);
  });

  it('does not open it again when the window has become too narrow for the host to show it', async () => {
    platform = 'claude';
    const host = claude();
    show();
    await settle();
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: 700 });
    hide();
    await settle();
    expect(host.presses).toEqual(['fold']);
  });

  it('cannot loop: a resizing sidebar never causes a press', async () => {
    platform = 'gemini';
    const host = gemini();
    show();
    await settle();
    for (let i = 0; i < 40; i++) {
      resized(host.box);
      await settle(200);
    }
    // The site folds and unfolds it by itself, repeatedly.
    for (const open of [true, false, true, false]) {
      host.set(open);
      await settle();
    }
    expect(host.presses).toEqual(['fold']);
  });

  it('keeps up with the panel opening and closing faster than the sidebar animates', async () => {
    const host = chatgpt();
    show();
    hide();
    show();
    await vi.advanceTimersByTimeAsync(20);
    hide();
    show();
    await settle(4000);
    // One press at a time, each confirmed before the next: it ends folded, as the open panel wants.
    expect(host.width()).toBe(0);
    expect(host.presses.length % 2).toBe(1);
    hide();
    await settle(4000);
    expect(host.width()).toBe(259);
  });

  it('looks once more for a sidebar the page has not built yet', async () => {
    platform = 'grok';
    document.body.innerHTML = '<main></main>';
    show();
    await settle(500);
    const host = grok();
    await settle(3000);
    expect(host.presses).toEqual(['fold']);
    // And only once more.
    host.set(true);
    await settle(6000);
    expect(host.presses).toEqual(['fold']);
  });

  it('measures what shows: a sidebar clipped away by its container counts as folded', async () => {
    platform = 'claude';
    const host = claude();
    const clip = document.createElement('div');
    clip.style.overflowX = 'hidden';
    host.box.replaceWith(clip);
    clip.append(host.box);
    place(clip, 0, 0, 0, 732);
    show();
    await settle(4000);
    expect(host.presses).toEqual([]);
  });
});
