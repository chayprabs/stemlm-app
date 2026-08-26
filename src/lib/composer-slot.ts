/**
 * Light-DOM slot for docking the stemLM inject control immediately to the
 * left of the host + / attach button — or just outside the composer shell
 * when in-row placement would overlap an out-of-flow host control.
 */
import type { PlatformAdapter } from '@/src/platforms/types';
import { FONT_SANS } from '@/src/lib/fonts';

const SLOT_ATTR = 'data-stemlm-composer-slot';
export const COMPOSER_SLOT_SELECTOR = `[${SLOT_ATTR}]`;
const PARENT_ATTR = 'data-stemlm-composer-row';
const HOST_ATTR = 'data-stemlm-composer-host';
export const COMPOSER_SLOT_STYLE_ID = 'stemlm-composer-slot-styles';
const SLOT_GAP_PX = 8;
export const INJECT_SIGNAL = '#ff6b2c';
export const INJECT_SIZE_PX = 32;
export const INJECT_RADIUS = '9px';

const UNFLEXABLE = new Set(['BODY', 'HTML', 'MAIN', 'FORM', 'FIELDSET']);

const POINTER_EVENTS = [
  'pointerdown',
  'pointerup',
  'mousedown',
  'mouseup',
  'click',
  'touchstart',
  'touchend',
  'auxclick',
  'contextmenu',
] as const;

const SLOT_CSS = `
[data-stemlm-composer-slot] {
  display: inline-flex;
  flex-shrink: 0;
  align-self: center;
  margin-right: ${SLOT_GAP_PX}px;
  position: relative;
  z-index: 50;
  font-family: ${FONT_SANS};
  pointer-events: auto;
  isolation: isolate;
  box-sizing: border-box;
  vertical-align: middle;
}
[data-stemlm-composer-slot][data-dock="outside-shell"],
[data-stemlm-composer-slot][data-dock="fixed"] {
  position: fixed;
  z-index: 2147483640;
  margin-right: 0;
}
[data-stemlm-composer-slot] .slm-fab-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}
[data-stemlm-composer-slot] .slm-inject-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--slm-inject-size, ${INJECT_SIZE_PX}px);
  height: var(--slm-inject-size, ${INJECT_SIZE_PX}px);
  padding: 0;
  border: 1.5px solid ${INJECT_SIGNAL};
  border-radius: ${INJECT_RADIUS};
  background: transparent;
  color: ${INJECT_SIGNAL};
  cursor: pointer;
  box-sizing: border-box;
  overflow: visible;
  touch-action: manipulation;
  transition: background 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    border-color 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    color 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.16s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
[data-stemlm-composer-slot] .slm-inject-btn:hover {
  background: rgba(255, 107, 44, 0.12);
}
[data-stemlm-composer-slot] .slm-inject-btn:active {
  transform: scale(0.94);
}
[data-stemlm-composer-slot] .slm-inject-btn.is-attached,
[data-stemlm-composer-slot] .slm-inject-btn.is-panel-open {
  border-color: ${INJECT_SIGNAL};
  color: ${INJECT_SIGNAL};
  background: rgba(255, 107, 44, 0.16);
}
[data-stemlm-composer-slot] .slm-inject-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: var(--slm-inject-size, ${INJECT_SIZE_PX}px);
  height: var(--slm-inject-size, ${INJECT_SIZE_PX}px);
  color: ${INJECT_SIGNAL};
}
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="dark"] .slm-inject-btn {
  background: rgba(20, 20, 20, 0.72);
  border-color: ${INJECT_SIGNAL};
  color: ${INJECT_SIGNAL};
}
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="dark"] .slm-inject-btn:hover,
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="dark"] .slm-inject-btn.is-attached,
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="dark"] .slm-inject-btn.is-panel-open {
  background: rgba(255, 107, 44, 0.18);
}
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="light"] .slm-inject-btn {
  background: rgba(255, 255, 255, 0.94);
  border-color: ${INJECT_SIGNAL};
  color: ${INJECT_SIGNAL};
}
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="light"] .slm-inject-btn:hover,
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="light"] .slm-inject-btn.is-attached,
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="light"] .slm-inject-btn.is-panel-open {
  background: rgba(255, 107, 44, 0.12);
}
[data-stemlm-composer-slot] .slm-inject-glyph {
  position: relative;
  display: block;
  width: 16px;
  height: 16px;
}
[data-stemlm-composer-slot] .slm-inject-glyph svg {
  position: absolute;
  inset: 0;
  width: 16px;
  height: 16px;
  display: block;
  transition: opacity 0.22s cubic-bezier(0.22, 1, 0.36, 1),
    transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
}
[data-stemlm-composer-slot] .slm-inject-plus {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}
[data-stemlm-composer-slot] .slm-inject-tick {
  opacity: 0;
  transform: rotate(-45deg) scale(0.4);
}
[data-stemlm-composer-slot] .slm-inject-btn.is-attached .slm-inject-plus,
[data-stemlm-composer-slot] .slm-inject-btn.is-panel-open .slm-inject-plus {
  opacity: 0;
  transform: rotate(90deg) scale(0.4);
}
[data-stemlm-composer-slot] .slm-inject-btn.is-attached .slm-inject-tick,
[data-stemlm-composer-slot] .slm-inject-btn.is-panel-open .slm-inject-tick {
  opacity: 1;
  transform: rotate(0deg) scale(1);
}
[data-stemlm-composer-row] {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
}
[data-stemlm-composer-host] {
  position: relative;
}
@media (prefers-reduced-motion: reduce) {
  [data-stemlm-composer-slot] .slm-inject-btn,
  [data-stemlm-composer-slot] .slm-inject-glyph svg {
    transition: none !important;
  }
  [data-stemlm-composer-slot] .slm-inject-btn:active {
    transform: none;
  }
}
`;

