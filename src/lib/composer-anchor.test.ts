import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CONTROL_GAP_PX,
  ROOM_ATTR,
  ROOM_STYLE_ID,
  locateControl,
  removeComposerRoom,
  trackComposerControl,
  type ControlPlacement,
} from './composer-anchor';
import { LIVE_COMPOSERS, fakeLayout, liveBoxes, mountLiveComposer, type LiveComposer } from '@/src/platforms/host-fixtures';
import { chatgptAdapter } from '@/src/platforms/chatgpt';
import { grokAdapter } from '@/src/platforms/grok';

let restore: (() => void) | undefined;
const live = (name: string) => LIVE_COMPOSERS.find((spec) => spec.name === name)!;
function mount(spec: LiveComposer, roomPx?: number) {
  const mounted = mountLiveComposer(spec, roomPx);
  restore = mounted.restore;
  return mounted;
}
const placed = (found: ReturnType<typeof locateControl>) => found as ControlPlacement;
const frames = (n = 4) => new Promise((resolve) => setTimeout(resolve, n * 20));
/** Trackers started by a test, stopped after it even when it fails. */
const stops: Array<() => void> = [];
const track = (...args: Parameters<typeof trackComposerControl>) => {
  const stop = trackComposerControl(...args);
  stops.push(stop);
  return stop;
};

afterEach(() => {
  for (const stop of stops.splice(0)) stop();
  restore?.();
  restore = undefined;
  removeComposerRoom();
  document.body.innerHTML = '';
  window.history.replaceState({}, '', '/');
  vi.restoreAllMocks();
});

describe.each(LIVE_COMPOSERS)('$name: the control has one place, beside the attach button', (spec) => {
  it('sits one gap to the right of the button, centred on it, at its size', () => {
    const { attach } = mount(spec);
    const found = placed(locateControl(spec.adapter));
    const b = attach.getBoundingClientRect();
    expect(found.anchor).toBe(attach);
    expect(found.left).toBe(b.right + CONTROL_GAP_PX);
    expect(found.size).toBe(b.height);
    expect(found.top + found.size / 2).toBe(b.top + b.height / 2);
    console.log('PLACED', spec.name, JSON.stringify({ left: found.left, top: found.top, size: found.size }));
  });

  it('moves only the node that makes room in that row, and nothing when the row has room', () => {
    mount(spec);
    locateControl(spec.adapter);
    const marked = [...document.querySelectorAll(`[${ROOM_ATTR}]`)];
    expect(marked).toEqual(spec.room ? [document.querySelector(spec.room)] : []);
    // The chat's tree gains no node: one attribute at most, and one stylesheet in the head.
    expect(document.querySelector('#dock [data-stemlm-inject], #dock style')).toBeNull();
  });

  it('gives the same place on every look: locating again changes nothing', () => {
    mount(spec);
    const first = placed(locateControl(spec.adapter));
    const marks = () => [...document.querySelectorAll(`[${ROOM_ATTR}]`)].map((el) => el.getAttribute(ROOM_ATTR));
    const before = marks();
    for (let i = 0; i < 3; i++) {
      const again = placed(locateControl(spec.adapter));
      expect({ ...again }).toEqual({ ...first });
    }
    expect(marks()).toEqual(before);
  });

  it('is not shown without layout to measure', () => {
    mount(spec);
    restore?.();
    restore = undefined;
    expect(locateControl(spec.adapter)).toBeNull();
  });

  it('is not shown while something of the chat covers the composer, and keeps its room', () => {
    const { attach } = mount(spec);
    locateControl(spec.adapter);
    const marks = document.querySelectorAll(`[${ROOM_ATTR}]`).length;
    const scrim = document.createElement('div');
    scrim.setAttribute('role', 'dialog');
    document.body.append(scrim);
    restore?.();
    restore = fakeLayout([...liveBoxes(spec), [scrim, { left: 0, top: 0, width: 1528, height: 732 }]]);
    expect(attach.isConnected).toBe(true);
    expect(locateControl(spec.adapter)).toBe('covered');
    // The row does not jump when a menu or dialog opens over it.
    expect(document.querySelectorAll(`[${ROOM_ATTR}]`)).toHaveLength(marks);
  });
});

