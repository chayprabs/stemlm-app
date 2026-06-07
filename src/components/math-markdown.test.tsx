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

  it('strips leaked @formulaend from rendered math', () => {
    const html = renderToStaticMarkup(
      <MathMarkdown content={'$$R = \\frac{u^2}{g}$$ @formulaend'} />,
    );
    expect(html).not.toContain('@formulaend');
    expect(html).not.toContain('@endformula');
  });

  it('renders undelimited @formula LaTeX as KaTeX (reactance pair)', () => {
    const html = renderToStaticMarkup(
      <MathMarkdown
        mathMode="display"
        content="Z_L = j\\omega L, \\quad Z_C = \\frac{1}{j\\omega C}"
      />,
    );
    expect(html).toContain('katex');
    expect(html).not.toContain('j\\omega L, \\quad');
    expect(html).toMatch(/math|mrow|mi|mo/i);
  });

  it('renders undelimited Z-parameter matrix formulas', () => {
    const html = renderToStaticMarkup(
      <MathMarkdown
        mathMode="display"
        content={
          '\\begin{bmatrix} Z_{11} & Z_{12} \\\\ Z_{21} & Z_{22} \\end{bmatrix} = ' +
          '\\begin{bmatrix} Z_1 + Z_2 & Z_2 \\\\ Z_2 & Z_3 + Z_2 \\end{bmatrix}'
        }
      />,
    );
    expect(html).toContain('katex');
    expect(html).toContain('mtable');
    expect(html).toContain('Z');
  });

  it('renders transfer function and Thevenin formulas', () => {
    const transfer = renderToStaticMarkup(
      <MathMarkdown
        mathMode="display"
        content="H(\\omega) = \\frac{Z_{21} Z_L}{(Z_{11} + Z_s)(Z_{22} + Z_L) - Z_{12}Z_{21}}"
      />,
    );
    expect(transfer).toContain('katex');
    expect(transfer).not.toContain('H(\\omega) = \\frac');

    const thevenin = renderToStaticMarkup(
      <MathMarkdown
        mathMode="display"
        content="Z_{th} = Z_3 + (Z_2 \\parallel (Z_1 + Z_s))"
      />,
    );
    expect(thevenin).toContain('katex');
    expect(thevenin).toContain('∥');
    expect(thevenin).not.toMatch(/>\s*p\s*a\s*r\s*a\s*l\s*l\s*e\s*l\s*</);
  });
});
