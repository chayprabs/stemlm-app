/**
 * Representative composer DOMs for the four shipped chat hosts.
 * Used by adapter / inject / slot tests — not imported by runtime code.
 */
import type { PlatformAdapter, PlatformId } from './types';
import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { geminiAdapter } from './gemini';
import { grokAdapter } from './grok';
import { PROTOCOL_FILENAME } from '@/src/protocol/builder';

export const HOST_CAPSULE = [
  '@meta',
  'subject: Physics',
  'topic: Test',
  '@endmeta',
  '@step',
  'title: A',
  '@body',
  'b',
  '@endstep',
  '@end',
].join('\n');

export interface HostFixtureSpec {
  id: PlatformId;
  adapter: PlatformAdapter;
  plusLabel: string;
  sendLabel: string;
  stopLabel: string;
}

export const HOST_FIXTURES: HostFixtureSpec[] = [
  {
    id: 'chatgpt',
    adapter: chatgptAdapter,
    plusLabel: 'Add files and more',
    sendLabel: 'Send',
    stopLabel: 'Stop',
  },
  {
    id: 'claude',
    adapter: claudeAdapter,
    plusLabel: 'Open attachment menu',
    sendLabel: 'Send Message',
    stopLabel: 'Stop response',
  },
  {
    id: 'gemini',
    adapter: geminiAdapter,
    plusLabel: 'Open upload file menu',
    sendLabel: 'Send message',
    stopLabel: 'Stop response',
  },
  {
    id: 'grok',
    adapter: grokAdapter,
    plusLabel: 'Upload a file',
    sendLabel: 'Submit',
    stopLabel: 'Stop generating',
  },
];

function makeCode(capsule: string): HTMLElement {
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.className = 'language-stemlm';
  code.textContent = capsule;
  pre.appendChild(code);
  return pre;
}

/** Live ChatGPT 2026-09-29: no <pre>; a header names the language, then <code> holds one span per line. */
function makeChatGptAssistant(capsule: string): HTMLElement {
  const turn = document.createElement('div');
  turn.setAttribute('data-content-search-unit-key', 'fallback-turn-0:2:assistant');
  turn.innerHTML = '<div data-markdown-text-style="assistant-message"><div data-markdown-copy="code-block"><div>stemlm</div><div dir="ltr"><code></code></div></div></div>';
  turn.querySelector('code')!.append(...capsule.split('\n').flatMap((line, i) => {
    const span = document.createElement('span');
    span.textContent = line;
    return i ? ['\n', span] : [span];
  }));
  return turn;
}

function makeAssistant(id: PlatformId, capsule: string): HTMLElement {
  if (id === 'chatgpt') return makeChatGptAssistant(capsule);
  const pre = makeCode(capsule);
  if (id === 'claude') {
    const el = document.createElement('div');
    el.setAttribute('data-testid', 'assistant-message');
    el.appendChild(pre);
    return el;
  }
  if (id === 'grok') {
    const el = document.createElement('div');
    el.className = 'message-bubble';
    el.setAttribute('data-testid', 'grok-message');
    el.appendChild(pre);
    return el;
  }
  const msg = document.createElement('model-response');
  const block = document.createElement('code-block');
  block.appendChild(pre);
  msg.appendChild(block);
  return msg;
}

