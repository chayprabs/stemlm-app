/**
 * Shared display bounds for inline SVG diagrams (panel + PDF).
 *
 * AI SVGs often use large viewBox coordinates (e.g. 520×260). When width/height
 * attributes are stripped, browsers treat those as CSS pixels and diagrams blow up.
 * We compute explicit display width/height that fit these caps while preserving
 * aspect ratio.
 */
export type DiagramSizeProfile = 'step' | 'solution' | 'print';

export const DIAGRAM_BOUNDS: Record<DiagramSizeProfile, { maxW: number; maxH: number }> = {
  step: { maxW: 480, maxH: 280 },
  solution: { maxW: 520, maxH: 320 },
  /** Match panel step size — print must not be smaller than the extension. */
  print: { maxW: 480, maxH: 280 },
};

/** Hard print caps (mm) used by PDF CSS as a second line of defense. */
export const PRINT_DIAGRAM_MM = { maxW: 120, maxH: 70 } as const;

/** Modest upscale for small viewBoxes so diagrams fill the card width. */
export const MAX_DIAGRAM_UPSCALE = 1.25;

export function parseViewBox(viewBox: string | null | undefined): {
  x: number;
  y: number;
  w: number;
  h: number;
} | null {
  if (!viewBox) return null;
  const parts = viewBox.trim().split(/[\s,]+/).map(Number);
  if (parts.length < 4 || parts.some((n) => Number.isNaN(n))) return null;
  const w = parts[2]! - parts[0]!;
  const h = parts[3]! - parts[1]!;
  if (w <= 0 || h <= 0) return null;
  return { x: parts[0]!, y: parts[1]!, w, h };
}

/** Scale factor applied to viewBox user-units when rendering (may upscale modestly). */
export function getDisplayScale(
  viewBox: string | null | undefined,
  profile: DiagramSizeProfile,
): number {
  const { maxW, maxH } = DIAGRAM_BOUNDS[profile];
  const parsed = parseViewBox(viewBox);
  if (!parsed) return 1;
  return Math.min(maxW / parsed.w, maxH / parsed.h, MAX_DIAGRAM_UPSCALE);
}

export function computeDisplaySize(
  viewBox: string | null | undefined,
  profile: DiagramSizeProfile,
): { width: number; height: number } {
  const { maxW, maxH } = DIAGRAM_BOUNDS[profile];
  const parsed = parseViewBox(viewBox);
  if (!parsed) {
    return { width: maxW, height: Math.round(maxH * 0.72) };
  }
  const scale = getDisplayScale(viewBox, profile);
  return {
    width: Math.max(1, Math.round(parsed.w * scale)),
    height: Math.max(1, Math.round(parsed.h * scale)),
  };
}
