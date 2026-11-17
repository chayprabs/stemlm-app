/**
 * The chat sites' own sidebars. While the study panel is shown stemLM folds an open one, so the
 * chat keeps its room, and unfolds it again afterwards.
 *
 * It only ever presses the site's own control. Nothing of the site's is hidden or restyled, which
 * would leave its layout and its own idea of the sidebar's state out of step. Every press is
 * checked by measuring the sidebar; one that cannot be measured is not repeated on this page.
 *
 * A press follows only from the panel being shown or hidden, or from the setting changing. What
 * is observed afterwards can release a sidebar to the student, never press anything, so a press
 * cannot lead to another and stemLM cannot fight someone who opens the sidebar again.
 */
import { detectAdapter } from './detect';
import type { PlatformId } from './types';
import { viewportWidth } from '@/src/lib/split-ratio';

interface SidebarSpec {
  /** Its fold control, by structure or test id. Labels are the fallback, below. */
  toggle: readonly string[];
  /** The sidebar's own box, where its control does not name it with `aria-controls`. */
  box: readonly string[];
}

/**
 * From the live sites on 2026-11-17: ChatGPT's two controls carry `aria-controls="ds-sidebar"`
 * (any id that says sidebar is taken, so a renamed one still works), Claude's sidebar is an
 * <aside>, Gemini's is <bard-sidenav>, and signed-in Grok is believed to use the shadcn
 * sidebar's `data-sidebar` markup. The `pin-sidebar-toggle` and `side-nav-menu-button` test ids
 * come from earlier builds of Claude and Gemini and were not on the pages checked; where they
 * are absent the label finds the control.
 */
const SPECS: Record<PlatformId, SidebarSpec> = {
  chatgpt: { toggle: ['button[aria-controls*="sidebar" i]'], box: [] },
  claude: { toggle: ['[data-testid="pin-sidebar-toggle"]'], box: ['aside[aria-label="Sidebar"]', 'aside'] },
  gemini: { toggle: ['[data-test-id="side-nav-menu-button"]'], box: ['bard-sidenav'] },
  grok: { toggle: ['button[data-sidebar="trigger"]'], box: ['[data-sidebar="sidebar"]'] },
};

/** A fold control is labelled by what pressing it will do: "Close sidebar", "Hide sidebar". */
const FOLDS = /\b(?:close|hide|collapse)\b.*\bside ?(?:bar|nav)/i;
const UNFOLDS = /\b(?:open|show|expand)\b.*\bside ?(?:bar|nav)/i;

/** An open sidebar is 256 to 288px wide on the four hosts; a folded one leaves a rail of 72px at most. */
const OPEN_PX = 160;
const POLL_MS = 50;
/** The hosts animate a fold over 200 to 350ms. */
const SETTLE_MS = 800;
/** A page that is still starting up gets one more look for its sidebar. */
const LATER_MS = 1500;

const query = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];

const label = (el: Element) => el.getAttribute('aria-label') ?? '';

/** How much of `el` shows, in px across: 0 when hidden, off-canvas or clipped away by an ancestor. */
function shownWidth(el: Element): number {
  if (el.checkVisibility && !el.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true })) return 0;
  let { left, right } = el.getBoundingClientRect();
  for (let node = el; node.parentElement; node = node.parentElement) {
    // A fixed box is placed against the window: nothing above it clips it.
    if (getComputedStyle(node).position === 'fixed') break;
    if (!/^(?:hidden|clip|auto|scroll)$/.test(getComputedStyle(node.parentElement).overflowX)) continue;
    const clip = node.parentElement.getBoundingClientRect();
    left = Math.max(left, clip.left);
    right = Math.min(right, clip.right);
  }
  return Math.max(0, Math.round(Math.min(right, window.innerWidth) - Math.max(left, 0)));
}

/** The sidebar: what its control says it controls, else the first match docked to the window's left edge. */
function sidebarBox(spec: SidebarSpec): HTMLElement | null {
  for (const control of spec.toggle.flatMap(query)) {
    const named = document.getElementById(control.getAttribute('aria-controls') ?? '');
    if (named) return named;
  }
  for (const selector of spec.box) {
    const box = query(selector).find((el) => el.getBoundingClientRect().left <= 2);
    if (box) return box;
  }
  return null;
}

/** Enabled, laid out, and not underneath something else (ChatGPT keeps a second control under the open sidebar). */
function pressable(el: HTMLElement): boolean {
  if (el.matches(':disabled, [aria-disabled="true"]')) return false;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return false;
  const top = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
  return top !== null && el.contains(top);
}

function findToggle(spec: SidebarSpec, box: HTMLElement | null, fold: boolean): HTMLElement | null {
  const says = fold ? FOLDS : UNFOLDS;
  const opposite = fold ? UNFOLDS : FOLDS;
  let found = spec.toggle.flatMap(query).filter((el) => !opposite.test(label(el)) && pressable(el));
  if (found.length === 0) found = query('button[aria-label]').filter((el) => says.test(label(el)) && pressable(el));
  // Two controls for one sidebar: the one that says it does this, then the one placed for it
  // (the control that folds a sidebar sits inside it).
  return found.find((el) => says.test(label(el))) ?? found.find((el) => (box?.contains(el) ?? false) === fold) ?? found[0] ?? null;
}

