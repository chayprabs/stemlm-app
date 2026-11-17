import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathMarkdown } from '@/src/components/MathMarkdown';
import { MAX_MARKDOWN_CHARS, messageToMarkdown } from './dom-to-markdown';
import { cpuMs } from '../lib/cpu-time';
import {
  HOST_ANSWER_MARKDOWN,
  HOST_STYLES,
  elementFromHtml,
  hostAnswerHtml,
  hostCode,
  hostMath,
} from './__fixtures__/host-dom';

function md(html: string): string {
  return messageToMarkdown(elementFromHtml(html));
}

describe('messageToMarkdown: one answer, every host markup', () => {
  it.each(HOST_STYLES)('%s renders to the same Markdown', (host) => {
    expect(md(hostAnswerHtml(host))).toBe(HOST_ANSWER_MARKDOWN);
  });

  it.each(HOST_STYLES)('%s never leaks toolbar, reasoning or citation text', (host) => {
    const out = md(hostAnswerHtml(host));
    for (const chrome of ['Copy', 'said:', 'Thought for', 'Show thinking', 'Planning the solve', 'Worked for', 'Export to Sheets', 'Example', 'Sources', 'content_copy']) {
      expect(out).not.toContain(chrome);
    }
  });
});

describe('messageToMarkdown: math sources', () => {
  it('reads the KaTeX annotation and ignores the aria-hidden glyph layer', () => {
    expect(md(`<p>Energy ${hostMath('claude', 'E = mc^2')} holds.</p>`)).toBe('Energy $E = mc^2$ holds.');
  });

  it('emits display math as its own block and splits the paragraph around it', () => {
    expect(md(`<p>Before ${hostMath('claude', '\\int_0^1 x\\,dx = \\tfrac12', true)} after.</p>`)).toBe(
      'Before\n\n$$\n\\int_0^1 x\\,dx = \\tfrac12\n$$\n\nafter.',
    );
  });

  it('reads Gemini data-math, block and inline', () => {
    expect(md(`<p>So ${hostMath('gemini', 'v = u + at')}.</p>${hostMath('gemini', 'F = ma', true)}`)).toBe(
      'So $v = u + at$.\n\n$$\nF = ma\n$$',
    );
  });

  it('reads ChatGPT data-math-source when KaTeX emitted no MathML', () => {
    expect(md(`<p>${hostMath('chatgpt', 'a^2 + b^2 = c^2')}</p>`)).toBe('$a^2 + b^2 = c^2$');
  });

  it('falls back to a TeX aria-label on role="math", but not to spoken text', () => {
    expect(md('<p><span role="math" aria-label="\\frac{1}{2}"><span class="katex"><span class="katex-html" aria-hidden="true">12</span></span></span></p>')).toBe('$\\frac{1}{2}$');
    expect(md('<p><span role="math" aria-label="one half of the total">half</span></p>')).toBe('half');
  });

  it('reads MathJax 2 scripts and drops the typeset frame and preview', () => {
    expect(md(`<p>Root ${hostMath('mathjax2', 'x = \\sqrt{2}')} found.</p>`)).toBe('Root $x = \\sqrt{2}$ found.');
    expect(md(`<div>${hostMath('mathjax2', 'x^2 = 2', true)}</div>`)).toBe('$$\nx^2 = 2\n$$');
  });

  it('ignores MathJax scripts that are not TeX', () => {
    expect(md('<p>a<script type="math/mml"><math><mi>x</mi></math></script>b</p>')).toBe('ab');
  });

  it('reads MathJax 3 through data-latex, the MathML annotation, then readable MathML', () => {
    expect(md(`<p>${hostMath('mathjax3', 'y = mx + c')}</p>`)).toBe('$y = mx + c$');
    expect(md('<mjx-container display="true"><mjx-math aria-hidden="true">glyph</mjx-math><mjx-assistive-mml><math display="block"><semantics><mi>x</mi><annotation encoding="application/x-tex">x \\ge 0</annotation></semantics></math></mjx-assistive-mml></mjx-container>')).toBe('$$\nx \\ge 0\n$$');
    expect(md('<p>Value <mjx-container><mjx-math aria-hidden="true">glyphs glyphs</mjx-math><mjx-assistive-mml><math><mi>x</mi><mo>=</mo><mn>2</mn></math></mjx-assistive-mml></mjx-container>.</p>')).toBe('Value x=2.');
  });

  it('reads raw MathML with a TeX annotation, and falls back to its text without one', () => {
    expect(md('<p><math><semantics><mrow><mi>x</mi></mrow><annotation encoding="application/x-tex">x_1</annotation></semantics></math></p>')).toBe('$x_1$');
    expect(md('<p>Is <math><mi>a</mi><mo>+</mo><mi>b</mi></math> ok</p>')).toBe('Is a+b ok');
    expect(md('<math display="block"><semantics><mi>x</mi><annotation encoding="TeX">x^3</annotation></semantics></math>')).toBe('$$\nx^3\n$$');
  });

  it('keeps KaTeX readable when no source survives', () => {
    expect(md('<p><span class="katex"><span class="katex-mathml"><math><mi>x</mi><mo>=</mo><mn>1</mn></math></span><span class="katex-html" aria-hidden="true">x=1x=1</span></span></p>')).toBe('x=1');
  });

  it('shows a KaTeX parse error as its source', () => {
    expect(md('<p><span class="katex-error" title="ParseError">\\frac{1}{</span></p>')).toBe('$\\frac{1}{$');
  });

  it('reads remark-math output that was never typeset', () => {
    expect(md('<p>So <code class="language-math math-inline">x^2</code>.</p><pre><code class="language-math math-display">y = 1</code></pre>')).toBe('So $x^2$.\n\n$$\ny = 1\n$$');
  });

  it('strips delimiters stored with the source and separates adjacent inline math', () => {
    expect(md('<p><span class="math-inline" data-math="$a$">a</span><span class="math-inline" data-math="\\(b\\)">b</span></p>')).toBe('$a$ $b$');
    expect(md('<span class="math-inline" data-math="$$c$$">c</span>')).toBe('$$\nc\n$$');
  });

  it('joins a TeX line that starts with "=" so the render path keeps the paragraph structure', () => {
    expect(md('<div class="math-block" data-math="x = 1 + 2\n= 3\n\n= 3.0">x</div>')).toBe('$$\nx = 1 + 2 = 3 = 3.0\n$$');
  });

  it('leaves unrendered TeX in text untouched and escapes prices', () => {
    expect(md('<p>Here $x^2 + 1 = 0$ and \\(a_1*b\\) stay; a coffee is $5 and tea $3.</p>')).toBe(
      'Here $x^2 + 1 = 0$ and \\(a_1*b\\) stay; a coffee is \\$5 and tea \\$3.',
    );
  });

  it('uses inline math inside headings, cells and emphasis', () => {
    expect(md(`<h2>Find ${hostMath('claude', 'x', true)}</h2>`)).toBe('## Find $x$');
    expect(md(`<p><strong>Result ${hostMath('gemini', 'x = 2', true)}</strong></p>`)).toBe('**Result $x = 2$**');
  });
});

