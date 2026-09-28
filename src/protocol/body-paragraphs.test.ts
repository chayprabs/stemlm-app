import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parse } from './parser';
import { StepWork } from '@/src/components/StepWork';

// Live Claude answers, 2026-09-28: a step body written as separate paragraphs ("Givens …", then one line
// per calculation) was shown as ONE run-on paragraph ("… = 4.738 m H = 20 m + 4.738 m = 24.74 m").
function capsuleWithBody(body: string): string {
  return [
    '```stemlm',
    '@meta',
    'version: 2',
    'subject: Physics',
    'topic: Paragraphs',
    'question: Q',
    '@endmeta',
    '@step id=s1',
    'title: Find the peak height',
    '@body',
    body,
    '@endbody',
    '@endstep',
    '@solution',
    'Done.',
    '@endsolution',
    '@end',
    '```',
  ].join('\n');
}

const firstBody = (body: string) => parse(capsuleWithBody(body)).capsule!.steps[0]!.body;

describe('step body paragraphs', () => {
  it('keeps a blank line between paragraphs, collapsed to one', () => {
    const body = firstBody('At the top $v_y=0$.\n\n\n$\\Delta y=4.738\\ \\text{m}$\n\n$H=24.74\\ \\text{m}$');
    expect(body).toBe('At the top $v_y=0$.\n\n$\\Delta y=4.738\\ \\text{m}$\n\n$H=24.74\\ \\text{m}$');
  });

  it('renders each paragraph as its own paragraph under Work', () => {
    const body = firstBody('At the top $v_y=0$.\n\n$\\Delta y=4.738\\ \\text{m}$\n\n$H=24.74\\ \\text{m}$');
    const html = renderToStaticMarkup(createElement(StepWork, { step: { id: 's1', index: 0, title: 't', body } }));
    expect(html.match(/<p>/g)?.length).toBe(3);
  });

  it('keeps separate lines of plain text and math apart when they were paragraphs', () => {
    // SF4 angle lines (live q10): each line its own paragraph, math and text interleaved.
    const body = firstBody('The ideal angles shrink:\n\n$F_{ax}$–S–$F_{ax}$ ≈ 173° (below 180°)\n\n$F_{eq}$–S–$F_{eq}$ ≈ 102° (below 120°)');
    const html = renderToStaticMarkup(createElement(StepWork, { step: { id: 's1', index: 0, title: 't', body } }));
    expect(html).not.toContain('katex-error');
    expect(html.match(/<p>/g)?.length).toBe(3);
    const visible = html.replace(/<span class="katex-mathml">[\s\S]*?<\/span>(?=<span class="katex-html")/g, '').replace(/<[^>]+>/g, '');
    expect(visible).toContain('≈ 173° (below 180°)');
    expect(visible).not.toContain('$');
    expect(visible).not.toContain('F_{');
  });

  it('never opens a blank line inside display math', () => {
    const body = firstBody('Solve:\n$$\nx = 1\n\ny = 2\n$$\n\nSo both hold.');
    expect(body).toBe('Solve:\n$$\nx = 1\ny = 2\n$$\n\nSo both hold.');
  });
});