/** The panel is on screen. */
let shown = false;
/** ... and the sidebar should be folded beside it. */
let wanted = false;
/** Looks taken for the sidebar since it was last wanted folded; a press ends the looking. */
let looks = 0;
/** A press whose effect could not be measured: the control is left alone for the rest of this page. */
let missed = false;
/**
 * Set while the sidebar is folded by stemLM and nobody has opened it since: the control that
 * folded it, and the window's width at that moment. A narrower window may have moved the host to
 * a layout where its control opens a drawer over the chat, so the sidebar is only unfolded in
 * one at least as wide.
 */
let folded: { by: HTMLElement; windowWidth: number } | null = null;
let pressing = false;
let later: ReturnType<typeof setTimeout> | undefined;
let watcher: ResizeObserver | undefined;
let watched: Element | null = null;
let report: (px: number) => void = () => {};
/** The width last reported. */
let told = 0;

function sidebar(): { spec: SidebarSpec; box: HTMLElement | null; width: number } | null {
  const id = detectAdapter()?.id;
  if (!id) return null;
  const spec = SPECS[id];
  const box = sidebarBox(spec);
  return { spec, box, width: box ? shownWidth(box) : 0 };
}

const widthNow = () => sidebar()?.width ?? 0;

/**
 * The layout keeps the chat its room beside whatever the sidebar is showing. Nothing is said
 * once the panel is leaving: the page has its width back, and the panel fades where it stood.
 */
function tell(width: number): void {
  if (!shown) return;
  told = width;
  report(width);
}

/** Someone opened it again: it is theirs now, and stays however they leave it. */
function release(width: number): void {
  if (folded && width >= OPEN_PX) folded = null;
}

/**
 * What is observed is reported, frame by frame while the sidebar moves, and can hand the sidebar
 * back to the student. It never presses.
 */
function observed(): void {
  const width = widthNow();
  // A sidebar that widens under the pointer may only be peeking out over the page, as a folded
  // one does on hover on some hosts. Whether it stayed open is seen once the pointer has left.
  if (width > told && watched?.matches(':hover')) return;
  if (!pressing) release(width);
  tell(width);
}

function watch(box: HTMLElement | null): void {
  if (box === watched) return;
  watcher?.disconnect();
  watched?.removeEventListener('mouseleave', observed);
  watched = box;
  if (!box) return;
  watcher = new ResizeObserver(observed);
  watcher.observe(box);
  // Some sidebars fold by narrowing what holds them, and keep their own size.
  if (box.parentElement) watcher.observe(box.parentElement);
  box.addEventListener('mouseleave', observed);
}

/** The width once it has moved and come to rest, or whatever it is after SETTLE_MS. */
async function atRest(from: number): Promise<number> {
  let last = from;
  for (let waited = 0; waited < SETTLE_MS; waited += POLL_MS) {
    await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    const now = widthNow();
    tell(now);
    if (now !== from && now === last) return now;
    last = now;
  }
  return last;
}

function press(toggle: HTMLElement, from: number, done: (after: number) => void): void {
  pressing = true;
  toggle.click();
  void atRest(from).then((after) => {
    pressing = false;
    done(after);
    reconcile();
  });
}

/** Runs when the panel is shown or hidden, when the setting changes, and after each press. */
function reconcile(): void {
  if (pressing) return;
  const found = sidebar();
  if (!found) return tell(0);
  const { spec, box, width } = found;
  watch(shown ? box : null);
  release(width);
  tell(width);

  if (wanted && !folded && looks < 2 && !missed) {
    looks += 1;
    const by = box && width >= OPEN_PX ? findToggle(spec, box, true) : null;
    if (by) {
      looks = 2;
      press(by, width, (after) => {
        if (after < OPEN_PX) folded = { by, windowWidth: viewportWidth() };
        else missed = true;
      });
    } else if (box && width < OPEN_PX) {
      // Already folded, or hidden by the host on a narrow window.
      looks = 2;
    } else if (looks < 2) {
      // The sidebar or its control is not on the page yet: look once more.
      later = setTimeout(reconcile, LATER_MS);
    }
  } else if (!wanted && folded) {
    const { by, windowWidth } = folded;
    folded = null;
    // The control that folded it unfolds it, unless it still says it folds (ChatGPT's is hidden
    // by then, and a second one opens the sidebar). A host may also have taken the folded
    // sidebar out of the page, so this does not wait on its box.
    const again = by.isConnected && !FOLDS.test(label(by)) && pressable(by) ? by : null;
    const toggle = viewportWidth() >= windowWidth ? (again ?? findToggle(spec, box, false)) : null;
    if (toggle) {
      press(toggle, width, (after) => {
        if (after < OPEN_PX) missed = true;
      });
    }
  }
}

/**
 * Call when the panel is shown or hidden and when the setting changes. While the panel is shown
 * `onWidth` is told, as it changes, how much of the window the sidebar is showing (its rail once
 * folded, 0 without one), so the layout can leave the chat its room next to it.
 */
export function syncHostSidebar(panelShown: boolean, fold: boolean, onWidth: (px: number) => void): void {
  report = onWidth;
  shown = panelShown;
  wanted = panelShown && fold;
  if (!wanted) {
    looks = 0;
    clearTimeout(later);
  }
  reconcile();
}
