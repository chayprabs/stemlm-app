import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createRoot, type Root } from 'react-dom/client';
import { OverlayButton } from './OverlayButton';
import { useStore } from '@/src/state/store';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { LIVE_COMPOSERS, fakeLayout, liveBoxes, mountLiveComposer } from '@/src/platforms/host-fixtures';
import { CONTROL_GAP_PX, ROOM_ATTR, removeComposerRoom } from '@/src/lib/composer-anchor';
import { injectControlEnabled } from '@/src/platforms/routes';
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
const controls = () => document.querySelectorAll<HTMLButtonElement>('[data-stemlm-inject]');
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
const grok = LIVE_COMPOSERS.find((spec) => spec.name === 'grok')!;

let container: HTMLDivElement;
let root: Root | undefined;
let restore: (() => void) | undefined;

/** stemLM's own root sits beside the chat's body, as its shadow host does. */
async function render(expected = 1) {
  container = document.createElement('div');
  document.documentElement.appendChild(container);
  root = createRoot(container);
  root.render(<OverlayButton />);
  await settle(expected);
}

beforeEach(() => {
  useStore.setState({ buttonInjected: false, panelOpen: false, status: 'idle', settings: DEFAULT_SETTINGS });
  window.history.replaceState({}, '', '/chat');
});

