/**
 * Light-DOM slot for docking the stemLM inject pill outside Gemini's composer,
 * just to the left of the input box (before the + upload button).
 */
import type { PlatformAdapter } from '@/src/platforms/types';

const SLOT_ATTR = 'data-stemlm-composer-slot';
const PARENT_ATTR = 'data-stemlm-composer-row';
const STYLE_ID = 'stemlm-composer-slot-styles';
const SLOT_GAP_PX = 8;

const SLOT_CSS = `
[data-stemlm-composer-slot] {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-shrink: 0;
  align-self: center;
  margin-right: ${SLOT_GAP_PX}px;
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
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
[data-stemlm-composer-slot] .slm-inject-btn:hover {
  background: #0D9490;
}
[data-stemlm-composer-slot] .slm-inject-btn.is-attached {
  background: #0EA5A0;
}
[data-stemlm-composer-slot] .slm-inject-btn.is-panel-open {
  background: #22C55E;
}
[data-stemlm-composer-slot] .slm-inject-status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  height: 26px;
  color: #0EA5A0;
  font-size: 10px;
  font-weight: 500;
}
[data-stemlm-composer-slot][data-scheme="light"] {
  --slm-slot-bg: #ffffff;
  --slm-slot-border: #e2e8f0;
  --slm-slot-fg: #64748b;
  --slm-slot-fg-strong: #0f1117;
}
[data-stemlm-composer-slot][data-scheme="dark"] {
  --slm-slot-bg: #212121;
  --slm-slot-border: #2a2a35;
  --slm-slot-fg: #8a8a9a;
  --slm-slot-fg-strong: #f0f0f2;
}
[data-stemlm-composer-slot][data-neutral="true"] .slm-inject-btn {
  background: var(--slm-slot-btn-bg, #212121);
  color: var(--slm-slot-btn-fg, #ffffff);
  border: 0.5px solid var(--slm-slot-btn-border, #2a2a35);
}
[data-stemlm-composer-slot][data-neutral="true"] .slm-inject-btn:hover {
  background: var(--slm-slot-btn-hover, #2a2a35);
  border-color: var(--slm-slot-btn-border-hover, #3a3a45);
}
[data-stemlm-composer-slot][data-neutral="true"] .slm-inject-btn .slm-inject-btn-mark {
  color: #0ea5a0;
}
[data-stemlm-composer-slot][data-neutral="true"] .slm-inject-btn.is-attached {
  background: var(--slm-slot-btn-bg, #212121);
  color: var(--slm-slot-btn-fg, #ffffff);
  border-color: #0ea5a0;
}
[data-stemlm-composer-slot][data-neutral="true"] .slm-inject-btn.is-attached svg {
  color: #0ea5a0;
}
[data-stemlm-composer-slot][data-neutral="true"] .slm-inject-btn.is-panel-open {
  background: #22c55e;
  color: #ffffff;
  border-color: #22c55e;
}
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="light"] {
  --slm-slot-btn-bg: #f1f5f5;
  --slm-slot-btn-fg: #0f1117;
  --slm-slot-btn-border: #e2e8f0;
  --slm-slot-btn-hover: #e8ecec;
  --slm-slot-btn-border-hover: #cbd5e1;
}
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="dark"] {
  --slm-slot-btn-bg: #212121;
  --slm-slot-btn-fg: #ffffff;
  --slm-slot-btn-border: #2a2a35;
  --slm-slot-btn-hover: #2a2a35;
  --slm-slot-btn-border-hover: #3a3a45;
}
[data-stemlm-composer-row] {
  display: flex !important;
  flex-direction: row !important;
  align-items: center !important;
}
`;

function ensureStyles() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = SLOT_CSS;
  document.head.appendChild(style);
}

function ensureFlexRow(parent: HTMLElement) {
  if (parent.hasAttribute(PARENT_ATTR)) return;
  const display = getComputedStyle(parent).display;
  if (display !== 'flex' && display !== 'inline-flex') {
    parent.setAttribute(PARENT_ATTR, '');
  }
}

export function ensureComposerSlot(
  adapter: PlatformAdapter,
  scheme: 'light' | 'dark' = 'light',
): HTMLElement | null {
  const shell = adapter.getComposerShell();
  if (!shell?.parentElement) return null;

  const parent = shell.parentElement;
  ensureFlexRow(parent);
  ensureStyles();

  let slot = parent.querySelector<HTMLElement>(`:scope > [${SLOT_ATTR}]`);
  if (!slot) {
    slot = document.createElement('div');
    slot.setAttribute(SLOT_ATTR, '');
    parent.insertBefore(slot, shell);
  } else if (slot.nextElementSibling !== shell) {
    parent.insertBefore(slot, shell);
  }

  slot.dataset.scheme = scheme;
  slot.dataset.neutral = adapter.brand.neutral ? 'true' : 'false';
  return slot;
}

export function removeComposerSlot() {
  document.querySelector(`[${SLOT_ATTR}]`)?.remove();
  document.getElementById(STYLE_ID)?.remove();
  document.querySelectorAll(`[${PARENT_ATTR}]`).forEach((el) => {
    el.removeAttribute(PARENT_ATTR);
  });
}

export const _composerSlotGap = SLOT_GAP_PX;
