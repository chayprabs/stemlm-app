import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathMarkdown } from './MathMarkdown';

describe('MathMarkdown', () => {
  it('renders bold and italic markdown', () => {
    const html = renderToStaticMarkup(
      <MathMarkdown content="The circuit is **capacitive** because *current leads* voltage." />,
    );
    expect(html).toContain('<strong>');
    expect(html).toContain('capacitive');
    expect(html).toContain('<em>');
    expect(html).toContain('current leads');
  });

  it('renders GFM lists and tables', () => {
    const md = [
      '- First item',
      '- Second item',
      '',
      '| Col A | Col B |',
      '| --- | --- |',
      '| 1 | 2 |',
    ].join('\n');
    const html = renderToStaticMarkup(<MathMarkdown content={md} />);
    expect(html).toContain('<ul>');
    expect(html).toContain('<li>');
    expect(html).toContain('<table>');
    expect(html).toContain('<th>');
    expect(html).toContain('<td>');
  });

  it('normalizes \\( \\) and \\[ \\] math delimiters to $ syntax', () => {
    const html = renderToStaticMarkup(
      <MathMarkdown content="Use \\(x^2\\) and \\[E = mc^2\\]" />,
    );
    expect(html).toContain('$x^2$');
    expect(html).toContain('$$E = mc^2$$');
  });

  it('wraps output in slm-prose for panel typography', () => {
    const html = renderToStaticMarkup(<MathMarkdown content="**bold**" />);
    expect(html).toContain('slm-prose');
  });
});