function composerHtml(id: PlatformId, plusLabel: string, sendLabel: string): string {
  const file = '<input type="file" multiple />';
  if (id === 'chatgpt') {
    // Live 2026-09-29: the pill is a grid (+ | editor | actions) whose layout switches as the draft
    // grows; the + sits in a display:contents tooltip span. The first two file inputs take images only.
    return `
      <form data-chatgpt-composer data-composer-placement="thread">
        <div role="presentation" data-composer-radius-variant="default" data-composer-layout="single-line" style="display:flex;border-radius:26px">
          <div style="display:flex;flex-direction:column;width:100%">
            <input type="file" accept="image/*,video/*" aria-label="Attach photos or videos" multiple />
            <input type="file" accept="image/*" aria-label="Attach photos" multiple />
            <input type="file" aria-label="Attach files" multiple />
            <div data-composer-body data-composer-layout="single-line" style="display:flex;flex-direction:column">
              <div data-composer-attachments><div class="flex flex-wrap"></div></div>
              <div data-composer-footer-responsive data-composer-layout="single-line" style="display:grid;grid-template-columns:auto 1fr auto;align-items:center">
                <div><div style="display:flex"><div style="display:flex"><span data-state="closed" style="display:contents">
                  <button type="button" aria-label="${plusLabel}" aria-expanded="false" data-composer-navigation-target="add-context" data-state="closed">+</button>
                </span></div></div></div>
                <div><div class="ProseMirror" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Ask ChatGPT"></div></div>
                <div style="display:flex">
                  <button type="button" aria-label="Select ChatGPT model" aria-haspopup="menu">Medium</button>
                  <button type="button" aria-label="Dictate">Dictate</button>
                  <button type="submit" aria-label="${sendLabel}">Send</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </form>`;
  }
  if (id === 'claude') {
    return `
      <fieldset>
        <div class="composer-footer" style="display:flex;align-items:center;flex-direction:row">
          <button type="button" aria-label="${plusLabel}" aria-haspopup="menu">+</button>
          ${file}
        </div>
        <div class="ProseMirror" contenteditable="true" role="textbox"></div>
        <button type="button" aria-label="${sendLabel}">Send</button>
      </fieldset>`;
  }
  if (id === 'grok') {
    // Live landing pill: native + is in-flow inside the box. Docking beside it
    // shifts Grok's composer, so the inject control stays outside the form.
    return `
      <div class="composer-wrap" style="display:flex;flex-direction:column;align-items:center">
        <form class="chat-input" style="position:relative;display:flex;align-items:center;flex-direction:row;width:640px;border-radius:28px">
          <button type="button" aria-label="${plusLabel}" aria-haspopup="menu">+</button>
          ${file}
          <textarea aria-label="Ask Grok anything" placeholder="What do you want to know?"></textarea>
          <button type="button" aria-label="${sendLabel}">Submit</button>
        </form>
      </div>`;
  }
  return `
    <input-area-v2 class="input-area">
      <div class="leading-actions" style="display:flex;align-items:center;flex-direction:row">
        <button type="button" aria-label="${plusLabel}">+</button>
      </div>
      <images-files-uploader>
        ${file}
      </images-files-uploader>
      <rich-textarea>
        <div class="ql-editor" contenteditable="true" role="textbox"></div>
      </rich-textarea>
      <div class="send-button-container">
        <button type="button" aria-label="${sendLabel}">Send</button>
      </div>
    </input-area-v2>`;
}

export function mountHostComposer(
  spec: HostFixtureSpec,
  opt?: { capsule?: string | false },
): { composer: Element; fileInput: HTMLInputElement } {
  const capsule = opt?.capsule === false ? '' : (opt?.capsule ?? HOST_CAPSULE);
  document.body.innerHTML = `
    ${composerHtml(spec.id, spec.plusLabel, spec.sendLabel)}
    <div id="thread"></div>
  `;
  if (capsule) {
    document.getElementById('thread')!.appendChild(makeAssistant(spec.id, capsule));
  }
  const composer =
    document.querySelector('form, fieldset, input-area-v2') ?? document.body;
  const fileInput = composer.querySelector('input[type="file"]') as HTMLInputElement;
  return { composer, fileInput };
}

export function addNamedChip(root: ParentNode, name: string): HTMLElement {
  const chip = document.createElement('div');
  chip.className = 'attachment-chip file-preview';
  chip.setAttribute('data-testid', 'file-preview');
  chip.textContent = name;
  const host =
    (root as Element).querySelector?.('images-files-uploader, form, fieldset') ??
    (root instanceof Element ? root : document.body);
  host.appendChild(chip);
  return chip;
}

export function wireProtocolAttach(root: ParentNode = document): void {
  const addProtocol = () => {
    if (root.querySelector('.attachment-chip') && (root.textContent ?? '').includes(PROTOCOL_FILENAME)) {
      return;
    }
    const existing = Array.from(root.querySelectorAll('.attachment-chip')).some((el) =>
      (el.textContent ?? '').includes(PROTOCOL_FILENAME),
    );
    if (existing) return;
    addNamedChip(root, PROTOCOL_FILENAME);
  };
  for (const input of root.querySelectorAll('input[type="file"]')) {
    input.addEventListener('change', addProtocol);
  }
  const dropRoot =
    root.querySelector('images-files-uploader, form, fieldset, [class*="chat-input"]') ??
    (root instanceof Element ? root : document.body);
  dropRoot.addEventListener('drop', addProtocol);
  dropRoot.addEventListener('paste', addProtocol);
}

export function pushAssistantCapsule(id: PlatformId, raw: string): void {
  const thread = document.getElementById('thread') ?? document.body;
  thread.appendChild(makeAssistant(id, raw));
}

export type Box = { left: number; top: number; width: number; height: number };

/**
 * Give elements boxes and answer hit tests from them: the test DOM has no layout of its own.
 * A box may be a function, read on every measurement, so a test can move the page.
 */