describe('room in the row', () => {
  it('writes one rule, sized to the control and its gap', () => {
    mount(live('gemini'));
    locateControl(live('gemini').adapter);
    expect(document.getElementById(ROOM_STYLE_ID)?.textContent).toContain(`[${ROOM_ATTR}="after"]{margin-inline-end:${32 + CONTROL_GAP_PX}px!important}`);
    removeComposerRoom();
    expect(document.getElementById(ROOM_STYLE_ID)).toBeNull();
    expect(document.querySelector(`[${ROOM_ATTR}]`)).toBeNull();
  });

  // Logged-out ChatGPT: the + sits in a fixed 40 px grid track, so a margin on the + moves nothing.
  it('goes up to the button\'s cell when a margin on the button itself moves nothing', () => {
    mount(live('chatgpt signed out'));
    placed(locateControl(chatgptAdapter));
    expect(document.querySelector('[aria-label="Add files and more"]')!.hasAttribute(ROOM_ATTR)).toBe(false);
    expect(document.querySelector('[data-cell]')!.getAttribute(ROOM_ATTR)).toBe('after');
  });

  // A + laid out of the row's flow (seen on Grok): only what sits beside it can make room.
  it('pushes what is in the way when the button is out of the row\'s flow', () => {
    const spec = { ...live('grok'), room: '[data-mid]' };
    mount(spec);
    const found = placed(locateControl(grokAdapter));
    expect(document.querySelector('[data-testid="attach-button"]')!.hasAttribute(ROOM_ATTR)).toBe(false);
    expect(document.querySelector('[data-mid]')!.getAttribute(ROOM_ATTR)).toBe('before');
    expect(found.left).toBe(202 + 32 + CONTROL_GAP_PX);
  });

  it('is not shown, and leaves no mark, when nothing in the row will move', () => {
    mount({ ...live('grok'), room: null, moves: [] });
    expect(locateControl(grokAdapter)).toBeNull();
    expect(document.querySelector(`[${ROOM_ATTR}]`)).toBeNull();
  });

  it('is not shown when making room would make an empty composer taller', () => {
    const spec = live('grok');
    const { attach } = mount(spec);
    const form = document.querySelector('form')!;
    restore?.();
    // The row wraps as soon as it is narrower: its buttons drop to a second line.
    const taller = () => ({ ...spec.boxes.form!, height: attach.hasAttribute(ROOM_ATTR) ? 82 : 58 });
    restore = fakeLayout([...liveBoxes(spec), [form, taller], [document.getElementById('dock'), taller]]);
    expect(locateControl(grokAdapter)).toBeNull();
    expect(document.querySelector(`[${ROOM_ATTR}]`)).toBeNull();
  });

  // A host update wipes the room mark while the student has a long draft: making room again
  // narrows the draft's column, and it may wrap one line earlier. That is the draft, not the row.
  it('stays when a draft wraps one line earlier, and goes when the row itself breaks', () => {
    const spec = live('grok');
    const { attach, editor } = mount(spec);
    editor.textContent = 'A 5.0 kg block is released from rest on a 30 degree incline with friction 0.20.';
    const form = document.querySelector('form')!;
    let extra = 24;
    const taller = () => ({ ...spec.boxes.form!, height: 58 + (attach.hasAttribute(ROOM_ATTR) ? extra : 0) });
    restore?.();
    restore = fakeLayout([...liveBoxes(spec, () => (attach.hasAttribute(ROOM_ATTR) ? 36 : 0)), [form, taller], [document.getElementById('dock'), taller]]);
    expect(placed(locateControl(grokAdapter)).anchor).toBe(attach);
    removeComposerRoom();
    extra = 60;
    expect(locateControl(grokAdapter)).toBeNull();
  });

  it('is not shown beside a button that only shares the page with the editor', () => {
    document.body.innerHTML = `
      <main><div id="page">
        <button type="button" data-testid="composer-plus-btn" aria-label="Add files and more">+</button>
        <div id="hero">Welcome</div>
        <form><div id="prompt-textarea" contenteditable="true"></div></form>
      </div></main>`;
    const pick = (sel: string) => document.querySelector(sel)!;
    restore = fakeLayout([
      [pick('#page'), { left: 0, top: 0, width: 1440, height: 900 }],
      [pick('[data-testid="composer-plus-btn"]'), { left: 20, top: 20, width: 36, height: 36 }],
      [pick('#hero'), { left: 0, top: 80, width: 1440, height: 500 }],
      [pick('form'), { left: 300, top: 700, width: 768, height: 52 }],
      [pick('#prompt-textarea'), { left: 320, top: 714, width: 700, height: 24 }],
    ]);
    // The slot beside that stray button is free page, but it is not a row of the composer.
    expect(chatgptAdapter.getComposerLeadingAnchor()).not.toBeNull();
    expect(locateControl(chatgptAdapter)).toBeNull();
  });

  it('sits on the other side of the button in a right-to-left page', () => {
    const { attach } = mount(live('claude'));
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => ({ direction: el === attach ? 'rtl' : 'ltr', color: '', borderTopLeftRadius: '' }) as CSSStyleDeclaration);
    restore?.();
    const spec = live('claude');
    restore = fakeLayout([
      ...liveBoxes(spec),
      [attach, { ...spec.boxes[spec.attach]!, left: 900 }],
      [document.querySelector('[data-testid="chat-input-send"]'), { ...spec.boxes['[data-testid="chat-input-send"]']!, left: 588 }],
      [document.querySelector('[data-space]'), { left: 616, top: 400, width: 284, height: 28 }],
      [document.querySelector('[aria-label="Dictate"]'), { left: 0, top: 0, width: 0, height: 0 }],
    ]);
    const found = placed(locateControl(spec.adapter));
    expect(found.left).toBe(900 - CONTROL_GAP_PX - 28);
  });

  it('takes the button\'s corner and ink, and reads a dark composer from light ink', () => {
    const { attach } = mount(live('claude'));
    const real = window.getComputedStyle.bind(window);
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el, pseudo) => (el === attach
      ? ({ direction: 'ltr', color: 'rgb(250, 249, 245)', borderTopLeftRadius: '6px' }) as CSSStyleDeclaration
      : real(el, pseudo)));
    const found = placed(locateControl(live('claude').adapter));
    expect(found.radius).toBe('6px');
    expect(found.ink).toBe('rgb(250, 249, 245)');
    expect(found.scheme).toBe('dark');
  });
});

