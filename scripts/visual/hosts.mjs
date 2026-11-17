/**
 * Stand-in pages for the four chat hosts.
 *
 * Each page reproduces the composer and message markup the adapters in
 * src/platforms look for, dressed to resemble the host closely enough to judge
 * how stemLM's controls sit beside it. They are layout doubles, not copies of
 * any site: no host assets, fonts or logos are used.
 *
 * A plain (non-stemLM) answer is rendered the way each host leaves it in the page: typeset math
 * with the TeX source where that host keeps it, code blocks with their toolbar, and the chrome
 * around a reply. The shapes mirror src/ingest/__fixtures__/host-dom.ts, which cites its sources.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';

const require = createRequire(import.meta.url);
const katex = require('katex');
/** KaTeX layout for the doubles' own math. Its font files are not served, so the faces are dropped. */
const KATEX_CSS = readFileSync(require.resolve('katex/dist/katex.min.css'), 'utf8').replace(/@font-face\{[^}]*\}/g, '');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const attr = (s) => esc(s).replace(/"/g, '&quot;');

const SKINS = {
  chatgpt: {
    url: 'https://chatgpt.com/c/demo',
    font: 'ui-sans-serif, -apple-system, system-ui, "Segoe UI", Helvetica, Arial, sans-serif',
    light: { bg: '#ffffff', side: '#f9f9f9', fg: '#0d0d0d', muted: '#5d5d5d', box: '#ffffff', boxBorder: 'rgba(0,0,0,.1)', bubble: '#f4f4f4', code: '#f9f9f9', send: '#0d0d0d', sendFg: '#fff' },
    dark: { bg: '#212121', side: '#181818', fg: '#ececec', muted: '#afafaf', box: '#303030', boxBorder: 'rgba(255,255,255,.06)', bubble: '#303030', code: '#171717', send: '#ffffff', sendFg: '#0d0d0d' },
    radius: 28,
  },
  claude: {
    url: 'https://claude.ai/chat/demo',
    font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    light: { bg: '#faf9f5', side: '#f5f4ed', fg: '#141413', muted: '#73726c', box: '#ffffff', boxBorder: 'rgba(31,30,29,.15)', bubble: '#f0eee6', code: '#f5f4ed', send: '#c96442', sendFg: '#fff' },
    dark: { bg: '#262624', side: '#1f1e1d', fg: '#faf9f5', muted: '#a6a39a', box: '#30302e', boxBorder: 'rgba(222,220,209,.15)', bubble: '#141413', code: '#1f1e1d', send: '#c96442', sendFg: '#fff' },
    radius: 20,
  },
  gemini: {
    url: 'https://gemini.google.com/app/demo',
    font: '"Google Sans Text", "Helvetica Neue", Roboto, Arial, sans-serif',
    light: { bg: '#ffffff', side: '#f0f4f9', fg: '#1f1f1f', muted: '#575b5f', box: '#f0f4f9', boxBorder: 'transparent', bubble: '#e9eef6', code: '#f0f4f9', send: '#1f1f1f', sendFg: '#fff' },
    dark: { bg: '#1b1c1d', side: '#282a2c', fg: '#e3e3e3', muted: '#a2a9b0', box: '#282a2c', boxBorder: 'transparent', bubble: '#333537', code: '#282a2c', send: '#e3e3e3', sendFg: '#1b1c1d' },
    radius: 32,
  },
  grok: {
    url: 'https://grok.com/chat/demo',
    font: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
    light: { bg: '#ffffff', side: '#fcfcfc', fg: '#0f0f0f', muted: '#6b6b6b', box: '#fcfcfc', boxBorder: 'rgba(0,0,0,.12)', bubble: '#f2f2f2', code: '#f7f7f7', send: '#0f0f0f', sendFg: '#fff' },
    dark: { bg: '#141414', side: '#0f0f0f', fg: '#f2f2f2', muted: '#9a9a9a', box: '#1f1f1f', boxBorder: 'rgba(255,255,255,.1)', bubble: '#242424', code: '#1a1a1a', send: '#f2f2f2', sendFg: '#0f0f0f' },
    radius: 30,
  },
};

export const HOST_IDS = Object.keys(SKINS);
export const hostUrl = (id) => SKINS[id].url;
export const hostOrigin = (id) => new URL(SKINS[id].url).origin;

const PLUS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>';
const UP = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>';

function composer(id) {
  if (id === 'chatgpt') {
    return `
    <form data-chatgpt-composer data-composer-placement="thread" class="box">
      <div role="presentation" data-composer-radius-variant="default" data-composer-layout="single-line" style="display:flex;width:100%">
        <div style="display:flex;flex-direction:column;width:100%">
          <input type="file" accept="image/*,video/*" aria-label="Attach photos or videos" multiple hidden />
          <input type="file" accept="image/*" aria-label="Attach photos" multiple hidden />
          <input type="file" aria-label="Attach files" multiple hidden />
          <div data-composer-body data-composer-layout="single-line" style="display:flex;flex-direction:column">
            <div data-composer-attachments><div class="chips"></div></div>
            <div data-composer-footer-responsive data-composer-layout="single-line" class="row" style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:6px">
              <div><div style="display:flex"><div style="display:flex"><span data-state="closed" style="display:contents">
                <button type="button" class="ic" aria-label="Add files and more" aria-expanded="false" data-composer-navigation-target="add-context" data-state="closed">${PLUS}</button>
              </span></div></div></div>
              <div><div class="ProseMirror editor" contenteditable="true" role="textbox" aria-multiline="true" aria-label="Ask ChatGPT" data-placeholder="Ask anything"></div></div>
              <div style="display:flex;gap:6px;align-items:center">
                <button type="submit" class="send" aria-label="Send">${UP}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>`;
  }
  if (id === 'claude') {
    return `
    <fieldset class="box" style="flex-direction:column;align-items:stretch">
      <div class="chips"></div>
      <div class="ProseMirror editor" contenteditable="true" role="textbox" data-placeholder="Reply to Claude..."></div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:10px">
        <div class="composer-footer" style="display:flex;align-items:center;flex-direction:row;gap:6px">
          <button type="button" class="ic bordered" aria-label="Open attachment menu" aria-haspopup="menu">${PLUS}</button>
          <input type="file" multiple hidden />
        </div>
        <button type="button" class="send square" aria-label="Send Message">${UP}</button>
      </div>
    </fieldset>`;
  }
  if (id === 'grok') {
    return `
    <div class="composer-wrap" style="display:flex;flex-direction:column;align-items:center;width:100%">
      <form class="chat-input box" style="position:relative;display:flex;align-items:center;flex-direction:row;width:100%;gap:6px">
        <button type="button" class="ic" aria-label="Upload a file" aria-haspopup="menu">${PLUS}</button>
        <input type="file" multiple hidden />
        <textarea class="editor" rows="1" aria-label="Ask Grok anything" placeholder="What do you want to know?"></textarea>
        <button type="button" class="send" aria-label="Submit">${UP}</button>
      </form>
    </div>`;
  }
  return `
    <input-area-v2 class="input-area box" style="flex-direction:column;align-items:stretch">
      <images-files-uploader><input type="file" multiple hidden /><div class="chips"></div></images-files-uploader>
      <rich-textarea><div class="ql-editor editor" contenteditable="true" role="textbox" data-placeholder="Ask Gemini"></div></rich-textarea>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px">
        <div class="leading-actions" style="display:flex;align-items:center;flex-direction:row;gap:6px">
          <button type="button" class="ic" aria-label="Open upload file menu">${PLUS}</button>
        </div>
        <div class="send-button-container"><button type="button" class="send" aria-label="Send message">${UP}</button></div>
      </div>
    </input-area-v2>`;
}

function assistant(id, { capsule, html }) {
  const inner = capsule != null
    ? `<pre><code class="language-stemlm">${esc(capsule)}</code></pre>`
    : `<div class="markdown">${html}</div>`;
  if (id === 'chatgpt') {
    const body = capsule != null
      ? `<div data-markdown-copy="code-block" class="codeblock"><div class="codehead">stemlm</div><div dir="ltr"><code>${capsule.split('\n').map((l) => `<span>${esc(l)}</span>`).join('\n')}</code></div></div>`
      : `<div class="markdown">${html}</div>`;
    return `<div class="turn assistant" data-content-search-unit-key="fallback-turn-0:2:assistant"><div data-markdown-text-style="assistant-message">${body}</div></div>`;
  }
  if (id === 'claude') return `<div class="turn assistant" data-testid="assistant-message">${inner}</div>`;
  if (id === 'grok') return `<div class="turn assistant message-bubble" data-testid="grok-message">${inner}</div>`;
  return `<model-response class="turn assistant">${capsule != null ? `<code-block>${inner}</code-block>` : `<message-content class="model-response-text">${inner}</message-content>`}</model-response>`;
}

/** The student's turn in the markup each host gives it, so the question an answer belongs to can be found. */
export function userTurn(id, question) {
  const text = esc(question);
  if (id === 'chatgpt') return `<div class="turn user" data-message-author-role="user"><div class="bubble whitespace-pre-wrap">${text}</div></div>`;
  if (id === 'claude') return `<div class="turn user"><div class="bubble" data-testid="user-message"><p class="whitespace-pre-wrap">${text}</p></div></div>`;
  if (id === 'grok') return `<div class="turn user"><div class="bubble message-bubble" data-testid="user-message"><div class="response-content-markdown">${text}</div></div></div>`;
  return `<user-query class="turn user"><user-query-content><div class="bubble query-text">${question.split('\n').map((line) => `<p class="query-text-line">${esc(line)}</p>`).join('')}</div></user-query-content></user-query>`;
}

const katexFull = (tex, display) => katex.renderToString(tex, { displayMode: display, throwOnError: false });
const katexHtml = (tex, display) => katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' });

/** Inline or display math as the host leaves it in the page. */
function hostMath(id, tex, display = false) {
  // ChatGPT's client-side layout: no MathML, the source lives on the semantic wrapper.
  if (id === 'chatgpt') return `<span role="math" aria-label="${attr(tex)}" data-math-source="${attr(tex)}">${katexHtml(tex, display)}</span>`;
  if (id === 'claude') return katexFull(tex, display);
  // Grok sets block math without the .katex-display wrapper: only the MathML says display="block".
  if (id === 'grok') return display ? katexFull(tex, true).replace(/^<span class="katex-display">/, '').replace(/<\/span>$/, '') : katexFull(tex, false);
  return display
    ? `<div class="math-block" data-math="${attr(tex)}">${katexHtml(tex, true)}</div>`
    : `<span class="math-inline" data-math="${attr(tex)}">${katexHtml(tex, false)}</span>`;
}

/** A fenced code block with the toolbar each host wraps around it. */
function hostCode(id, language, code) {
  const lines = code.split('\n');
  const label = language.charAt(0).toUpperCase() + language.slice(1);
  if (id === 'chatgpt') return `<div data-markdown-copy="code-block" class="codeblock"><div data-markdown-copy="exclude" class="codehead">${language} <button aria-label="Copy">Copy code</button></div><div dir="ltr"><code>${lines.map((l) => `<span>${esc(l)}</span>`).join('\n')}</code></div></div>`;
  if (id === 'claude') return `<div class="codewrap"><div class="codehead">${language} <button aria-label="Copy to clipboard">Copy</button></div><pre class="code-block__code"><code class="language-${language}">${lines.map((l) => `<span>${esc(l)}</span>`).join('\n')}</code></pre></div>`;
  if (id === 'grok') return `<div data-testid="code-block" class="codewrap"><div class="codehead group/code-header"><span>${label}</span> <button>Copy</button></div><div class="shiki"><pre class="shiki"><code>${lines.map((l) => `<span class="line">${esc(l)}</span>`).join('\n')}</code></pre></div></div>`;
  return `<code-block><div class="code-block codewrap"><div class="code-block-decoration codehead"><span>${label}</span> <button class="copy-button" aria-label="Copy code">Copy</button></div><pre><code role="text" data-test-id="code-content" class="code-container">${esc(code)}</code></pre></div></code-block>`;
}

function inline(id, text) {
  return text
    .split(/(\$[^$\n]+\$|`[^`\n]+`)/)
    .map((part) => {
      if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) return hostMath(id, part.slice(1, -1));
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) return `<code>${esc(part.slice(1, -1))}</code>`;
      return esc(part).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    })
    .join('');
}

/**
 * A plain answer, written as Markdown in the fixtures, as the HTML `id` would render it: headings,
 * paragraphs, lists, display math and code fences. A fixture format, not a Markdown implementation.
 */
function answerBody(id, markdown) {
  return markdown.split(/\n{2,}/).map((block) => {
    const lines = block.split('\n');
    const heading = /^(#{1,6}) (.*)$/.exec(block);
    if (heading && lines.length === 1) return `<h${heading[1].length}>${inline(id, heading[2])}</h${heading[1].length}>`;
    if (block.startsWith('$$') && block.endsWith('$$')) {
      const display = hostMath(id, block.slice(2, -2).trim(), true);
      return id === 'grok' ? `<p>${display}</p>` : display;
    }
    const fence = /^```(\S*)\n([\s\S]*?)\n```$/.exec(block);
    if (fence) return hostCode(id, fence[1], fence[2]);
    if (lines.every((line) => /^\d+\. /.test(line))) return `<ol>${lines.map((line) => `<li>${inline(id, line.replace(/^\d+\. /, ''))}</li>`).join('')}</ol>`;
    if (lines.every((line) => line.startsWith('- '))) return `<ul>${lines.map((line) => `<li>${inline(id, line.slice(2))}</li>`).join('')}</ul>`;
    return `<p>${inline(id, lines.join(' '))}</p>`;
  }).join('\n');
}

/** A whole assistant turn holding a plain answer, with the chrome the host draws around a reply. */
export function plainAssistant(id, markdown) {
  const body = answerBody(id, markdown);
  if (id === 'chatgpt') {
    return `<div class="turn assistant" data-message-author-role="assistant" data-content-search-unit-key="fallback-turn-0:2:assistant"><h4 class="sr-only" data-conversation-role="assistant">ChatGPT said:</h4><div data-markdown-text-style="assistant-message"><div class="markdown">${body}</div></div><div data-message-actions class="actions"><button>Copy</button><button>Good response</button></div></div>`;
  }
  if (id === 'claude') {
    return `<div class="turn assistant font-claude-response" data-testid="assistant-message"><div class="group/status actions"><button>Thought for 8s</button></div><div class="standard-markdown markdown">${body}</div><div data-testid="action-bar-copy" class="actions"><button>Copy</button></div></div>`;
  }
  if (id === 'grok') {
    return `<div class="turn assistant message-bubble" data-testid="assistant-message" aria-label="Grok" role="article"><div class="thinking-container actions"><button data-testid="canvas-trigger" aria-expanded="false">Worked for 12s</button></div><div class="response-content-markdown markdown">${body}</div></div>`;
  }
  // Gemini keeps its reasoning in a second <message-content> inside <model-thoughts>.
  return `<model-response class="turn assistant"><model-thoughts class="actions"><button class="thoughts-header-button">Show thinking</button><div class="thoughts-content" hidden><message-content><p>Planning the solve: identify the givens, pick the governing relation, substitute, and check the units of the result before stating it.</p><p>The student asked for a worked answer, so each stage gets its own short paragraph and the final value is stated with its unit.</p></message-content></div></model-thoughts><message-content class="model-response-text"><div class="markdown markdown-main-panel">${body}</div></message-content><message-actions class="actions"><button>Copy</button></message-actions></model-response>`;
}

/**
 * @param {'chatgpt'|'claude'|'gemini'|'grok'} id
 * @param {{ scheme?: 'light'|'dark', question?: string, capsule?: string, html?: string, markdown?: string, empty?: boolean }} opt
 *   `capsule`: a stemLM answer. `html`: a reply as raw HTML. `markdown`: a plain answer, rendered
 *   the way the host would (typeset math, code toolbars, reply chrome).
 */
export function hostPage(id, opt = {}) {
  const skin = SKINS[id];
  const c = skin[opt.scheme ?? 'light'];
  const thread = opt.empty
    ? `<div class="hero">How can I help today?</div>`
    : `${userTurn(id, opt.question ?? 'Solve this step by step.')}
       ${opt.markdown != null ? plainAssistant(id, opt.markdown) : assistant(id, opt)}`;
  return `<!doctype html>
<html lang="en" style="color-scheme:${opt.scheme ?? 'light'}">
<head>
<meta charset="utf-8" />
<title>${id} (stemLM layout double)</title>
<style>
  * { box-sizing: border-box; }
  html, body { height: 100%; margin: 0; }
  body { background: ${c.bg}; color: ${c.fg}; font: 16px/1.6 ${skin.font}; display: flex; }
  aside.nav { width: 260px; flex: none; background: ${c.side}; padding: 14px 12px; display: flex; flex-direction: column; gap: 6px; }
  aside.nav .item { height: 34px; border-radius: 9px; padding: 0 10px; display: flex; align-items: center; color: ${c.muted}; font-size: 14px; }
  aside.nav .item.on { background: ${c.bubble}; color: ${c.fg}; }
  aside.nav .gap { height: 14px; }
  main { flex: 1; min-width: 0; display: flex; flex-direction: column; height: 100%; }
  header.top { height: 52px; flex: none; display: flex; align-items: center; padding: 0 18px; color: ${c.muted}; font-size: 15px; font-weight: 600; }
  .scroll { flex: 1; overflow: auto; }
  .thread { max-width: 760px; margin: 0 auto; padding: 18px 24px 40px; display: flex; flex-direction: column; gap: 22px; }
  .hero { font-size: 30px; text-align: center; margin-top: 22vh; font-weight: 500; }
  .turn.user { display: flex; justify-content: flex-end; }
  .bubble { background: ${c.bubble}; padding: 10px 16px; border-radius: 20px; max-width: 78%; }
  pre, .codeblock { background: ${c.code}; border-radius: 12px; padding: 14px 16px; margin: 0; overflow: auto; max-height: 300px; font: 13px/1.55 ui-monospace, "SF Mono", Menlo, Consolas, monospace; white-space: pre; }
  .codehead { color: ${c.muted}; font-size: 12px; margin-bottom: 8px; }
  .dock { flex: none; padding: 0 24px 22px; }
  .dock-inner { max-width: 760px; margin: 0 auto; display: flex; }
  .box { display: flex; align-items: center; width: 100%; margin: 0; border: 1px solid ${c.boxBorder}; background: ${c.box}; border-radius: ${skin.radius}px; padding: 10px 12px; min-width: 0; box-shadow: 0 1px 6px rgba(0,0,0,.05); }
  .editor { flex: 1; min-height: 26px; outline: none; border: 0; background: transparent; color: inherit; font: inherit; resize: none; width: 100%; padding: 2px 6px; }
  .editor:empty::before { content: attr(data-placeholder); color: ${c.muted}; }
  textarea.editor::placeholder { color: ${c.muted}; }
  button { font: inherit; cursor: pointer; }
  .ic { width: 34px; height: 34px; border-radius: 999px; border: 0; background: transparent; color: ${c.fg}; display: inline-flex; align-items: center; justify-content: center; }
  .ic.bordered { border: 1px solid ${c.boxBorder}; border-radius: 9px; width: 32px; height: 32px; }
  .send { width: 34px; height: 34px; border-radius: 999px; border: 0; background: ${c.send}; color: ${c.sendFg}; display: inline-flex; align-items: center; justify-content: center; }
  .send.square { border-radius: 9px; width: 32px; height: 32px; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; }
  .attachment-chip { font-size: 12px; padding: 6px 10px; border-radius: 10px; background: ${c.bubble}; margin-bottom: 8px; }
  .markdown h3 { font-size: 18px; margin: 20px 0 6px; }
  .markdown p { margin: 0 0 12px; }
  .markdown ol, .markdown ul { margin: 0 0 12px; padding-left: 24px; }
  .markdown li { margin: 4px 0; }
  .markdown .codewrap, .markdown .codeblock { margin: 0 0 12px; }
  .codewrap { background: ${c.code}; border-radius: 12px; padding: 10px 16px 14px; }
  .codewrap pre { padding: 0; background: transparent; border-radius: 0; }
  .codehead button, .actions button { border: 0; background: transparent; color: ${c.muted}; font-size: 12px; padding: 2px 6px; }
  .actions { display: flex; gap: 4px; margin: 2px 0 6px; }
  .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }
  ${opt.markdown != null || opt.katex ? KATEX_CSS : ''}
  .foot { text-align: center; color: ${c.muted}; font-size: 12px; padding-top: 8px; }
</style>
</head>
<body>
  <aside class="nav">
    <div class="item on">New chat</div><div class="item">Search</div><div class="gap"></div>
    <div class="item">Incline with friction</div><div class="item">Voltage divider</div><div class="item">Dijkstra walkthrough</div>
  </aside>
  <main>
    <header class="top">${id === 'chatgpt' ? 'ChatGPT' : id === 'claude' ? 'Claude' : id === 'gemini' ? 'Gemini' : 'Grok'}</header>
    <div class="scroll"><div class="thread" id="thread">${thread}</div></div>
    <div class="dock"><div class="dock-inner">${composer(id)}</div><div class="foot">Layout double for stemLM visual checks</div></div>
  </main>
  <script>
    // The host accepts an attached file by listing it; the adapters confirm delivery from that chip.
    for (const input of document.querySelectorAll('input[type=file]')) {
      input.addEventListener('change', () => {
        const chips = document.querySelector('.chips') || document.querySelector('.box');
        for (const file of input.files || []) {
          const chip = document.createElement('div');
          chip.className = 'attachment-chip file-preview';
          chip.setAttribute('data-testid', 'file-preview');
          chip.textContent = file.name;
          chips.prepend(chip);
        }
      });
    }
  </script>
</body>
</html>`;
}
