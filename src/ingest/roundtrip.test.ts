import { describe, it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import 'katex/contrib/mhchem';
import { messageToMarkdown } from './dom-to-markdown';
import { structureMessage } from './index';
import { ANSWERS } from './__fixtures__/answers';
import { HOST_ANSWER_MARKDOWN, HOST_STYLES, elementFromHtml, hostAnswerHtml } from './__fixtures__/host-dom';

const rendered = new Map<string, string>();

function render(markdown: string): string {
  const cached = rendered.get(markdown);
  if (cached !== undefined) return cached;
  const html = typeset(markdown);
  rendered.set(markdown, html);
  return html;
}

/** The project's own render stack (MathMarkdown.tsx), without its prose-to-math heuristics. */
function typeset(markdown: string): string {
  return renderToStaticMarkup(
    createElement(
      Markdown,
      { remarkPlugins: [remarkMath, remarkGfm], rehypePlugins: [[rehypeKatex, { throwOnError: false, strict: false, trust: false }]] },
      markdown,
    ),
  );
}

/**
 * Canonical DOM for comparison: `$$x$$` written on one line renders as display math inside a
 * paragraph, a fenced `$$` block renders beside it. Both are the same display equation.
 */
function canonical(html: string): string {
  const host = elementFromHtml(html);
  for (const p of Array.from(host.querySelectorAll('p'))) {
    const only = p.children.length === 1 && p.children[0]!.classList.contains('katex-display') && !(p.textContent ?? '').replace(p.children[0]!.textContent ?? '', '').trim();
    if (only) p.replaceWith(p.children[0]!);
  }
  // A soft line break is a space; only <pre> keeps its newlines.
  const walker = document.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (!node.parentElement?.closest('pre')) node.nodeValue = (node.nodeValue ?? '').replace(/\s+/g, ' ');
  }
  return host.innerHTML.replace(/>\s+</g, '><').trim();
}

function roundTrip(markdown: string): string {
  return messageToMarkdown(elementFromHtml(render(markdown)));
}

const SYNTAX: Array<[string, string]> = [
  ['emphasis and code', 'Plain *em* **strong** ***both*** ~~gone~~ `code` and ``a ` b``.'],
  ['literal punctuation', 'Costs \\$5 and \\$7; 2 \\* 3; a\\_b\\_; \\<tag>; 3 < 4 > 2; R&D; \\# not a heading.'],
  ['line-start literals', '1\\. not a list\n\n\\- not a bullet\n\n\\> not a quote\n\n\\= 4'],
  ['hard break', 'first line\\\nsecond line'],
  ['links', 'See [the docs](https://example.com/a_b?q=1) and <https://example.org/x>.'],
  ['nested lists', '1. one\n   - a\n   - b\n     1. deep\n2. two\n\n- x\n- y'],
  ['loose list with blocks', '3. Three:\n\n   $$\n   a^2 + b^2 = c^2\n   $$\n\n   ```js\n   let x = 1;\n   ```\n\n4. Four'],
  ['task list', '- [x] done\n- [ ] todo'],
  ['table', '| Name | Value | Note |\n| :-- | --: | :-: |\n| $x$ | 1 | a \\| b |\n| `y\\|z` | 2 |  |'],
  ['quote', '> Quoted **text** with $x$.\n>\n> - item\n> - other'],
  ['code with backticks', '````md\n```js\nconst a = `x`;\n```\n````'],
  ['headings', '# One\n\n## Two with $x^2$\n\n###### Six'],
  ['inline and display math', 'Inline $a_1 + b^{2}$ then\n\n$$\n\\begin{aligned}\nx &= 1 \\\\\ny &= 2\n\\end{aligned}\n$$\n\nand after.'],
  ['math next to punctuation', 'If $x>0$, then ($y<0$); so $z=\\tfrac{1}{2}$.'],
  ['cjk emphasis', '**注意：** 这是重点，$x = 1$。'],
  ['rule', 'above\n\n---\n\nbelow'],
];

describe('Markdown -> render -> DOM -> messageToMarkdown', () => {
  const corpus: Array<[string, string]> = [...ANSWERS.map((a): [string, string] => [a.name, a.markdown]), ...SYNTAX];

  it.each(corpus)('%s renders the same after a round trip', (_name, markdown) => {
    const back = roundTrip(markdown);
    expect(canonical(render(back))).toBe(canonical(render(markdown)));
  });

  it.each(corpus)('%s reaches a fixed point', (_name, markdown) => {
    const once = roundTrip(markdown);
    expect(roundTrip(once)).toBe(once);
  });

  it('reproduces canonical Markdown exactly', () => {
    expect(roundTrip(HOST_ANSWER_MARKDOWN)).toBe(HOST_ANSWER_MARKDOWN);
  });
});

describe('structureMessage: page element to study structure', () => {
  it.each(HOST_STYLES)('%s markup yields the same steps', (host) => {
    const result = structureMessage(elementFromHtml(hostAnswerHtml(host)), { question: 'Solve x^2 - 5x + 6 = 0' });
    expect(result).not.toBeNull();
    expect(result!.capsule.meta.subject).toBe('Math');
    expect(result!.capsule.meta.question).toBe('Solve x^2 - 5x + 6 = 0');
    expect(result!.capsule.steps[0]!.formula).toBe('x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}');
    expect(JSON.stringify(result!.capsule)).not.toMatch(/Copy|Thought for|Show thinking|Worked for/);
  });

  it('structures a rendered corpus answer the same as its Markdown source', () => {
    for (const answer of ANSWERS) {
      const fromPage = structureMessage(elementFromHtml(render(answer.markdown)), { question: answer.question });
      if (answer.expect === null) {
        expect(fromPage, answer.name).toBeNull();
        continue;
      }
      expect(fromPage, answer.name).not.toBeNull();
      expect(fromPage!.strategy, answer.name).toBe(answer.expect.strategy);
      expect(fromPage!.capsule.steps, answer.name).toHaveLength(answer.expect.steps);
    }
  });

  it('returns null for an element with nothing to study', () => {
    expect(structureMessage(elementFromHtml('<p>Hello! How can I help?</p>'))).toBeNull();
    expect(structureMessage(null as unknown as Element)).toBeNull();
  });
});