describe('trackComposerControl', () => {
  // The test DOM holds an observer's callback weakly and can drop it mid-test, so the page's
  // mutations are reported here by hand, as the browser reports them: the tracker's own handling
  // of a report is what is under test.
  const observers = new Set<MutationCallback>();
  const report = (...records: Array<Partial<MutationRecord>>) => {
    for (const callback of observers) callback(records as MutationRecord[], {} as MutationObserver);
  };
  beforeEach(() => {
    observers.clear();
    vi.stubGlobal('MutationObserver', class {
      private readonly callback: MutationCallback;
      constructor(callback: MutationCallback) {
        this.callback = callback;
      }
      observe() {
        observers.add(this.callback);
      }
      disconnect() {
        observers.delete(this.callback);
      }
    });
  });
  afterEach(() => vi.unstubAllGlobals());

  it('shows the control, follows the button, and stops when the page is at rest', async () => {
    const spec = live('claude');
    const { attach } = mount(spec);
    const box = { ...spec.boxes[spec.attach]! };
    restore?.();
    restore = fakeLayout([...liveBoxes(spec), [attach, () => box]]);
    const shown: Array<ControlPlacement | null> = [];
    const stop = track(spec.adapter, () => true, (p) => shown.push(p));
    await frames();
    expect(shown.at(-1)?.anchor).toBe(attach);
    expect(shown.at(-1)?.top).toBe(400);

    // The composer grows by a line of text: the button row is 20 px lower, with no node added.
    box.top = 420;
    window.dispatchEvent(new Event('resize'));
    await frames();
    expect(shown.at(-1)?.top).toBe(420);
    expect(shown.at(-1)?.left).toBe(588 + 28 + CONTROL_GAP_PX);

    // At rest nothing runs: no frame is requested until the page changes again.
    await frames(20);
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    await frames(10);
    expect(raf).not.toHaveBeenCalled();
    stop();
    expect(document.getElementById(ROOM_STYLE_ID)).toBeNull();
  });

  it('does not wake itself: its own mark on the page starts no new look', async () => {
    const spec = live('gemini');
    const { attach } = mount(spec);
    const editor = vi.spyOn(spec.adapter, 'findEditor');
    track(spec.adapter, () => true, () => {});
    await frames(20);
    expect(attach.getAttribute(ROOM_ATTR)).toBe('after');
    const style = document.getElementById(ROOM_STYLE_ID)!;
    const looks = () => editor.mock.calls.length;

    // What the tracker wrote itself: its mark, where it put it, and its one stylesheet.
    let before = looks();
    report({ type: 'attributes', attributeName: ROOM_ATTR, target: attach, addedNodes: [] as unknown as NodeList });
    report({ type: 'childList', target: document.head, addedNodes: [style] as unknown as NodeList });
    report({ type: 'childList', target: style, addedNodes: [] as unknown as NodeList });
    await frames(20);
    expect(looks()).toBe(before);

    // The chat took the mark off again (a re-render of the row): that is news.
    attach.removeAttribute(ROOM_ATTR);
    report({ type: 'attributes', attributeName: ROOM_ATTR, target: attach, addedNodes: [] as unknown as NodeList });
    await frames(20);
    expect(looks()).toBeGreaterThan(before);
    expect(attach.getAttribute(ROOM_ATTR)).toBe('after');

    // And then it is quiet again: one look restored the mark, and nothing follows it.
    before = looks();
    await frames(30);
    expect(looks()).toBe(before);
  });

  it('finds the new button in the same pass when the chat re-renders its row', async () => {
    const spec = live('gemini');
    const { attach } = mount(spec);
    const shown: Array<ControlPlacement | null> = [];
    const stop = track(spec.adapter, () => true, (p) => shown.push(p));
    await frames();
    expect(shown.at(-1)?.anchor).toBe(attach);

    // A host update: the button is a new node and the room mark is gone with the old one.
    const fresh = attach.cloneNode(true) as HTMLElement;
    fresh.removeAttribute(ROOM_ATTR);
    restore?.();
    attach.replaceWith(fresh);
    restore = mountedBoxes(spec);
    report({ type: 'childList', target: fresh.parentElement!, addedNodes: [fresh] as unknown as NodeList });
    await frames(10);
    expect(shown.every((p) => p !== null)).toBe(true);
    expect(shown.at(-1)?.anchor).toBe(fresh);
    expect(fresh.getAttribute(ROOM_ATTR)).toBe('after');
    stop();
  });

  it('hides when turned off or on a page that is not a chat, and clears its room', async () => {
    const spec = live('gemini');
    mount(spec);
    let on = true;
    const shown: Array<ControlPlacement | null> = [];
    const stop = track(spec.adapter, () => on, (p) => shown.push(p));
    await frames();
    expect(shown.at(-1)).not.toBeNull();
    on = false;
    window.history.pushState({}, '', '/settings');
    await frames(10);
    expect(shown.at(-1)).toBeNull();
    expect(document.querySelector(`[${ROOM_ATTR}]`)).toBeNull();
    stop();
  });

  it('leaves no listener or observer behind', async () => {
    const spec = live('claude');
    mount(spec);
    const show = vi.fn();
    const stop = track(spec.adapter, () => true, show);
    await frames();
    stop();
    show.mockClear();
    document.body.append(document.createElement('div'));
    window.dispatchEvent(new Event('resize'));
    window.history.pushState({}, '', '/c/next');
    await frames(10);
    expect(show).not.toHaveBeenCalled();
  });
});

/** The captured boxes again, on whatever nodes now match (after a host re-render). */
function mountedBoxes(spec: LiveComposer): () => void {
  const room = document.querySelector(spec.room!)!;
  return fakeLayout(liveBoxes(spec, () => (room.hasAttribute(ROOM_ATTR) ? 36 : 0)));
}
