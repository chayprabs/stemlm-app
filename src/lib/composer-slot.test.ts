import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { geminiAdapter } from '@/src/platforms/gemini';
import { chatgptAdapter } from '@/src/platforms/chatgpt';
import { grokAdapter } from '@/src/platforms/grok';
import {
  COMPOSER_SLOT_STYLE_ID,
  INJECT_SIGNAL,
  INJECT_RADIUS,
  ensureComposerSlot,
  isolateStemLmPointer,
  removeComposerSlot,
  _slotCss,
} from './composer-slot';
import { HOST_FIXTURES, mountHostComposer } from '@/src/platforms/host-fixtures';

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe('ensureComposerSlot', () => {
  afterEach(() => {
    removeComposerSlot();
    document.body.innerHTML = '';
  });

  beforeEach(() => {
    setBody(`
      <input-area-v2 class="input-area">
        <div class="leading-actions">
          <button aria-label="Open upload file menu">+</button>
        </div>
        <rich-textarea>
          <div class="ql-editor" contenteditable="true" role="textbox"></div>
        </rich-textarea>
        <div class="send-button-container">
          <button aria-label="Send message">Send</button>
        </div>
      </input-area-v2>
    `);
  });

  it('docks a slot immediately left of the upload button', () => {
    const slot = ensureComposerSlot(geminiAdapter, 'dark');
    expect(slot).not.toBeNull();
    expect(slot!.isConnected).toBe(true);
    const upload = document.querySelector('button[aria-label="Open upload file menu"]');
    expect(slot!.nextElementSibling).toBe(upload);
  });

  it('ships a rounded-square orange outline, not a teal circle', () => {
    ensureComposerSlot(geminiAdapter, 'dark');
    const css = document.getElementById(COMPOSER_SLOT_STYLE_ID)?.textContent ?? '';
    expect(css).toBe(_slotCss);
    expect(css).toContain(`border-radius: ${INJECT_RADIUS}`);
    expect(css).not.toMatch(/border-radius:\s*50%/);
    expect(css).not.toMatch(/border-radius:\s*999px/);
    expect(css.toLowerCase()).toContain(INJECT_SIGNAL);
    expect(css).not.toContain('#0EA5A0');
    expect(css).not.toContain('#0ea5a0');
    expect(INJECT_SIGNAL.toLowerCase()).toBe('#ff6b2c');
    expect(INJECT_RADIUS).not.toBe('50%');
  });

  it('remounts after Gemini rebuilds the composer row', () => {
    const first = ensureComposerSlot(geminiAdapter, 'dark');
    expect(first?.isConnected).toBe(true);

    const oldRow = document.querySelector('input-area-v2')!;
    oldRow.remove();

    setBody(`
      <input-area-v2 class="input-area">
        <div class="leading-actions">
          <button aria-label="Open upload file menu">+</button>
        </div>
        <rich-textarea>
          <div class="ql-editor" contenteditable="true" role="textbox"></div>
        </rich-textarea>
      </input-area-v2>
    `);

    const second = ensureComposerSlot(geminiAdapter, 'dark');
    expect(second).not.toBeNull();
    expect(second).toBe(first);
    expect(second!.isConnected).toBe(true);
    expect(document.querySelectorAll('[data-stemlm-composer-slot]').length).toBe(1);
  });

  it('reuses the same slot element across repeated ensure calls', () => {
    const a = ensureComposerSlot(geminiAdapter, 'light');
    const b = ensureComposerSlot(geminiAdapter, 'dark');
    expect(a).toBe(b);
  });

  it('does not throw when the inject button becomes the first button in input-area-v2', () => {
    const slot = ensureComposerSlot(geminiAdapter, 'dark');
    slot!.innerHTML =
      '<div class="slm-fab-wrap"><button type="button" class="slm-inject-btn">+</button></div>';

    expect(() => ensureComposerSlot(geminiAdapter, 'dark')).not.toThrow();
    expect(slot!.isConnected).toBe(true);

    const upload = document.querySelector('button[aria-label="Open upload file menu"]');
    expect(geminiAdapter.getComposerLeadingAnchor()).toBe(upload);
    expect(slot!.nextElementSibling).toBe(upload);
  });
});

