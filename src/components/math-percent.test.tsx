import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathMarkdown } from './MathMarkdown';

/** Visible text only: KaTeX MathML (the original TeX in <annotation>) and tags removed. */
function visibleText(html: string): string {
  return html
    .replace(/<span class="katex-mathml">[\s\S]*?<\/span>(?=<span class="katex-html")/g, '')
    .replace(/<[^>]+>/g, '');
}

describe('a percent sign next to or inside math', () => {
  // Live Claude answer, 2026-09-28: "5.69 V (63.2%). At …" showed as "5.69 V (63.2. At …": the
  // parenthesised percentage was wrapped as math and TeX read the bare % as a comment.
  it('keeps a parenthesised percentage after inline math', () => {
    const html = renderToStaticMarkup(
      <MathMarkdown content={'At $t=\\tau$, $v_C=5.69\\ \\text{V}$ (63.2%). At $5\\tau$, $v_C=8.94\\ \\text{V}$ (99.3%), so it is full.'} />,
    );
    const text = visibleText(html);
    expect(html).not.toContain('katex-error');
    expect(text).toContain('(63.2%)');
    expect(text).toContain('(99.3%)');
    expect(text).toContain('so it is full.');
  });

  it('shows a bare percent the model put inside its own math', () => {
    const html = renderToStaticMarkup(<MathMarkdown content={'The efficiency is $\\eta = 45%$ of the ideal value.'} />);
    const text = visibleText(html);
    expect(html).not.toContain('katex-error');
    expect(text).toContain('45%');
    expect(text).toContain('of the ideal value.');
  });

  it('leaves an already escaped percent alone', () => {
    const html = renderToStaticMarkup(<MathMarkdown content={'The ionization is $x/0.10 = 1.3\\% < 5\\%$, so it holds.'} />);
    const text = visibleText(html);
    expect(html).not.toContain('katex-error');
    expect(text).toContain('1.3%');
    expect(text).toContain('5%');
    expect(text).not.toContain('\\%');
  });
});
