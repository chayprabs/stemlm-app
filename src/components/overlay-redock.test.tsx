import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayButton } from './OverlayButton';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { HOST_FIXTURES, mountHostComposer } from '@/src/platforms/host-fixtures';
import { removeComposerSlot } from '@/src/lib/composer-slot';
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

// Live Claude 2026-09-27: after "New chat" (SPA) the host rebuilt its composer, the shared slot was
// re-inserted, but the + stayed in its fixed fallback below the composer with the slot empty.
describe.each(HOST_FIXTURES)('$id + docks again after the host rebuilds its composer', (spec) => {
  let container: HTMLDivElement;
  let root: Root | undefined;

  beforeEach(() => {
    activeAdapter = spec.adapter;
    mountHostComposer(spec, { capsule: false });
    // The shadow host lives outside the host's body, so a body re-render never removes it.
    container = document.createElement('div');
    document.documentElement.appendChild(container);
    useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle', settings: DEFAULT_SETTINGS });
  });

  afterEach(() => {
    act(() => root?.unmount());
    container.remove();
    removeComposerSlot();
    document.body.innerHTML = '';
  });

  it('portals the control into the new composer instead of staying fixed', async () => {
    await act(async () => {
      root = createRoot(container);
      root.render(<OverlayButton />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(document.querySelector('[data-stemlm-composer-slot] [data-stemlm-inject]')).not.toBeNull();

    // Navigation: the host drops the old composer (and our slot with it) and React re-renders.
    await act(async () => {
      document.body.innerHTML = '';
      useStore.setState({ panelOpen: true });
    });
    // Hosts docked outside the shell keep their viewport slot; the others fall back to fixed.
    if (spec.adapter.composerDock !== 'outside-shell') {
      expect(container.querySelector('.slm-fab-wrap--fixed')).not.toBeNull();
    }

    // The new page renders a fresh composer; the dock retry picks it up.
    await act(async () => {
      mountHostComposer(spec, { capsule: false });
      await new Promise((resolve) => setTimeout(resolve, 1200));
    });
    const slot = document.querySelector('[data-stemlm-composer-slot]');
    console.log('REDOCK', spec.id, JSON.stringify({ slotConnected: !!slot?.isConnected, inSlot: !!slot?.querySelector('[data-stemlm-inject]'), fixed: !!container.querySelector('.slm-fab-wrap--fixed') }));
    expect(slot?.querySelector('[data-stemlm-inject]')).not.toBeNull();
    expect(container.querySelector('.slm-fab-wrap--fixed')).toBeNull();
  });
});