function ensureStyles() {
  let style = document.getElementById(COMPOSER_SLOT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = COMPOSER_SLOT_STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== SLOT_CSS) style.textContent = SLOT_CSS;
}

function ensureFlexRow(parent: HTMLElement) {
  if (UNFLEXABLE.has(parent.tagName)) return;
  const display = getComputedStyle(parent).display;
  if (
    display === 'flex' ||
    display === 'inline-flex' ||
    display === 'grid' ||
    display === 'inline-grid'
  ) {
    return;
  }
  parent.setAttribute(PARENT_ATTR, '');
}

function isOutOfFlow(el: HTMLElement): boolean {
  try {
    const pos = getComputedStyle(el).position;
    return pos === 'absolute' || pos === 'fixed';
  } catch {
    return false;
  }
}

function isHorizontalCluster(parent: HTMLElement): boolean {
  try {
    const display = getComputedStyle(parent).display;
    if (display === 'flex' || display === 'inline-flex') {
      const dir = getComputedStyle(parent).flexDirection;
      return dir === 'row' || dir === 'row-reverse' || dir === 'initial' || dir === '';
    }
    if (display === 'grid' || display === 'inline-grid') return true;
  } catch {
    /* ignore */
  }
  return false;
}

function rectsOverlap(a: DOMRect, b: DOMRect, min = 6): boolean {
  if ((a.width === 0 && a.height === 0) || (b.width === 0 && b.height === 0)) return false;
  const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
  const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
  return x >= min && y >= min;
}

function parentIsSafeRow(parent: HTMLElement): boolean {
  if (UNFLEXABLE.has(parent.tagName)) return false;
  return isHorizontalCluster(parent) || parent.childElementCount <= 8;
}

/** True when in-row insertBefore(leading) will actually make room. */
export function canDockBeforePlus(leading: HTMLElement): boolean {
  if (!leading.isConnected) return false;
  if (isOutOfFlow(leading)) return false;
  const parent = leading.parentElement;
  if (!parent) return false;
  if (!parentIsSafeRow(parent) && !isHorizontalCluster(parent)) return false;
  return true;
}

/** One persistent slot node — moving it in the DOM keeps the React portal stable. */
let sharedSlot: HTMLElement | null = null;
let slotIsolation: (() => void) | null = null;

function getSharedSlot(): HTMLElement {
  if (!sharedSlot) {
    sharedSlot = document.createElement('div');
    sharedSlot.setAttribute(SLOT_ATTR, '');
    slotIsolation = isolateStemLmPointer(sharedSlot);
  }
  return sharedSlot;
}

