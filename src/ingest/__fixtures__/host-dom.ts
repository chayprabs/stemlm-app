/**
 * The same worked answer in the markup each host renders it with. Test-only: mirrors the DOM
 * shapes cited in dom-to-markdown.ts, with real KaTeX output where the host uses KaTeX.
 */
import katex from 'katex';

export type HostStyle =
  | 'chatgpt'
  | 'chatgpt-legacy'
  | 'claude'
  | 'gemini'
  | 'grok'
  | 'mathjax2'
  | 'mathjax3';

export const HOST_STYLES: HostStyle[] = ['chatgpt', 'chatgpt-legacy', 'claude', 'gemini', 'grok', 'mathjax2', 'mathjax3'];

function attr(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function text(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function katexFull(tex: string, display: boolean): string {
  return katex.renderToString(tex, { displayMode: display, throwOnError: false });
}

function katexHtmlOnly(tex: string, display: boolean): string {
  return katex.renderToString(tex, { displayMode: display, throwOnError: false, output: 'html' });
}

const GLYPHS = '<span class="glyphs">𝑥²−⋯</span>';

/** Inline or display math exactly as the host leaves it in the page. */
export function hostMath(host: HostStyle, tex: string, display = false): string {
  switch (host) {
    case 'chatgpt':
      // 2026 client-side layout: no MathML, the source lives on the semantic wrapper.
      return `<span role="math" aria-label="${attr(tex)}" data-math-source="${attr(tex)}">${katexHtmlOnly(tex, display)}</span>`;
    case 'chatgpt-legacy':
    case 'claude':
      return katexFull(tex, display);
    case 'grok':
      // Block math without the .katex-display wrapper: only the MathML says display="block".
      return display
        ? katexFull(tex, true).replace(/^<span class="katex-display">/, '').replace(/<\/span>$/, '')
        : katexFull(tex, false);
    case 'gemini':
      return display
        ? `<div class="math-block" data-math="${attr(tex)}">${katexHtmlOnly(tex, true)}</div>`
        : `<span class="math-inline" data-math="${attr(tex)}">${katexHtmlOnly(tex, false)}</span>`;
    case 'mathjax2': {
      const frame = `<span class="MathJax" role="presentation"><nobr aria-hidden="true">${GLYPHS}</nobr><span class="MJX_Assistive_MathML" role="presentation"><math xmlns="http://www.w3.org/1998/Math/MathML"><mi>x</mi></math></span></span>`;
      return display
        ? `<span class="MathJax_Preview" style="color: inherit;"></span><div class="MathJax_Display">${frame}</div><script type="math/tex; mode=display">${text(tex)}</script>`
        : `<span class="MathJax_Preview" style="color: inherit;"></span>${frame}<script type="math/tex">${text(tex)}</script>`;
    }
    case 'mathjax3':
      // v4 output: data-latex on the typeset root, assistive MathML beside it.
      return `<mjx-container class="MathJax" jax="CHTML"${display ? ' display="true"' : ''}><mjx-math class="MJX-TEX" aria-hidden="true" data-latex="${attr(tex)}">${GLYPHS}</mjx-math><mjx-assistive-mml unselectable="on" display="${display ? 'block' : 'inline'}"><math xmlns="http://www.w3.org/1998/Math/MathML"${display ? ' display="block"' : ''}><mi>x</mi></math></mjx-assistive-mml></mjx-container>`;
  }
}

/** A fenced code block with the toolbar each host wraps around it. */
export function hostCode(host: HostStyle, language: string, code: string): string {
  const lines = code.split('\n');
  const label = language.charAt(0).toUpperCase() + language.slice(1);
  switch (host) {
    case 'chatgpt':
      // No <pre>: marked block, an excluded header, then <code> with one span per line.
      return `<div data-markdown-copy="code-block"><div data-markdown-copy="exclude" class="flex"><div class="truncate">${language}</div><button aria-label="Copy"><svg></svg>Copy code</button></div><div dir="ltr"><code>${lines.map((l) => `<span>${text(l)}</span>`).join('\n')}</code></div></div>`;
    case 'chatgpt-legacy':
      return `<pre class="overflow-visible!"><div class="contain-inline-size rounded-2xl"><div class="flex items-center text-xs">${language}</div><div class="sticky top-9"><button class="flex gap-1">Copy code</button></div><div class="overflow-y-auto p-4" dir="ltr"><code class="whitespace-pre! hljs language-${language}">${text(code)}</code></div></div></pre>`;
    case 'claude':
      return `<div class="relative group/copy rounded-lg"><div class="sticky opacity-0"><div class="absolute right-0"><button aria-label="Copy to clipboard"><svg></svg></button></div></div><div class="text-text-500 font-small p-3.5 pb-0">${language}</div><div class="overflow-x-auto"><pre class="code-block__code !my-0"><code class="language-${language}">${lines.map((l) => `<span>${text(l)}</span>`).join('\n')}</code></pre></div></div>`;
    case 'gemini':
      return `<code-block><div class="code-block"><div class="code-block-decoration header-formatted gds-title-s"><span>${label}</span><div class="buttons"><button class="copy-button" aria-label="Copy code"><mat-icon>content_copy</mat-icon></button></div></div><div class="formatted-code-block-internal-container"><div class="animated-opacity"><pre><code role="text" data-test-id="code-content" class="code-container formatted">${text(code)}</code></pre></div></div></div></code-block>`;
    case 'grok':
      // Shiki: one span.line per line joined by a literal newline, header in a named group.
      return `<div data-testid="code-block" class="relative not-prose"><div class="flex flex-row group/code-header"><span class="font-mono text-xs">${label}</span><button class="inline-flex">Copy</button></div><div class="shiki not-prose"><pre class="shiki"><code>${lines.map((l) => `<span class="line">${text(l)}</span>`).join('\n')}</code></pre></div></div>`;
    case 'mathjax2':
    case 'mathjax3':
      return `<pre><code class="language-${language}">${text(code)}</code></pre>`;
  }
}

function citation(host: HostStyle): string {
  switch (host) {
    case 'chatgpt':
    case 'chatgpt-legacy':
      return '<span data-testid="webpage-citation-pill"><a href="https://example.org/s?utm_source=chatgpt.com" target="_blank"><span>Example</span></a></span>';
    case 'gemini':
      return '<source-footnote><sup class="superscript" data-turn-source-index="1"></sup></source-footnote><sources-carousel-inline><source-inline-chip>Sources</source-inline-chip></sources-carousel-inline>';
    case 'grok':
      return '<a class="citation" href="https://example.org/s">\u2060Example</a>';
    case 'claude':
      return '<span class="inline-flex"><a class="group/tag citation-chip" href="https://example.org/s"><span>Example</span></a></span>';
    default:
      return '';
  }
}

function wrap(host: HostStyle, body: string): string {
  switch (host) {
    case 'chatgpt':
      return `<div data-message-author-role="assistant"><h4 class="sr-only" data-conversation-role="assistant">ChatGPT said:</h4><div data-markdown-text-style="assistant-message">${body}</div><div data-message-actions><button>Copy</button><button>Good response</button></div></div>`;
    case 'chatgpt-legacy':
      return `<div data-message-author-role="assistant"><h6 class="sr-only">ChatGPT said:</h6><div class="markdown prose w-full">${body}</div><div class="flex"><button aria-label="Copy">Copy</button></div></div>`;
    case 'claude':
      return `<div class="font-claude-response" data-testid="assistant-message"><div class="group/status"><button>Thought for 8s</button></div><div class="standard-markdown">${body}</div><div data-testid="action-bar-copy"><button>Copy</button></div></div>`;
    case 'gemini':
      return `<model-response><model-thoughts><button class="thoughts-header-button">Show thinking</button><div class="thoughts-content"><message-content><p>Planning the solve.</p></message-content></div></model-thoughts><message-content class="model-response-text"><div class="markdown markdown-main-panel">${body}</div></message-content><message-actions><button>Copy</button></message-actions></model-response>`;
    case 'grok':
      return `<div class="message-bubble" data-testid="assistant-message" aria-label="Grok" role="article"><div class="thinking-container"><button data-testid="canvas-trigger" aria-expanded="false">Worked for 12s</button></div><div class="response-content-markdown markdown">${body}</div><section class="inline-media-container"></section></div>`;
    default:
      return `<div class="answer">${body}</div>`;
  }
}

function table(host: HostStyle, html: string): string {
  return host === 'gemini'
    ? `<table-block><div class="table-block has-export-button"><div class="table-content">${html}</div><div class="table-footer"><button class="export-sheets-button">Export to Sheets</button></div></div></table-block>`
    : html;
}

/** The shared answer, rendered the way `host` would. */
export function hostAnswerHtml(host: HostStyle): string {
  const m = (tex: string) => hostMath(host, tex);
  const display = hostMath(host, 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}', true);
  // Hosts differ on whether block math sits inside the paragraph or beside it.
  const formula = host === 'chatgpt-legacy' || host === 'grok' ? `<p>${display}</p>` : display;
  const body = [
    '<h3>Step 1: Set up</h3>',
    `<p>We solve ${m('x^2 - 5x + 6 = 0')} with the <strong>quadratic formula</strong>:</p>`,
    formula,
    `<ol><li>Identify <em>a</em> = 1, ${m('b = -5')}, ${m('c = 6')}.<ul><li>Discriminant: ${m('\\Delta = 1')}</li><li>Two real roots</li></ul></li><li>Substitute to get ${m('x = 2')} or ${m('x = 3')}.</li></ol>`,
    table(host, `<table><thead><tr><th>Root</th><th>Check</th></tr></thead><tbody><tr><td>${m('x = 2')}</td><td>${m('4 - 10 + 6 = 0')}</td></tr><tr><td>${m('x = 3')}</td><td>${m('|9 - 15 + 6| = 0')}</td></tr></tbody></table>`),
    hostCode(host, 'python', 'import math\nprint(math.sqrt(1))'),
    `<p>It costs $5 to check; see <a href="https://example.com/q">the notes</a>.${citation(host)}</p>`,
  ].join('\n');
  return wrap(host, body);
}

export const HOST_ANSWER_MARKDOWN = [
  '### Step 1: Set up',
  '',
  'We solve $x^2 - 5x + 6 = 0$ with the **quadratic formula**:',
  '',
  '$$',
  'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
  '$$',
  '',
  '1. Identify *a* = 1, $b = -5$, $c = 6$.',
  '   - Discriminant: $\\Delta = 1$',
  '   - Two real roots',
  '2. Substitute to get $x = 2$ or $x = 3$.',
  '',
  '| Root | Check |',
  '| --- | --- |',
  '| $x = 2$ | $4 - 10 + 6 = 0$ |',
  '| $x = 3$ | $\\vert 9 - 15 + 6\\vert = 0$ |',
  '',
  '```python',
  'import math',
  'print(math.sqrt(1))',
  '```',
  '',
  'It costs \\$5 to check; see [the notes](https://example.com/q).',
].join('\n');

export function elementFromHtml(html: string): Element {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host;
}
