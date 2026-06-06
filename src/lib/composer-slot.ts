/**
 * Light-DOM slot for docking the stemLM inject pill inside Gemini's composer.
 */
import type { PlatformAdapter } from '@/src/platforms/types';

const SLOT_ATTR = 'data-stemlm-composer-slot';
const STYLE_ID = 'stemlm-composer-slot-styles';

const SLOT_CSS = `
[data-stemlm-composer-slot] {
  display: inline-flex;
  flex-direction: column;
  align-items: flex-end;
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
  align-items: flex-end;
  gap: 4px;
  position: relative;
}
[data-stemlm-composer-slot] .slm-inject-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 3px;
  min-width: 72px;
  height: 26px;
  padding: 0 8px;
  border: none;
  border-radius: 6px;
  background: #0EA5A0;
  color: #fff;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.15s ease;
}
[data-stemlm-composer-slot] .slm-inject-btn:hover {
  background: #0D9490;
}
[data-stemlm-composer-slot] .slm-inject-btn.is-done {
  background: #22C55E;
}
[data-stemlm-composer-slot] .slm-fab-subject {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  max-width: 5.5rem;
  padding: 1px 6px;
  border: 0.5px solid var(--slm-slot-border, #E2E8F0);
  border-radius: 999px;
  background: var(--slm-slot-bg, #fff);
  color: var(--slm-slot-fg, #64748B);
  font-size: 9px;
  font-weight: 500;
  cursor: pointer;
}
[data-stemlm-composer-slot] .slm-fab-subject-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
[data-stemlm-composer-slot] .slm-fab-menu {
  position: absolute;
  bottom: calc(100% + 6px);
  right: 0;
  margin: 0;
  padding: 4px;
  list-style: none;
  width: 10.5rem;
  max-height: 14rem;
  overflow-y: auto;
  background: var(--slm-slot-bg, #fff);
  border: 0.5px solid var(--slm-slot-border, #E2E8F0);
  border-radius: 10px;
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
  color: var(--slm-slot-fg-strong, #0F1117);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
[data-stemlm-composer-slot] .slm-fab-menu-item:hover,
[data-stemlm-composer-slot] .slm-fab-menu-item.is-active {
  background: #0EA5A015;
  color: #0EA5A0;
}
[data-stemlm-composer-slot][data-scheme="dark"] {
  --slm-slot-bg: #141418;
  --slm-slot-border: #1E1E24;
  --slm-slot-fg: #8A8A9A;
  --slm-slot-fg-strong: #F0F0F2;
}
`;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = SLOT_CSS;
  document.head.appendChild(style);
}

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
