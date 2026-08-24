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
    sendLabel: 'Send prompt',
    stopLabel: 'Stop generating',
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

function makeAssistant(id: PlatformId, capsule: string): HTMLElement {
  const pre = makeCode(capsule);
  if (id === 'chatgpt') {
    const el = document.createElement('div');
    el.setAttribute('data-message-author-role', 'assistant');
    el.appendChild(pre);
    return el;
  }
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
    // Landing pill: + sits in a flex row with "Ask anything"; send appears after typing.
    return `
      <form>
        <div class="composer-pill" style="display:flex;align-items:center;flex-direction:row">
          <button type="button" data-testid="composer-plus-btn" aria-label="${plusLabel}" aria-haspopup="menu">+</button>
          ${file}
          <div id="prompt-textarea" data-testid="prompt-textarea" contenteditable="true" role="textbox" data-placeholder="Ask anything"></div>
          <button type="button" aria-label="Think">Think</button>
          <button type="button" data-testid="send-button" aria-label="${sendLabel}">Send</button>
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
    // Landing pill: native + is position:absolute over the placeholder.
    return `
      <div class="composer-wrap" style="display:flex;align-items:center;flex-direction:row">
        <form class="chat-input" style="position:relative;display:block">
          <button type="button" aria-label="${plusLabel}" aria-haspopup="menu" style="position:absolute;left:8px;top:8px">+</button>
          ${file}
          <textarea aria-label="Ask Grok anything" placeholder="How can I help you today?"></textarea>
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
