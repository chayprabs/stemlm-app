/**
 * Where the composer control sits: beside the chat's own attach button, in its row.
 *
 * That button is the one anchor. The control is drawn in stemLM's shadow root, never in the chat's
 * own tree (logged-out ChatGPT blanks its page when it meets a foreign node in its composer), and
 * is laid over the row at a place measured from the button: same height, same corner, same ink,
 * one gap to its right. Without a button that can be vouched for, the control is not shown.
 *
 * Room in the row comes from one stylesheet rule keyed on one attribute. It is kept only when a
 * hit test confirms that nothing of the chat's is left under the control and that the composer is
 * no taller for it.
 */
import type { PlatformAdapter } from '@/src/platforms/types';
import { watchComposerRoute } from '@/src/platforms/routes';
import { detectHostScheme } from '@/src/lib/theme';

/** Space between the attach button and the control. */
export const CONTROL_GAP_PX = 4;
/** Marks the one host node whose margin makes room: `after` it, or `before` what was in the way. */
export const ROOM_ATTR = 'data-stemlm-room';
export const ROOM_STYLE_ID = 'stemlm-room-style';

const MIN_SIZE_PX = 24;
const MAX_SIZE_PX = 44;
/** A full look for the button at most this often; between looks only its box is read. */
const LOCATE_EVERY_MS = 100;
/** Frames without movement before the control stops following. */
const SETTLE_FRAMES = 12;
/** How far from the editor the attach button may be and still be its own (a row of chips fits between). */
const NEIGHBOUR_PX = 96;
/** What the chat shows to be used: the control never lies over one of these. */
const HOST_UI =
  'a, button, input, textarea, select, img, svg, video, canvas, [role="button"], [role="link"], [role="menu"], [role="dialog"], [contenteditable]:not([contenteditable="false"])';

export interface ControlPlacement {
  /** The chat's own attach button. */
  anchor: HTMLElement;
  /** The control's box in the viewport: a square, `size` on a side. */
  left: number;
  top: number;
  size: number;
  /** The attach button's corner radius and ink, so the control reads as its neighbour. */
  radius: string;
  ink: string;
  scheme: 'light' | 'dark';
}

type Side = 'after' | 'before';

function isClear(color: string): boolean {
  return !color || color === 'transparent' || /^rgba\(.+,\s*0(?:\.0+)?\)$/.test(color) || /\/\s*0(?:\.0+)?%?\s*\)$/.test(color);
}

