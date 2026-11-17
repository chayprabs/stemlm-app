import type { KeyboardEvent } from 'react';

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
