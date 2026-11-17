/** Minimum panel width in px — keeps the study panel usable on narrow viewports. */
export const MIN_PANEL_PX = 280;
/**
 * The chat keeps a column this wide beside the panel (UI-SMALL-01): the narrowest the hosts lay
 * it out themselves, their 768px breakpoint less a 288px sidebar.
 */
export const MIN_CHAT_PX = 480;
/**
 * A folded host sidebar leaves a rail 48 to 72px wide, and not always as part of the sidebar's
 * own box, so room is kept for one whatever is measured.
 */
const HOST_RAIL_PX = 60;
export const MAX_SPLIT_RATIO = 0.75;
export const MIN_SPLIT_RATIO_FLOOR = 0.25;
/**
 * Default study-panel fraction of the viewport. A reading-first majority keeps
 * the study surface usable while leaving the host chat visible.
 */
export const DEFAULT_SPLIT_RATIO = 0.68;
/** Pre-majority default. Stored exact 0.5 hydrates to DEFAULT_SPLIT_RATIO. */
export const LEGACY_DEFAULT_SPLIT_RATIO = 0.5;
/**
 * Wide canonical viewport for reading/writing settings. Never use the popup's
 * 312px window here — MIN_PANEL_PX / 312 clamps the stored split up to 0.75.
 */
export const STORAGE_VIEWPORT_PX = 1600;

/**
 * The layout viewport, which `vw` and a fixed panel are measured against. Not the visual
 * viewport: that one shrinks under pinch zoom while the page's layout stays where it was.
 */
export function viewportWidth(): number {
  if (typeof window === 'undefined') return STORAGE_VIEWPORT_PX;
  return document.documentElement.clientWidth || window.innerWidth;
}

/** Smallest allowed panel fraction for the current viewport width. */
export function minSplitRatio(vw = viewportWidth()): number {
  if (vw <= 0) return MIN_SPLIT_RATIO_FLOOR;
  return Math.max(MIN_SPLIT_RATIO_FLOOR, MIN_PANEL_PX / vw);
}

export function clampSplitRatio(ratio: number, vw = viewportWidth()): number {
  if (!Number.isFinite(ratio)) return DEFAULT_SPLIT_RATIO;
  const min = minSplitRatio(vw);
  return Math.min(MAX_SPLIT_RATIO, Math.max(min, ratio));
}

/**
 * Stored split hydration. Exact 0.5 is the legacy never-resized default.
 * Exact 0.75 is the popup-window clamp artifact (312px × MIN_PANEL_PX) and
 * also restores to the current default. Other finite values stay as-is.
 */
export function hydrateSplitRatio(
  value: unknown,
  vw = STORAGE_VIEWPORT_PX,
  options: { preserveLegacyValues?: boolean } = {},
): number {
  if (
    (!options.preserveLegacyValues &&
      (value === LEGACY_DEFAULT_SPLIT_RATIO || value === MAX_SPLIT_RATIO)) ||
    value == null
  ) {
    return clampSplitRatio(DEFAULT_SPLIT_RATIO, vw);
  }
  if (typeof value !== 'number') {
    return clampSplitRatio(DEFAULT_SPLIT_RATIO, vw);
  }
  return clampSplitRatio(value, vw);
}

/** Panel width fraction from a pointer position (panel docked on the right). */
export function ratioFromPointer(clientX: number, vw = viewportWidth()): number {
  if (vw <= 0) return DEFAULT_SPLIT_RATIO;
  return clampSplitRatio(1 - clientX / vw, vw);
}

/** Too narrow for both: the panel covers the chat instead of crushing it to a sliver. */
export function isOverlayViewport(vw = viewportWidth()): boolean {
  return vw < MIN_PANEL_PX + MIN_CHAT_PX;
}

/**
 * Layout-only ratio. Stored/drag ratios retain the 75% product cap; the layout keeps the panel's
 * minimum and the chat's, beside whatever the host's own sidebar is showing (`hostSidebar` px,
 * never taken for less than a rail), and a window too narrow for both gets the panel full width
 * over the chat. Where the two minimums cannot both be met, the panel keeps its own.
 */
export function layoutSplitRatio(ratio: number, vw = viewportWidth(), hostSidebar = 0): number {
  if (isOverlayViewport(vw)) return 1;
  const min = minSplitRatio(vw);
  const max = Math.max(min, Math.min(MAX_SPLIT_RATIO, (vw - MIN_CHAT_PX - Math.max(hostSidebar, HOST_RAIL_PX)) / vw));
  return Math.min(max, Math.max(min, Number.isFinite(ratio) ? ratio : DEFAULT_SPLIT_RATIO));
}

export function layoutPanelWidthVw(ratio: number, vw = viewportWidth(), hostSidebar = 0): number {
  return +(layoutSplitRatio(ratio, vw, hostSidebar) * 100).toFixed(3);
}
