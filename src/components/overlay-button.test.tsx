import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayButton } from './OverlayButton';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { INJECT_RADIUS, INJECT_SIGNAL, INJECT_SIGNAL_STRONG } from '@/src/lib/inject-control-css';

const inject = vi.fn(async () => true);
const getLastQuestion = vi.fn(() => 'Old circuit question');
const resetInjection = vi.fn(() => {
  useStore.getState().setButtonInjected(false);
});
const takeAttachNotice = vi.fn<() => { tone: 'info' | 'error'; text: string } | null>(() => null);

vi.mock('@/src/content/controller', () => ({
  getController: () => ({
    inject,
    getLastQuestion,
    resetInjection,
    takeAttachNotice,
  }),
}));

vi.mock('@/src/platforms/detect', () => ({
  detectAdapter: () => ({
    id: 'gemini',
    brand: { accent: '#4285f4', neutral: false },
    findEditor: () => document.getElementById('ed'),
    getEditorText: () => document.getElementById('ed')?.textContent ?? '',
    getComposerLeadingAnchor: () => null,
    getComposerShell: () => document.body,
    getComposerBox: () => document.body,
  }),
}));

// The control exists only beside a measured attach button; here it is always given one.
vi.mock('@/src/lib/composer-anchor', () => ({
  trackComposerControl: (_adapter: unknown, _enabled: unknown, show: (place: unknown) => void) => {
    show({ anchor: document.body, left: 100, top: 200, size: 32, radius: '999px', ink: '', scheme: 'light' });
    return () => {};
  },
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('OverlayButton re-inject vs panel toggle', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    inject.mockClear();
    resetInjection.mockClear();
    takeAttachNotice.mockReset();
    takeAttachNotice.mockReturnValue(null);
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    const ed = document.createElement('div');
    ed.id = 'ed';
    document.body.appendChild(ed);
    useStore.setState({
      buttonInjected: true,
      panelOpen: false,
      status: 'ready',
      settings: DEFAULT_SETTINGS,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    act(() => root.unmount());
    container.remove();
    document.getElementById('ed')?.remove();
    useStore.setState({ settings: DEFAULT_SETTINGS });
  });

  it('injects a pointer when protocol is present and the question changed', async () => {
    getLastQuestion.mockReturnValue('Old circuit question');
    const ed = document.getElementById('ed')!;
    ed.textContent = 'New projectile question\n--- stemLM ---\nFollow the attached stemlm-protocol.txt';
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    await act(async () => {
      btn.click();
    });
    expect(inject).toHaveBeenCalled();
  });

  it('toggles the panel when the question is unchanged', async () => {
    getLastQuestion.mockReturnValue('Same question');
    const ed = document.getElementById('ed')!;
    ed.textContent = 'Same question\n--- stemLM ---\nFollow the attached stemlm-protocol.txt';
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const btn = container.querySelector('button') as HTMLButtonElement;
    await act(async () => {
      btn.click();
    });
    expect(inject).not.toHaveBeenCalled();
    expect(useStore.getState().panelOpen).toBe(true);
  });

  it('idle glyph is the therefore mark, so the control cannot be taken for the chat\'s own plus', () => {
    useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle' });
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const btn = container.querySelector('.slm-inject-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('data-glyph')).toBe('mark');
    expect(btn.className).not.toMatch(/is-attached/);
    const html = btn.innerHTML;
    // Two premises and a conclusion: two dots and the square apex, drawn inline at glyph size.
    const mark = btn.querySelector('.slm-inject-mark') as SVGElement;
    expect(mark.querySelectorAll('circle.slm-inject-dot')).toHaveLength(2);
    expect(mark.querySelectorAll('rect.slm-inject-apex')).toHaveLength(1);
    expect(btn.querySelector('.slm-inject-glyph')?.classList.contains('is-mark')).toBe(true);
    expect(html).not.toContain('M12 5v14');
    expect(html).not.toContain('slm-inject-plus');
    // The tick is already in place for the swap; it is only shown once the guide is attached.
    expect(html).toContain('slm-inject-tick');
    expect(html).not.toContain('slm-extension-logo');
    // The glyph is decoration: the control's name says what pressing it does.
    expect(btn.querySelector('.slm-inject-glyph')?.getAttribute('aria-hidden')).toBe('true');
    expect(btn.getAttribute('aria-label')).toBe('Add the stemLM guide to this question');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
    expect(btn.getAttribute('data-state')).toBe('idle');
    // The same words are beside the control for a pointer or the keyboard; no native title doubles them.
    expect(container.querySelector('.slm-inject-tip')?.textContent).toBe('Add the stemLM guide to this question');
    expect(btn.hasAttribute('title')).toBe(false);
  });

  it('attached glyph is a tick; emptying the composer returns to the mark', async () => {
    vi.useFakeTimers();
    getLastQuestion.mockReturnValue('A question');
    const ed = document.getElementById('ed')!;
    ed.textContent = 'A question\n--- stemLM ---\nstub';
    // inject()/followUp set buttonInjected + status loading together; that is
    // the real post-send window when the host composer is cleared.
    useStore.setState({ buttonInjected: true, panelOpen: false, status: 'loading' });
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const btn = container.querySelector('.slm-inject-btn') as HTMLButtonElement;
    expect(btn.getAttribute('data-glyph')).toBe('tick');
    expect(btn.className).toMatch(/is-attached/);
    expect(btn.querySelector('.slm-inject-glyph')?.classList.contains('is-tick')).toBe(true);
    expect(btn.querySelector('.slm-inject-tick path')).toBeTruthy();
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.getAttribute('data-state')).toBe('attached');
    expect(btn.getAttribute('aria-label')).toBe('stemLM is on for this question. Open the panel');

    ed.textContent = '';
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    const after = container.querySelector('.slm-inject-btn') as HTMLButtonElement;
    expect(useStore.getState().buttonInjected).toBe(false);
    expect(after.getAttribute('data-glyph')).toBe('mark');
    expect(after.className).not.toMatch(/is-attached/);
    expect(after.querySelector('.slm-inject-glyph')?.classList.contains('is-mark')).toBe(true);
    vi.useRealTimers();
  });

  it('does not reset injection while loading if the composer still has text', async () => {
    vi.useFakeTimers();
    getLastQuestion.mockReturnValue('A question');
    const ed = document.getElementById('ed')!;
    ed.textContent = 'A question\n--- stemLM ---\nstub';
    useStore.setState({ buttonInjected: true, panelOpen: false, status: 'loading' });
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    expect(resetInjection).not.toHaveBeenCalled();
    expect(useStore.getState().buttonInjected).toBe(true);
    expect(container.querySelector('.slm-inject-btn')?.getAttribute('data-glyph')).toBe('tick');
    vi.useRealTimers();
  });

  it('carries its own stylesheet into the shadow root, and is laid out at the place it was given', () => {
    useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle' });
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const wrap = container.querySelector('.slm-fab-wrap') as HTMLElement;
    // Its box is the measured one: beside the chat's attach button, at that button's size and corner.
    expect(wrap.style.left).toBe('100px');
    expect(wrap.style.top).toBe('200px');
    expect(wrap.style.getPropertyValue('--slm-inject-size')).toBe('32px');
    expect(wrap.style.getPropertyValue('--slm-inject-radius')).toBe('999px');
    expect(wrap.dataset.scheme).toBe('light');
    const css = wrap.querySelector(':scope > style')?.textContent ?? '';
    const base = css.slice(css.indexOf('.slm-inject-btn {'), css.indexOf('.slm-inject-btn:hover'));
    expect(base).toContain(`border-radius: var(--slm-inject-radius, ${INJECT_RADIUS})`);
    expect(base).not.toContain('border-radius: 50%');
    expect(css).toContain(INJECT_SIGNAL);
    expect(css).not.toMatch(/--slm-accent|teal/);
    // The panel's sheet holds none of it: one stylesheet serves the docked and the fixed control.
    const panelCss = readFileSync(resolve(process.cwd(), 'assets/panel.css'), 'utf8');
    expect(panelCss).not.toMatch(/\.slm-inject-(?:btn|glyph|mark|tick|spinner)/);
    // And its orange is the panel's signal, to the digit.
    const tokens = readFileSync(resolve(process.cwd(), 'assets/tokens.css'), 'utf8');
    expect(new RegExp(`--slm-signal:\\s*${INJECT_SIGNAL}`, 'i').test(tokens)).toBe(true);
    expect(new RegExp(`--slm-signal-strong:\\s*${INJECT_SIGNAL_STRONG}`, 'i').test(tokens)).toBe(true);
  });

  it('hides the attach control when stemlm is turned off', async () => {
    useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle' });
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    expect(container.querySelector('.slm-inject-btn')).toBeTruthy();

    await act(async () => {
      useStore.setState({ settings: { ...DEFAULT_SETTINGS, stemlmEnabled: false } });
    });
    expect(container.querySelector('.slm-inject-btn')).toBeNull();
  });

  it('starts only one attachment when activated twice before React renders', async () => {
    let finish!: (ok: boolean) => void;
    inject.mockImplementationOnce(() => new Promise<boolean>((resolve) => { finish = resolve; }));
    useStore.setState({ buttonInjected: false, status: 'idle' });
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const button = container.querySelector('button')!;
    act(() => { button.click(); button.click(); });
    expect(inject).toHaveBeenCalledTimes(1);
    await act(async () => { finish(true); });
  });

  it('shows a recoverable error when attachment unexpectedly rejects', async () => {
    inject.mockRejectedValueOnce(new Error('Host editor disconnected'));
    useStore.setState({ buttonInjected: false, status: 'idle' });
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    await act(async () => { container.querySelector('button')!.click(); });
    expect(useStore.getState().status).toBe('error');
    expect(useStore.getState().errorMessage).toMatch(/try.*again/i);
    // A press never opens the panel, even to report a failure: the student is still writing.
    expect(useStore.getState().panelOpen).toBe(false);
    expect(container.querySelector('.slm-inject-btn')).not.toBeNull();
    expect(container.querySelector('.slm-inject-status')).toBeNull();
    // The control says so itself, in place: an error state and one short line beside it.
    const btn = container.querySelector('.slm-inject-btn')!;
    expect(btn.getAttribute('data-state')).toBe('error');
    expect(btn.getAttribute('data-glyph')).toBe('alert');
    expect(container.querySelector('.slm-inject-tip.is-open')?.textContent).toMatch(/try again/i);
    expect(container.querySelector('[role="status"]')?.textContent).toMatch(/try again/i);
  });

  it('shows the line the controller left about the last press, then lets it go', async () => {
    vi.useFakeTimers();
    takeAttachNotice.mockReturnValueOnce({ tone: 'info', text: 'This chat did not take a file, so the guide is in your message as text.' });
    inject.mockImplementationOnce(async () => {
      useStore.getState().setButtonInjected(true);
      return true;
    });
    useStore.setState({ buttonInjected: false, status: 'idle' });
    document.getElementById('ed')!.textContent = 'A question';
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    await act(async () => { container.querySelector('button')!.click(); });
    const btn = container.querySelector('.slm-inject-btn')!;
    // The guide went in as text: stemlm is on for the question, and the line says how.
    expect(btn.getAttribute('data-state')).toBe('attached');
    expect(container.querySelector('.slm-inject-tip.is-open')?.textContent).toMatch(/as text/);
    expect(container.querySelector('[role="status"]')?.textContent).toMatch(/as text/);
    await act(async () => { vi.advanceTimersByTime(7100); });
    expect(container.querySelector('.slm-inject-tip.is-open')).toBeNull();
    expect(container.querySelector('.slm-inject-btn')?.getAttribute('data-state')).toBe('attached');
  });

  it('keeps a press on the control from the chat page\'s own listeners', async () => {
    useStore.setState({ buttonInjected: false, status: 'idle' });
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const seen = vi.fn();
    for (const type of ['click', 'pointerdown', 'mousedown', 'keydown']) document.addEventListener(type, seen);
    const btn = container.querySelector('button')!;
    await act(async () => {
      btn.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
      btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      btn.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
      btn.click();
    });
    for (const type of ['click', 'pointerdown', 'mousedown', 'keydown']) document.removeEventListener(type, seen);
    expect(inject).toHaveBeenCalledTimes(1);
    expect(seen).not.toHaveBeenCalled();
  });
});
