import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FollowupBar } from './FollowupBar';

vi.mock('@/src/content/controller', () => ({ getController: () => ({ followUp: vi.fn() }) }));

/** What a reader sees: no tags, and no MathML twin of a typeset formula. */
const visible = (html: string) =>
  html.replace(/<span class="katex-mathml">[\s\S]*?<\/span>(?=<span class="katex-html")/g, '').replace(/<[^>]+>/g, '');

// Live Claude answers, 2026-09-28: the Ask-in-chat hint read "Try: … a simple $P\Delta V$?" and
// "Try: What would $v_C$ be …" with the TeX delimiters showing.
describe('Ask-in-chat suggestion', () => {
  it('typesets math in the suggested question', () => {
    const html = renderToStaticMarkup(
      <FollowupBar followup="ctx" subject="Physics" stepTitle="Work on an isotherm" intent="ask" suggestion={'Why does the work on an isotherm involve a logarithm rather than a simple $P\\Delta V$?'} />,
    );
    expect(html).toContain('katex');
    expect(visible(html)).not.toContain('$');
    expect(visible(html)).not.toContain('\\Delta');
    expect(visible(html)).toContain('Try: Why does the work on an isotherm involve a logarithm rather than a simple');
  });

  it('keeps a plain suggestion as plain text', () => {
    const html = renderToStaticMarkup(
      <FollowupBar followup="ctx" subject="Physics" stepTitle="t" intent="ask" suggestion="Why does a bigger resistor slow the charging?" />,
    );
    expect(html).not.toContain('katex');
    expect(visible(html)).toContain('Try: Why does a bigger resistor slow the charging?');
  });

  it('typesets math in a plain hint too', () => {
    const html = renderToStaticMarkup(<FollowupBar followup="ctx" subject="Physics" stepTitle="t" intent="ask" hint={'Ask about $v_C$.'} />);
    expect(html).toContain('katex');
    expect(visible(html)).not.toContain('$');
  });
});
