import { describe, it, expect, beforeEach } from 'vitest';
import { detectAdapter, adapterById } from './detect';
import { geminiAdapter } from './gemini';
import { buildComposerStub, buildInjectionPrompt } from '@/src/protocol/builder';
import {
  appendEditorText,
  createAdapter,
  setEditorText,
  getEditorTextOf,
  editorReflectsText,
  composerHasAttachments,
  focusComposerQuestionSlot,
} from './factory';
import { buildFollowupAskInChatPrompt } from '@/src/protocol/builder';
import { buildInjectionAppendix } from '@/src/protocol/builder';

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

  it('finds the leading upload control inside the composer shell', () => {
    document.body.querySelector('input-area-v2')?.insertAdjacentHTML(
      'afterbegin',
      '<button aria-label="Upload file">+</button>',
    );
    expect(geminiAdapter.getComposerLeadingAnchor()?.getAttribute('aria-label')).toBe(
      'Upload file',
    );
  });

  it('finds the upload menu button inside leading-actions', () => {
    setBody(`
      <input-area-v2>
        <div class="leading-actions">
          <button aria-label="Open upload file menu">+</button>
        </div>
        <rich-textarea>
          <div class="ql-editor" contenteditable="true" role="textbox"></div>
        </rich-textarea>
      </input-area-v2>
    `);
    expect(geminiAdapter.getComposerLeadingAnchor()?.getAttribute('aria-label')).toBe(
      'Open upload file menu',
    );
  });

  it('uses neutral brand styling on Gemini', () => {
    expect(geminiAdapter.brand.neutral).toBe(true);
  });

  it('inserts a prompt into the editor', () => {
    expect(geminiAdapter.insertPrompt('hello\nworld')).toBe(true);
    expect(geminiAdapter.getEditorText()).toContain('hello');
  });

  it('inserts the full stemLM protocol into a Quill-like editor', () => {
    const { prompt } = buildInjectionPrompt(
      'Solve this circuit with a 12V source and resistor (Kirchhoff)',
    );
    expect(geminiAdapter.insertPrompt(prompt)).toBe(true);
    const got = geminiAdapter.getEditorText();
    expect(got).toContain('stemLM instructions');
    expect(got).toContain('OUTPUT:');
    expect(got).toContain('ELECTRICAL');
    expect(got).not.toContain('stemlm-protocol.txt');
  });

  it('appends the protocol below an existing question without erasing it', () => {
    const editor = geminiAdapter.findEditor()!;
    editor.innerHTML = '<p>Find the range of a projectile launched at 60 degrees</p>';
    const { prompt } = buildInjectionAppendix(
      'Find the range of a projectile launched at 60 degrees',
    );
    expect(geminiAdapter.insertPrompt(prompt, 'append')).toBe(true);
    const got = geminiAdapter.getEditorText();
    expect(got).toContain('Find the range of a projectile launched at 60 degrees');
    expect(got).toContain('stemLM instructions');
    expect(got).toContain('OUTPUT:');
  });

  it('does not treat the upload control as an attachment', () => {
    setBody(`
      <input-area-v2>
        <images-files-uploader><button aria-label="Open upload file menu">+</button></images-files-uploader>
        <rich-textarea>
          <div class="ql-editor" contenteditable="true" role="textbox"></div>
        </rich-textarea>
      </input-area-v2>
    `);
    const editor = geminiAdapter.findEditor()!;
    expect(composerHasAttachments(editor)).toBe(false);
  });

  it('detects file preview chips as attachments', () => {
    setBody(`
      <input-area-v2>
        <images-files-uploader>
          <button>+</button>
          <div class="attachment-chip">photo.png</div>
        </images-files-uploader>
        <rich-textarea>
          <div class="ql-editor" contenteditable="true" role="textbox"></div>
        </rich-textarea>
      </input-area-v2>
    `);
    expect(composerHasAttachments(geminiAdapter.findEditor())).toBe(true);
  });

  it('keeps image attachments when appending the protocol', () => {
    const editor = geminiAdapter.findEditor()!;
    editor.innerHTML = '<p>See attached problem</p><img alt="problem photo" src="blob:test">';
    expect(composerHasAttachments(editor)).toBe(true);
    const { prompt } = buildInjectionAppendix('See attached problem');
    expect(appendEditorText(editor, prompt)).toBe(true);
    expect(editor.querySelector('img[alt="problem photo"]')).not.toBeNull();
    expect(getEditorTextOf(editor)).toContain('See attached problem');
    expect(getEditorTextOf(editor)).toContain('stemLM instructions');
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

  it('focuses the caret in the follow-up question slot', () => {
    setBody('<textarea id="t"></textarea>');
    const ta = document.getElementById('t') as HTMLTextAreaElement;
    const prompt = buildFollowupAskInChatPrompt({
      selection: 'Explain the sign of reactance',
      subject: 'Electrical',
    });
    setEditorText(ta, prompt);
    focusComposerQuestionSlot(ta);
    expect(ta.selectionStart).toBeGreaterThan(0);
    expect(ta.selectionStart).toBeLessThan(ta.value.indexOf('stemLM follow-up context'));
  });

  it('places the caret after the follow-up label in contenteditable editors', () => {
    setBody('<div id="ed" contenteditable="true"></div>');
    const el = document.getElementById('ed')!;
    const prompt = buildFollowupAskInChatPrompt({
      selection: 'Why is X_L positive?',
      subject: 'Electrical',
    });
    setEditorText(el, prompt);
    focusComposerQuestionSlot(el);
    const sel = window.getSelection();
    expect(sel?.anchorOffset).toBeGreaterThan(0);
    const markerPos = getEditorTextOf(el).indexOf('Ask your question here:');
    expect(sel?.anchorOffset).toBeGreaterThan(markerPos);
  });
});

describe('editorReflectsText', () => {
  it('requires protocol markers for stemLM injection prompts', () => {
    setBody('<div id="ed" contenteditable="true"></div>');
    const el = document.getElementById('ed')!;
    const { prompt } = buildInjectionPrompt('derivative of x^2');
    setEditorText(el, prompt);
    expect(editorReflectsText(el, prompt)).toBe(true);
  });

  it('treats the short file-attach stub as complete without the paste wall', () => {
    setBody('<div id="ed" contenteditable="true"></div>');
    const el = document.getElementById('ed')!;
    const stub = buildComposerStub('derivative of x^2');
    setEditorText(el, stub);
    expect(editorReflectsText(el, stub)).toBe(true);
    expect(getEditorTextOf(el)).not.toContain('stemLM instructions');
    expect(getEditorTextOf(el)).not.toContain('OUTPUT:');
  });
});
