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

vi.mock('@/src/content/controller', () => ({
  getController: () => ({
    inject,
    getLastQuestion,
    resetInjection,
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

vi.mock('@/src/lib/composer-slot', () => ({
  ensureComposerSlot: () => null,
  removeComposerSlot: () => {},
  syncComposerSlotGeometry: () => {},
  isolateStemLmPointer: () => () => {},
  resolveComposerFrame: () => document.body,
  outsideShellCoords: () => ({ top: 100, left: 24 }),
  _composerSlotGap: 8,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe('OverlayButton re-inject vs panel toggle', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    inject.mockClear();
    resetInjection.mockClear();
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
    expect(btn.getAttribute('aria-label')).toBe('Study with stemlm: attach the guide to this question');
    expect(btn.getAttribute('aria-pressed')).toBe('false');
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

  it('carries its own stylesheet into the shadow root: a rounded square on the brand signal', () => {
    useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle' });
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    // Not docked here, so the control is the fixed fallback and brings its rules with it.
    const css = container.querySelector('.slm-fab-wrap--fixed > style')?.textContent ?? '';
    const base = css.slice(css.indexOf('.slm-inject-btn {'), css.indexOf('.slm-inject-btn:hover'));
    expect(base).toContain(`border-radius: ${INJECT_RADIUS}`);
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
    expect(useStore.getState().panelOpen).toBe(true);
    expect(container.querySelector('.slm-inject-btn')).not.toBeNull();
    expect(container.querySelector('.slm-inject-status')).toBeNull();
  });
});