/** 0 (black) to 1 (white) for the colour forms a computed style reports; null when unreadable. */
function lightness(color: string): number | null {
  const n = (color.match(/-?\d*\.?\d+%?/g) ?? []).map((v) => (v.endsWith('%') ? parseFloat(v) / 100 : parseFloat(v)));
  if (n.length < 3) return null;
  if (/^rgba?\(/.test(color)) return (0.2126 * n[0]! + 0.7152 * n[1]! + 0.0722 * n[2]!) / 255;
  if (/^color\(srgb/.test(color)) return 0.2126 * n[0]! + 0.7152 * n[1]! + 0.0722 * n[2]!;
  if (/^okl(?:ab|ch)\(/.test(color)) return n[0]!;
  if (/^l(?:ab|ch)\(/.test(color)) return n[0]! / (color.includes('%') ? 1 : 100);
  return null;
}

/** The chat's own elements at a point, topmost first: stemLM's shadow host is not one of them. */
function hostElementsAt(x: number, y: number): Element[] {
  const stack = typeof document.elementsFromPoint === 'function' ? document.elementsFromPoint(x, y) : [];
  return stack.filter((el) => el.tagName !== 'STEMLM-ROOT');
}

/** True when the chat shows the button itself at its centre: no dialog, backdrop or overlay over it. */
function isUncovered(button: HTMLElement, b: DOMRect): boolean {
  const top = hostElementsAt(b.left + b.width / 2, b.top + b.height / 2)[0];
  return top != null && (top === button || button.contains(top) || top.contains(button));
}

/** True when `el` shows something at the point: a control, an editor, a fill, or its own text. */
function paintsAt(el: Element, x: number, y: number): boolean {
  if (el.closest(HOST_UI)) return true;
  try {
    const cs = getComputedStyle(el);
    if (!isClear(cs.backgroundColor) || (cs.backgroundImage && cs.backgroundImage !== 'none') || (cs.boxShadow && cs.boxShadow !== 'none')) return true;
  } catch {
    return true;
  }
  for (const node of el.childNodes) {
    if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue;
    const range = document.createRange();
    range.selectNodeContents(node);
    for (const r of range.getClientRects()) {
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return true;
    }
  }
  return false;
}

/** Nothing of the chat's is at the point above the composer's own surface. */
function pointIsFree(button: HTMLElement, x: number, y: number): boolean {
  const stack = hostElementsAt(x, y);
  // No answer (outside the window, or no layout to ask): the spot cannot be vouched for.
  if (!stack.length) return false;
  for (const el of stack) {
    if (el === button || button.contains(el)) return false;
    // A wrapper around the button is the row or the composer itself.
    if (el.contains(button)) return true;
    if (paintsAt(el, x, y)) return false;
  }
  return true;
}

function controlSize(b: DOMRect): number {
  return Math.min(MAX_SIZE_PX, Math.max(MIN_SIZE_PX, Math.round(b.height)));
}

function slotOf(b: DOMRect, rtl: boolean): { left: number; top: number; size: number } {
  const size = controlSize(b);
  return {
    left: rtl ? b.left - CONTROL_GAP_PX - size : b.right + CONTROL_GAP_PX,
    top: b.top + (b.height - size) / 2,
    size,
  };
}

function slotIsFree(button: HTMLElement, rtl: boolean): boolean {
  const { left, top, size } = slotOf(button.getBoundingClientRect(), rtl);
  const edge = 3;
  const midX = left + size / 2;
  const midY = top + size / 2;
  return [left + edge, midX, left + size - edge].every((x) => pointIsFree(button, x, midY)) &&
    pointIsFree(button, midX, top + edge) && pointIsFree(button, midX, top + size - edge);
}

/** The nearest box around `el`: a `display: contents` wrapper has none of its own. */
function boxAround(el: HTMLElement): DOMRect {
  let node: HTMLElement | null = el;
  let r = node.getBoundingClientRect();
  while (!r.width && !r.height && node.parentElement) {
    node = node.parentElement;
    r = node.getBoundingClientRect();
  }
  return r;
}

function setRoomRule(px: number): void {
  const css = `[${ROOM_ATTR}="after"]{margin-inline-end:${px}px!important}[${ROOM_ATTR}="before"]{margin-inline-start:${px}px!important}`;
  let style = document.getElementById(ROOM_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = ROOM_STYLE_ID;
    (document.head ?? document.documentElement).appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
}

/** Attributes only: the stylesheet stays, so clearing is not a change to the page's tree. */
export function clearComposerRoom(): void {
  for (const el of document.querySelectorAll(`[${ROOM_ATTR}]`)) el.removeAttribute(ROOM_ATTR);
}

/** Everything stemLM added to the chat page for the control. */
export function removeComposerRoom(): void {
  clearComposerRoom();
  document.getElementById(ROOM_STYLE_ID)?.remove();
}

/**
 * The nodes whose margin could open the slot, nearest first: the button and the wrappers that are
 * only its own cell (a margin inside a fixed grid track moves nothing, so the cell is next), then
 * whatever sits in the slot, pushed from its own side (a button laid out of the row's flow).
 */
function* roomTargets(button: HTMLElement, root: HTMLElement, rtl: boolean): Generator<[HTMLElement, Side]> {
  const b = button.getBoundingClientRect();
  let el: HTMLElement | null = button;
  for (let hops = 0; el && el !== root && hops < 6; hops++, el = el.parentElement) {
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) continue;
    if (r.width > b.width + 24) break;
    yield [el, 'after'];
  }
  const { left, top, size } = slotOf(b, rtl);
  let occupant = hostElementsAt(left + size / 2, top + size / 2)[0] as HTMLElement | undefined;
  if (!occupant || occupant.contains(button) || !root.contains(occupant)) return;
  while (occupant.parentElement && !occupant.parentElement.contains(button)) occupant = occupant.parentElement;
  yield [occupant, 'before'];
}

/** One line of the draft, in px: what a draft may grow by when its column gets narrower. */
function draftLine(editor: HTMLElement): number {
  const draft = editor instanceof HTMLTextAreaElement ? editor.value : (editor.textContent ?? '');
  if (!draft.trim()) return 0;
  const style = getComputedStyle(editor);
  return parseFloat(style.lineHeight) || (parseFloat(style.fontSize) || 16) * 1.5;
}

/**
 * Make sure the slot beside the button is empty, moving the row's own content aside if it is not.
 * An empty composer must stay exactly as tall as it was; one holding a draft may wrap that draft a
 * line earlier, and no more.
 */
function ensureRoom(button: HTMLElement, root: HTMLElement, editor: HTMLElement, rtl: boolean): boolean {
  if (slotIsFree(button, rtl)) return true;
  clearComposerRoom();
  const height = boxAround(root).height;
  const grow = draftLine(editor) + 1;
  const need = controlSize(button.getBoundingClientRect()) + CONTROL_GAP_PX;
  for (const [target, side] of roomTargets(button, root, rtl)) {
    const own = parseFloat(getComputedStyle(target)[side === 'after' ? 'marginInlineEnd' : 'marginInlineStart']) || 0;
    setRoomRule(own + need);
    target.setAttribute(ROOM_ATTR, side);
    if (slotIsFree(button, rtl) && Math.abs(boxAround(root).height - height) < grow) return true;
    target.removeAttribute(ROOM_ATTR);
  }
  return false;
}

function placementFor(button: HTMLElement, rtl: boolean): ControlPlacement {
  const style = getComputedStyle(button);
  const ink = getComputedStyle(button.querySelector('svg') ?? button).color;
  const light = lightness(ink);
  const radius = style.borderTopLeftRadius;
  return {
    anchor: button,
    ...slotOf(button.getBoundingClientRect(), rtl),
    radius: !radius || parseFloat(radius) === 0 ? '8px' : radius,
    ink: isClear(ink) ? '' : ink,
    // Light ink means a dark composer, whatever the rest of the page is doing.
    scheme: light == null || isClear(ink) ? detectHostScheme() : light > 0.5 ? 'dark' : 'light',
  };
}

/**
 * The control's place now, `'covered'` while something of the chat's lies over the attach button
 * (the room is kept, so the row does not jump when a menu opens), or null when there is no
 * composer to trust: no editor or attach button, no layout, out of view, no room in the row.
 */
export function locateControl(adapter: PlatformAdapter): ControlPlacement | 'covered' | null {
  const editor = adapter.findEditor();
  const button = adapter.getComposerLeadingAnchor();
  const root = adapter.getComposerRoot?.();
  if (!editor || !button || !root) return null;
  const b = button.getBoundingClientRect();
  const e = editor.getBoundingClientRect();
  if (b.width < 16 || b.height < 16 || b.height > 64 || !e.width || !e.height) return null;
  if (b.bottom <= 0 || b.right <= 0 || b.top >= window.innerHeight || b.left >= window.innerWidth) return null;
  // The attach button is the editor's neighbour: beside it, or in the row above or under it. A
  // button further off only shares the page with it, and an editor nearly as tall as the window
  // is a document (a canvas), not a composer.
  const apart = Math.max(b.left - e.right, e.left - b.right, b.top - e.bottom, e.top - b.bottom);
  if (apart > NEIGHBOUR_PX || e.height > window.innerHeight * 0.85) return null;
  if (!isUncovered(button, b)) return 'covered';
  const rtl = getComputedStyle(button).direction === 'rtl';
  if (!ensureRoom(button, root, editor, rtl)) return null;
  const placement = placementFor(button, rtl);
  // Beside the button but past the composer's edge is not in its row.
  const box = boxAround(root);
  const inRow = placement.left >= box.left - 1 && placement.left + placement.size <= box.right + 1 &&
    placement.top >= box.top - 1 && placement.top + placement.size <= box.bottom + 1;
  return inRow ? placement : null;
}

/**
 * A change stemLM itself made to the chat page and still stands: its room mark where it put it,
 * or its one stylesheet. Not news about the page, so it must not start another look (a mark the
 * chat took off again is news).
 */
function isOwnWrite(record: MutationRecord): boolean {
  if (record.type === 'attributes') {
    return record.attributeName === ROOM_ATTR && (record.target as Element).hasAttribute(ROOM_ATTR);
  }
  const style = document.getElementById(ROOM_STYLE_ID);
  return style !== null && (record.target === style || [...record.addedNodes].includes(style));
}

function sameBox(a: ControlPlacement | null, b: ControlPlacement | null): boolean {
  if (!a || !b) return a === b;
  return a.anchor === b.anchor && a.left === b.left && a.top === b.top && a.size === b.size &&
    a.radius === b.radius && a.ink === b.ink && a.scheme === b.scheme;
}

/**
 * Keep the control on its anchor. `show` gets the place whenever it changes and null when the
 * control must not be shown. Every change of the page wakes a frame loop that follows the button
 * until it has stood still for a few frames, then stops: nothing runs on a page at rest.
 */
export function trackComposerControl(
  adapter: PlatformAdapter,
  enabled: () => boolean,
  show: (placement: ControlPlacement | null) => void,
): () => void {
  let frame = 0;
  let dirty = true;
  let calm = 0;
  let nextLocate = 0;
  let found: ControlPlacement | 'covered' | null = null;
  let shown: ControlPlacement | null = null;
  let watched: Element[] = [];

  /** `look`: free to search the page and make room, which a pass inside a resize report is not. */
  const tick = (look = true) => {
    frame = 0;
    const now = performance.now();
    const anchor = typeof found === 'object' ? found?.anchor : undefined;
    if (!enabled()) {
      found = null;
      dirty = false;
    } else if (look && ((dirty && now >= nextLocate) || (anchor && !anchor.isConnected))) {
      // A host re-render took the button away: find its replacement in this same frame.
      dirty = false;
      nextLocate = now + LOCATE_EVERY_MS;
      found = locateControl(adapter);
    } else if (anchor?.isConnected) {
      found = placementFor(anchor, getComputedStyle(anchor).direction === 'rtl');
    }
    if (found === null) clearComposerRoom();

    const placement = typeof found === 'object' ? found : null;
    if (placement?.anchor !== watched[0]) {
      for (const el of watched) sizes.unobserve(el);
      const root = placement && adapter.getComposerRoot?.();
      watched = placement ? [placement.anchor, ...(root ? [root] : [])] : [];
      for (const el of watched) sizes.observe(el);
    }
    if (sameBox(placement, shown)) {
      calm += 1;
    } else {
      calm = 0;
      shown = placement;
      show(placement);
    }
    if (dirty || calm < SETTLE_FRAMES) frame = requestAnimationFrame(() => tick());
  };

  const wake = () => {
    dirty = true;
    calm = 0;
    if (!frame) frame = requestAnimationFrame(() => tick());
  };
  /** A resize is reported after layout and before paint: move with it now, look again next frame. */
  const follow = () => {
    dirty = true;
    calm = 0;
    cancelAnimationFrame(frame);
    tick(false);
  };

  const mutations = new MutationObserver((records) => {
    if (records.some((record) => !isOwnWrite(record))) wake();
  });
  const sizes = new ResizeObserver(follow);
  mutations.observe(document.documentElement, { childList: true, subtree: true, attributes: true });
  sizes.observe(document.documentElement);

  const stops: Array<() => void> = [watchComposerRoute(wake)];
  const listen = (target: EventTarget | null | undefined, types: string[], capture = false) => {
    for (const type of types) {
      target?.addEventListener(type, wake, { capture, passive: true });
      stops.push(() => target?.removeEventListener(type, wake, { capture }));
    }
  };
  listen(window, ['resize']);
  listen(window, ['scroll'], true);
  listen(window.visualViewport, ['resize', 'scroll']);
  listen(document, ['transitionrun', 'transitionstart', 'transitionend', 'transitioncancel', 'animationstart', 'animationend'], true);
  wake();

  return () => {
    cancelAnimationFrame(frame);
    mutations.disconnect();
    sizes.disconnect();
    for (const stop of stops) stop();
    removeComposerRoom();
  };
}
