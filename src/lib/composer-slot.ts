/**
 * Light-DOM slot for docking the stemLM inject control immediately to the
 * left of the host + / attach button — or just outside the composer shell
 * when in-row placement would overlap an out-of-flow host control.
 */
import type { PlatformAdapter } from '@/src/platforms/types';
import { FONT_SANS } from '@/src/lib/fonts';
import { INJECT_RADIUS, INJECT_SIGNAL, INJECT_SIZE_PX, injectControlCss } from '@/src/lib/inject-control-css';

export { INJECT_RADIUS, INJECT_SIGNAL, INJECT_SIZE_PX };

const SLOT_ATTR = 'data-stemlm-composer-slot';
export const COMPOSER_SLOT_SELECTOR = `[${SLOT_ATTR}]`;
const PARENT_ATTR = 'data-stemlm-composer-row';
const HOST_ATTR = 'data-stemlm-composer-host';
/** Marks the host node an inset dock shifts right to make room for the control. */
export const ROOM_ATTR = 'data-stemlm-composer-room';
export const COMPOSER_SLOT_STYLE_ID = 'stemlm-composer-slot-styles';
const COMPOSER_ROOM_STYLE_ID = 'stemlm-composer-room-styles';
const SLOT_GAP_PX = 8;

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
[data-stemlm-composer-slot][data-dock="inset"],
[data-stemlm-composer-slot][data-dock="above"],
[data-stemlm-composer-slot][data-dock="fixed"] {
  position: fixed;
  z-index: 2147483640;
  margin-right: 0;
}
[data-stemlm-composer-row] {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
}
[data-stemlm-composer-host] {
  position: relative;
}
${injectControlCss('[data-stemlm-composer-slot] ', (scheme) => `[data-stemlm-composer-slot][data-scheme="${scheme}"]`)}
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

/** Shift `target` right by one control plus gap, by stylesheet only: the host tree gains no node. */
function markRoom(target: HTMLElement, size: number) {
  const css = `[${ROOM_ATTR}]{margin-left:${size + SLOT_GAP_PX}px!important}`;
  let style = document.getElementById(COMPOSER_ROOM_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = COMPOSER_ROOM_STYLE_ID;
    document.head.appendChild(style);
  }
  if (style.textContent !== css) style.textContent = css;
  document.querySelectorAll(`[${ROOM_ATTR}]`).forEach((el) => {
    if (el !== target) el.removeAttribute(ROOM_ATTR);
  });
  if (!target.hasAttribute(ROOM_ATTR)) target.setAttribute(ROOM_ATTR, '');
}

/** Attributes only: removing the stylesheet would be a childList mutation, which re-runs the dock. */
function clearRoom() {
  document.querySelectorAll(`[${ROOM_ATTR}]`).forEach((el) => el.removeAttribute(ROOM_ATTR));
}

/**
 * True when the shifted + now touches another composer control or pushes one past the frame:
 * the row had no spare width for the inset control (ChatGPT beside an open panel).
 */