describe('messageToMarkdown: blocks', () => {
  it('serializes headings, emphasis, strike, inline code, links, breaks, rules and quotes', () => {
    expect(
      md('<h1>T</h1><p>A <b>b</b> <i>i</i> <del>d</del> <code>x_1 = `y`</code><br>next</p><hr><blockquote><p>Q1</p><p>Q2</p></blockquote>'),
    ).toBe('# T\n\nA **b** *i* ~~d~~ `` x_1 = `y` ``\\\nnext\n\n---\n\n> Q1\n>\n> Q2');
  });

  it('keeps link text and http(s) targets only', () => {
    expect(md('<p><a href="https://a.example/x_(1)">doc</a> <a href="javascript:alert(1)">bad</a> <a href="/rel">rel</a> <a href="https://b.example/">https://b.example/</a></p>')).toBe(
      '[doc](https://a.example/x_%281%29) bad rel <https://b.example/>',
    );
  });

  it('preserves ordered start numbers, nesting and task lists', () => {
    expect(
      md('<ol start="3"><li>three<ol><li>inner</li></ol></li><li>four</li></ol><ul><li><input type="checkbox" checked disabled> done</li><li><input type="checkbox" disabled> todo</li></ul>'),
    ).toBe('3. three\n   1. inner\n4. four\n\n- [x] done\n- [ ] todo');
  });

  it('keeps loose lists loose and indents blocks inside an item', () => {
    expect(md(`<ol><li><p>First:</p>${hostMath('claude', 'a = b', true)}<p>then</p></li><li><p>Second</p></li></ol>`)).toBe(
      '1. First:\n\n   $$\n   a = b\n   $$\n\n   then\n\n2. Second',
    );
  });

  it('writes GFM tables with escaped pipes, alignment and padded rows', () => {
    expect(
      md('<table><tr><th style="text-align:right">n</th><th align="center">a|b</th></tr><tr><td>1</td><td><code>x|y</code></td></tr><tr><td>2</td></tr></table>'),
    ).toBe('| n | a\\|b |\n| --: | :-: |\n| 1 | `x\\|y` |\n| 2 |  |');
  });

  it('uses alt text for images and skips decorative ones', () => {
    expect(md('<p><img alt="Free-body diagram" src="x.png"> <img alt="" src="y.png"><img role="presentation" alt="icon" src="z.png"></p>')).toBe('Free-body diagram');
  });

  it('turns sub and sup into script notation and drops citation superscripts', () => {
    expect(md('<p>H<sub>2</sub>O at 10<sup>-5</sup> m<sup>2</sup>, the 1<sup>st</sup> term<sup><a href="#fn1">1</a></sup><sup>[2]</sup></p>')).toBe(
      'H$_2$O at 10$^{-5}$ m$^2$, the 1$^{\\text{st}}$ term',
    );
  });
});