describe.each(HOST_FIXTURES)('$id composer slot docks beside the leading +', (spec) => {
  afterEach(() => {
    removeComposerSlot();
    document.body.innerHTML = '';
  });

  it('sits immediately left of the + and not inside the stemLM slot', () => {
    mountHostComposer(spec, { capsule: false });
    const slot = ensureComposerSlot(spec.adapter, 'dark');
    expect(slot).not.toBeNull();
    const plus = spec.adapter.getComposerLeadingAnchor();
    expect(plus).not.toBeNull();
    expect(plus!.getAttribute('aria-label')).toBe(spec.plusLabel);
    expect(plus!.closest('[data-stemlm-composer-slot]')).toBeNull();
    expect(slot!.contains(plus!)).toBe(false);
    const shell = spec.adapter.getComposerShell();
    expect(slot!.nextElementSibling === plus || slot!.nextElementSibling === shell).toBe(true);

    slot!.innerHTML =
      '<div class="slm-fab-wrap"><button type="button" class="slm-inject-btn">+</button></div>';
    expect(() => ensureComposerSlot(spec.adapter, 'dark')).not.toThrow();
    expect(spec.adapter.getComposerLeadingAnchor()).toBe(plus);
    expect(slot!.contains(plus!)).toBe(false);
  });

  it('does not let a pointer on the inject slot reach the host +', () => {
    mountHostComposer(spec, { capsule: false });
    const slot = ensureComposerSlot(spec.adapter, 'dark')!;
    const plus = spec.adapter.getComposerLeadingAnchor()!;
    const plusClick = vi.fn();
    const parentClick = vi.fn();
    plus.addEventListener('click', plusClick);
    plus.parentElement!.addEventListener('click', parentClick);

    slot.innerHTML = '<button type="button" class="slm-inject-btn" data-stemlm-inject="true">+</button>';
    const inject = slot.querySelector('button') as HTMLButtonElement;
    inject.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(plusClick).not.toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();

    plus.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
    expect(plusClick).toHaveBeenCalledTimes(1);
  });
});

describe('landing-page composer markup', () => {
  afterEach(() => {
    removeComposerSlot();
    document.body.innerHTML = '';
  });

  it('docks ChatGPT inject to the left of a plus that sits beside the form', () => {
    document.body.innerHTML = `
      <div class="composer" style="display:flex;align-items:center;flex-direction:row">
        <button type="button" data-testid="composer-plus-btn" aria-label="Add files and more" aria-haspopup="menu">+</button>
        <form>
          <div id="prompt-textarea" data-testid="prompt-textarea" contenteditable="true" role="textbox" data-placeholder="Ask anything"></div>
        </form>
      </div>
    `;
    const plus = chatgptAdapter.getComposerLeadingAnchor();
    expect(plus).not.toBeNull();
    expect(plus!.getAttribute('data-testid')).toBe('composer-plus-btn');
    const slot = ensureComposerSlot(chatgptAdapter, 'dark');
    expect(slot).not.toBeNull();
    expect(slot!.nextElementSibling).toBe(plus);
    expect(slot!.contains(plus!)).toBe(false);
  });

  it('does not sit on Grok’s absolutely positioned +', () => {
    document.body.innerHTML = `
      <div class="wrap" style="display:flex;align-items:center;flex-direction:row">
        <form class="chat-input" style="position:relative">
          <button type="button" aria-label="Upload a file" aria-haspopup="menu" style="position:absolute;left:8px;top:8px">+</button>
          <textarea aria-label="Ask Grok anything" placeholder="How can I help you today?"></textarea>
        </form>
      </div>
    `;
    const plus = grokAdapter.getComposerLeadingAnchor();
    const shell = grokAdapter.getComposerShell();
    expect(plus).not.toBeNull();
    expect(shell).not.toBeNull();
    const slot = ensureComposerSlot(grokAdapter, 'dark');
    expect(slot).not.toBeNull();
    expect(slot!.contains(plus!)).toBe(false);
    expect(plus!.closest('[data-stemlm-composer-slot]')).toBeNull();
    expect(slot!.nextElementSibling === plus || slot!.nextElementSibling === shell).toBe(true);
    expect(slot!.dataset.dock === 'outside-shell' || slot!.nextElementSibling === shell).toBe(true);
  });
});

describe('isolateStemLmPointer', () => {
  it('stops bubble to a parent listener', () => {
    const parent = document.createElement('div');
    const child = document.createElement('button');
    parent.appendChild(child);
    document.body.appendChild(parent);
    const parentSpy = vi.fn();
    parent.addEventListener('click', parentSpy);
    const stop = isolateStemLmPointer(child);
    child.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(parentSpy).not.toHaveBeenCalled();
    stop();
    parent.remove();
  });
});
