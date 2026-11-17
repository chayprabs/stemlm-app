/**
 * The chat column, tidied: a stemLM answer the controller has read folds to one row, while it is
 * written and after; the student's own message shows only the question. Nothing is added to the
 * chat's tree, the fold survives the chat rebuilding its block, and an answer that was cut off or
 * could not be read is left exactly as the chat wrote it.
 *
 * The page is real DOM in Gemini's markup, read through the real Gemini adapter.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { geminiAdapter } from '@/src/platforms/gemini';
import { DEFAULT_SETTINGS } from '@/src/lib/settings';
import { useStore } from '@/src/state/store';
import { StemController } from './controller';
import { CAPSULE_ATTR, ChatTidy, NOTE_ATTR, OPEN_ATTR, foldableWrapper } from './chat-tidy';

const META = ['@meta', 'version: 2', 'subject: Physics', 'topic: Block on an incline', '@endmeta'];
const S1 = ['@step id=s1', 'title: Draw the forces', '@body', 'Weight, normal force and friction act on the block.', '@endbody', '@endstep'];
const S2 = ['@step id=s2', 'title: Balance the perpendicular forces', '@body', 'The block stays on the surface.', '@endbody', '@endstep'];
const S3_OPEN = ['@step id=s3', 'title: Apply the second law', '@body', 'Along the incline'];
const S3 = ['@step id=s3', 'title: Apply the second law', '@body', 'Along the incline the net force gives the acceleration.', '@endbody', '@endstep'];
const CLOSING = ['@solution', 'The block accelerates at $3.2\\,\\text{m/s}^2$.', '@endsolution', '@end'];
const FULL = [...META, ...S1, ...S2, ...S3, ...CLOSING].join('\n');

const state = () => useStore.getState();
const block = () => document.querySelector<HTMLElement>('model-response:last-of-type code-block')!;
const fold = () => block().getAttribute(CAPSULE_ATTR);
const chatNodes = () => document.querySelector('main')!.querySelectorAll('*').length;

function streaming(on: boolean): void {
  document.querySelector('input-area-v2 button[aria-label="Stop response"]')?.remove();
  if (!on) return;
  const stop = document.createElement('button');
  stop.setAttribute('aria-label', 'Stop response');
  document.querySelector('input-area-v2')!.append(stop);
}

function newReply(text = ''): void {
  const reply = document.createElement('model-response');
  reply.innerHTML = '<message-content><code-block><pre><code></code></pre></code-block></message-content>';
  reply.querySelector('code')!.textContent = text;
  document.querySelector('main')!.append(reply);
}

/** The reply grows to `text` without a pause, then the page goes quiet for one look. */
async function streamTo(text: string): Promise<void> {
  const code = block().querySelector('code')!;
  for (let sent = (code.textContent ?? '').length; sent < text.length;) {
    sent = Math.min(text.length, sent + 40);
    code.textContent = text.slice(0, sent);
    await vi.advanceTimersByTimeAsync(100);
  }
  await vi.advanceTimersByTimeAsync(400);
}

function box(el: Element, rect: { top: number; height: number; left?: number; width?: number }): void {
  const { top, height, left = 0, width = 600 } = rect;
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue(
    { top, bottom: top + height, left, right: left + width, width, height, x: left, y: top, toJSON: () => ({}) } as DOMRect,
  );
}

function click(el: Element, clientX: number, clientY: number): MouseEvent {
  const event = new MouseEvent('click', { bubbles: true, cancelable: true, clientX, clientY });
  el.dispatchEvent(event);
  return event;
}

describe('foldableWrapper', () => {
  it('folds the code block with its own header and buttons, never the reply around it', () => {
    document.body.innerHTML = '<div id="m"><p>Here it is.</p><div id="w"><div class="head">stemlm <button>Copy</button></div><pre><code>@meta</code></pre></div></div>';
    const code = document.querySelector<HTMLElement>('code')!;
    const message = document.getElementById('m')!;
    expect(foldableWrapper(code, message)?.id).toBe('w');
    // A paragraph of the reply next to the block: only the block's own <pre>.
    document.body.innerHTML = '<div id="m"><div id="w"><p>Here it is.</p><pre><code>@meta</code></pre></div></div>';
    expect(foldableWrapper(document.querySelector('code'), document.getElementById('m'))?.tagName).toBe('PRE');
    expect(foldableWrapper(null, message)).toBeNull();
    expect(foldableWrapper(code, null)).toBeNull();
  });
});

