import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayButton } from './OverlayButton';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';

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

  it('idle glyph is a plus in a rounded-square control, not the therefore mark', () => {
    useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle' });
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const btn = container.querySelector('.slm-inject-btn') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    expect(btn.getAttribute('data-glyph')).toBe('plus');
    expect(btn.className).not.toMatch(/is-attached/);
    const html = btn.innerHTML;
    expect(html).toContain('M12 5v14');
    expect(html).toContain('slm-inject-plus');
    expect(html).toContain('slm-inject-tick');
    expect(btn.querySelectorAll('circle')).toHaveLength(0);
    expect(html).not.toContain('slm-extension-logo');
  });

  it('attached glyph is a tick; emptying the composer returns to plus', async () => {
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
    expect(btn.innerHTML).toContain('M20 6 9 17l-5-5');

    ed.textContent = '';
    await act(async () => {
      vi.advanceTimersByTime(500);
    });
    const after = container.querySelector('.slm-inject-btn') as HTMLButtonElement;
    expect(useStore.getState().buttonInjected).toBe(false);
    expect(after.getAttribute('data-glyph')).toBe('plus');
    expect(after.className).not.toMatch(/is-attached/);
    expect(after.innerHTML).toContain('M12 5v14');
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

  it('shadow inject stylesheet is a rounded square in brand orange, not a teal circle', () => {
    const css = readFileSync(resolve(process.cwd(), 'assets/panel.css'), 'utf8');
    const injectBlock = css.slice(css.indexOf('.slm-inject-btn {'), css.indexOf('.slm-inject-btn:hover'));
    expect(injectBlock).toContain('border-radius: 9px');
    expect(injectBlock).not.toContain('border-radius: 50%');
    expect(injectBlock).toContain('var(--slm-signal)');
    expect(injectBlock).not.toContain('var(--slm-accent)');
    expect(css).not.toMatch(/\.slm-inject-btn\s*\{[^}]*border-radius:\s*50%/);
    const tokens = readFileSync(resolve(process.cwd(), 'assets/tokens.css'), 'utf8');
    expect(tokens).toMatch(/--slm-signal:\s*#ff6b2c/i);
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
});
