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
