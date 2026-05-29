import { describe, it, expect, beforeEach } from 'vitest';
import { detectAdapter, adapterById } from './detect';
import { chatgptAdapter } from './chatgpt';
import { claudeAdapter } from './claude';
import { geminiAdapter } from './gemini';
import { perplexityAdapter } from './perplexity';
import { grokAdapter } from './grok';
import { deepseekAdapter } from './deepseek';
import { setEditorText, getEditorTextOf } from './factory';

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
  it('matches each platform by host', () => {
    expect(detectAdapter('chatgpt.com')?.id).toBe('chatgpt');
    expect(detectAdapter('chat.openai.com')?.id).toBe('chatgpt');
    expect(detectAdapter('claude.ai')?.id).toBe('claude');
    expect(detectAdapter('gemini.google.com')?.id).toBe('gemini');
    expect(detectAdapter('www.perplexity.ai')?.id).toBe('perplexity');
    expect(detectAdapter('perplexity.ai')?.id).toBe('perplexity');
    expect(detectAdapter('grok.com')?.id).toBe('grok');
    expect(detectAdapter('chat.deepseek.com')?.id).toBe('deepseek');
  });

  it('returns null for unsupported hosts', () => {
    expect(detectAdapter('example.com')).toBeNull();
    expect(detectAdapter('notchatgpt.com.evil.com')).toBeNull();
    expect(detectAdapter('perplexity.ai.evil.com')).toBeNull();
  });

  it('looks up by id', () => {
    expect(adapterById('gemini')?.label).toBe('Gemini');
    expect(adapterById('perplexity')?.label).toBe('Perplexity');
    expect(adapterById('grok')?.label).toBe('Grok');
    expect(adapterById('deepseek')?.label).toBe('DeepSeek');
  });

  it('every adapter exposes a brand palette and layout roots', () => {
    for (const id of ['chatgpt', 'claude', 'gemini', 'perplexity', 'grok', 'deepseek'] as const) {
      const a = adapterById(id)!;
      expect(a.brand.accent).toMatch(/^#[0-9a-f]{3,8}$/i);
      expect(a.layoutRoots.length).toBeGreaterThan(0);
    }
  });
});

describe('ChatGPT adapter', () => {
  beforeEach(() => {
    setBody(`
      <main><form>
        <div id="prompt-textarea" class="ProseMirror" contenteditable="true"></div>
        <button data-testid="send-button">Send</button>
      </form></main>
      <div data-message-author-role="assistant"><pre><code>${CAPSULE_BODY}</code></pre></div>
    `);
  });

  it('finds the editor and composer anchor', () => {
    expect(chatgptAdapter.findEditor()).not.toBeNull();
    expect(chatgptAdapter.getComposerAnchor()).not.toBeNull();
  });

  it('inserts a prompt into the editor', () => {
    expect(chatgptAdapter.insertPrompt('hello\nworld')).toBe(true);
    expect(chatgptAdapter.getEditorText()).toContain('hello');
  });

  it('extracts the capsule from the code block', () => {
    const caps = chatgptAdapter.extractCapsules();
    expect(caps).toHaveLength(1);
    expect(caps[0]).toContain('@meta');
  });

  it('reports streaming when stop button present', () => {
    expect(chatgptAdapter.isStreaming()).toBe(false);
    document.body.insertAdjacentHTML('beforeend', '<button data-testid="stop-button">Stop</button>');
    expect(chatgptAdapter.isStreaming()).toBe(true);
  });
});

describe('Claude adapter', () => {
  beforeEach(() => {
    setBody(`
      <fieldset>
        <div class="ProseMirror" contenteditable="true" role="textbox"></div>
        <button aria-label="Send message">Send</button>
      </fieldset>
      <div data-testid="assistant-message" class="font-claude-message">
        <pre><code>${CAPSULE_BODY}</code></pre>
      </div>
    `);
  });

  it('finds the editor', () => {
    expect(claudeAdapter.findEditor()).not.toBeNull();
  });

  it('extracts the capsule', () => {
    const caps = claudeAdapter.extractCapsules();
    expect(caps.length).toBeGreaterThanOrEqual(1);
    expect(caps[0]).toContain('@meta');
  });
});

describe('Gemini adapter', () => {
  beforeEach(() => {
    setBody(`
      <rich-textarea>
        <div class="ql-editor" contenteditable="true" role="textbox"></div>
      </rich-textarea>
      <button aria-label="Send message">Send</button>
      <model-response>
        <code-block><pre><code>${CAPSULE_BODY}</code></pre></code-block>
      </model-response>
    `);
  });

  it('finds the editor', () => {
    expect(geminiAdapter.findEditor()).not.toBeNull();
  });

  it('extracts the capsule from code-block', () => {
    const caps = geminiAdapter.extractCapsules();
    expect(caps.length).toBeGreaterThanOrEqual(1);
    expect(caps[0]).toContain('@meta');
  });
});

describe('Perplexity adapter', () => {
  beforeEach(() => {
    setBody(`
      <main>
        <textarea placeholder="Ask anything"></textarea>
        <button aria-label="Submit">Go</button>
      </main>
      <div id="markdown-content-0" class="prose">
        <pre><code>${CAPSULE_BODY}</code></pre>
      </div>
    `);
  });

  it('finds the editor (textarea) and inserts a prompt', () => {
    expect(perplexityAdapter.findEditor()).not.toBeNull();
    expect(perplexityAdapter.insertPrompt('hi there')).toBe(true);
    expect(perplexityAdapter.getEditorText()).toContain('hi there');
  });

  it('extracts the capsule', () => {
    const caps = perplexityAdapter.extractCapsules();
    expect(caps.length).toBeGreaterThanOrEqual(1);
    expect(caps[0]).toContain('@meta');
  });
});

describe('Grok adapter', () => {
  beforeEach(() => {
    setBody(`
      <main>
        <textarea aria-label="Ask Grok anything"></textarea>
        <button type="submit">Send</button>
      </main>
      <div class="message-bubble">
        <pre><code>${CAPSULE_BODY}</code></pre>
      </div>
    `);
  });

  it('finds the editor and composer anchor', () => {
    expect(grokAdapter.findEditor()).not.toBeNull();
    expect(grokAdapter.getComposerAnchor()).not.toBeNull();
  });

  it('extracts the capsule', () => {
    const caps = grokAdapter.extractCapsules();
    expect(caps.length).toBeGreaterThanOrEqual(1);
    expect(caps[0]).toContain('@meta');
  });
});

describe('DeepSeek adapter', () => {
  beforeEach(() => {
    setBody(`
      <main>
        <textarea id="chat-input"></textarea>
        <div role="button" aria-disabled="false">Send</div>
      </main>
      <div class="ds-markdown">
        <pre><code>${CAPSULE_BODY}</code></pre>
      </div>
    `);
  });

  it('finds the editor (textarea#chat-input) and inserts a prompt', () => {
    expect(deepseekAdapter.findEditor()).not.toBeNull();
    expect(deepseekAdapter.insertPrompt('solve x')).toBe(true);
    expect(deepseekAdapter.getEditorText()).toContain('solve x');
  });

  it('extracts the capsule', () => {
    const caps = deepseekAdapter.extractCapsules();
    expect(caps.length).toBeGreaterThanOrEqual(1);
    expect(caps[0]).toContain('@meta');
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
