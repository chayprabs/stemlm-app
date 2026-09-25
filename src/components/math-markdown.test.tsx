import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { MathMarkdown } from './MathMarkdown';

/** Drop KaTeX MathML (it stores original TeX in <annotation>) so leak checks see visible HTML. */
function visibleHtml(html: string): string {
  return html.replace(/<span class="katex-mathml">[\s\S]*?<\/span>(?=<span class="katex-html")/g, '');
}

describe('MathMarkdown', () => {
  it('GAP-02 renders bracketed concentrations beside units without merging math spans', () => {
    const source = 'Conditions: $[\\mathrm{H_2SO_4}]=0.10\\ \\mathrm{mol\\,dm^{-3}}$, $298\\ \\mathrm{K}$, $25\\,^{\\circ}\\mathrm{C}$, $\\lambda=5000\\ \\text{\\AA}$, $e=1.602\\times10^{-19}\\ \\mathrm{C}$.';
    const html = visibleHtml(renderToStaticMarkup(<MathMarkdown content={source} />));
    expect(html).not.toContain('katex-error');
    expect(html).not.toContain('\\mathrm');
    expect(html).not.toContain('$$');
  });
  it('GAP-02 preserves adjacent math spans with nested unit arguments', () => {
    const source = 'Conditions: $c=0.10\\ \\mathrm{mol\\,dm^{-3}}$, $T=298\\ \\mathrm{K}$, and $v=5\\ \\mathrm{m\\,s^{-1}}$.';
    const html = visibleHtml(renderToStaticMarkup(<MathMarkdown content={source} />));
    expect(html).not.toContain('katex-error');
    expect(html).not.toContain('\\mathrm');
    expect(html).not.toContain('$$');
    for (const value of ['0.10', '298', '5']) expect(html).toContain(value);
  });
  function rendered(content: string, mathMode: 'auto' | 'display' = 'auto') {
    const host = document.createElement('div');
    host.innerHTML = visibleHtml(renderToStaticMarkup(<MathMarkdown content={content} mathMode={mathMode} />));
    return host;
  }

  it.each([
    ['$$\nE=mc^2\n$$', 'auto'],
    ['a=1\nb=2\nc=3', 'display'],
    ['\\begin{align} a &= b \\\\ c &= d \\end{align}', 'display'],
  ] as const)('GAP-02 renders complete display blocks without losing content: %s', (source, mode) => {
    const host = rendered(source, mode);
    expect(host.querySelector('.katex-display')).not.toBeNull();
    expect(host.querySelector('.katex-error')).toBeNull();
    for (const token of source.match(/\d+/g) ?? []) expect(host.textContent).toContain(token);
  });

  it.each([
    ['Consider $x = 5 and then stop.', ['Consider', '5', 'then stop']],
    ['$$E = mc^2 and the rest of the paragraph.', ['E', '2', 'rest of the paragraph']],
    ['Value \\(x=1\\] here.', ['Value', '1', 'here']],
    ['$a = \\text{cost is $5}$', ['cost is $5']],
    ['\\begin{align} a &= b \\\\ c &= d', ['a', 'b', 'c', 'd']],
  ] as const)('GAP-02 preserves malformed-delimiter content: %s', (source, tokens) => {
    const host = rendered(source);
    for (const token of tokens) expect(host.textContent?.replace(/\u00a0/g, ' ')).toContain(token);
  });

  it.each(['https://example.com/a_b_c/d_e', 'src/lib/math_content_v2.ts'])('GAP-02 preserves paths: %s', (path) => {
    expect(rendered(`See ${path} for details.`).textContent).toContain(path);
  });

  it('GAP-02 keeps currency literal while rendering subsequent math', () => {
    const host = rendered('It costs $5, and $x$ is the rate.');
    expect(host.textContent).toContain('$5');
    expect(host.querySelector('.katex')).not.toBeNull();
  });

  it('keeps two currency amounts and an escaped dollar literal', () => {
    const host = rendered('Costs were $5 and $7, and an escaped \\$ stays a dollar.');
    expect(host.querySelector('.katex-error')).toBeNull();
    expect(host.textContent).toBe('Costs were $5 and $7, and an escaped $ stays a dollar.');
  });

  it('MATH-01 renders an angle with a capitalised vertex name as one formula', () => {
    const host = rendered('Angle $30^\\circ$ and $\\angle ABC = 90^{\\circ}$.');
    expect(host.querySelectorAll('.katex')).toHaveLength(2);
    expect(host.textContent).not.toContain('^{');
    expect(host.textContent).not.toContain('\\');
  });

  it('MATH-03 renders three prices as text, not math', () => {
    const host = rendered('The ticket costs $5 and the snack costs $7, so $12 total.');
    expect(host.querySelector('.katex')).toBeNull();
    expect(host.textContent).toBe('The ticket costs $5 and the snack costs $7, so $12 total.');
  });

  it('MATH-04 renders inline math split by a soft line break', () => {
    const host = rendered('Energy $E =\nmc^2$ holds.');
    expect(host.querySelectorAll('.katex')).toHaveLength(1);
    expect(host.textContent).not.toContain('$');
  });

  it('MATH-06 styles unparseable TeX as code in the panel and the PDF', () => {
    expect(rendered('Broken $\\frac{1}{2$ here.').querySelector('.katex-error')).not.toBeNull();
    const panelCss = readFileSync(resolve(process.cwd(), 'assets/panel.css'), 'utf8');
    const rule = panelCss.slice(panelCss.indexOf('.slm-prose .katex-error {'));
    expect(rule.slice(0, rule.indexOf('}'))).toMatch(/font-family:\s*var\(--font-mono\)[\s\S]*color:\s*var\(--slm-fg\)\s*!important/);
    expect(readFileSync(resolve(process.cwd(), 'src/lib/pdf.ts'), 'utf8')).toMatch(/\.katex-error\{font-family:\$\{FONT_MONO\}/);
  });

  it('MATH-06 renders an escaped dollar inside math without a KaTeX error', () => {
    const host = rendered('Price $\\$5$ per unit.');
    expect(host.querySelector('.katex-error')).toBeNull();
    expect(host.textContent).toContain('$5');
    expect(host.textContent).toContain('per unit.');
  });

  it.each(['$|x|$', '$\\|x\\|$'])('GAP-02 preserves pipes inside table math: %s', (formula) => {
    const host = rendered(`| A | B |\n| --- | --- |\n| ${formula} | 2 |`);
    const cells = host.querySelectorAll('td');
    expect(cells).toHaveLength(2);
    expect(cells[0]?.textContent).toContain('x');
    expect(cells[1]?.textContent).toBe('2');
  });

  it.each(['Smart “quotes” remain.', 'NBSP: 5\u00a0Ω.', 'Joiner a\u200db remains.', 'refrac\u00adtion index.', 'v = u +\nat, so v grows.'])('GAP-02 preserves copied text: %s', (source) => {
    const text = rendered(source).textContent ?? '';
    for (const token of source.match(/[A-Za-z0-9]+/g) ?? []) expect(text).toContain(token);
  });

  it('GAP-02 loads mhchem and contains untrusted KaTeX commands', () => {
    expect(rendered('$\\ce{2H2 + O2 -> 2H2O}$').querySelector('.katex-error')).toBeNull();
    for (const source of ['$\\href{javascript:alert(1)}{click}$', '$\\includegraphics{https://invalid.example/x}$', '$\\htmlClass{attacker}{x}$', '$\\htmlStyle{position:fixed}{x}$']) {
      const host = rendered(source);
      expect(host.querySelector('img, .attacker, [href^="javascript:"], [style*="position:fixed"]')).toBeNull();
    }
    expect(rendered('$\\def\\x{\\x\\x}\\x$').querySelector('.katex-error')).not.toBeNull();
    expect(rendered('$\\gdef\\zz{42}\\zz$').textContent).toContain('42');
    expect(rendered('$\\zz$').textContent).not.toContain('42');
  });
  it('MATH-01 retains every numeric quantity in rendered answer prose', () => {
    const sources = [
      'The temperature is T=300 K. The critical temperature is T_c = 273 K.',
      'Set T=300 K and T_c = 273 K.',
      'With R=10 ohm and R_1 = 4 ohm in series.',
      'Take E=25 for the first trial and then E_k = 40 for the second.',
    ];
    for (const source of sources) {
      const host = document.createElement('div');
      host.innerHTML = visibleHtml(renderToStaticMarkup(<MathMarkdown content={source} />));
      for (const quantity of source.match(/\d+/g) ?? []) {
        expect(host.textContent).toContain(quantity);
      }
    }
  });

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

  it('renders repaired dimensional notation and common roots without visible TeX leakage', () => {
    const html = renderToStaticMarkup(
      <MathMarkdown content={'Dimensional check is (dimensionless)$$\\times(length/length); roots sqrt(x+1), ∛y, and ∜(q^2).'} />,
    );
    const vis = visibleHtml(html);
    expect(html).toContain('katex');
    expect(html).not.toContain('katex-error');
    expect(vis).not.toContain('$$');
    expect(vis).not.toContain('\\times');
    expect(vis).not.toContain('sqrt(');
    expect(vis).not.toContain('∛');
    expect(vis).not.toContain('∜');
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
