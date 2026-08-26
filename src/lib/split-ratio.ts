/** Minimum panel width in px — keeps the study panel usable on narrow viewports. */
export const MIN_PANEL_PX = 280;
export const MAX_SPLIT_RATIO = 0.75;
export const MIN_SPLIT_RATIO_FLOOR = 0.25;
/**
 * Default study-panel fraction of the viewport. Modest majority so stemLM is a
 * little larger than the host chat without crushing it.
 */
export const DEFAULT_SPLIT_RATIO = 0.55;
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
 * also restores to the 55/45 default. Other finite values stay as-is.
 */
export function hydrateSplitRatio(value: unknown, vw = STORAGE_VIEWPORT_PX): number {
  if (
    value === LEGACY_DEFAULT_SPLIT_RATIO ||
    value === MAX_SPLIT_RATIO ||
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