afterEach(() => {
  root?.unmount();
  root = undefined;
  container?.remove();
  restore?.();
  restore = undefined;
  removeComposerRoom();
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

describe.each(LIVE_COMPOSERS)('$name: the control is drawn beside the chat\'s attach button', (spec) => {
  beforeEach(() => {
    activeAdapter = spec.adapter;
    restore = mountLiveComposer(spec).restore;
  });

  it('is one control, at the button\'s side and size, outside the chat\'s own tree', async () => {
    await render();
    const attach = spec.adapter.getComposerLeadingAnchor()!;
    const b = attach.getBoundingClientRect();
    expect(controls()).toHaveLength(1);
    const control = controls()[0]!;
    const wrap = control.closest('.slm-fab-wrap') as HTMLElement;
    expect(container.contains(wrap)).toBe(true);
    // The chat's composer holds nothing of stemLM's: logged-out ChatGPT blanks its page otherwise.
    expect(document.querySelector('main [data-stemlm-inject], main .slm-fab-wrap, main style')).toBeNull();
    expect(wrap.style.left).toBe(`${b.right + CONTROL_GAP_PX}px`);
    expect(wrap.style.top).toBe(`${b.top}px`);
    expect(wrap.style.getPropertyValue('--slm-inject-size')).toBe(`${b.height}px`);
    // Beside the chat's own plus it shows the therefore mark, never a second plus.
    expect(control.getAttribute('data-glyph')).toBe('mark');
    expect(control.innerHTML).not.toContain('M12 5v14');
    expect(control.querySelectorAll('.slm-inject-mark circle')).toHaveLength(2);
    expect(control.querySelectorAll('.slm-inject-mark rect')).toHaveLength(1);
    // Its rules travel with it, in stemLM's root; the chat page's head gets only the room rule.
    expect(wrap.querySelector('style')?.textContent).toContain('.slm-inject-btn {');
    expect([...document.head.querySelectorAll('style')].every((style) => !style.textContent?.includes('.slm-inject-btn'))).toBe(true);
  });

  it('leaves the chat\'s own attach button to the chat', async () => {
    await render();
    const attach = spec.adapter.getComposerLeadingAnchor()!;
    const attachClick = vi.fn();
    const pageClick = vi.fn();
    attach.addEventListener('click', attachClick);
    document.body.addEventListener('click', pageClick);
    controls()[0]!.click();
    await frames(1);
    expect(attachClick).not.toHaveBeenCalled();
    expect(pageClick).not.toHaveBeenCalled();
    attach.click();
    expect(attachClick).toHaveBeenCalledTimes(1);
  });

  it('can be reached from the keyboard at the attach button, and hands focus back to it', async () => {
    await render();
    const attach = spec.adapter.getComposerLeadingAnchor()!;
    const control = controls()[0]!;
    attach.focus();
    const tab = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    attach.dispatchEvent(tab);
    expect(document.activeElement).toBe(control);
    expect(tab.defaultPrevented).toBe(true);
    const back = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    control.dispatchEvent(back);
    expect(document.activeElement).toBe(attach);
    expect(back.defaultPrevented).toBe(true);
  });
});

describe('the control is shown only where it belongs', () => {
  beforeEach(() => {
    activeAdapter = grok.adapter;
    restore = mountLiveComposer(grok).restore;
  });

  it('hides on /imagine and shows again on a chat path', async () => {
    await render();
    expect(controls()).toHaveLength(1);

    window.history.pushState({}, '', '/imagine');
    await settle(0);
    expect(injectControlEnabled('grok', location.pathname)).toBe(false);
    expect(controls()).toHaveLength(0);
    expect(document.querySelector(`[${ROOM_ATTR}]`)).toBeNull();

    window.history.pushState({}, '', '/chat');
    await settle(1);
    expect(injectControlEnabled('grok', location.pathname)).toBe(true);
    expect(controls()).toHaveLength(1);
  });

  it('is removed when stemlm is turned off and restored when it is turned back on', async () => {
    await render();
    expect(controls()).toHaveLength(1);
    expect(document.querySelector(`[${ROOM_ATTR}]`)).not.toBeNull();

    useStore.setState({ settings: { ...DEFAULT_SETTINGS, stemlmEnabled: false } });
    await settle(0);
    expect(controls()).toHaveLength(0);
    // Nothing of stemLM's is left on the chat page.
    expect(document.querySelector(`[${ROOM_ATTR}]`)).toBeNull();
    expect(document.head.querySelector('style')).toBeNull();

    useStore.setState({ settings: DEFAULT_SETTINGS });
    await settle(1);
    expect(controls()).toHaveLength(1);
  });

  it('follows the composer when it moves', async () => {
    const attach = document.querySelector<HTMLElement>(grok.attach)!;
    let lift = 0;
    restore?.();
    restore = fakeLayout(liveBoxes(grok, () => (attach.hasAttribute(ROOM_ATTR) ? 36 : 0)).map(([el, box]) => [
      el,
      () => {
        const b = typeof box === 'function' ? box() : box;
        return { ...b, top: b.top - lift };
      },
    ]));
    await render();
    const wrap = controls()[0]!.closest('.slm-fab-wrap') as HTMLElement;
    expect(wrap.style.top).toBe('277px');

    lift = 80;
    window.dispatchEvent(new Event('scroll'));
    await frames(3);
    expect(wrap.style.top).toBe('197px');
    expect(wrap.style.left).toBe(`${202 + 32 + CONTROL_GAP_PX}px`);
    expect(controls()).toHaveLength(1);
  });

  // The control used to fall back to a fixed spot near the composer, then to a corner of the
  // window. Without the chat's attach button there is nothing to anchor to: it is not shown.
  it('is not shown at all once its anchor is gone: it never floats', async () => {
    await render();
    expect(controls()).toHaveLength(1);
    document.querySelector(grok.attach)!.remove();
    await settle(0);
    expect(controls()).toHaveLength(0);
    expect(container.querySelector('.slm-fab-wrap')).toBeNull();
    expect(document.querySelector(`[${ROOM_ATTR}]`)).toBeNull();
  });

  it('is not shown beside a field that is not the composer', async () => {
    restore?.();
    document.body.innerHTML = `
      <main>
        <div data-testid="user-message"><form>
          <button type="button" data-testid="attach-button" aria-label="Add files">clip</button>
          <div data-testid="chat-input"><div contenteditable="true" aria-label="Edit message">An earlier question</div></div>
        </form></div>
        <div role="dialog"><form>
          <button type="button" data-testid="attach-button" aria-label="Add files">clip</button>
          <div data-testid="chat-input"><div contenteditable="true" aria-label="Custom instructions"></div></div>
        </form></div>
      </main>`;
    restore = fakeLayout([...document.querySelectorAll('main *')].map((el, i) => [el, { left: 200, top: 100 + i * 40, width: el.tagName === 'BUTTON' ? 32 : 600, height: 32 }]));
    await render(0);
    await frames(10);
    // An earlier message being edited and a dialog's field both look like a composer; neither is one.
    expect(grok.adapter.findEditor()).toBeNull();
    expect(controls()).toHaveLength(0);
  });
});
