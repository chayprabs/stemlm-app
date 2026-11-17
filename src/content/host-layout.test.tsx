/**
 * What opening and closing the study panel does to the chat page: the page is narrowed beside
 * the panel, its own sidebar is folded, and both are put back exactly when the panel leaves.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { SPLIT_STYLE_ID } from '@/src/lib/split-screen';

vi.mock('@/src/content/load-panel', () => ({
  loadPanelHost: async () => ({ open }: { open: boolean }) => (open ? <aside className="slm-panel" /> : null),
}));
vi.mock('@/src/components/OverlayButton', () => ({ OverlayButton: () => null }));
vi.mock('@/src/platforms/detect', () => ({ detectAdapter: () => ({ id: 'claude', layoutRoots: ['main'] }) }));

import App from '../../entrypoints/content/App';

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PAGE = `<head><title>Claude</title><style>body{margin:0}</style></head>
<body class="bg-bg-100" style="color: black">
  <aside aria-label="Sidebar"><button aria-label="Hide sidebar"></button></aside>
  <main><p>How do I find the acceleration?</p></main>
  <div id="stemlm"></div>
</body>`;

let root: Root;
let presses: number;
let sidebarWidth: number;

const sheet = () => document.getElementById(SPLIT_STYLE_ID)?.textContent ?? null;
const settle = () => act(async () => { await vi.advanceTimersByTimeAsync(1500); });
const openPanel = () => act(async () => { useStore.getState().openPanel(); });
const closePanel = () => act(async () => { useStore.getState().closePanel(); });

function setWindow(width: number) {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width });
  act(() => { window.dispatchEvent(new Event('resize')); });
}

/** Claude's sidebar as captured: 288px open, one control labelled by what it will do. Folded, a 52px rail. */
function buildPage() {
  document.documentElement.innerHTML = PAGE;
  document.documentElement.className = 'dark';
  const sidebar = document.querySelector('aside')!;
  const toggle = sidebar.querySelector('button')!;
  const rect = (left: number, top: number, width: number, height: number) =>
    ({ left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON: () => ({}) });
  // The test DOM lays nothing out; the split clips <html> and <body>, so their boxes are part of
  // what is measured.
  document.documentElement.getBoundingClientRect = () => rect(0, 0, 1440, 732);
  document.body.getBoundingClientRect = () => rect(0, 0, 1440, 732);
  sidebar.getBoundingClientRect = () => rect(0, 0, sidebarWidth, 732);
  toggle.getBoundingClientRect = () => rect(12, 8, 28, 28);
  document.elementFromPoint = () => toggle;
  toggle.addEventListener('click', () => {
    presses += 1;
    const open = sidebarWidth < 100;
    sidebarWidth = open ? 288 : 52;
    toggle.setAttribute('aria-label', open ? 'Hide sidebar' : 'Show sidebar');
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  presses = 0;
  sidebarWidth = 288;
  buildPage();
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: 1440 });
  useStore.setState({ panelOpen: false, status: 'idle', settings: DEFAULT_SETTINGS, splitRatio: DEFAULT_SETTINGS.splitRatio, hostSidebarPx: 0 });
  root = createRoot(document.getElementById('stemlm')!);
  act(() => root.render(<App />));
});

afterEach(async () => {
  act(() => root.unmount());
  // Let a press that is still being confirmed finish: the sidebar module outlives a test.
  await settle();
  useStore.setState({ panelOpen: false, hostSidebarPx: 0 });
  vi.useRealTimers();
  document.documentElement.innerHTML = '<head></head><body></body>';
  document.documentElement.removeAttribute('class');
  Reflect.deleteProperty(document.documentElement, 'getBoundingClientRect');
});

describe('the chat page while the panel is open', () => {
  it('is narrowed beside the panel with its sidebar folded, and put back exactly when the panel closes', async () => {
    const before = document.documentElement.outerHTML;
    await openPanel();
    await settle();
    // 1440 - 480 for the chat - 60 for the folded sidebar's rail = 900px of panel.
    expect(sheet()).toContain('html>body{width:calc(100% - 62.5vw)!important');
    expect(sidebarWidth).toBe(52);
    expect(presses).toBe(1);
    expect(useStore.getState().hostSidebarPx).toBe(52);

    await closePanel();
    // Given back as the panel starts to leave, not after it has gone.
    expect(sheet()).toBeNull();
    await settle();
    expect(sidebarWidth).toBe(288);
    expect(presses).toBe(2);
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it('carries nothing of stemlm on the page\'s own elements while it is open', async () => {
    const before = document.documentElement.outerHTML;
    await openPanel();
    await settle();
    const page = document.documentElement.cloneNode(true) as HTMLElement;
    page.querySelector(`#${SPLIT_STYLE_ID}`)!.remove();
    page.querySelector('.slm-panel')!.remove();
    // Only what the host's own control changed when it was pressed.
    page.querySelector('aside button')!.setAttribute('aria-label', 'Hide sidebar');
    expect(page.outerHTML).toBe(before);
  });

  it('leaves the sidebar alone when the setting is off, and leaves the chat its room beside it', async () => {
    act(() => useStore.setState({ settings: { ...DEFAULT_SETTINGS, collapseHostSidebar: false } }));
    await openPanel();
    await settle();
    expect(presses).toBe(0);
    expect(useStore.getState().hostSidebarPx).toBe(288);
    // 1440 - 480 - 288 = 672px of panel.
    expect(sheet()).toContain('calc(100% - 46.667vw)');
    await closePanel();
    await settle();
    expect(presses).toBe(0);
  });

  it('follows the setting when it is changed with the panel open', async () => {
    await openPanel();
    await settle();
    expect(presses).toBe(1);
    await act(async () => { useStore.setState({ settings: { ...DEFAULT_SETTINGS, collapseHostSidebar: false } }); });
    await settle();
    expect(sidebarWidth).toBe(288);
    expect(sheet()).toContain('calc(100% - 46.667vw)');
  });

  it('overlays a narrow window instead of narrowing the page, and splits again when it is widened', async () => {
    await openPanel();
    await settle();
    setWindow(740);
    expect(sheet()).toBeNull();
    setWindow(1440);
    expect(sheet()).toContain('calc(100% - 62.5vw)');
  });

  it('survives opening and closing faster than the sidebar can be confirmed', async () => {
    const before = document.documentElement.outerHTML;
    for (let i = 0; i < 5; i++) {
      await openPanel();
      await act(async () => { await vi.advanceTimersByTimeAsync(30); });
      await closePanel();
    }
    await settle();
    await settle();
    expect(sheet()).toBeNull();
    expect(sidebarWidth).toBe(288);
    expect(presses % 2).toBe(0);
    expect(document.documentElement.outerHTML).toBe(before);
  });

  it('gives the page back when stemlm is torn down with the panel open', async () => {
    await openPanel();
    await settle();
    act(() => root.unmount());
    expect(sheet()).toBeNull();
    await settle();
    expect(sidebarWidth).toBe(288);
    root = createRoot(document.getElementById('stemlm')!);
  });
});
