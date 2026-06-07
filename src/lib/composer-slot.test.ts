import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { geminiAdapter } from '@/src/platforms/gemini';
import { ensureComposerSlot, removeComposerSlot } from './composer-slot';

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