function isInsideComposerSlot(el: Element | null): boolean {
  return !!el?.closest(COMPOSER_SLOT_SELECTOR);
}

function mountViewportSlot(): HTMLElement {
  const slot = getSharedSlot();
  ensureStyles();
  if (slot.parentElement !== document.documentElement) {
    document.documentElement.appendChild(slot);
  }
  slot.style.position = 'fixed';
  slot.style.zIndex = '2147483640';
  slot.style.marginRight = '0';
  if (!slot.style.top) slot.style.top = '-999px';
  if (!slot.style.left) slot.style.left = '-999px';
  return slot;
}

const OPEN_FRAME_TAGS = new Set(['BODY', 'HTML', 'MAIN']);

function isUsableComposerFrame(el: HTMLElement | null): el is HTMLElement {
  return !!el?.isConnected && !OPEN_FRAME_TAGS.has(el.tagName);
}

function frameRect(el: HTMLElement): { width: number; height: number } {
  try {
    const r = el.getBoundingClientRect();
    return { width: r.width, height: r.height };
  } catch {
    return { width: 0, height: 0 };
  }
}

function pickComposerFrame(
  candidates: HTMLElement[],
  editor: HTMLElement | null,
  leading: HTMLElement | null,
): HTMLElement | null {
  const usable = candidates.filter((el) => {
    if (!isUsableComposerFrame(el)) return false;
    if (el === editor || el === leading) return false;
    if (editor?.isConnected && !el.contains(editor)) return false;
    return true;
  });
  if (!usable.length) return null;
  const vw = window.innerWidth || 1200;
  const vh = window.innerHeight || 800;
  const scored = usable.map((el) => {
    const { width, height } = frameRect(el);
    return {
      el,
      area: width * height,
      real: width > 0 && height > 0,
      tooOpen: width > vw * 0.92 && height > vh * 0.45,
      hasLeading: !!(leading?.isConnected && el.contains(leading) && el !== leading),
    };
  });
  if (!scored.some((s) => s.real)) return usable[0] ?? null;
  const compact = scored.filter((s) => s.real && !s.tooOpen);
  const compactWithLeading = leading?.isConnected ? compact.filter((s) => s.hasLeading) : compact;
  const pool = compactWithLeading.length
    ? compactWithLeading
    : compact.length
      ? compact
      : scored.filter((s) => s.real);
  pool.sort((a, b) => a.area - b.area);
  return pool[0]?.el ?? usable[0] ?? null;
}

/**
 * Tight visual composer box: smallest compact ancestor of the editor that
 * also contains the host +, otherwise the declared shell. Oversized page
 * wrappers (common ancestor of a stray + and the editor) are skipped so
 * outside-shell docking stays next to the rounded pill.
 */
export function resolveComposerFrame(adapter: PlatformAdapter): HTMLElement | null {
  const editor = adapter.findEditor();
  const leading = adapter.getComposerLeadingAnchor();
  const shell = adapter.getComposerShell();
  const box = adapter.getComposerBox();
  const candidates: HTMLElement[] = [];

  if (editor?.isConnected && leading?.isConnected) {
    let node: HTMLElement | null = editor.parentElement;
    while (node && !OPEN_FRAME_TAGS.has(node.tagName)) {
      if (node.contains(leading) && node !== leading) {
        candidates.push(node);
        break;
      }
      node = node.parentElement;
    }
  }

  if (isUsableComposerFrame(shell)) candidates.push(shell);
  if (isUsableComposerFrame(box)) candidates.push(box);
  if (editor?.parentElement && isUsableComposerFrame(editor.parentElement)) {
    candidates.push(editor.parentElement);
  }
  return pickComposerFrame(candidates, editor, leading);
}

function clamp(v: number, min: number, max: number) {
  return Math.min(max, Math.max(min, v));
}

export type FrameRect = Pick<DOMRect, 'top' | 'left' | 'right' | 'bottom' | 'width' | 'height'>;

/**
 * Place the inject control just left of the composer when there is room;
 * otherwise sit immediately above (then below) so a narrow viewport cannot
 * pin the button on top of the pill.
 */
