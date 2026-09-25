/** Minimum panel width in px — keeps the study panel usable on narrow viewports. */
export const MIN_PANEL_PX = 280;
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

export function viewportWidth(): number {
  if (typeof window === 'undefined') return STORAGE_VIEWPORT_PX;
  return window.visualViewport?.width ?? window.innerWidth;
}

/** Smallest allowed panel fraction for the current viewport width. */
export function minSplitRatio(vw = viewportWidth()): number {
  if (vw <= 0) return MIN_SPLIT_RATIO_FLOOR;
  // Keep both the panel and the host-side 8px inset on very narrow windows.
  // The CSS panel has the authoritative 280px minimum; this value only tells
  // the host page how much width it must surrender to avoid overlap.
  const usablePanelPx = Math.min(MIN_PANEL_PX, Math.max(0, vw - 16));
  return Math.max(MIN_SPLIT_RATIO_FLOOR, usablePanelPx / vw);
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

export function panelWidthVw(ratio: number): number {
  return +(clampSplitRatio(ratio) * 100).toFixed(3);
}

export function pageWidthVw(ratio: number): number {
  return +(100 - panelWidthVw(ratio)).toFixed(3);
}

/**
 * Layout-only ratio. Stored/drag ratios retain the 75% product cap, while a
 * narrow host must surrender enough width for the panel's CSS minimum.
 */
export function layoutSplitRatio(ratio: number, vw = viewportWidth()): number {
  const value = Number.isFinite(ratio) ? Math.min(MAX_SPLIT_RATIO, Math.max(0, ratio)) : DEFAULT_SPLIT_RATIO;
  return Math.max(value, minSplitRatio(vw));
}

export function layoutPanelWidthVw(ratio: number, vw = viewportWidth()): number {
  return +(layoutSplitRatio(ratio, vw) * 100).toFixed(3);
}

export function layoutPageWidthVw(ratio: number, vw = viewportWidth()): number {
  return +(100 - layoutPanelWidthVw(ratio, vw)).toFixed(3);
}
