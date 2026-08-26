import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayButton } from './OverlayButton';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
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
      settings: DEFAULT_SETTINGS,
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
    if (spec.adapter.composerDock === 'outside-shell') {
      expect(slot!.getAttribute('data-dock')).toBe('outside-shell');
      expect(shell?.contains(slot!)).toBe(false);
    } else {
      const next = slot!.nextElementSibling;
      expect(next === plus || next === shell).toBe(true);
    }
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
    useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle', settings: DEFAULT_SETTINGS });
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

describe('inject control hides when stemlm is turned off', () => {
  const grok = HOST_FIXTURES.find((s) => s.id === 'grok')!;
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    activeAdapter = grok.adapter;
    document.body.innerHTML = '';
    container = document.createElement('div');
    document.body.appendChild(container);
    mountHostComposer(grok, { capsule: false });
    useStore.setState({
      buttonInjected: false,
      panelOpen: false,
      status: 'idle',
      settings: DEFAULT_SETTINGS,
    });
    window.history.replaceState({}, '', '/chat');
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    removeComposerSlot();
    document.body.innerHTML = '';
    window.history.replaceState({}, '', '/');
    useStore.setState({ settings: DEFAULT_SETTINGS });
  });

  it('removes the composer attach control and restores it when turned back on', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.querySelector('[data-stemlm-inject]')).not.toBeNull();
    expect(document.querySelector('[data-stemlm-composer-slot]')).not.toBeNull();

    await act(async () => {
      useStore.setState({ settings: { ...DEFAULT_SETTINGS, stemlmEnabled: false } });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.querySelector('[data-stemlm-inject]')).toBeNull();
    expect(document.querySelector('[data-stemlm-composer-slot]')).toBeNull();

    await act(async () => {
      useStore.setState({ settings: DEFAULT_SETTINGS });
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.querySelector('[data-stemlm-inject]')).not.toBeNull();
  });
});

describe('outside-shell overlay stays visible and tracks the composer', () => {
  const chatgpt = HOST_FIXTURES.find((s) => s.id === 'chatgpt')!;
  let container: HTMLDivElement;
  let root: Root | undefined;

  function mockBox(el: Element, box: { left: number; top: number; width: number; height: number }) {
    vi.spyOn(el, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          x: box.left,
          y: box.top,
          width: box.width,
          height: box.height,
          top: box.top,
          left: box.left,
          bottom: box.top + box.height,
          right: box.left + box.width,
          toJSON() {},
        }) as DOMRect,
    );
  }

  beforeEach(() => {
    activeAdapter = chatgpt.adapter;
    document.body.innerHTML = '';
    mountHostComposer(chatgpt, { capsule: false });
    container = document.createElement('div');
    document.body.appendChild(container);
    useStore.setState({
      buttonInjected: false,
      panelOpen: false,
      status: 'idle',
      splitRatio: 0.5,
      splitDragging: false,
      settings: DEFAULT_SETTINGS,
    });
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    removeComposerSlot();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('repositions immediately on scroll instead of waiting for the dock debounce', async () => {
    const pill = document.querySelector('.composer-pill') as HTMLElement;
    const plus = chatgpt.adapter.getComposerLeadingAnchor()!;
    const pillBox = { left: 200, top: 400, width: 640, height: 52 };
    const plusBox = { left: 212, top: 410, width: 36, height: 36 };
    mockBox(pill, pillBox);
    mockBox(plus, plusBox);

    await act(async () => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const slot = document.querySelector('[data-stemlm-composer-slot]') as HTMLElement;
    expect(slot).not.toBeNull();
    expect(Number.parseFloat(slot.style.left)).toBe(200 - 36 - 8);

    pillBox.left = 140;
    pillBox.top = 320;
    plusBox.left = 152;
    plusBox.top = 330;
    mockBox(pill, pillBox);
    mockBox(plus, plusBox);

    await act(async () => {
      window.dispatchEvent(new Event('scroll'));
    });

    expect(Number.parseFloat(slot.style.left)).toBe(140 - 36 - 8);
    expect(Number.parseFloat(slot.style.top)).toBe(330);
  });

  it('falls back to a visible fixed wrap if the dock slot is disconnected', async () => {
    const pill = document.querySelector('.composer-pill') as HTMLElement;
    mockBox(pill, { left: 200, top: 400, width: 640, height: 52 });

    await act(async () => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const slot = document.querySelector('[data-stemlm-composer-slot]') as HTMLElement;
    expect(slot?.querySelector('[data-stemlm-inject]')).not.toBeNull();
    slot.remove();

    await act(async () => {
      useStore.setState({ panelOpen: true });
    });

    const wrap = container.querySelector('.slm-fab-wrap') as HTMLElement;
    expect(wrap).not.toBeNull();
    expect(wrap.className).toMatch(/slm-fab-wrap--fixed/);
    expect(wrap.querySelector('[data-stemlm-inject]')).not.toBeNull();
    expect(wrap.closest('[data-stemlm-composer-slot]')).toBeNull();
  });
});