export function outsideShellCoords(box: FrameRect, align: FrameRect, size: number): {
  top: number;
  left: number;
} {
  const vw = window.innerWidth || 1200;
  const vh = window.innerHeight || 800;
  const maxTop = Math.max(8, vh - size - 8);
  const maxLeft = Math.max(8, vw - size - 8);
  const desiredLeft = box.left - size - SLOT_GAP_PX;
  const alignedTop = align.top + (align.height - size) / 2;
  if (desiredLeft >= 8) {
    return { top: clamp(alignedTop, 8, maxTop), left: clamp(desiredLeft, 8, maxLeft) };
  }
  const aboveTop = box.top - size - SLOT_GAP_PX;
  if (box.top > vh * 0.72 && aboveTop >= 8) {
    return { top: clamp(aboveTop, 8, maxTop), left: clamp(box.left, 8, maxLeft) };
  }
  return { top: clamp(alignedTop, 8, maxTop), left: 8 };
}

function mountSlotBefore(anchor: HTMLElement, opts?: { flex?: boolean }): HTMLElement | null {
  if (!anchor.isConnected) return null;
  if (isInsideComposerSlot(anchor)) {
    const slot = getSharedSlot();
    return slot.isConnected ? slot : null;
  }

  const parent = anchor.parentElement;
  if (!parent) return null;

  const slot = getSharedSlot();
  if (slot === anchor || slot.contains(anchor) || slot.contains(parent) || parent === slot) {
    return slot.isConnected ? slot : null;
  }

  if (opts?.flex !== false) ensureFlexRow(parent);
  ensureStyles();

  if (slot.parentElement !== parent || slot.nextElementSibling !== anchor) {
    parent.insertBefore(slot, anchor);
  }
  return slot.isConnected ? slot : null;
}

function sizeFromLeading(leading: HTMLElement | null): number {
  const h = leading?.isConnected ? leading.getBoundingClientRect().height : 0;
  if (h >= 26 && h <= 44) return Math.round(h);
  return INJECT_SIZE_PX;
}

export function syncComposerSlotGeometry(adapter: PlatformAdapter): void {
  const slot = sharedSlot;
  if (!slot?.isConnected) return;
  const leading = adapter.getComposerLeadingAnchor();
  const frame = resolveComposerFrame(adapter);
  const shell = adapter.getComposerShell();
  const size = sizeFromLeading(leading);
  slot.style.setProperty('--slm-inject-size', `${size}px`);

  if (slot.dataset.dock === 'before-plus') {
    slot.style.position = '';
    slot.style.top = '';
    slot.style.left = '';
    return;
  }

  const viewportParent =
    slot.parentElement === document.documentElement || slot.parentElement === document.body;

  if (!viewportParent && slot.dataset.dock === 'outside-shell') {
    const parent = slot.parentElement;
    let parentDisplay = '';
    let dir = '';
    try {
      if (parent) {
        const cs = getComputedStyle(parent);
        parentDisplay = cs.display;
        dir = cs.flexDirection;
      }
    } catch {
      /* ignore */
    }
    const rowDir = dir === 'row' || dir === 'row-reverse' || dir === 'initial' || dir === '';
    const inFlowRow =
      parent != null &&
      !UNFLEXABLE.has(parent.tagName) &&
      (parentDisplay === 'flex' || parentDisplay === 'inline-flex') &&
      rowDir &&
      slot.nextElementSibling === (shell ?? frame);
    if (inFlowRow) {
      slot.style.position = '';
      slot.style.top = '';
      slot.style.left = '';
      return;
    }
  }

  const box = frame ?? shell ?? leading;
  const vh = window.innerHeight || 800;
  const applyFixed = (top: number, left: number) => {
    slot.dataset.dock = slot.dataset.dock === 'outside-shell' ? 'outside-shell' : 'fixed';
    slot.style.position = 'fixed';
    slot.style.top = `${top}px`;
    slot.style.left = `${left}px`;
    slot.style.zIndex = '2147483640';
    slot.style.marginRight = '0';
  };

  if (!box?.isConnected) {
    applyFixed(clamp(vh - size - 72, 8, Math.max(8, vh - size - 8)), 24);
    return;
  }

  const boxR = box.getBoundingClientRect();
  const alignR =
    leading?.isConnected && box.contains(leading) ? leading.getBoundingClientRect() : boxR;
  if (boxR.width === 0 && boxR.height === 0 && alignR.width === 0 && alignR.height === 0) {
    applyFixed(clamp(vh - size - 72, 8, Math.max(8, vh - size - 8)), 24);
    return;
  }

  const next = outsideShellCoords(boxR, alignR, size);
  applyFixed(next.top, next.left);
}

