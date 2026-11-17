import { describe, it, expect, afterEach, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { DiagramRenderer } from './DiagramRenderer';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const GRAPH = { type: 'graph', content: 'node: a Glucose\nnode: b Pyruvate\nedge: a b glycolysis', caption: 'Glycolysis overview' } as const;

/** Wait by the clock, not by a number of ticks: the first compile of a run loads the graph engine. */
async function settle(check: () => boolean, withinMs = 4000): Promise<void> {
  const deadline = Date.now() + withinMs;
  while (!check() && Date.now() < deadline) {
    await act(async () => { await new Promise((r) => setTimeout(r, 5)); });
  }
}

function deepActive(): Element | null {
  let active = document.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

function key(target: Element, name: string, shiftKey = false): void {
  act(() => { target.dispatchEvent(new KeyboardEvent('keydown', { key: name, shiftKey, bubbles: true, composed: true })); });
}

describe('FIG-SIZE-01 figure lightbox', () => {
  let host: HTMLElement | undefined;
  let root: Root | undefined;

  afterEach(() => {
    act(() => root?.unmount());
    host?.remove();
    host = undefined;
    root = undefined;
  });

  async function mount(onPanelKey = vi.fn()) {
    host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const app = document.createElement('div');
    app.id = 'stemlm-app';
    shadow.appendChild(app);
    await act(async () => {
      root = createRoot(app);
      root.render(
        <aside onKeyDown={onPanelKey}>
          <DiagramRenderer diagram={GRAPH} theme="dark" section />
        </aside>,
      );
    });
    await settle(() => Boolean(shadow.querySelector('.slm-diagram-svg svg')));
    return shadow;
  }

  it('opens an enlarged, labelled modal copy of the figure from a keyboard-reachable button', async () => {
    const shadow = await mount();
    const enlarge = shadow.querySelector<HTMLButtonElement>('button.slm-diagram-enlarge')!;
    expect(enlarge).toBeTruthy();
    expect(enlarge.getAttribute('aria-label')).toBe('Enlarge diagram');
    expect(enlarge.getAttribute('aria-haspopup')).toBe('dialog');
    enlarge.focus();
    act(() => enlarge.click());

    const dialog = shadow.querySelector('[role="dialog"]')!;
    expect(dialog).toBeTruthy();
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Glycolysis overview');
    expect(dialog.closest('[data-stemlm-theme]')?.getAttribute('data-stemlm-theme')).toBe('dark');
    expect(dialog.querySelector('.slm-diagram-svg svg')).toBeTruthy();
    expect(dialog.textContent).toContain('Glucose');
    expect(dialog.querySelector('figcaption')?.textContent).toBe('Glycolysis overview');
    expect(deepActive()).toBe(dialog.querySelector('button.slm-lightbox-close'));
  });

  it('closes on Escape without closing the panel, and returns focus to the opener', async () => {
    const onPanelKey = vi.fn();
    const shadow = await mount(onPanelKey);
    const enlarge = shadow.querySelector<HTMLButtonElement>('button.slm-diagram-enlarge')!;
    enlarge.focus();
    act(() => enlarge.click());
    const close = shadow.querySelector('button.slm-lightbox-close')!;
    key(close, 'ArrowRight');
    key(close, 'Escape');
    expect(shadow.querySelector('[role="dialog"]')).toBeNull();
    expect(onPanelKey).not.toHaveBeenCalled();
    expect(deepActive()).toBe(enlarge);
  });

  it('keeps Tab inside the dialog and closes from the backdrop', async () => {
    const shadow = await mount();
    act(() => shadow.querySelector<HTMLButtonElement>('button.slm-diagram-enlarge')!.click());
    const close = shadow.querySelector<HTMLButtonElement>('button.slm-lightbox-close')!;
    key(close, 'Tab');
    expect(deepActive()).toBe(close);
    key(close, 'Tab', true);
    expect(deepActive()).toBe(close);
    act(() => shadow.querySelector<HTMLButtonElement>('.slm-lightbox-backdrop')!.click());
    expect(shadow.querySelector('[role="dialog"]')).toBeNull();
  });

  it('also opens when the figure itself is clicked', async () => {
    const shadow = await mount();
    act(() => shadow.querySelector<HTMLElement>('.slm-step-diagram .slm-diagram-frame')!.click());
    expect(shadow.querySelector('[role="dialog"]')).toBeTruthy();
  });

  it('offers no enlarge control for a figure that stays hidden', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    await act(async () => {
      root = createRoot(host!);
      root.render(<DiagramRenderer diagram={{ type: 'graph', content: 'caption: nothing drawable' }} theme="light" section />);
    });
    await settle(() => false, 250);
    expect(host.querySelector('button.slm-diagram-enlarge')).toBeNull();
  });
});
