/**
 * Code inside a step. The guide teaches a `~~~` block, because a ``` line inside the answer ends
 * the answer's own code block on the chat page. Both must reach the panel as the code was written.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StepWork } from '@/src/components/StepWork';
import { findCapsuleRaw, parse } from './parser';

const CODE = [
  'def mid(a, lo, hi):',
  '    m = (lo + hi) // 2',
  '',
  '    @patch("x")  # a decorator is not a marker',
  '    return a[m] if x_1 == $2 else None',
];

function capsule(fence: string, outer = '```stemlm'): string {
  return [
    outer,
    '@meta',
    'subject: CS',
    'topic: Binary search',
    '@endmeta',
    '@step id=s1',
    'title: Find the middle index',
    '@body',
    'The middle is found by integer division:',
    '',
    `${fence}python`,
    ...CODE,
    fence,
    '',
    'It runs in $O(\\log n)$ time.',
    '@endbody',
    '@endstep',
    '@step id=s2',
    'title: Compare',
    '@body',
    'Compare `a[m]` with the target.',
    '@endbody',
    '@endstep',
    '@step id=s3',
    'title: Repeat',
    '@body',
    'Halve the range and repeat.',
    '@endbody',
    '@endstep',
    '@solution',
    'Binary search halves the range each time.',
    '@endsolution',
    '@end',
    '```',
  ].join('\n');
}

describe.each([['~~~', 'a ~~~ block, as the guide teaches'], ['```', 'a ``` block, written against the guide']])('code in a step: %s (%s)', (fence) => {
  const result = parse(capsule(fence));
  const body = result.capsule?.steps[0]?.body ?? '';

  it('keeps the whole answer: every step, and the text after the code', () => {
    expect(result.status).toBe('ok');
    expect(result.capsule?.steps.map((step) => step.id)).toEqual(['s1', 's2', 's3']);
    expect(body).toContain('It runs in $O(\\log n)$ time.');
    expect(result.capsule?.solution).toBe('Binary search halves the range each time.');
    expect(result.warningCodes).not.toContain('missing_end');
  });

  it('keeps the code byte for byte: indentation, blank lines, and a line that looks like a marker', () => {
    expect(body).toContain([`${fence}python`, ...CODE, fence].join('\n'));
  });

  it('shows it in the panel as a code block, untouched by the maths and Markdown passes', () => {
    const html = renderToStaticMarkup(<StepWork step={result.capsule!.steps[0]!} />);
    const code = /<pre><code[^>]*>([\s\S]*?)<\/code><\/pre>/.exec(html)?.[1] ?? '';
    const text = code.replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
    expect(text.trimEnd()).toBe(CODE.join('\n'));
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('~~~');
  });
});

describe('a code fence the model wrote inside an answer with no stemlm label', () => {
  it('does not cut the answer at the inner fence', () => {
    const raw = capsule('```', '```');
    expect(findCapsuleRaw(raw)).toContain('@endsolution\n@end');
    const result = parse(raw);
    expect(result.capsule?.steps).toHaveLength(3);
    expect(result.capsule?.solution).toBe('Binary search halves the range each time.');
  });

  it('still reads an answer that is being written and has not reached @end', () => {
    const partial = capsule('~~~', '```').split('@step id=s2')[0]!;
    expect(parse(partial).capsule?.steps).toHaveLength(1);
  });

  it('never lets an unclosed code block swallow the rest of the answer', () => {
    const raw = capsule('~~~').replace('~~~\n\nIt runs', '\nIt runs');
    const result = parse(raw);
    expect(result.capsule?.steps.map((step) => step.id)).toEqual(['s1', 's2', 's3']);
    expect(result.capsule?.solution).toBe('Binary search halves the range each time.');
  });
});
