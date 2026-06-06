import { describe, it, expect, beforeEach } from 'vitest';
import { detectAdapter, adapterById } from './detect';
import { geminiAdapter } from './gemini';
import { createAdapter, setEditorText, getEditorTextOf } from './factory';

const CAPSULE_BODY = [
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

function setBody(html: string) {
  document.body.innerHTML = html;
}

describe('detectAdapter', () => {
  it('matches Gemini by host', () => {
    expect(detectAdapter('gemini.google.com')?.id).toBe('gemini');
    expect(detectAdapter('www.gemini.google.com')?.id).toBe('gemini');
  });

  it('returns null for unsupported hosts', () => {
    expect(detectAdapter('example.com')).toBeNull();
    expect(detectAdapter('notgemini.google.com.evil.com')).toBeNull();
  });

  it('looks up Gemini by id', () => {
    expect(adapterById('gemini')?.label).toBe('Gemini');
  });

  it('exposes brand palette and layout roots', () => {
    const a = adapterById('gemini')!;
    expect(a.brand.accent).toMatch(/^#[0-9a-f]{3,8}$/i);
    expect(a.layoutRoots.length).toBeGreaterThan(0);
  });

  it('exposes getComposerShell', () => {
    expect(typeof adapterById('gemini')!.getComposerShell).toBe('function');
  });
});

describe('Gemini adapter', () => {
  beforeEach(() => {
    setBody(`
      <input-area-v2 class="input-area">
        <rich-textarea>
          <div class="ql-editor" contenteditable="true" role="textbox"></div>
        </rich-textarea>
        <div class="send-button-container">
          <button aria-label="Send message">Send</button>
        </div>
      </input-area-v2>
      <model-response>
        <code-block><pre><code>${CAPSULE_BODY}</code></pre></code-block>
      </model-response>
    `);
  });

  it('finds the editor and composer shell', () => {
    expect(geminiAdapter.findEditor()).not.toBeNull();
    expect(geminiAdapter.getComposerShell()).not.toBeNull();
    expect(geminiAdapter.getComposerAnchor()).not.toBeNull();
    expect(geminiAdapter.getComposerBox()).not.toBeNull();
    expect(geminiAdapter.getComposerLayout()).not.toBeNull();
  });

  it('finds the leading upload control', () => {
    document.body.insertAdjacentHTML(
      'afterbegin',
      '<button aria-label="Upload file">+</button>',
    );
    expect(geminiAdapter.getComposerLeadingAnchor()?.getAttribute('aria-label')).toBe(
      'Upload file',
    );
  });

  it('uses neutral brand styling on Gemini', () => {
    expect(geminiAdapter.brand.neutral).toBe(true);
  });

  it('inserts a prompt into the editor', () => {
    expect(geminiAdapter.insertPrompt('hello\nworld')).toBe(true);
    expect(geminiAdapter.getEditorText()).toContain('hello');
  });

  it('extracts the capsule from code-block', () => {
    const caps = geminiAdapter.extractCapsules();
    expect(caps.length).toBeGreaterThanOrEqual(1);
    expect(caps[0]).toContain('@meta');
  });

  it('reports streaming when stop button present', () => {
    expect(geminiAdapter.isStreaming()).toBe(false);
    document.body.insertAdjacentHTML('beforeend', '<button aria-label="Stop response">Stop</button>');
    expect(geminiAdapter.isStreaming()).toBe(true);
  });
});

describe('getComposerShell factory fallback', () => {
  it('uses composerShell selectors when configured', () => {
    setBody(`
      <div class="composer-box">
        <div id="ed" contenteditable="true"></div>
      </div>
    `);
    const adapter = createAdapter({
      id: 'gemini',
      label: 'Test',
      hosts: /test/,
      editor: ['#ed'],
      composerBox: ['div.composer-box'],
      composerActionRow: ['#ed'],
      composerAnchor: ['#ed'],
      composerShell: ['div.composer-box'],
      assistant: [],
      codeBlock: ['pre code'],
      streaming: [],
      brand: { accent: '#000' },
    });
    expect(adapter.getComposerShell()?.className).toBe('composer-box');
  });

  it('walks up from the editor when composerShell selectors miss', () => {
    setBody(`
      <form>
        <div id="ed" contenteditable="true"></div>
      </form>
    `);
    const adapter = createAdapter({
      id: 'gemini',
      label: 'Test',
      hosts: /test/,
      editor: ['#ed'],
      composerBox: ['form'],
      composerActionRow: ['#ed'],
      composerAnchor: ['#ed'],
      composerShell: ['div.missing-shell'],
      assistant: [],
      codeBlock: ['pre code'],
      streaming: [],
      brand: { accent: '#000' },
    });
    expect(adapter.getComposerShell()?.tagName).toBe('FORM');
  });

  it('returns null when no editor is present', () => {
    setBody('<main></main>');
    expect(geminiAdapter.getComposerShell()).toBeNull();
  });
});

describe('setEditorText on textarea', () => {
  it('sets the value and is readable back', () => {
    setBody('<textarea id="t"></textarea>');
    const ta = document.getElementById('t') as HTMLTextAreaElement;
    expect(setEditorText(ta, 'abc')).toBe(true);
    expect(getEditorTextOf(ta)).toBe('abc');
  });
});