describe('messageToMarkdown: code blocks', () => {
  it.each(['chatgpt', 'chatgpt-legacy', 'claude', 'gemini', 'grok'] as const)('%s: language from the block, toolbar text excluded', (host) => {
    expect(md(hostCode(host, 'javascript', 'const a = 1;\n\nconsole.log(a);'))).toBe('```javascript\nconst a = 1;\n\nconsole.log(a);\n```');
  });

  it('reads the language from data-language and treats plain text as none', () => {
    expect(md('<pre data-language="Rust"><code>fn main() {}</code></pre>')).toBe('```rust\nfn main() {}\n```');
    expect(md('<pre><code class="language-plaintext">hello</code></pre>')).toBe('```\nhello\n```');
  });

  it('uses a fence longer than any backtick run inside', () => {
    expect(md('<pre><code class="language-md">```js\nx\n```</code></pre>')).toBe('````md\n```js\nx\n```\n````');
  });

  it('joins editors that render one element per line and skips line numbers', () => {
    expect(md('<pre><code><div class="cm-line"><span class="linenumber">1</span>a = 1</div><div class="cm-line">b = 2</div></code></pre>')).toBe('```\na = 1\nb = 2\n```');
  });

  it('does not swallow prose that merely sits beside a code block', () => {
    expect(md('<div><div>Output</div><pre><code>42</code></pre></div>')).toBe('Output\n\n```\n42\n```');
    expect(md('<div><p>Run it:</p><pre><code>ls</code></pre><button>Copy</button></div>')).toBe('Run it:\n\n```\nls\n```');
  });

  it('skips a code block whose text the host has not mounted yet', () => {
    expect(md('<p>a</p><div data-testid="code-block"><div class="group/code-header"><span>Bash</span><button>Copy</button></div></div><p>b</p>')).toBe('a\n\nb');
  });

  it('treats a multi-line <code> outside <pre> as a block', () => {
    expect(md('<div><code class="language-py">a = 1\nb = 2</code></div>')).toBe('```py\na = 1\nb = 2\n```');
  });
});

