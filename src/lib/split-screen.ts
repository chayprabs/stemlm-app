/**
 * Host-page split layout. While the study panel is docked, the chat page's <body> is narrowed so
 * the two read as columns and nothing of the page lies under the panel.
 *
 * One stylesheet does all of it. It selects by tag, never by a class or attribute written onto
 * the page (a host that rewrites <html>'s class to change theme would silently drop the split),
 * and it lives in stemLM's own root element, which the content script already keeps attached
 * when a host replaces <head>. Removing the sheet puts the page back exactly as it was.
 *
 * Nothing here animates: the page column changes in one layout pass, level with the panel's edge.
 */
import { detectAdapter } from '@/src/platforms/detect';
import { isOverlayViewport, layoutPanelWidthVw, viewportWidth } from '@/src/lib/split-ratio';

export const SPLIT_STYLE_ID = 'stemlm-split-style';
/** The content script's shadow host (entrypoints/content/index.ts). */
const STEMLM_ROOT = 'stemlm-root';

/**
 * Page containers that are sized by the window rather than by <body> and so still reach under
 * the panel. Found by measuring, so a container that already follows <body> keeps its own width
 * rules; kept for as long as the split is on.
 */
const wideRoots = new Set<string>();

function reachesPast(selector: string, edge: number): boolean {
  // The selectors are the adapters'. One that does not parse must not stop the panel opening.
  try {
    return [...document.querySelectorAll(selector)].some((el) => el.getBoundingClientRect().right > edge + 1);
  } catch {
    return false;
  }
}

export function applySplit(ratio: number, hostSidebar = 0): void {
  const vw = viewportWidth();
  // The panel overlays a narrow window; the chat keeps its full width underneath.
  if (isOverlayViewport(vw)) return removeSplit();
  const panelVw = layoutPanelWidthVw(ratio, vw, hostSidebar);

  let style = document.getElementById(SPLIT_STYLE_ID) as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement('style');
    style.id = SPLIT_STYLE_ID;
    (document.querySelector(STEMLM_ROOT) ?? document.head).append(style);
  }
  // `100%` is the window less a page scrollbar, which is where a fixed panel's edge sits.
  // `clip` keeps wide content from painting under the panel without making <body> a scroller.
  const body = `html{overflow-x:hidden!important}html>body{width:calc(100% - ${panelVw}vw)!important;min-width:0!important;overflow-x:clip!important}`;
  const clamp = () =>
    [...wideRoots].map((sel) => `${sel}{max-width:calc(100vw - ${panelVw}vw)!important;min-width:0!important;box-sizing:border-box!important}`).join('');

  style.textContent = body + clamp();
  const edge = vw * (1 - panelVw / 100);
  const found = (detectAdapter()?.layoutRoots ?? ['main']).filter((sel) => !wideRoots.has(sel) && reachesPast(sel, edge));
  if (found.length === 0) return;
  for (const sel of found) wideRoots.add(sel);
  style.textContent = body + clamp();
}

export function removeSplit(): void {
  wideRoots.clear();
  document.getElementById(SPLIT_STYLE_ID)?.remove();
}
