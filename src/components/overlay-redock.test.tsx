import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayButton } from './OverlayButton';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { LIVE_COMPOSERS, mountLiveComposer } from '@/src/platforms/host-fixtures';
import { CONTROL_GAP_PX, removeComposerRoom } from '@/src/lib/composer-anchor';
import type { PlatformAdapter } from '@/src/platforms/types';

let activeAdapter: PlatformAdapter = LIVE_COMPOSERS[0]!.adapter;

vi.mock('@/src/content/controller', () => ({
  getController: () => ({
    inject: vi.fn(async () => true),
    getLastQuestion: vi.fn(() => ''),
    resetInjection: vi.fn(),
    takeAttachNotice: vi.fn(() => null),
  }),
}));

vi.mock('@/src/platforms/detect', () => ({
  detectAdapter: () => activeAdapter,
}));

// The control follows the page on its own clock (frames, observers), so these tests let React
// and the page run as they do in a tab and wait for what they expect to see.
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  false;

const frames = (n = 5) => new Promise((resolve) => setTimeout(resolve, n * 20));
const controls = () => document.querySelectorAll<HTMLElement>('[data-stemlm-inject]');
/**
 * Let the page run until the control is there (or gone): frames are not counted, only awaited.
 * The test DOM can drop a MutationObserver mid-test (it holds the callback weakly), so a change to
 * the page is also announced the way a browser would on the next layout: as a resize.
 */
async function settle(count: number) {
  window.dispatchEvent(new Event('resize'));
  for (let i = 0; i < 100 && controls().length !== count; i++) await frames(1);
  await frames(2);
}

// Live Claude 2026-09-27: after "New chat" (in-app navigation) the host rebuilt its composer and
// the control was left behind in a fixed spot below it. Now it has no place but the attach button.
describe.each(LIVE_COMPOSERS)('$name: the control returns to the composer the chat rebuilds', (spec) => {
  let container: HTMLDivElement;
  let root: Root | undefined;
  let restore: (() => void) | undefined;

  beforeEach(() => {
    activeAdapter = spec.adapter;
    restore = mountLiveComposer(spec).restore;
    // The shadow host lives outside the host's body, so a body re-render never removes it.
    container = document.createElement('div');
    document.documentElement.appendChild(container);
    useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle', settings: DEFAULT_SETTINGS });
  });

  afterEach(() => {
    root?.unmount();
    container.remove();
    restore?.();
    removeComposerRoom();
    document.body.innerHTML = '';
  });

  it('is gone while the chat has no composer, and is one control beside the new attach button', async () => {
    root = createRoot(container);
    root.render(<OverlayButton />);
    await settle(1);
    expect(controls()).toHaveLength(1);
    const first = spec.adapter.getComposerLeadingAnchor()!;

    // Navigation: the host drops the old composer; nothing is left to anchor to.
    restore?.();
    document.body.innerHTML = '';
    useStore.setState({ panelOpen: true });
    await settle(0);
    expect(controls()).toHaveLength(0);

    // The new page renders a fresh composer: the control is back, on the new button, once.
    restore = mountLiveComposer(spec).restore;
    await settle(1);
    const attach = spec.adapter.getComposerLeadingAnchor()!;
    expect(attach).not.toBe(first);
    expect(controls()).toHaveLength(1);
    const wrap = controls()[0]!.closest('.slm-fab-wrap') as HTMLElement;
    expect(wrap.style.left).toBe(`${attach.getBoundingClientRect().right + CONTROL_GAP_PX}px`);
    console.log('REANCHORED', spec.name, JSON.stringify({ left: wrap.style.left, top: wrap.style.top }));
  });
});
