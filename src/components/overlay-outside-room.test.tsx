import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayButton } from './OverlayButton';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { HOST_FIXTURES, mountHostComposer } from '@/src/platforms/host-fixtures';
import { removeComposerSlot } from '@/src/lib/composer-slot';

const grok = HOST_FIXTURES.find((s) => s.id === 'grok')!;

vi.mock('@/src/content/controller', () => ({
  getController: () => ({ inject: vi.fn(async () => true), getLastQuestion: vi.fn(() => ''), resetInjection: vi.fn() }),
}));
vi.mock('@/src/platforms/detect', () => ({ detectAdapter: () => grok.adapter }));

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

type Box = { left: number; top: number; width: number; height: number };
function mockBox(el: Element, box: Box) {
  vi.spyOn(el, 'getBoundingClientRect').mockImplementation(
    () => ({ x: box.left, y: box.top, width: box.width, height: box.height, top: box.top, left: box.left, bottom: box.top + box.height, right: box.left + box.width, toJSON() {} }) as DOMRect,
  );
}

// Live Grok 2026-09-27 (windows 360-760 px): the composer starts 8-16 px from the window edge, so the
// "outside the box" + was pinned over Grok's own Attach button or floated above the composer.
describe('outside-shell dock without room left of the composer', () => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    mountHostComposer(grok, { capsule: false });
    container = document.createElement('div');
    document.documentElement.appendChild(container);
    useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle', settings: DEFAULT_SETTINGS });
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    removeComposerSlot();
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  async function render() {
    await act(async () => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    return document.querySelector('[data-stemlm-composer-slot]') as HTMLElement;
  }

  it('docks inside the composer, before the host +, when the composer hugs the window edge', async () => {
    const pill = document.querySelector('form.chat-input')!;
    const plus = grok.adapter.getComposerLeadingAnchor()!;
    mockBox(pill, { left: 16, top: 400, width: 600, height: 100 });
    mockBox(plus, { left: 28, top: 450, width: 36, height: 36 });
    const slot = await render();
    console.log('OUTSIDE_ROOM', JSON.stringify({ dock: slot.dataset.dock, left: slot.style.left, next: slot.nextElementSibling === plus }));
    expect(slot.dataset.dock).toBe('before-plus');
    expect(slot.nextElementSibling).toBe(plus);
    expect(slot.style.position).toBe('');
    expect(slot.style.marginRight).toBe('');
    expect(slot.querySelector('[data-stemlm-inject]')).not.toBeNull();
  });

  // Live Grok thread view 2026-09-27: the spot left of the composer was the host sidebar rail.
  it('docks inside when host UI (a sidebar) occupies the spot beside the composer', async () => {
    const pill = document.querySelector('form.chat-input')!;
    const plus = grok.adapter.getComposerLeadingAnchor()!;
    mockBox(pill, { left: 81, top: 496, width: 268, height: 102 });
    mockBox(plus, { left: 93, top: 556, width: 36, height: 36 });
    const sidebar = document.createElement('nav');
    document.body.prepend(sidebar);
    Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: () => [sidebar, document.body, document.documentElement] });
    try {
      const slot = await render();
      console.log('SIDEBAR_ROOM', JSON.stringify({ dock: slot.dataset.dock }));
      expect(slot.dataset.dock).toBe('before-plus');
      expect(slot.nextElementSibling).toBe(plus);
    } finally {
      Reflect.deleteProperty(document, 'elementsFromPoint');
    }
  });

  it('keeps the outside dock when the spot beside the composer is empty page', async () => {
    const pill = document.querySelector('form.chat-input')!;
    const wrap = pill.parentElement!;
    mockBox(pill, { left: 200, top: 400, width: 600, height: 100 });
    Object.defineProperty(document, 'elementsFromPoint', { configurable: true, value: () => [wrap, document.body, document.documentElement] });
    try {
      const slot = await render();
      expect(slot.dataset.dock).toBe('outside-shell');
    } finally {
      Reflect.deleteProperty(document, 'elementsFromPoint');
    }
  });

  // Live Grok 2026-09-27: after a page load the + sat on the sidebar for ~5 s. Every host mutation
  // pushed the dock re-check back, so it ran only once the page went quiet.
  it('re-checks the dock while the host keeps mutating', async () => {
    const pill = document.querySelector('form.chat-input')!;
    const plus = grok.adapter.getComposerLeadingAnchor()!;
    const box = { left: 200, top: 400, width: 600, height: 100 };
    mockBox(pill, box);
    mockBox(plus, { left: 212, top: 450, width: 36, height: 36 });
    const slot = await render();
    expect(slot.dataset.dock).toBe('outside-shell');

    box.left = 12;
    mockBox(pill, box);
    const ticker = document.createElement('span');
    document.body.appendChild(ticker);
    let dockedAt = -1;
    await act(async () => {
      for (let t = 0; t < 2000; t += 100) {
        ticker.textContent = String(t);
        await new Promise((resolve) => setTimeout(resolve, 100));
        if (dockedAt < 0 && slot.dataset.dock === 'before-plus') dockedAt = t;
      }
    });
    console.log('BUSY_HOST_REDOCK', JSON.stringify({ dockedAt, dock: slot.dataset.dock }));
    expect(dockedAt).toBeGreaterThanOrEqual(0);
    expect(dockedAt).toBeLessThan(1000);
  });

  it('keeps the outside dock when there is room beside the composer', async () => {
    const pill = document.querySelector('form.chat-input')!;
    mockBox(pill, { left: 200, top: 400, width: 600, height: 100 });
    const slot = await render();
    expect(slot.dataset.dock).toBe('outside-shell');
    expect(Number.parseFloat(slot.style.left)).toBeGreaterThanOrEqual(8);
  });

  it('moves inside when the window narrows and back outside when it widens', async () => {
    const pill = document.querySelector('form.chat-input')!;
    const plus = grok.adapter.getComposerLeadingAnchor()!;
    const box = { left: 200, top: 400, width: 600, height: 100 };
    mockBox(pill, box);
    mockBox(plus, { left: 212, top: 450, width: 36, height: 36 });
    const slot = await render();
    expect(slot.dataset.dock).toBe('outside-shell');

    box.left = 12;
    mockBox(pill, box);
    await act(async () => {
      window.dispatchEvent(new Event('resize'));
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    expect(slot.dataset.dock).toBe('before-plus');
    expect(slot.style.position).toBe('');

    box.left = 220;
    mockBox(pill, box);
    await act(async () => {
      window.dispatchEvent(new Event('resize'));
      await new Promise((resolve) => setTimeout(resolve, 600));
    });
    expect(slot.dataset.dock).toBe('outside-shell');
    expect(slot.querySelector('[data-stemlm-inject]')).not.toBeNull();
  });
});