describe('the chat column while stemLM captures', () => {
  let controller: StemController;
  beforeEach(() => {
    vi.useFakeTimers();
    document.head.innerHTML = '';
    document.body.innerHTML =
      '<main><user-query><div class="query-text"><p class="query-text-line">Find the acceleration.</p></div></user-query></main>' +
      '<input-area-v2><rich-textarea><div class="ql-editor" contenteditable="true"></div></rich-textarea></input-area-v2>';
    useStore.setState({
      sessions: [], activeSessionId: undefined, activeStepIndex: 0, status: 'idle', errorMessage: undefined,
      writingId: undefined, buttonInjected: false, panelOpen: false, settings: DEFAULT_SETTINGS,
    });
    controller = new StemController(geminiAdapter);
  });
  afterEach(() => {
    controller.stopWatching();
    vi.restoreAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = '';
  });

  it('folds the answer while it is written and once it is read, adding nothing to the chat', async () => {
    newReply();
    const nodes = chatNodes();
    controller.startWatching();
    streaming(true);
    await streamTo([...META, ...S1, ...S3_OPEN].join('\n'));
    expect(state().writingId).toBeDefined();
    expect(fold()).toBe('streaming');

    await streamTo(FULL);
    streaming(false);
    await vi.advanceTimersByTimeAsync(500);
    expect(state().writingId).toBeUndefined();
    expect(fold()).toBe('done');
    expect(block().getAttribute('role')).toBe('button');
    expect(block().getAttribute('tabindex')).toBe('0');
    expect(chatNodes()).toBe(nodes);
    expect(document.getElementById('stemlm-chat-tidy')?.parentElement).toBe(document.head);
  });

  it('marks a block the chat rebuilt while writing in the same task, before the page is looked at again', async () => {
    newReply();
    controller.startWatching();
    streaming(true);
    await streamTo([...META, ...S1, ...S3_OPEN].join('\n'));
    const fresh = block().cloneNode(true) as HTMLElement;
    for (const name of [CAPSULE_ATTR, 'role', 'tabindex', 'aria-label']) fresh.removeAttribute(name);
    block().replaceWith(fresh);
    // Only the observer's own callback has run: no look at the page (350 ms) has.
    await vi.advanceTimersByTimeAsync(0);
    expect(fresh.getAttribute(CAPSULE_ATTR)).toBe('streaming');
  });

  it('leaves an answer the chat stopped writing as the chat wrote it', async () => {
    newReply();
    controller.startWatching();
    streaming(true);
    await streamTo([...META, ...S1, ...S2].join('\n'));
    expect(fold()).toBe('streaming');
    streaming(false);
    await vi.advanceTimersByTimeAsync(3_000);
    expect(state().sessions[0]?.cutOff).toBe(true);
    expect(fold()).toBeNull();
    expect(block().hasAttribute('role')).toBe(false);
  });

  it('never folds an answer it could not read', async () => {
    newReply([...META, '@end'].join('\n'));
    controller.startWatching();
    await vi.advanceTimersByTimeAsync(3_000);
    expect(state().sessions).toHaveLength(0);
    expect(fold()).toBeNull();
  });

  it('unfolds a question removed from the panel, and everything when the setting is off or capture stops', async () => {
    newReply(FULL);
    controller.startWatching();
    await vi.advanceTimersByTimeAsync(500);
    expect(fold()).toBe('done');

    useStore.getState().removeSession(state().sessions[0]!.id);
    expect(fold()).toBeNull();
    useStore.getState().restoreRemoved();
    expect(fold()).toBe('done');

    useStore.setState({ settings: { ...DEFAULT_SETTINGS, tidyChat: false } });
    expect(fold()).toBeNull();
    expect(document.getElementById('stemlm-chat-tidy')).toBeNull();
    useStore.setState({ settings: DEFAULT_SETTINGS });
    expect(fold()).toBe('done');

    controller.stopWatching();
    expect(fold()).toBeNull();
    expect(document.getElementById('stemlm-chat-tidy')).toBeNull();
  });

  it('opens the panel on the answer from the row, and shows or hides the text from its end', async () => {
    newReply(FULL);
    controller.startWatching();
    await vi.advanceTimersByTimeAsync(500);
    const id = state().sessions[0]!.id;
    useStore.setState({ activeSessionId: undefined, panelOpen: false });
    box(block(), { top: 0, height: 44 });

    expect(click(block(), 100, 20).defaultPrevented).toBe(true);
    expect(state()).toMatchObject({ panelOpen: true, activeSessionId: id });

    click(block(), 560, 20);
    expect(block().hasAttribute(OPEN_ATTR)).toBe(true);
    // Shown, the block is the chat's again, except its "Hide text" strip.
    expect(click(block(), 100, 20).defaultPrevented).toBe(false);
    click(block(), 560, 12);
    expect(block().hasAttribute(OPEN_ATTR)).toBe(false);
  });

  it('does not wake itself: a page that stops changing is not read again', async () => {
    newReply(FULL);
    controller.startWatching();
    await vi.advanceTimersByTimeAsync(500);
    const reads = vi.spyOn(geminiAdapter, 'getCapsuleSources');
    await vi.advanceTimersByTimeAsync(10_000);
    expect(reads).not.toHaveBeenCalled();
  });
});

