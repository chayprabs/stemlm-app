/**
 * Read and normalize text the student selected inside the study panel for
 * quote-reply follow-ups.
 */

/** Strip invisible chars and collapse noisy whitespace while keeping line breaks. */
export function normalizeFollowupSelection(text: string): string {
  return text
    .replace(/\u00a0/g, ' ')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .split('\n')
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n')
    .trim();
}

export interface PanelSelection {
  text: string;
  /** Viewport anchor for the selection popover (center-bottom of highlight). */
  x: number;
  y: number;
}

/** Read the current non-collapsed selection confined to `panel`. */
export function readPanelSelection(panel: HTMLElement): PanelSelection | null {
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || sel.rangeCount === 0) return null;

  const range = sel.getRangeAt(0);
  if (!panel.contains(range.commonAncestorContainer)) return null;

  const anchor = range.commonAncestorContainer;
  const anchorEl =
    anchor.nodeType === Node.TEXT_NODE
      ? (anchor.parentElement as Element | null)
      : (anchor as Element);
  if (!anchorEl?.closest?.('.slm-selectable')) return null;

  const text = normalizeFollowupSelection(sel.toString());
  if (text.length < 3) return null;

  const rect = range.getBoundingClientRect();
  const hasBox = rect.width > 0 || rect.height > 0;

  return {
    text,
    x: hasBox ? rect.left + rect.width / 2 : 0,
    y: hasBox ? rect.bottom : 0,
  };
}
