import { chatgptAdapter } from '@/src/platforms/chatgpt';
import { claudeAdapter } from '@/src/platforms/claude';
import { geminiAdapter } from '@/src/platforms/gemini';
import { grokAdapter } from '@/src/platforms/grok';
import { ensureComposerSlot, resolveComposerFrame, syncComposerSlotGeometry } from '@/src/lib/composer-slot';
import type { PlatformAdapter, PlatformId } from '@/src/platforms/types';

const adapters: Record<PlatformId, PlatformAdapter> = {
  chatgpt: chatgptAdapter,
  claude: claudeAdapter,
  gemini: geminiAdapter,
  grok: grokAdapter,
};

const BUTTON_HTML = `
  <div class="slm-fab-wrap">
    <button type="button" class="slm-inject-btn" data-stemlm-inject="true" data-glyph="plus" title="Solve with stemLM" aria-label="Solve with stemLM">
      <span class="slm-inject-glyph" aria-hidden="true">
        <svg class="slm-inject-plus" viewBox="0 0 24 24" width="16" height="16">
          <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </span>
    </button>
  </div>
`;

function rectOf(el: HTMLElement | null) {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top,
    left: r.left,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
  };
}

(window as unknown as { __stemlmQa: unknown }).__stemlmQa = {
  dock(id: PlatformId) {
    const adapter = adapters[id];
    const slot = ensureComposerSlot(adapter, 'dark');
    if (slot && !slot.querySelector('[data-stemlm-inject]')) {
      slot.innerHTML = BUTTON_HTML;
    }
    const frame = resolveComposerFrame(adapter);
    const plus = adapter.getComposerLeadingAnchor();
    const editor = adapter.findEditor();
    const slotRect = rectOf(slot);
    const frameRect = rectOf(frame);
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const visible =
      !!slotRect &&
      slotRect.width > 8 &&
      slotRect.height > 8 &&
      slotRect.right > 0 &&
      slotRect.left < vw &&
      slotRect.bottom > 0 &&
      slotRect.top < vh;
    return {
      id,
      dock: slot?.dataset.dock ?? null,
      parent: slot?.parentElement?.tagName ?? null,
      insideFrame: !!(frame && slot && frame.contains(slot)),
      nextIsPlus: slot?.nextElementSibling === plus,
      visible,
      slot: slotRect,
      frame: frameRect,
      plus: rectOf(plus),
      editor: rectOf(editor),
      viewport: { width: vw, height: vh },
    };
  },
  sync(id: PlatformId) {
    const adapter = adapters[id];
    syncComposerSlotGeometry(adapter);
    return (window as unknown as { __stemlmQa: { dock: (id: PlatformId) => unknown } }).__stemlmQa.dock(id);
  },
};
