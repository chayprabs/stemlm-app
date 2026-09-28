import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathMarkdown } from './MathMarkdown';
import { prepareMathForRender } from '@/src/lib/math-content';

function visibleText(html: string): string {
  return html
    .replace(/<span class="katex-mathml">[\s\S]*?<\/span>(?=<span class="katex-html")/g, '')
    .replace(/<[^>]+>/g, '');
}

// Live Claude answers, 2026-09-28: genetics blanks ("R_Y_") raised a KaTeX error, and a prose
// parenthesis after a number ("≈ 173° (below 180°)") was typeset as italic variables b·e·l·o·w.
describe('notation that only looks like math', () => {
  it('keeps genotype blanks as written, without a KaTeX error', () => {
    const html = renderToStaticMarkup(
      <MathMarkdown content={'Round yellow (R_Y_) has 9 cells and wrinkled yellow (rrY_) has 3.'} />,
    );
    expect(html).not.toContain('katex-error');
    expect(visibleText(html)).toContain('(R_Y_) has 9 cells');
    expect(visibleText(html)).toContain('(rrY_) has 3');
  });

  it('keeps a one-word prose parenthesis out of math', () => {
    expect(prepareMathForRender('x ≈ 173° (below 180°)', 'auto', true)).toBe('$x ≈ 173°$ (below 180°)');
    expect(prepareMathForRender('y = 4 (about 12 units)', 'auto', true)).toBe('$y = 4$ (about 12 units)');
  });

  it('still treats a function call or a unit in parentheses as math', () => {
    expect(prepareMathForRender('so y = (sin x)^2 here', 'auto', true)).toContain('$y = (sin x)^2$');
    expect(prepareMathForRender('n = 2.5 (mmol) total', 'auto', true)).toContain('(mmol)');
  });
});
