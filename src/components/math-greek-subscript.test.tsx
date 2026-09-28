import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathMarkdown } from './MathMarkdown';
import { prepareMathForRender } from '@/src/lib/math-content';

/** Drop KaTeX MathML (it stores original TeX in <annotation>) so leak checks see visible HTML. */
function visibleHtml(html: string): string {
  return html.replace(/<span class="katex-mathml">[\s\S]*?<\/span>(?=<span class="katex-html")/g, '');
}

// Live Claude 2026-09-27 (answer notes, panel + PDF): "μ_k → 0" and "μ_s < 0.60" showed a raw
// "μ_" because the math span started after the Greek letter.
describe('a Greek letter with a subscript in plain text', () => {
  it.each([
    ['Limit check: μ_k → 0 gives the frictionless result.', 'μ_k'],
    ['The block moves if μ_s < 0.60.', 'μ_s'],
    ['The natural frequency ω_n = 2 rad/s.', 'ω_n'],
  ])('is typeset as one symbol: %s', (text, symbol) => {
    const prepared = prepareMathForRender(text, 'auto');
    console.log('GREEK_SUB', JSON.stringify(prepared));
    expect(prepared).toContain(`$${symbol}`);
    const visible = visibleHtml(renderToStaticMarkup(<MathMarkdown content={text} />));
    expect(visible).not.toContain(`${symbol[0]}_`);
    expect(visible).not.toContain('katex-error');
  });

  it('leaves a lone Greek letter in prose alone', () => {
    expect(prepareMathForRender('The friction coefficient μ depends on the surfaces.', 'auto')).toBe('The friction coefficient μ depends on the surfaces.');
  });
});