describe('messageToMarkdown: chrome and reasoning', () => {
  it('skips buttons, icons, hidden and screen-reader-only content', () => {
    expect(md('<p>Keep<button>Copy</button><svg><text>x</text></svg><span class="sr-only">hidden</span><span aria-hidden="true">deco</span><span style="display:none">gone</span><span hidden>gone</span> this.</p>')).toBe('Keep this.');
  });

  it('skips reasoning collapsibles and closed details; keeps open content without its summary', () => {
    expect(md('<details open><summary>Thought for 12s</summary><p>scratch work</p></details><p>Answer.</p>')).toBe('Answer.');
    expect(md('<details><summary>More</summary><p>hidden</p></details><p>Answer.</p>')).toBe('Answer.');
    expect(md('<details open><summary>Derivation</summary><p>shown</p></details>')).toBe('shown');
  });

  it('drops citation chips but keeps a paragraph that only carries a citation class', () => {
    expect(md('<p>Fact.<span class="citation-chip"><a href="https://s.example/">Source</a></span></p>')).toBe('Fact.');
    const long = 'This paragraph is the answer itself and is far longer than any source chip could be, so it stays in the output whatever its class says.';
    expect(md(`<p class="has-citations">${long}</p>`)).toBe(long);
  });

  it('removes citation tokens ChatGPT prints as text', () => {
    expect(md('<p>Water boils at 100 °C :contentReference[oaicite:0]{index=0} at sea level【4†source】.\uE200cite\uE202turn0search0\uE201</p>')).toBe('Water boils at 100 °C at sea level.');
  });
});

describe('messageToMarkdown: escaping', () => {
  it('escapes only what Markdown would misread', () => {
    expect(md('<p>2 * 3 and a*b, snake_case and _private, a < b and &lt;div>, R&D and &amp;amp;</p>')).toBe(
      '2 * 3 and a\\*b, snake_case and \\_private, a < b and \\<div>, R&D and \\&amp;',
    );
  });

  it('escapes line-start markers that the page shows as text', () => {
    expect(md('<p># not a heading</p><p>- not a bullet</p><p>1. not a list</p><p>&gt; not a quote</p><p>= 42</p><p>---</p>')).toBe(
      '\\# not a heading\n\n\\- not a bullet\n\n1\\. not a list\n\n\\> not a quote\n\n\\= 42\n\n\\---',
    );
  });

  it('keeps literal brackets, escaping only what would form a link', () => {
    expect(md('<p>Interval [0, 1] and [text](url) literal</p>')).toBe('Interval [0, 1] and &#91;text](url) literal');
  });

  it('moves edge punctuation out of emphasis that CommonMark would not close', () => {
    expect(md('<p><strong>注意：</strong>这是重点</p>')).toBe('**注意**：这是重点');
    expect(md('<p>f<strong>(x)</strong> end <strong> spaced </strong>word</p>')).toBe('f(**x)** end **spaced** word');
  });

  it('collapses whitespace like a browser and leaves no trailing spaces', () => {
    const out = md('<div>\n  <p>  a \n  b  </p>\n  <p>c<br>  </p>\n</div>');
    expect(out).toBe('a b\n\nc');
    expect(out).not.toMatch(/[ \t]+$/m);
  });
});

describe('messageToMarkdown: output through the panel renderer', () => {
  const shown = (html: string) => {
    const host = elementFromHtml(renderToStaticMarkup(createElement(MathMarkdown, { content: md(html) })));
    host.querySelectorAll('.katex-mathml').forEach((node) => node.remove());
    return host;
  };

  it('keeps prices, brackets and line-start literals as the text the chat showed', () => {
    const host = shown('<p>A coffee is $5 and tea $3, see [note](x).</p><p>= 42</p><p>1. not a list</p><p># not a heading</p>');
    expect(host.querySelector('.katex')).toBeNull();
    expect(host.querySelectorAll('p')).toHaveLength(4);
    expect(host.querySelector('ol, h1, a')).toBeNull();
    expect(host.textContent).toContain('A coffee is $5 and tea $3, see [note](x).');
    expect(host.textContent).toContain('= 42');
    expect(host.textContent).toContain('1. not a list');
    expect(host.textContent).toContain('# not a heading');
  });

  it('typesets scripts and the host math without an error', () => {
    const host = shown(`<p>H<sub>2</sub>O at 10<sup>-5</sup> with ${hostMath('claude', '\\frac{a}{b}')}</p>${hostMath('gemini', 'x = 1\n= 2', true)}`);
    expect(host.querySelector('.katex-error')).toBeNull();
    expect(host.querySelectorAll('.katex-display')).toHaveLength(1);
    expect(host.querySelectorAll('p')).toHaveLength(1);
    expect(host.querySelectorAll('.katex').length).toBeGreaterThanOrEqual(4);
  });
});

