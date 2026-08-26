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
  resolveComposerFrame,
  syncComposerSlotGeometry,
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
    if (spec.adapter.composerDock === 'outside-shell') {
      expect(slot!.dataset.dock).toBe('outside-shell');
      expect(shell?.contains(slot!)).toBe(false);
      expect(slot!.parentElement).toBe(document.documentElement);
    } else {
      expect(slot!.nextElementSibling === plus || slot!.nextElementSibling === shell).toBe(true);
    }

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

  it('keeps ChatGPT inject outside a grid pill that would clip extra children', () => {
    document.body.innerHTML = `
      <form>
        <div class="composer-pill" style="display:grid;grid-template-columns:auto 1fr auto;overflow:hidden">
          <button type="button" data-testid="composer-plus-btn" aria-label="Add files and more" aria-haspopup="menu">+</button>
          <div id="prompt-textarea" data-testid="prompt-textarea" contenteditable="true" role="textbox" data-placeholder="Ask anything"></div>
          <button type="button" aria-label="Think">Think</button>
        </div>
      </form>
    `;
    const plus = chatgptAdapter.getComposerLeadingAnchor();
    expect(plus).not.toBeNull();
    expect(plus!.getAttribute('data-testid')).toBe('composer-plus-btn');
    const pill = document.querySelector('.composer-pill') as HTMLElement;
    expect(resolveComposerFrame(chatgptAdapter)).toBe(pill);
    const slot = ensureComposerSlot(chatgptAdapter, 'dark');
    expect(slot).not.toBeNull();
    expect(slot!.dataset.dock).toBe('outside-shell');
    expect(pill.contains(slot!)).toBe(false);
    expect(slot!.parentElement).toBe(document.documentElement);
    expect(chatgptAdapter.composerDock).toBe('outside-shell');
  });

  it('docks ChatGPT inject outside a plus that sits beside the form', () => {
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
    const slot = ensureComposerSlot(chatgptAdapter, 'dark');
    expect(slot).not.toBeNull();
    expect(slot!.contains(plus!)).toBe(false);
    expect(slot!.dataset.dock).toBe('outside-shell');
    expect(slot!.parentElement).toBe(document.documentElement);
  });

  it('keeps Grok inject outside the box even when the + is in-flow', () => {
    document.body.innerHTML = `
      <div class="wrap" style="display:flex;flex-direction:column;align-items:center">
        <form class="chat-input" style="position:relative;display:flex;align-items:center;flex-direction:row">
          <button type="button" aria-label="Upload a file" aria-haspopup="menu">+</button>
          <textarea aria-label="Ask Grok anything" placeholder="What do you want to know?"></textarea>
        </form>
      </div>
    `;
    const plus = grokAdapter.getComposerLeadingAnchor();
    const shell = grokAdapter.getComposerShell();
    expect(plus).not.toBeNull();
    expect(shell).not.toBeNull();
    expect(grokAdapter.composerDock).toBe('outside-shell');
    const slot = ensureComposerSlot(grokAdapter, 'dark');
    expect(slot).not.toBeNull();
    expect(slot!.contains(plus!)).toBe(false);
    expect(plus!.closest('[data-stemlm-composer-slot]')).toBeNull();
    expect(shell!.contains(slot!)).toBe(false);
    expect(slot!.dataset.dock).toBe('outside-shell');
    expect(slot!.parentElement).toBe(document.documentElement);
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
    expect(shell!.contains(slot!)).toBe(false);
    expect(slot!.dataset.dock).toBe('outside-shell');
  });

  it('viewport-fixes ChatGPT just left of the visual pill', () => {
    document.body.innerHTML = `
      <form>
        <div class="composer-pill">
          <button type="button" data-testid="composer-plus-btn" aria-label="Add files and more">+</button>
          <div id="prompt-textarea" data-testid="prompt-textarea" contenteditable="true"></div>
        </div>
      </form>
    `;
    const pill = document.querySelector('.composer-pill') as HTMLElement;
    const plus = chatgptAdapter.getComposerLeadingAnchor()!;
    vi.spyOn(pill, 'getBoundingClientRect').mockReturnValue({
      x: 200, y: 400, width: 640, height: 52, top: 400, left: 200, bottom: 452, right: 840, toJSON() {},
    } as DOMRect);
    vi.spyOn(plus, 'getBoundingClientRect').mockReturnValue({
      x: 212, y: 410, width: 36, height: 36, top: 410, left: 212, bottom: 446, right: 248, toJSON() {},
    } as DOMRect);
    const slot = ensureComposerSlot(chatgptAdapter, 'dark')!;
    expect(slot.style.position).toBe('fixed');
    expect(Number.parseFloat(slot.style.left)).toBe(200 - 36 - 8);
    expect(Number.parseFloat(slot.style.top)).toBe(410 + (36 - 36) / 2);
  });

  it('finds the unauthenticated ChatGPT textarea composer and docks outside it', () => {
    document.body.innerHTML = `
      <form class="wm-composer-composer" data-landing>
        <button type="button" aria-label="Add files and more">+</button>
        <textarea id="mobile-composer-prompt" placeholder="Ask ChatGPT" aria-label="Chat with ChatGPT"></textarea>
        <button type="button" aria-label="Send message">Send</button>
      </form>
    `;
    expect(chatgptAdapter.findEditor()?.id).toBe('mobile-composer-prompt');
    expect(chatgptAdapter.getComposerLeadingAnchor()?.getAttribute('aria-label')).toBe('Add files and more');
    const slot = ensureComposerSlot(chatgptAdapter, 'light');
    expect(slot?.dataset.dock).toBe('outside-shell');
    expect(document.querySelector('form')!.contains(slot!)).toBe(false);
  });

  it('pins a narrow centered pill to the left edge instead of covering the heading', () => {
    document.body.innerHTML = `
      <form>
        <div class="composer-pill">
          <button type="button" data-testid="composer-plus-btn" aria-label="Add files and more">+</button>
          <div id="prompt-textarea" data-testid="prompt-textarea" contenteditable="true"></div>
        </div>
      </form>
    `;
    const pill = document.querySelector('.composer-pill') as HTMLElement;
    const plus = chatgptAdapter.getComposerLeadingAnchor()!;
    vi.spyOn(pill, 'getBoundingClientRect').mockReturnValue({
      x: 12, y: 520, width: 366, height: 52, top: 520, left: 12, bottom: 572, right: 378, toJSON() {},
    } as DOMRect);
    vi.spyOn(plus, 'getBoundingClientRect').mockReturnValue({
      x: 20, y: 528, width: 32, height: 32, top: 528, left: 20, bottom: 560, right: 52, toJSON() {},
    } as DOMRect);
    const slot = ensureComposerSlot(chatgptAdapter, 'dark')!;
    expect(Number.parseFloat(slot.style.left)).toBe(8);
    expect(Number.parseFloat(slot.style.top)).toBe(528);
    expect(Number.parseFloat(slot.style.top)).toBeGreaterThan(400);
  });

  it('sits above a bottom-docked narrow composer when there is no left room', () => {
    document.body.innerHTML = `
      <div class="thread"><p>assistant reply</p></div>
      <form>
        <div class="composer-pill">
          <button type="button" data-testid="composer-plus-btn" aria-label="Add files and more">+</button>
          <div id="prompt-textarea" data-testid="prompt-textarea" contenteditable="true"></div>
        </div>
      </form>
    `;
    const pill = document.querySelector('.composer-pill') as HTMLElement;
    const plus = chatgptAdapter.getComposerLeadingAnchor()!;
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(844);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(390);
    vi.spyOn(pill, 'getBoundingClientRect').mockReturnValue({
      x: 12, y: 780, width: 366, height: 52, top: 780, left: 12, bottom: 832, right: 378, toJSON() {},
    } as DOMRect);
    vi.spyOn(plus, 'getBoundingClientRect').mockReturnValue({
      x: 20, y: 788, width: 32, height: 32, top: 788, left: 20, bottom: 820, right: 52, toJSON() {},
    } as DOMRect);
    const slot = ensureComposerSlot(chatgptAdapter, 'dark')!;
    expect(Number.parseFloat(slot.style.left)).toBe(12);
    expect(Number.parseFloat(slot.style.top)).toBe(780 - 32 - 8);
    expect(Number.parseFloat(slot.style.top) + 32).toBeLessThanOrEqual(780);
  });

  it('prefers the inner pill over a page-sized wrapper that also contains a stray +', () => {
    document.body.innerHTML = `
      <div class="page">
        <button type="button" data-testid="composer-plus-btn" aria-label="Add files and more">+</button>
        <form>
          <div class="composer-pill">
            <div id="prompt-textarea" data-testid="prompt-textarea" contenteditable="true"></div>
          </div>
        </form>
      </div>
    `;
    const page = document.querySelector('.page') as HTMLElement;
    const form = document.querySelector('form') as HTMLElement;
    const pill = document.querySelector('.composer-pill') as HTMLElement;
    vi.spyOn(page, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, width: 1440, height: 900, top: 0, left: 0, bottom: 900, right: 1440, toJSON() {},
    } as DOMRect);
    vi.spyOn(form, 'getBoundingClientRect').mockReturnValue({
      x: 200, y: 780, width: 720, height: 64, top: 780, left: 200, bottom: 844, right: 920, toJSON() {},
    } as DOMRect);
    vi.spyOn(pill, 'getBoundingClientRect').mockReturnValue({
      x: 220, y: 788, width: 680, height: 48, top: 788, left: 220, bottom: 836, right: 900, toJSON() {},
    } as DOMRect);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900);
    expect(resolveComposerFrame(chatgptAdapter)).toBe(pill);
  });

  it('docks beside a bottom-of-thread ChatGPT composer, not the page heading', () => {
    document.body.innerHTML = `
      <h1>Conversation</h1>
      <div class="thread"><p>assistant reply</p></div>
      <form>
        <div class="composer-pill">
          <button type="button" data-testid="composer-plus-btn" aria-label="Add files and more">+</button>
          <div id="prompt-textarea" data-testid="prompt-textarea" contenteditable="true"></div>
        </div>
      </form>
    `;
    const pill = document.querySelector('.composer-pill') as HTMLElement;
    const plus = chatgptAdapter.getComposerLeadingAnchor()!;
    vi.spyOn(pill, 'getBoundingClientRect').mockReturnValue({
      x: 180, y: 820, width: 720, height: 52, top: 820, left: 180, bottom: 872, right: 900, toJSON() {},
    } as DOMRect);
    vi.spyOn(plus, 'getBoundingClientRect').mockReturnValue({
      x: 192, y: 828, width: 36, height: 36, top: 828, left: 192, bottom: 864, right: 228, toJSON() {},
    } as DOMRect);
    vi.spyOn(window, 'innerHeight', 'get').mockReturnValue(900);
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1440);
    const slot = ensureComposerSlot(chatgptAdapter, 'dark')!;
    expect(slot.dataset.dock).toBe('outside-shell');
    expect(Number.parseFloat(slot.style.left)).toBe(180 - 36 - 8);
    expect(Number.parseFloat(slot.style.top)).toBe(828);
    expect(Number.parseFloat(slot.style.top)).toBeGreaterThan(700);
  });

  it('updates the outside-shell position when the composer rect moves', () => {
    document.body.innerHTML = `
      <form>
        <div class="composer-pill">
          <button type="button" data-testid="composer-plus-btn" aria-label="Add files and more">+</button>
          <div id="prompt-textarea" data-testid="prompt-textarea" contenteditable="true"></div>
        </div>
      </form>
    `;
    const pill = document.querySelector('.composer-pill') as HTMLElement;
    const plus = chatgptAdapter.getComposerLeadingAnchor()!;
    const pillRect = { left: 200, top: 400, width: 640, height: 52 };
    const plusRect = { left: 212, top: 410, width: 36, height: 36 };
    const pillSpy = vi.spyOn(pill, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          x: pillRect.left,
          y: pillRect.top,
          width: pillRect.width,
          height: pillRect.height,
          top: pillRect.top,
          left: pillRect.left,
          bottom: pillRect.top + pillRect.height,
          right: pillRect.left + pillRect.width,
          toJSON() {},
        }) as DOMRect,
    );
    vi.spyOn(plus, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          x: plusRect.left,
          y: plusRect.top,
          width: plusRect.width,
          height: plusRect.height,
          top: plusRect.top,
          left: plusRect.left,
          bottom: plusRect.top + plusRect.height,
          right: plusRect.left + plusRect.width,
          toJSON() {},
        }) as DOMRect,
    );
    const slot = ensureComposerSlot(chatgptAdapter, 'dark')!;
    expect(Number.parseFloat(slot.style.left)).toBe(200 - 36 - 8);
    pillRect.left = 160;
    pillRect.top = 360;
    plusRect.left = 172;
    plusRect.top = 370;
    syncComposerSlotGeometry(chatgptAdapter);
    expect(Number.parseFloat(slot.style.left)).toBe(160 - 36 - 8);
    expect(Number.parseFloat(slot.style.top)).toBe(370);
    pillSpy.mockRestore();
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