export function fakeLayout(boxes: Array<[Element | null, Box | (() => Box)]>): () => void {
  const map = new Map(boxes.filter((pair): pair is [Element, Box | (() => Box)] => pair[0] !== null));
  const boxOf = (el: Element): Box => {
    const box = map.get(el);
    return typeof box === 'function' ? box() : (box ?? { left: 0, top: 0, width: 0, height: 0 });
  };
  const original = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function getBoundingClientRect(this: Element) {
    const { left, top, width, height } = boxOf(this);
    return { x: left, y: top, left, top, width, height, right: left + width, bottom: top + height, toJSON() {} } as DOMRect;
  };
  Object.defineProperty(document, 'elementsFromPoint', {
    configurable: true,
    // Later in the page paints above; an element without a box is hit nowhere.
    value: (x: number, y: number) => [...document.querySelectorAll('*')].reverse().filter((el) => {
      const b = boxOf(el);
      return b.width > 0 && b.height > 0 && x >= b.left && x <= b.left + b.width && y >= b.top && y <= b.top + b.height;
    }),
  });
  return () => {
    Element.prototype.getBoundingClientRect = original;
    Reflect.deleteProperty(document, 'elementsFromPoint');
  };
}

/**
 * The four composers as captured on the live sites on 2026-11-17: structure, test ids, labels and
 * boxes (viewport 1528x732; Grok 1142x686). `room` is the node whose margin actually moves the
 * row there, and `moves` what shifts when it does: the control's code has to find that node.
 */
export interface LiveComposer {
  name: string;
  adapter: PlatformAdapter;
  html: string;
  attach: string;
  editor: string;
  boxes: Record<string, Box>;
  room: string | null;
  moves: string[];
}

export const LIVE_COMPOSERS: LiveComposer[] = [
  {
    // Signed out: a textarea, 44 px buttons in 40 px cells, wrappers without a box.
    name: 'chatgpt signed out',
    adapter: chatgptAdapter,
    html: `
      <form data-landing data-logged-out>
        <div data-contents><div data-contents><div data-contents>
          <div data-cell><button type="button" aria-label="Add files and more">+</button></div>
          <div data-primary><div data-field><div data-contents>
            <textarea id="mobile-composer-prompt" aria-label="Chat with ChatGPT"></textarea>
          </div></div></div>
          <div data-cell><button type="button" aria-label="Start dictation">mic</button></div>
        </div></div></div>
        <input id="octane-mobile-composer-files-input" type="file" multiple />
      </form>`,
    attach: '[aria-label="Add files and more"]',
    editor: '#mobile-composer-prompt',
    boxes: {
      form: { left: 510, top: 336, width: 768, height: 52 },
      '[data-cell]': { left: 517, top: 340, width: 40, height: 44 },
      '[aria-label="Add files and more"]': { left: 517, top: 340, width: 44, height: 44 },
      '[data-primary]': { left: 557, top: 344, width: 634, height: 36 },
      '[data-field]': { left: 567, top: 344, width: 618, height: 36 },
      '#mobile-composer-prompt': { left: 567, top: 350, width: 618, height: 24 },
      '[aria-label="Start dictation"]': { left: 1185, top: 340, width: 44, height: 44 },
    },
    room: '[data-cell]',
    moves: ['[data-primary]', '[data-field]', '#mobile-composer-prompt'],
  },
  {
    // The row under the editor has free space beside the attach button: nothing needs to move.
    name: 'claude',
    adapter: claudeAdapter,
    html: `
      <div data-outer><div data-card><div data-pad>
        <div data-edit><div><div>
          <div data-testid="chat-input" contenteditable="true" aria-label="Write your prompt to Claude"></div>
        </div></div></div>
        <div data-row>
          <button type="button" data-testid="chat-input-attach" aria-label="Add files, connectors, and more">+</button>
          <span data-space></span>
          <button type="button" aria-label="Dictate">mic</button>
          <button type="button" data-testid="chat-input-send" aria-label="Send message">send</button>
        </div>
      </div></div>
      <input id="chat-input-file-upload-onpage" data-testid="file-upload" type="file" multiple /></div>`,
    attach: '[data-testid="chat-input-attach"]',
    editor: '[data-testid="chat-input"]',
    boxes: {
      '[data-outer]': { left: 580, top: 333, width: 656, height: 139 },
      '[data-card]': { left: 580, top: 333, width: 656, height: 103 },
      '[data-pad]': { left: 588, top: 341, width: 640, height: 87 },
      '[data-edit]': { left: 588, top: 341, width: 640, height: 57 },
      '[data-testid="chat-input"]': { left: 596, top: 345, width: 632, height: 50 },
      '[data-row]': { left: 588, top: 400, width: 640, height: 28 },
      '[data-testid="chat-input-attach"]': { left: 588, top: 400, width: 28, height: 28 },
      '[data-space]': { left: 616, top: 400, width: 532, height: 28 },
      '[aria-label="Dictate"]': { left: 1148, top: 400, width: 28, height: 28 },
      '[data-testid="chat-input-send"]': { left: 1200, top: 400, width: 28, height: 28 },
    },
    room: null,
    moves: [],
  },
  {
    name: 'gemini',
    adapter: geminiAdapter,
    html: `
      <input-area-v2><div><fieldset><div data-row>
        <div data-lead><button type="button" aria-label="Upload &amp; tools" aria-expanded="false">+</button></div>
        <div data-text><div><div><div><rich-textarea>
          <div contenteditable="true" aria-label="Enter a prompt for Gemini"></div>
        </rich-textarea></div></div></div></div>
        <button type="button" data-testid="bard-mode-menu-button" aria-label="Open mode picker, currently Gemini Auto">Auto</button>
        <button type="button" aria-label="Dictate (^⇧D)">mic</button>
      </div></fieldset></div></input-area-v2>`,
    attach: '[aria-label="Upload & tools"]',
    editor: 'rich-textarea [contenteditable]',
    boxes: {
      'input-area-v2': { left: 578, top: 334, width: 660, height: 64 },
      fieldset: { left: 578, top: 334, width: 660, height: 64 },
      '[data-row]': { left: 578, top: 334, width: 660, height: 64 },
      '[data-lead]': { left: 594, top: 350, width: 32, height: 32 },
      '[aria-label="Upload & tools"]': { left: 594, top: 350, width: 32, height: 32 },
      '[data-text]': { left: 634, top: 346, width: 391, height: 40 },
      'rich-textarea [contenteditable]': { left: 634, top: 354, width: 391, height: 24 },
      '[data-testid="bard-mode-menu-button"]': { left: 1033, top: 346, width: 145, height: 40 },
    },
    room: '[aria-label="Upload & tools"]',
    moves: ['[data-text]', 'rich-textarea [contenteditable]'],
  },
  {
    name: 'grok',
    adapter: grokAdapter,
    html: `
      <form>
        <button type="button" data-testid="attach-button" aria-label="Add files, skills, and connectors">clip</button>
        <input type="file" multiple />
        <div data-mid><div data-mid2><div><div data-testid="chat-input"><div>
          <div contenteditable="true" aria-label="Message Grok"></div>
        </div></div></div>
        <button type="button" id="model-select-trigger" aria-label="Model: Fast">Fast</button></div></div>
        <button type="submit" data-testid="chat-submit" aria-label="Send">send</button>
      </form>`,
    attach: '[data-testid="attach-button"]',
    editor: '[data-testid="chat-input"] [contenteditable]',
    boxes: {
      form: { left: 189, top: 264, width: 764, height: 58 },
      '[data-testid="attach-button"]': { left: 202, top: 277, width: 32, height: 32 },
      '[data-mid]': { left: 234, top: 281, width: 670, height: 24 },
      '[data-mid2]': { left: 234, top: 281, width: 670, height: 24 },
      '[data-testid="chat-input"] [contenteditable]': { left: 242, top: 281, width: 594, height: 24 },
      '#model-select-trigger': { left: 844, top: 281, width: 57, height: 24 },
      '[data-testid="chat-submit"]': { left: 908, top: 277, width: 32, height: 32 },
    },
    room: '[data-testid="attach-button"]',
    moves: ['[data-mid]', '[data-mid2]', '[data-testid="chat-input"] [contenteditable]'],
  },
];

