/** Minimum panel width in px — keeps the study panel usable on narrow viewports. */
export const MIN_PANEL_PX = 280;
export const MAX_SPLIT_RATIO = 0.75;
export const MIN_SPLIT_RATIO_FLOOR = 0.25;

export function viewportWidth(): number {
  if (typeof window === 'undefined') return 1280;
  return window.visualViewport?.width ?? window.innerWidth;
}

/** Smallest allowed panel fraction for the current viewport width. */
export function minSplitRatio(vw = viewportWidth()): number {
  if (vw <= 0) return MIN_SPLIT_RATIO_FLOOR;
  return Math.max(MIN_SPLIT_RATIO_FLOOR, MIN_PANEL_PX / vw);
}

export function clampSplitRatio(ratio: number, vw = viewportWidth()): number {
  if (!Number.isFinite(ratio)) return 0.5;
  const min = minSplitRatio(vw);
  return Math.min(MAX_SPLIT_RATIO, Math.max(min, ratio));
}

/** Panel width fraction from a pointer position (panel docked on the right). */
export function ratioFromPointer(clientX: number, vw = viewportWidth()): number {
  if (vw <= 0) return 0.5;
  return clampSplitRatio(1 - clientX / vw, vw);
}

export function panelWidthVw(ratio: number): number {
  return +(clampSplitRatio(ratio) * 100).toFixed(3);
}

export function pageWidthVw(ratio: number): number {
  return +(100 - panelWidthVw(ratio)).toFixed(3);
}
