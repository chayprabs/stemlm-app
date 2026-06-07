/**
 * Shared display bounds for inline SVG diagrams (panel + PDF).
 *
 * Panel profiles stay compact so diagrams don't dominate the step card.
 * Print profile is larger for legible PDF export.
 */
export type DiagramSizeProfile = 'step' | 'solution' | 'print';

export const DIAGRAM_BOUNDS: Record<DiagramSizeProfile, { maxW: number; maxH: number }> = {
  /** Inline step card — compact, readable, not half the panel. */
  step: { maxW: 300, maxH: 165 },
  solution: { maxW: 340, maxH: 185 },
  /** PDF — larger than panel for print legibility. */
  print: { maxW: 480, maxH: 275 },
};

/** Hard print caps (mm) used by PDF CSS as a second line of defense. */
export const PRINT_DIAGRAM_MM = { maxW: 125, maxH: 72 } as const;

/** Only PDF may upscale small viewBoxes; panel keeps native scale. */
export const MAX_DIAGRAM_UPSCALE: Record<DiagramSizeProfile, number> = {
  step: 1,
  solution: 1,
  print: 1.15,
};

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

/** Scale factor applied to viewBox user-units when rendering. */
export function getDisplayScale(
  viewBox: string | null | undefined,
  profile: DiagramSizeProfile,
): number {
  const { maxW, maxH } = DIAGRAM_BOUNDS[profile];
  const parsed = parseViewBox(viewBox);
  if (!parsed) return 1;
  const cap = MAX_DIAGRAM_UPSCALE[profile];
  return Math.min(maxW / parsed.w, maxH / parsed.h, cap);
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