export function ensureComposerSlot(
  adapter: PlatformAdapter,
  scheme: 'light' | 'dark' = 'light',
): HTMLElement | null {
  const leading = adapter.getComposerLeadingAnchor();
  const shell = adapter.getComposerShell();
  let slot: HTMLElement | null = null;
  let dock: 'before-plus' | 'outside-shell' | 'fixed' = 'fixed';

  const forceOutside = adapter.composerDock === 'outside-shell';
  const preferBeforePlus = !forceOutside && leading != null && canDockBeforePlus(leading);

  if (leading && preferBeforePlus) {
    slot = mountSlotBefore(leading);
    if (slot) dock = 'before-plus';
  }

  if (forceOutside) {
    slot = mountViewportSlot();
    dock = 'outside-shell';
  }

  if (!slot && shell?.parentElement) {
    slot = mountSlotBefore(shell, { flex: !UNFLEXABLE.has(shell.parentElement.tagName) });
    if (slot) dock = 'outside-shell';
  }

  if (!slot) {
    const slotNode = getSharedSlot();
    ensureStyles();
    if (!slotNode.isConnected) document.documentElement.appendChild(slotNode);
    slot = slotNode;
    dock = 'fixed';
  }

  if (!slot?.isConnected) return null;

  slot.dataset.scheme = scheme;
  slot.dataset.neutral = adapter.brand.neutral ? 'true' : 'false';
  slot.dataset.dock = dock;

  if (leading && dock === 'before-plus') {
    const sr = slot.getBoundingClientRect();
    const lr = leading.getBoundingClientRect();
    if (rectsOverlap(sr, lr) || slot.contains(leading)) {
      if (shell?.parentElement) {
        const moved = mountSlotBefore(shell, { flex: !UNFLEXABLE.has(shell.parentElement.tagName) });
        if (moved) {
          slot = moved;
          slot.dataset.dock = 'outside-shell';
          dock = 'outside-shell';
        }
      }
    }
  }

  syncComposerSlotGeometry(adapter);
  return slot;
}

/**
 * Stop pointer events on the inject control from reaching host ancestors
 * (Gemini attach menu, etc.). Slot uses bubble so the inner button still
 * receives the event; the wrap uses capture + onActivate.
 */
export function isolateStemLmPointer(
  el: EventTarget,
  onActivate?: () => void,
  capture = false,
): () => void {
  const stop = (e: Event) => {
    e.stopPropagation();
    if (capture) e.stopImmediatePropagation();
  };
  const onClick = (e: Event) => {
    e.stopPropagation();
    if (capture) e.stopImmediatePropagation();
    onActivate?.();
  };
  for (const type of POINTER_EVENTS) {
    const handler = type === 'click' && onActivate ? onClick : stop;
    el.addEventListener(type, handler, capture);
  }
  return () => {
    for (const type of POINTER_EVENTS) {
      const handler = type === 'click' && onActivate ? onClick : stop;
      el.removeEventListener(type, handler, capture);
    }
  };
}

export function removeComposerSlot() {
  slotIsolation?.();
  slotIsolation = null;
  sharedSlot?.remove();
  sharedSlot = null;
  document.getElementById(COMPOSER_SLOT_STYLE_ID)?.remove();
  document.querySelectorAll(`[${PARENT_ATTR}]`).forEach((el) => {
    el.removeAttribute(PARENT_ATTR);
  });
  document.querySelectorAll(`[${HOST_ATTR}]`).forEach((el) => {
    el.removeAttribute(HOST_ATTR);
  });
}

/** Test hook — returns the singleton slot element if allocated. */
export function getComposerSlotElement(): HTMLElement | null {
  return sharedSlot;
}

export const _composerSlotGap = SLOT_GAP_PX;
export const _slotCss = SLOT_CSS;
