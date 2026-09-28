import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { FollowupBar } from './FollowupBar';

vi.mock('@/src/content/controller', () => ({ getController: () => ({ followUp: vi.fn() }) }));

// Live Claude answers, 2026-09-28: the Ask-in-chat hint read "Try: … a simple $P\Delta V$?" and
// "Try: What would $v_C$ be …" with the TeX delimiters showing.
describe('Ask-in-chat hint', () => {
  it('typesets math in the suggested question', () => {
    const html = renderToStaticMarkup(
      <FollowupBar followup="ctx" subject="Physics" stepTitle="Work on an isotherm" intent="ask" hint={'Try: Why does the work on an isotherm involve a logarithm rather than a simple $P\\Delta V$?'} />,
    );
    const visible = html.replace(/<span class="katex-mathml">[\s\S]*?<\/span>(?=<span class="katex-html")/g, '').replace(/<[^>]+>/g, '');
    expect(html).toContain('katex');
    expect(visible).not.toContain('$');
    expect(visible).not.toContain('\\Delta');
    expect(visible).toContain('Try: Why does the work on an isotherm involve a logarithm rather than a simple');
  });

  it('keeps a plain hint as plain text', () => {
    const html = renderToStaticMarkup(
      <FollowupBar followup="ctx" subject="Physics" stepTitle="t" intent="ask" hint="Try: Why does a bigger resistor slow the charging?" />,
    );
    expect(html).not.toContain('katex');
    expect(html).toContain('Try: Why does a bigger resistor slow the charging?');
  });
});
