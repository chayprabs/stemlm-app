/**
 * Light-DOM slot for docking the stemLM button inside each platform's composer
 * action row. Keeps the button visually inside the input box across all hosts.
 */
import type { PlatformAdapter } from '@/src/platforms/types';

const SLOT_ATTR = 'data-stemlm-composer-slot';
const STYLE_ID = 'stemlm-composer-slot-styles';

const SLOT_CSS = `
[data-stemlm-composer-slot] {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  flex-shrink: 0;
  align-self: flex-end;
  margin-right: 6px;
  margin-bottom: 2px;
  position: relative;
  z-index: 50;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
[data-stemlm-composer-slot] .slm-fab-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  position: relative;
  top: auto;
  left: auto;
}
[data-stemlm-composer-slot] .slm-fab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: var(--slm-fab-surface, linear-gradient(135deg, #7c6bff, #5b46e0));
  color: var(--slm-fab-fg, #fff);
  cursor: pointer;
  box-shadow: 0 1px 4px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06);
  transition: transform 0.12s ease, box-shadow 0.15s ease, filter 0.15s ease;
}
[data-stemlm-composer-slot] .slm-fab:hover {
  filter: brightness(1.06);
  box-shadow: 0 2px 8px rgba(0,0,0,0.22), 0 0 0 2px var(--slm-fab-ring, rgba(91,70,224,0.35));
}
[data-stemlm-composer-slot] .slm-fab.is-done {
  background: #16a34a;
  color: #fff;
}
[data-stemlm-composer-slot] .slm-fab-subject {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 5.5rem;
  padding: 1px 6px;
  border: 1px solid var(--slm-slot-border, rgba(128,128,128,0.25));
  border-radius: 999px;
  background: var(--slm-slot-bg, rgba(255,255,255,0.94));
  color: var(--slm-slot-fg, #5c6370);
  font-size: 9px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0,0,0,0.08);
}
[data-stemlm-composer-slot] .slm-fab-subject-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-stemlm-composer-slot] .slm-fab-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  left: 50%;
  transform: translateX(-50%);
  margin: 0;
  padding: 4px;
  list-style: none;
  width: 10.5rem;
  max-height: 14rem;
  overflow-y: auto;
  background: var(--slm-slot-bg, #fff);
  border: 1px solid var(--slm-slot-border, #e2e4ea);
  border-radius: 10px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.18);
  z-index: 100;
}
[data-stemlm-composer-slot] .slm-fab-menu-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  text-align: left;
  padding: 6px 10px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--slm-slot-fg-strong, #0f1117);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}
[data-stemlm-composer-slot] .slm-fab-menu-item:hover,
[data-stemlm-composer-slot] .slm-fab-menu-item.is-active {
  background: var(--slm-slot-active, #eeebff);
  color: var(--slm-slot-accent, #5b46e0);
}
[data-stemlm-composer-slot][data-scheme="dark"] {
  --slm-slot-bg: #1a1d25;
  --slm-slot-border: #262a35;
  --slm-slot-fg: #9aa1ae;
  --slm-slot-fg-strong: #f0f2f7;
  --slm-slot-active: rgba(124,107,255,0.15);
  --slm-slot-accent: #8c7dff;
}
`;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = SLOT_CSS;
  document.head.appendChild(style);
}

/** Insert or return the light-DOM slot inside the composer action row. */
export function ensureComposerSlot(
  adapter: PlatformAdapter,
  scheme: 'light' | 'dark' = 'light',
): HTMLElement | null {
  const layout = adapter.getComposerLayout?.();
  if (!layout) return null;

  const { actionRow } = layout;
  const send = adapter.getComposerAnchor();

  let slot = actionRow.querySelector<HTMLElement>(`[${SLOT_ATTR}]`);
  if (!slot) {
    ensureStyles();
    slot = document.createElement('div');
    slot.setAttribute(SLOT_ATTR, '');
    slot.dataset.scheme = scheme;
    if (send && send.parentElement === actionRow) {
      actionRow.insertBefore(slot, send);
    } else if (send?.parentElement?.contains(actionRow)) {
      send.parentElement.insertBefore(slot, send);
    } else {
      actionRow.appendChild(slot);
    }
  }

  slot.dataset.scheme = scheme;
  return slot;
}

export function removeComposerSlot() {
  document.querySelector(`[${SLOT_ATTR}]`)?.remove();
}