describe('messageToMarkdown: robustness', () => {
  it('returns an empty string for non-elements and empty messages', () => {
    expect(messageToMarkdown(null as unknown as Element)).toBe('');
    expect(messageToMarkdown(document.createTextNode('x') as unknown as Element)).toBe('');
    expect(md('')).toBe('');
  });

  it('serializes a root that is itself a code block or a formula', () => {
    const pre = elementFromHtml('<pre><code class="language-c">int x;</code></pre>').firstElementChild!;
    expect(messageToMarkdown(pre)).toBe('```c\nint x;\n```');
    const math = elementFromHtml(hostMath('gemini', 'x', true)).firstElementChild!;
    expect(messageToMarkdown(math)).toBe('$$\nx\n$$');
  });

  it('does not read the DOM destructively', () => {
    const el = elementFromHtml(hostAnswerHtml('claude'));
    const before = el.innerHTML;
    messageToMarkdown(el);
    expect(el.innerHTML).toBe(before);
  });

  it('is bounded on very deep and very large messages', () => {
    let deep = 'core';
    for (let i = 0; i < 400; i++) deep = `<div>${deep}</div>`;
    expect(() => md(deep)).not.toThrow();

    const big = elementFromHtml(`<div>${`<p>${'word '.repeat(60)}</p>`.repeat(1200)}</div>`);
    const out = messageToMarkdown(big);
    expect(out.length).toBeLessThanOrEqual(MAX_MARKDOWN_CHARS);
    expect(out.length).toBeGreaterThan(10_000);
  });

  it('stays linear on text built to make a pattern backtrack', () => {
    const run = (text: string, wrap = (t: string) => t) => {
      const p = document.createElement('p');
      p.textContent = text;
      const host = document.createElement('div');
      host.innerHTML = wrap('<i></i>');
      (host.querySelector('i') ?? host).replaceWith(p);
      return messageToMarkdown(host);
    };
    const started = cpuMs();
    expect(run(`a${' '.repeat(200_000)}b`)).toBe('a b');
    expect(run('['.repeat(100_000)).length).toBe(100_000);
    expect(run(':contentReference['.repeat(10_000))).toContain(':contentReference');
    expect(run('【'.repeat(50_000)).length).toBe(50_000);
    expect(run('$='.repeat(50_000))).toContain('\\$=');
    expect(run('\\('.repeat(50_000)).length).toBe(100_000);
    expect(run(`a ${'&x'.repeat(50_000)}`).length).toBeGreaterThan(100_000);

    const bold = document.createElement('div');
    bold.innerHTML = '<p>a<strong></strong>b</p>';
    bold.querySelector('strong')!.textContent = `${'('.repeat(60_000)}x${')'.repeat(60_000)}`;
    expect(messageToMarkdown(bold)).toContain('**x**');

    const math = document.createElement('span');
    math.setAttribute('data-math', `x${' '.repeat(100_000)}\n${' '.repeat(100_000)}y`);
    expect(messageToMarkdown(math)).toBe('$x y$');

    const code = document.createElement('div');
    code.innerHTML = '<p><code></code></p>';
    code.querySelector('code')!.textContent = `a${' '.repeat(100_000)}\n${'\n'.repeat(50_000)}b`;
    expect(messageToMarkdown(code).startsWith('```\na')).toBe(true);
    expect(cpuMs() - started).toBeLessThan(2000);
  });

  it('survives hostile and malformed markup', () => {
    const html = '<p onclick="x()">a<script>alert(1)</script><style>p{}</style><iframe src="x"></iframe><table><tr></tr></table><ol start="zz"><li value="-">i</li></ol><annotation>stray</annotation><span class="katex"></span></p>';
    expect(() => md(html)).not.toThrow();
    expect(md(html)).not.toContain('alert');
  });
});