function roomCrowdsRow(leading: HTMLElement, frame: HTMLElement): boolean {
  const lr = leading.getBoundingClientRect();
  const fr = frame.getBoundingClientRect();
  for (const el of frame.querySelectorAll<HTMLElement>('button, [role="button"]')) {
    if (el === leading || el.contains(leading) || leading.contains(el) || el.closest(COMPOSER_SLOT_SELECTOR)) continue;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    if (r.right > fr.right + 1) return true;
    const x = Math.min(r.right, lr.right) - Math.max(r.left, lr.left);
    const y = Math.min(r.bottom, lr.bottom) - Math.max(r.top, lr.top);
    if (x > 1 && y > 1) return true;
  }
  return false;
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

/**
 * The node an in-row dock goes before: the leading control, or the wrappers around it that cannot
 * take a sibling. A `display: contents` wrapper (ChatGPT's tooltip trigger around its +) has no box,
 * and a slot inside it would send the control's hover and focus through that trigger. A grid cell
 * (logged-out ChatGPT's one-column + field) would push the + onto a second row, where it is clipped.
 */
function beforePlusTarget(leading: HTMLElement): HTMLElement {
  let target = leading;
  for (let parent = target.parentElement; parent && !UNFLEXABLE.has(parent.tagName); parent = target.parentElement) {
    let display = '';
    try {
      display = getComputedStyle(parent).display;
    } catch {
      break;
    }
    if (display !== 'contents' && display !== 'grid' && display !== 'inline-grid') break;
    target = parent;
  }
  return target;
}

/** The box an inset dock shifts: the in-row target, or what a `display: contents` target shows. */
function roomTarget(leading: HTMLElement): HTMLElement {
  let target = beforePlusTarget(leading);
  while (target !== leading && target.firstElementChild instanceof HTMLElement) {
    try {
      if (getComputedStyle(target).display !== 'contents') break;
    } catch {
      break;
    }
    target = target.firstElementChild;
  }
  return target;
}

/** True when in-row insertBefore(leading) will actually make room. */
export function canDockBeforePlus(leading: HTMLElement): boolean {
  if (!leading.isConnected) return false;
  if (isOutOfFlow(leading)) return false;
  const parent = beforePlusTarget(leading).parentElement;
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
    // Also clears what a previous outside (fixed) dock left inline.
    slot.style.position = '';
    slot.style.top = '';
    slot.style.left = '';
    slot.style.zIndex = '';
    slot.style.marginRight = '';
    return;
  }

  if (slot.dataset.dock === 'inset' && leading?.isConnected) {
    markRoom(roomTarget(leading), size);
    // The shift opened size + gap before the +; the control takes that space, a gap from the +
    // itself (logged-out ChatGPT's + overflows its narrower grid cell).
    const alignR = leading.getBoundingClientRect();
    slot.style.position = 'fixed';
    slot.style.top = `${alignR.top + (alignR.height - size) / 2}px`;
    slot.style.left = `${alignR.left - SLOT_GAP_PX - size}px`;
    slot.style.zIndex = '2147483640';
    slot.style.marginRight = '0';
    return;
  }

  // The whole composer (shell), attachment tray included: the frame can be just the editor rows.
  const above = shell ?? frame;
  if (slot.dataset.dock === 'above' && above?.isConnected) {
    // Floats over the page just above the composer's top-left corner.
    const r = above.getBoundingClientRect();
    const vw = window.innerWidth || 1200;
    const vh = window.innerHeight || 800;
    slot.style.position = 'fixed';
    slot.style.top = `${clamp(r.top - size - SLOT_GAP_PX, 8, Math.max(8, vh - size - 8))}px`;
    slot.style.left = `${clamp(r.left, 8, Math.max(8, vw - size - 8))}px`;
    slot.style.zIndex = '2147483640';
    slot.style.marginRight = '0';
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

const HOST_UI_SELECTOR = [
  'a', 'button', 'input', 'textarea', 'select', 'img', 'svg', 'video', 'canvas', 'nav', 'aside', 'header', 'footer',
  '[role="button"]', '[role="link"]', '[role="navigation"]', '[role="dialog"]', '[role="menu"]',
].join(', ');

function isClearColor(color: string): boolean {
  return !color || color === 'transparent' || /rgba?\([^)]*[,/]\s*0(?:\.0+)?\s*\)$/.test(color);
}

/**
 * True when `el` shows something at (x, y): a control, landmark or media, a fill, a shadow, or its
 * own text. A transparent layout box (ChatGPT's thread column and its collapsed sidebar's overflow
 * both span the page beside the composer) covers nothing.
 */
function showsHostUiAt(el: Element, x: number, y: number): boolean {
  if (el.matches(HOST_UI_SELECTOR)) return true;
  try {
    const cs = getComputedStyle(el);
    if ((cs.backgroundImage && cs.backgroundImage !== 'none') || !isClearColor(cs.backgroundColor)) return true;
    if (cs.boxShadow && cs.boxShadow !== 'none') return true;
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

/**
 * An outside dock needs empty page left of the composer. In a narrow window the composer hugs the
 * edge, or a sidebar sits there, and the control would cover host UI or float above the box, so it
 * docks inside instead. Without layout (zero-size frame) the configured dock stands.
 */
function roomLeftOfComposer(adapter: PlatformAdapter, leading: HTMLElement | null): boolean {
  const frame = resolveComposerFrame(adapter) ?? adapter.getComposerShell();
  const box = frame?.isConnected ? frame.getBoundingClientRect() : null;
  if (!frame || !box || box.width === 0) return true;
  const size = sizeFromLeading(leading);
  const left = box.left - size - SLOT_GAP_PX;
  if (left < 8) return false;
  const align = leading?.isConnected && frame.contains(leading) ? leading.getBoundingClientRect() : box;
  const y = align.top + align.height / 2;
  // Only the composer's own wrappers, stemlm itself and empty layout boxes may be under the spot.
  return [left + 2, left + size / 2, left + size - 2].every((x) =>
    (document.elementsFromPoint?.(x, y) ?? []).every((el) =>
      el.contains(frame) || el.tagName === 'STEMLM-ROOT' || Boolean(el.closest(COMPOSER_SLOT_SELECTOR)) ||
      !showsHostUiAt(el, x, y)));
}

export function ensureComposerSlot(
  adapter: PlatformAdapter,
  scheme: 'light' | 'dark' = 'light',
): HTMLElement | null {
  const leading = adapter.getComposerLeadingAnchor();
  const shell = adapter.getComposerShell();
  let slot: HTMLElement | null = null;
  let dock: 'before-plus' | 'outside-shell' | 'inset' | 'above' | 'fixed' = 'fixed';

  const forceOutside = adapter.composerDock === 'outside-shell' && roomLeftOfComposer(adapter, leading);
  // An inset host never gets a node in its own tree, not even beside the composer shell.
  const insetHost = adapter.composerDock === 'outside-shell' && adapter.insideDock === 'inset';
  const preferBeforePlus = !forceOutside && leading != null && canDockBeforePlus(leading);

  if (leading && preferBeforePlus) {
    if (insetHost) {
      slot = mountViewportSlot();
      // Try the shift; a row too narrow for it keeps the host's own controls apart instead.
      const frame = resolveComposerFrame(adapter);
      markRoom(roomTarget(leading), sizeFromLeading(leading));
      dock = frame && roomCrowdsRow(leading, frame) ? 'above' : 'inset';
    } else {
      slot = mountSlotBefore(beforePlusTarget(leading));
      if (slot) dock = 'before-plus';
    }
  }
  if (dock !== 'inset') clearRoom();

  if (forceOutside) {
    slot = mountViewportSlot();
    dock = 'outside-shell';
  }

  if (!slot && shell?.parentElement && !insetHost) {
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
  clearRoom();
  document.getElementById(COMPOSER_ROOM_STYLE_ID)?.remove();
}
export const _composerSlotGap = SLOT_GAP_PX;
export const _slotCss = SLOT_CSS;
