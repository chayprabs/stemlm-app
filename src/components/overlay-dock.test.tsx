import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayButton } from './OverlayButton';
import { useStore } from '@/src/state/store';
import { HOST_FIXTURES, mountHostComposer } from '@/src/platforms/host-fixtures';
import { removeComposerSlot } from '@/src/lib/composer-slot';
import { injectControlEnabled } from '@/src/platforms/routes';
import type { PlatformAdapter } from '@/src/platforms/types';

let activeAdapter: PlatformAdapter = HOST_FIXTURES[0]!.adapter;

vi.mock('@/src/content/controller', () => ({
  getController: () => ({
    inject: vi.fn(async () => true),
    getLastQuestion: vi.fn(() => ''),
    resetInjection: vi.fn(),
  }),
}));

vi.mock('@/src/platforms/detect', () => ({
  detectAdapter: () => activeAdapter,
}));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

describe.each(HOST_FIXTURES)('$id overlay docks beside the shipped leading +', (spec) => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    activeAdapter = spec.adapter;
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    mountHostComposer(spec, { capsule: false });
    useStore.setState({
      buttonInjected: false,
      panelOpen: false,
      status: 'idle',
    });
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    removeComposerSlot();
    document.body.innerHTML = '';
  });

  it('portals the inject control next to the + and not inside the stemLM slot as the +', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const plus = spec.adapter.getComposerLeadingAnchor();
    expect(plus).not.toBeNull();
    expect(plus!.getAttribute('aria-label')).toBe(spec.plusLabel);
    expect(plus!.closest('[data-stemlm-composer-slot]')).toBeNull();

    const slot = document.querySelector('[data-stemlm-composer-slot]');
    expect(slot).not.toBeNull();
    const shell = spec.adapter.getComposerShell();
    const next = slot!.nextElementSibling;
    expect(next === plus || next === shell).toBe(true);
    expect(slot!.querySelector('button')).not.toBeNull();
    expect(slot!.contains(plus!)).toBe(false);

    const inject = slot!.querySelector('button') as HTMLButtonElement;
    expect(inject).toBeTruthy();
    expect(inject.getAttribute('data-stemlm-inject')).toBe('true');
    expect(inject.getAttribute('data-glyph')).toBe('plus');
    expect(inject.innerHTML).toContain('M12 5v14');
    expect(inject.querySelectorAll('circle')).toHaveLength(0);
  });

  it('does not fire the host + listener when the stemLM control is clicked', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const plus = spec.adapter.getComposerLeadingAnchor()!;
    const parent = plus.parentElement!;
    const plusClick = vi.fn();
    const plusDown = vi.fn();
    const parentClick = vi.fn();
    const parentDown = vi.fn();
    plus.addEventListener('click', plusClick);
    plus.addEventListener('pointerdown', plusDown);
    parent.addEventListener('click', parentClick);
    parent.addEventListener('pointerdown', parentDown);

    const inject = document.querySelector('[data-stemlm-inject]') as HTMLButtonElement;
    expect(inject).toBeTruthy();
    await act(async () => {
      inject.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      inject.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    });

    expect(plusClick).not.toHaveBeenCalled();
    expect(plusDown).not.toHaveBeenCalled();
    expect(parentClick).not.toHaveBeenCalled();
    expect(parentDown).not.toHaveBeenCalled();

    await act(async () => {
      plus.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      plus.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, cancelable: true }));
    });
    expect(plusClick).toHaveBeenCalledTimes(1);
    expect(plusDown).toHaveBeenCalledTimes(1);
  });
});

describe('inject control hides on image-gen SPA routes', () => {
  const grok = HOST_FIXTURES.find((s) => s.id === 'grok')!;
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    activeAdapter = grok.adapter;
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    mountHostComposer(grok, { capsule: false });
    useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle' });
    window.history.replaceState({}, '', '/chat');
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    removeComposerSlot();
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/');
  });

  it('hides on /imagine and shows again on a chat path', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.querySelector('[data-stemlm-inject]')).not.toBeNull();

    await act(async () => {
      window.history.pushState({}, '', '/imagine');
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(injectControlEnabled('grok', location.pathname)).toBe(false);
    expect(document.querySelector('[data-stemlm-inject]')).toBeNull();
    expect(document.querySelector('[data-stemlm-composer-slot]')).toBeNull();

    await act(async () => {
      window.history.pushState({}, '', '/chat');
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(injectControlEnabled('grok', location.pathname)).toBe(true);
    expect(document.querySelector('[data-stemlm-inject]')).not.toBeNull();
  });
});