/** The captured boxes on whatever nodes match now; the wrapper around the composer takes its outermost box. */
export function liveBoxes(spec: LiveComposer, shift: () => number = () => 0): Array<[Element | null, Box | (() => Box)]> {
  const boxes = Object.entries(spec.boxes);
  return [
    [document.getElementById('dock'), boxes[0]![1]],
    ...boxes.map(([sel, box]): [Element | null, Box | (() => Box)] => [
      document.querySelector(sel),
      spec.moves.includes(sel) ? () => ({ ...box, left: box.left + shift(), width: box.width - shift() }) : box,
    ]),
  ];
}

/**
 * Put a captured composer in the page with its boxes. While `room` carries the control's room
 * mark, everything in `moves` sits that far to the right, as the chat's own layout would put it.
 */
export function mountLiveComposer(spec: LiveComposer, roomPx = 0): { attach: HTMLElement; editor: HTMLElement; restore: () => void } {
  document.body.innerHTML = `<main><div id="thread"></div><div id="dock">${spec.html}</div></main>`;
  const pick = (sel: string) => document.querySelector<HTMLElement>(sel)!;
  const room = spec.room ? pick(spec.room) : null;
  const shift = () => (room?.hasAttribute('data-stemlm-room') ? roomPx || pick(spec.attach).getBoundingClientRect().height + 4 : 0);
  const restore = fakeLayout(liveBoxes(spec, shift));
  return { attach: pick(spec.attach), editor: pick(spec.editor), restore };
}
