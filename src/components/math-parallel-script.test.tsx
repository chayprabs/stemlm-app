import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathMarkdown } from './MathMarkdown';

/** Drop KaTeX MathML (it stores original TeX in <annotation>) so leak checks see visible HTML. */
function visibleHtml(html: string): string {
  return html.replace(/<span class="katex-mathml">[\s\S]*?<\/span>(?=<span class="katex-html")/g, '');
}

describe('\\parallel as a subscript or superscript', () => {
  // Live Claude answer, 2026-09-27: "$F-W_\parallel=10.19\ \text{N}$" showed as a raw code span.
  for (const [label, content] of [
    ['inline subscript', 'The block moves because $F-W_\\parallel=10.19\\ \\text{N}$ exceeds the friction.'],
    ['inline superscript', 'Only $v^\\parallel$ changes.'],
    ['display subscript', '$$W_\\parallel = mg\\sin\\theta$$'],
  ] as const) {
    it(`typesets ${label} without leaking TeX`, () => {
      const html = renderToStaticMarkup(<MathMarkdown content={content} />);
      const visible = visibleHtml(html);
      console.log('PARALLEL_SCRIPT', label, JSON.stringify({ code: /<code/.test(html), error: html.includes('katex-error'), leak: visible.includes('mathbin') || visible.includes('\\parallel') }));
      expect(html).toContain('katex');
      expect(html).not.toContain('katex-error');
      expect(html).not.toMatch(/<code/);
      expect(visible).not.toContain('mathbin');
      expect(visible).not.toContain('\\parallel');
      expect(visible).toContain('∥');
    });
  }
});