describe("the student's own message", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  it("ends at stemLM's first line, with a line that shows the rest", () => {
    const text = 'Find the acceleration.\n\n--- stemLM ---\nAnswer in one stemlm code block, 3 to 7 steps.';
    document.body.innerHTML = '<div data-testid="user-message"><p style="position: static"></p></div>';
    const p = document.querySelector('p')!;
    p.textContent = text;
    // One 24 px line per line of text, from y = 90.
    vi.spyOn(Range.prototype, 'getBoundingClientRect').mockImplementation(function (this: Range) {
      const top = 90 + text.slice(0, this.startOffset).split('\n').length * 24 - 24;
      return { top, bottom: top + 24, height: 24, left: 0, right: 10, width: 10, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    box(p, { top: 90, height: 96 });

    const tidy = new ChatTidy(() => {});
    tidy.sync([], undefined, () => true);
    // stemLM's line starts 48 px down; the expander sits on the blank line above it.
    expect(p.getAttribute(NOTE_ATTR)).toBe('48-24-24-0-0');
    expect(document.getElementById('stemlm-chat-tidy')!.textContent).toContain('max-height: 48px');

    click(p, 40, 100);
    expect(p.hasAttribute(OPEN_ATTR)).toBe(false);
    click(p, 40, 90 + 24 + 12);
    expect(p.hasAttribute(OPEN_ATTR)).toBe(true);
    tidy.clear();
    expect(p.hasAttribute(NOTE_ATTR)).toBe(false);
  });

  it('cuts the bubble, never the turn around it with the guide file chip, nor a flex box', () => {
    const text = 'Find the acceleration.\n\n--- stemLM ---\nAnswer in one stemlm code block.';
    document.body.innerHTML =
      '<div data-message-author-role="user" style="display: flex; flex-direction: column; justify-content: flex-end">' +
      '<div class="attachment-chip file-preview">stemLM Guide.txt</div><div class="bubble" style="position: static"></div></div>';
    const bubble = document.querySelector<HTMLElement>('.bubble')!;
    bubble.textContent = text;
    vi.spyOn(Range.prototype, 'getBoundingClientRect').mockImplementation(function (this: Range) {
      const top = 90 + text.slice(0, this.startOffset).split('\n').length * 24 - 24;
      return { top, bottom: top + 24, height: 24, left: 0, right: 10, width: 10, x: 0, y: top, toJSON: () => ({}) } as DOMRect;
    });
    box(bubble, { top: 90, height: 96 });
    const tidy = new ChatTidy(() => {});
    tidy.sync([], undefined, () => true);
    expect(bubble.getAttribute(NOTE_ATTR)).toBe('48-24-24-0-0');
    expect(document.querySelector('[data-message-author-role]')!.hasAttribute(NOTE_ATTR)).toBe(false);

    tidy.clear();
    bubble.style.display = 'flex';
    tidy.sync([], undefined, () => true);
    expect(bubble.hasAttribute(NOTE_ATTR)).toBe(false);
  });
});
