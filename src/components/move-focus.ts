import type { KeyboardEvent } from 'react';

/**
 * Give the study panel the keyboard. Focus goes to the reading area, the element that scrolls,
 * so Space, Page Down, the arrows, Home and End move the text. A panel with nothing to read
 * takes it itself.
 */
export function focusPanel(panel: HTMLElement | null | undefined): void {
  (panel?.querySelector<HTMLElement>('.slm-read, .slm-solution-wrap') ?? panel)?.focus({ preventScroll: true });
}

/**
 * Arrow keys walk a row or column of sibling controls, wrapping at the ends; Home and End jump
 * to them. Focus only moves: choosing stays with Enter or Space, so walking a strip of options
 * never changes a setting on the way past.
 */
export function moveFocus(event: KeyboardEvent, items: HTMLElement[], back: string, forward: string): void {
  const at = items.indexOf(event.target as HTMLElement);
  if (at < 0) return;
  const last = items.length - 1;
  const to =
    event.key === forward ? (at === last ? 0 : at + 1)
    : event.key === back ? (at === 0 ? last : at - 1)
    : event.key === 'Home' ? 0
    : event.key === 'End' ? last
    : -1;
  if (to < 0) return;
  event.preventDefault();
  items[to]?.focus();
}
