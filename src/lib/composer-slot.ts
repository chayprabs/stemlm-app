/**
 * Light-DOM slot for docking the stemLM inject control outside Gemini's composer,
 * immediately to the left of the + (upload) button.
 */
import type { PlatformAdapter } from '@/src/platforms/types';

const SLOT_ATTR = 'data-stemlm-composer-slot';
const PARENT_ATTR = 'data-stemlm-composer-row';
const STYLE_ID = 'stemlm-composer-slot-styles';
const SLOT_GAP_PX = 8;

const SLOT_CSS = `
[data-stemlm-composer-slot] {
  display: inline-flex;
  flex-shrink: 0;
  align-self: center;
  margin-right: ${SLOT_GAP_PX}px;
  position: relative;
  z-index: 50;
  font-family: 'Inter', ui-sans-serif, system-ui, sans-serif;
}
[data-stemlm-composer-slot] .slm-fab-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
}
[data-stemlm-composer-slot] .slm-inject-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1.5px solid #0EA5A0;
  border-radius: 50%;
  background: transparent;
  color: #0EA5A0;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}
[data-stemlm-composer-slot] .slm-inject-btn:hover {
  background: rgba(14, 165, 160, 0.08);
}
[data-stemlm-composer-slot] .slm-inject-btn.is-attached {
  border-color: #0EA5A0;
  color: #0EA5A0;
}
[data-stemlm-composer-slot] .slm-inject-btn.is-panel-open {
  border-color: #22C55E;
  background: rgba(34, 197, 94, 0.1);
  color: #22C55E;
}
[data-stemlm-composer-slot] .slm-inject-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  color: #0EA5A0;
}
[data-stemlm-composer-slot][data-neutral="true"] .slm-inject-btn {
  border-color: #0EA5A0;
  background: transparent;
  color: #0EA5A0;
}
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="dark"] .slm-inject-btn {
  background: rgba(33, 33, 33, 0.6);
  border-color: #0EA5A0;
}
[data-stemlm-composer-slot][data-neutral="true"][data-scheme="light"] .slm-inject-btn {
  background: rgba(255, 255, 255, 0.9);
  border-color: #0EA5A0;
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
  const display = getComputedStyle(parent).display;
  if (display !== 'flex' && display !== 'inline-flex') {
    parent.setAttribute(PARENT_ATTR, '');
  }
}

/** One persistent slot node — moving it in the DOM keeps the React portal stable. */
let sharedSlot: HTMLElement | null = null;

function getSharedSlot(): HTMLElement {
  if (!sharedSlot) {
    sharedSlot = document.createElement('div');
    sharedSlot.setAttribute(SLOT_ATTR, '');
  }
  return sharedSlot;
}

function mountSlotBefore(anchor: HTMLElement): HTMLElement | null {
  if (!anchor.isConnected) return null;
  const parent = anchor.parentElement;
  if (!parent) return null;
  ensureFlexRow(parent);
  ensureStyles();

  const slot = getSharedSlot();
  if (slot.parentElement !== parent || slot.nextElementSibling !== anchor) {
    parent.insertBefore(slot, anchor);
  }
  return slot.isConnected ? slot : null;
}

export function ensureComposerSlot(
  adapter: PlatformAdapter,
  scheme: 'light' | 'dark' = 'light',
): HTMLElement | null {
  const leading = adapter.getComposerLeadingAnchor();
  let slot: HTMLElement | null = null;

  if (leading) {
    slot = mountSlotBefore(leading);
  }

  if (!slot) {
    const shell = adapter.getComposerShell();
    if (!shell?.parentElement) return null;
    slot = mountSlotBefore(shell);
  }

  if (!slot?.isConnected) return null;
  slot.dataset.scheme = scheme;
  slot.dataset.neutral = adapter.brand.neutral ? 'true' : 'false';
  return slot;
}

export function removeComposerSlot() {
  sharedSlot?.remove();
  sharedSlot = null;
  document.getElementById(STYLE_ID)?.remove();
  document.querySelectorAll(`[${PARENT_ATTR}]`).forEach((el) => {
    el.removeAttribute(PARENT_ATTR);
  });
}

/** Test hook — returns the singleton slot element if allocated. */
export function getComposerSlotElement(): HTMLElement | null {
  return sharedSlot;
}

export const _composerSlotGap = SLOT_GAP_PX;
