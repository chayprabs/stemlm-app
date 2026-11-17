import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayButton } from './OverlayButton';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { injectControlCss } from '@/src/lib/inject-control-css';

const _slotCss = injectControlCss('', (scheme) => `.slm-fab-wrap[data-scheme="${scheme}"]`);

const inject = vi.fn<() => Promise<boolean>>();

vi.mock('@/src/content/controller', () => ({
  getController: () => ({
    inject,
    getLastQuestion: vi.fn(() => ''),
    resetInjection: vi.fn(),
    takeAttachNotice: vi.fn(() => null),
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

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

describe('attachment responsiveness', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    const editor = document.createElement('div');
    editor.id = 'ed';
    document.body.appendChild(editor);
    useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle', settings: DEFAULT_SETTINGS });
    inject.mockReset();
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    document.getElementById('ed')?.remove();
  });

  it('keeps one focused button in place while attachment is pending', async () => {
    let finish!: (value: boolean) => void;
    inject.mockReturnValueOnce(new Promise<boolean>((resolve) => { finish = resolve; }));
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const button = container.querySelector<HTMLButtonElement>('[data-stemlm-inject]')!;
    button.focus();
    await act(async () => { button.click(); });

    expect(container.querySelector('[data-stemlm-inject]')).toBe(button);
    expect(button.className).toContain('is-loading');
    expect(button.getAttribute('aria-busy')).toBe('true');
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(document.activeElement).toBe(button);
    expect(container.querySelector('[aria-live="polite"]')?.textContent).toMatch(/attaching/i);

    await act(async () => { finish(true); });
    expect(container.querySelector('[data-stemlm-inject]')).toBe(button);
    expect(button.className).not.toContain('is-loading');
    expect(button.getAttribute('aria-busy')).toBe('false');
    expect(button.getAttribute('aria-disabled')).toBe('false');
  });

  it('does not start a second attachment while the first is pending', async () => {
    let finish!: (value: boolean) => void;
    inject.mockReturnValueOnce(new Promise<boolean>((resolve) => { finish = resolve; }));
    act(() => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    const button = container.querySelector<HTMLButtonElement>('[data-stemlm-inject]')!;
    await act(async () => {
      button.click();
      button.click();
    });
    expect(inject).toHaveBeenCalledTimes(1);
    await act(async () => { finish(true); });
  });

  it('ships the attaching animation with a reduced-motion override', () => {
    expect(_slotCss).toMatch(/\.slm-inject-status|\.slm-inject-spinner/);
    // While attaching, the three shapes of the mark rise in turn; this is the one loop.
    expect(_slotCss).toMatch(/\.slm-inject-spinner \.slm-inject-apex\s*\{[^}]*animation:\s*slm-inject-think [^;]*infinite/);
    expect(_slotCss).toContain('@keyframes slm-inject-think');
    const reduced = _slotCss.slice(_slotCss.indexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toMatch(/\.slm-inject-spinner \.slm-inject-apex\s*\{[^}]*animation:\s*none/);
    expect(reduced).toMatch(/transition:\s*none/);
  });
});
