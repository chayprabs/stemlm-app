import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathMarkdown } from './MathMarkdown';

/** Drop KaTeX MathML (it stores original TeX in <annotation>) so leak checks see visible HTML. */
function visibleHtml(html: string): string {
  return html.replace(/<span class="katex-mathml">[\s\S]*?<\/span>(?=<span class="katex-html")/g, '');
}

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

  it('keeps spaces in quickcheck prose with embedded subscripts', () => {
    const q =
      'Why is the current leaving C towards D written as (V_C - V_D)/24?';
    const a =
      "Because Ohm's law states current is the potential difference divided by resistance, and the potential at C minus the potential at D is V_C - V_D, so I = (V_C - V_D)/24Ω.";
    const qHtml = renderToStaticMarkup(<MathMarkdown content={q} />);
    const aHtml = renderToStaticMarkup(<MathMarkdown content={a} />);
    expect(qHtml).toContain('Why is the current leaving');
    expect(qHtml).not.toContain('Whyisthecurrentleaving');
    expect(qHtml).toContain('katex');
    expect(aHtml).toContain('law states current');
    expect(aHtml).not.toContain('BecauseOhm');
    expect(aHtml).toContain('katex');
    expect(visibleHtml(qHtml)).not.toContain('V_C');
    expect(visibleHtml(aHtml)).not.toContain('V_C');
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

  it('typesets the radiation display formula without leaking TeX', () => {
    const formula = 'A(t) = A_0 \\left(\\frac{1}{2}\\right)^{t / T_{1/2}}';
    const html = renderToStaticMarkup(
      <MathMarkdown mathMode="display" content={formula} />,
    );
    const vis = visibleHtml(html);
    expect(html).toContain('katex');
    expect(html).toMatch(/math|mrow|mi|mo/i);
    expect(vis).not.toContain('\\left');
    expect(vis).not.toContain('\\right');
    expect(vis).not.toContain('\\frac');
    expect(vis).not.toContain('T_{1/2}');
    expect(html).not.toContain('katex-error');

    const halfSrc = 'A(t) = A_0 \\left(½\\right)^{t / T_{1/2}}';
    const half = renderToStaticMarkup(
      <MathMarkdown mathMode="display" content={halfSrc} />,
    );
    const halfVis = visibleHtml(half);
    expect(half).toContain('katex');
    expect(halfVis).not.toContain('\\left');
    expect(halfVis).not.toContain('\\right');
    expect(halfVis).not.toContain('T_{1/2}');
    expect(half).not.toContain('katex-error');
  });

  it('typesets radiation work/check tokens and keeps English spacing', () => {
    const work =
      'A_0 is the initial radiation level, A(t) is the radiation level at time t, and T_{1/2} is the half-life. With initial relative activity A_0 = 64 A_{safe}, permissible activity A(t) = A_{safe}, and half-life T_{1/2} = 18 days: A(t)/A_0 = 1/64.';
    const workHtml = renderToStaticMarkup(<MathMarkdown content={work} />);
    const workVis = visibleHtml(workHtml);
    expect(workHtml).toContain('katex');
    expect(workHtml).toContain('initial radiation');
    expect(workHtml).toContain('permissible activity');
    expect(workVis).not.toContain('A_{safe}');
    expect(workVis).not.toContain('T_{1/2}');
    expect(workHtml).not.toContain('<em>safe</em>');
    expect(workHtml).not.toContain('64A_safer');
    expect(workHtml).not.toMatch(/64A<em>/);

    const check = '1/2 because A(T_{1/2})/A_0 = (1/2)^1 = 0.5.';
    const checkHtml = renderToStaticMarkup(<MathMarkdown content={check} />);
    const checkVis = visibleHtml(checkHtml);
    expect(checkHtml).toContain('katex');
    expect(checkHtml).toContain('because');
    expect(checkHtml).not.toContain('1/2because');
    expect(checkVis).not.toContain('T_{1/2}');
    expect(checkVis).not.toContain('A(T_{1/2})');
  });

  it('typesets Greek, mhchem, 10^{-n}, and \\left...\\right in mixed prose', () => {
    const greekSrc = 'The wavelength is \\lambda = 500 nm.';
    const greek = renderToStaticMarkup(<MathMarkdown content={greekSrc} />);
    expect(greek).toContain('katex');
    expect(greek).toContain('The wavelength is');
    expect(visibleHtml(greek)).not.toContain('\\lambda');

    const ceSrc = 'The molecule \\ce{H2O} is water.';
    const ce = renderToStaticMarkup(<MathMarkdown content={ceSrc} />);
    expect(ce).toContain('katex');
    expect(ce).toContain('is water');
    expect(visibleHtml(ce)).not.toContain('\\ce{H2O}');

    const sciSrc = 'A nanometer is 10^{-6} m long.';
    const sci = renderToStaticMarkup(<MathMarkdown content={sciSrc} />);
    expect(sci).toContain('katex');
    expect(sci).toContain('nanometer is');
    expect(visibleHtml(sci)).not.toContain('10^{-6}');

    const lrSrc = 'Activity is scaled by \\left(\\frac{1}{2}\\right)^{n} after n half-lives.';
    const lr = renderToStaticMarkup(<MathMarkdown content={lrSrc} />);
    expect(lr).toContain('katex');
    expect(lr).toContain('scaled by');
    expect(lr).toContain('after');
    const lrVis = visibleHtml(lr);
    expect(lrVis).not.toContain('\\left');
    expect(lrVis).not.toContain('\\right');
    expect(lrVis).not.toContain('\\frac');
  });

  it('does not let GFM italics eat TeX subscripts, while lists/tables still render', () => {
    const safe = renderToStaticMarkup(
      <MathMarkdown content="With activity 64 A_{safe} remaining." />,
    );
    expect(safe).toContain('katex');
    expect(safe).not.toContain('<em>safe</em>');
    expect(visibleHtml(safe)).not.toContain('A_{safe}');
    expect(safe).toContain('remaining');

    const italic = renderToStaticMarkup(
      <MathMarkdown content="The circuit is **capacitive** because _current leads_ voltage." />,
    );
    expect(italic).toContain('<em>');
    expect(italic).toContain('current leads');

    const md = [
      '- First item',
      '- Second item',
      '',
      '| Col A | Col B |',
      '| --- | --- |',
      '| 1 | 2 |',
    ].join('\n');
    const table = renderToStaticMarkup(<MathMarkdown content={md} />);
    expect(table).toContain('<ul>');
    expect(table).toContain('<table>');
  });
});
