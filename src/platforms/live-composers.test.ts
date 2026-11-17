import { afterEach, describe, expect, it } from 'vitest';
import { LIVE_COMPOSERS, fakeLayout, mountLiveComposer } from './host-fixtures';
import { locateControl } from '@/src/lib/composer-anchor';
import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { geminiAdapter } from './gemini';
import { grokAdapter } from './grok';
import { injectControlEnabled } from './routes';

let restore: (() => void) | undefined;

afterEach(() => {
  restore?.();
  restore = undefined;
  document.body.innerHTML = '';
});

// The composers as captured on the four sites on 2026-11-17 (host-fixtures.ts). None of them
// carries the classes or roles the earlier selectors leaned on.
describe.each(LIVE_COMPOSERS)('$name: the adapter reads the live composer', (spec) => {
  it('finds the editor, the attach button and the composer that holds them', () => {
    const { attach, editor, restore: drop } = mountLiveComposer(spec);
    drop();
    expect(spec.adapter.findEditor()).toBe(editor);
    expect(spec.adapter.getComposerLeadingAnchor()).toBe(attach);
    const root = spec.adapter.getComposerRoot!()!;
    expect(root.contains(editor)).toBe(true);
    expect(root.contains(attach)).toBe(true);
    // The composer, not the page: the thread beside it is never inside.
    expect(root.contains(document.getElementById('thread'))).toBe(false);
    expect(['MAIN', 'BODY', 'HTML']).not.toContain(root.tagName);
  });

  it('still finds the attach button when its label is in another language', () => {
    const { attach, restore: drop } = mountLiveComposer(spec);
    drop();
    for (const button of document.querySelectorAll('button')) {
      button.removeAttribute('data-testid');
      button.setAttribute('aria-label', 'Zusatz');
    }
    // By structure alone: the attach button leads the composer on all four hosts.
    expect(spec.adapter.getComposerLeadingAnchor()).toBe(attach);
  });

  it('reads and writes the draft', () => {
    mountLiveComposer(spec).restore();
    expect(spec.adapter.insertPrompt('A block slides down an incline.', 'replace')).toBe(true);
    expect(spec.adapter.getEditorText()).toContain('A block slides down an incline.');
    expect(spec.adapter.insertPrompt('Second line.', 'append')).toBe(true);
    expect(spec.adapter.getEditorText()).toContain('A block slides down an incline.');
    expect(spec.adapter.getEditorText()).toContain('Second line.');
  });
});

describe('editors that are not the composer', () => {
  const composer = '<form><button type="button" data-testid="attach-button" aria-label="Add files">clip</button><div data-testid="chat-input"><div id="main-editor" contenteditable="true"></div></div></form>';
  const edit = '<div contenteditable="true" class="ProseMirror ql-editor tiptap" role="textbox">An earlier question</div>';

  it.each([
    ['chatgpt', chatgptAdapter, `<div data-message-author-role="user"><form data-chatgpt-composer>${edit}</form></div>`],
    ['claude', claudeAdapter, `<div data-testid="user-message"><fieldset>${edit}</fieldset></div>`],
    ['gemini', geminiAdapter, `<user-query><rich-textarea>${edit}</rich-textarea></user-query>`],
    ['grok', grokAdapter, `<div data-testid="user-message"><form>${edit}<textarea></textarea></form></div>`],
  ] as const)('%s: an earlier message opened for editing is not the composer', (_id, adapter, turn) => {
    document.body.innerHTML = `<main><div id="thread">${turn}</div></main>`;
    expect(adapter.findEditor()).toBeNull();
    expect(adapter.getComposerLeadingAnchor()).toBeNull();
    expect(adapter.getComposerRoot!()).toBeNull();
  });

  it('a field in a dialog is not the composer, and the composer behind it still is', () => {
    document.body.innerHTML = `<main><div role="dialog" aria-modal="true"><form><div data-testid="chat-input">${edit}</div></form></div>${composer}</main>`;
    expect(grokAdapter.findEditor()?.id).toBe('main-editor');
    document.querySelector('#main-editor')!.closest('form')!.remove();
    expect(grokAdapter.findEditor()).toBeNull();
  });

  it('a canvas document and a search box are not the composer', () => {
    document.body.innerHTML = `
      <main>
        <header><input type="search" aria-label="Search chats" /></header>
        <aside><button type="button" aria-label="Add comment">+</button><div class="ProseMirror" contenteditable="true" role="textbox">A draft document.</div></aside>
        <div data-outer><div data-pad>
          <div><div data-testid="chat-input" id="main-editor" contenteditable="true"></div></div>
          <div><button type="button" data-testid="chat-input-attach" aria-label="Add files, connectors, and more">+</button></div>
        </div></div>
      </main>`;
    expect(claudeAdapter.findEditor()?.id).toBe('main-editor');
    expect(claudeAdapter.getComposerLeadingAnchor()?.getAttribute('data-testid')).toBe('chat-input-attach');
    // Without the composer, the canvas editor and its toolbar are all an older selector can find.
    // They are a pane of the page, not a composer: the control has no place there.
    document.querySelector('[data-outer]')!.remove();
    const aside = document.querySelector('aside')!;
    restore = fakeLayout([
      [aside, { left: 600, top: 52, width: 400, height: 700 }],
      [aside.querySelector('button'), { left: 620, top: 70, width: 32, height: 32 }],
      [aside.querySelector('.ProseMirror'), { left: 620, top: 110, width: 360, height: 660 }],
    ]);
    expect(locateControl(claudeAdapter)).toBeNull();
  });
});

describe('a composer that cannot take a file', () => {
  it('is known for logged-out ChatGPT, and only there', () => {
    const out = LIVE_COMPOSERS.find((spec) => spec.name === 'chatgpt signed out')!;
    mountLiveComposer(out).restore();
    expect(chatgptAdapter.acceptsFiles!()).toBe(false);
    document.body.innerHTML = '<form data-type="unified-composer"><button data-testid="composer-plus-btn">+</button><div id="prompt-textarea" contenteditable="true"></div></form>';
    expect(chatgptAdapter.acceptsFiles!()).toBe(true);
    for (const spec of LIVE_COMPOSERS.filter((s) => s !== out)) {
      mountLiveComposer(spec).restore();
      expect(spec.adapter.acceptsFiles!(), spec.name).toBe(true);
    }
  });
});

describe('pages of a host that are not a chat', () => {
  it.each([
    ['chatgpt', '/gpts', false], ['chatgpt', '/gpts/editor/g-abc', false], ['chatgpt', '/library', false],
    ['chatgpt', '/g/g-abc-tutor/c/123', true], ['chatgpt', '/c/123', true], ['chatgpt', '/', true],
    ['claude', '/settings/profile', false], ['claude', '/projects', false], ['claude', '/recents', false], ['claude', '/artifacts', false],
    ['claude', '/project/0199', true], ['claude', '/new', true], ['claude', '/chat/abc', true],
    ['gemini', '/gems/create', false], ['gemini', '/saved-info', false], ['gemini', '/gem/abc', true], ['gemini', '/app/abc', true],
    ['grok', '/imagine', false], ['grok', '/c/abc', true], ['grok', '/project/abc', true],
  ] as const)('%s %s', (id, path, shown) => {
    expect(injectControlEnabled(id, path)).toBe(shown);
  });
});
