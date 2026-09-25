import { describe, it, expect } from 'vitest';
import {
  looksLikeRawLatex,
  looksLikeProseWithMath,
  prepareMathForRender,
  hasMathDelimiters,
  splitMathSegments,
} from './math-content';

describe('looksLikeRawLatex', () => {
  it('detects undelimited formula lines from electrical capsules', () => {
    expect(looksLikeRawLatex('Z_L = j\\omega L, \\quad Z_C = \\frac{1}{j\\omega C}')).toBe(true);
    expect(
      looksLikeRawLatex(
        '\\begin{bmatrix} Z_{11} & Z_{12} \\\\ Z_{21} & Z_{22} \\end{bmatrix} = \\begin{bmatrix} Z_1 + Z_2 & Z_2 \\\\ Z_2 & Z_3 + Z_2 \\end{bmatrix}',
      ),
    ).toBe(true);
    expect(
      looksLikeRawLatex(
        'H(\\omega) = \\frac{Z_{21} Z_L}{(Z_{11} + Z_s)(Z_{22} + Z_L) - Z_{12}Z_{21}}',
      ),
    ).toBe(true);
    expect(looksLikeRawLatex('Z_{th} = Z_3 + (Z_2 \\parallel (Z_1 + Z_s))')).toBe(true);
    expect(looksLikeRawLatex('X_L = -X_{th}')).toBe(true);
    expect(looksLikeRawLatex('P = \\frac{1}{2} |I|^2 R_L')).toBe(true);
  });

  it('ignores plain prose and already-delimited math', () => {
    expect(looksLikeRawLatex('Impedances are the foundational units for AC analysis.')).toBe(false);
    expect(looksLikeRawLatex('$Z_1 = j10 \\, \\Omega$')).toBe(false);
    expect(hasMathDelimiters('$Z_1 = j10 \\, \\Omega$')).toBe(true);
  });

  it('does not treat quickcheck prose with embedded subscripts as raw LaTeX', () => {
    const q =
      'Why is the current leaving C towards D written as (V_C - V_D)/24?';
    const a =
      "Because Ohm's law states current is the potential difference divided by resistance, and the potential at C minus the potential at D is V_C - V_D, so I = (V_C - V_D)/24Ω.";
    expect(looksLikeProseWithMath(q)).toBe(true);
    expect(looksLikeProseWithMath(a)).toBe(true);
    expect(looksLikeRawLatex(q)).toBe(false);
    expect(looksLikeRawLatex(a)).toBe(false);
  });

  it('treats A(t)= and I_0= as math, not the English article A', () => {
    const decay = 'A(t) = A_0 \\left(\\frac{1}{2}\\right)^{t / T_{1/2}}';
    const half = 'A(t) = A_0 \\left(½\\right)^{t / T_{1/2}}';
    expect(looksLikeProseWithMath(decay)).toBe(false);
    expect(looksLikeProseWithMath(half)).toBe(false);
    expect(looksLikeRawLatex(decay)).toBe(true);
    expect(looksLikeRawLatex('I_0 = 5\\times 10^{-6}')).toBe(true);
    expect(looksLikeProseWithMath('A battery is connected in series.')).toBe(true);
    expect(looksLikeRawLatex('A battery is connected in series.')).toBe(false);
    expect(looksLikeProseWithMath('An n-channel MOSFET is biased in saturation.')).toBe(true);
  });
});

describe('prepareMathForRender', () => {
  it('repairs an unmatched display delimiter before an inline multiplication expression', () => {
    const out = prepareMathForRender(
      'Dimensional check: $(n_2-n_1)d/h$ is (dimensionless)$$\\times(length/length), so it is a pure number.',
    );

    expect(out).toContain('$(n_2-n_1)d/h$');
    expect(out).toContain('$(dimensionless)\\times(length/length)$');
    expect(out).not.toContain('$$\\times');
    expect(out).toContain(', so it is a pure number.');
  });

  it('does not confuse adjacent inline math spans with one display delimiter', () => {
    expect(prepareMathForRender('A $x$$y$ B')).toBe('A $x$$y$ B');
    expect(prepareMathForRender('A $x$$ B')).toBe('A $x$$ B');
  });

  it('normalizes common square, cube, and fourth-root notation in prose', () => {
    const out = prepareMathForRender(
      'The roots are sqrt(x+1), cbrt(y), √(a+b), ∛z, and ∜(q^2).',
    );

    expect(out).toContain('$\\sqrt{x+1}$');
    expect(out).toContain('$\\sqrt[3]{y}$');
    expect(out).toContain('$\\sqrt{a+b}$');
    expect(out).toContain('$\\sqrt[3]{z}$');
    expect(out).toContain('$\\sqrt[4]{q^2}$');
  });

  it('normalizes calculator roots inside math spans and signed unicode roots', () => {
    const out = prepareMathForRender('Use $sqrt(x+1)$, √-1, and ∛-8.');

    expect(out).toContain('$\\sqrt{x+1}$');
    expect(out).toContain('$\\sqrt{-1}$');
    expect(out).toContain('$\\sqrt[3]{-8}$');
    expect(out).not.toContain('$sqrt(');
  });

  it('repairs an accidental slash before a subscripted variable', () => {
    const out = prepareMathForRender('The result is tan \\n_2 - n_1 over the slab height.');
    expect(out).toContain('$n_2 - n_1$');
    expect(out).not.toContain('\\n_2');
  });

  it('fails closed before KaTeX work on oversized content', () => {
    expect(prepareMathForRender('x'.repeat(120_001))).toBe('Math content is too large to typeset safely.');
  });

  it('wraps raw @formula content in display math delimiters', () => {
    const raw = 'Z_L = j\\omega L, \\quad Z_C = \\frac{1}{j\\omega C}';
    const out = prepareMathForRender(raw, 'display');
    expect(out).toMatch(/^\$\$/);
    expect(out).toContain('Z_L = j\\omega L');
    expect(out).toMatch(/\$\$$/);
  });

  it('wraps Z-parameter matrices for KaTeX', () => {
    const raw =
      '\\begin{bmatrix} Z_{11} & Z_{12} \\\\ Z_{21} & Z_{22} \\end{bmatrix} = \\begin{bmatrix} Z_1 + Z_2 & Z_2 \\\\ Z_2 & Z_3 + Z_2 \\end{bmatrix}';
    const out = prepareMathForRender(raw, 'display');
    expect(out).toContain('$$');
    expect(out).toContain('\\begin{bmatrix}');
  });

  it('leaves body text with inline $ delimiters unchanged', () => {
    const body =
      'Convert at $\\omega = 5000 \\text{ rad/s}$.\\n- $Z_1 = j10 \\, \\Omega$.';
    expect(prepareMathForRender(body, 'auto')).toBe(body);
  });

  it('normalizes \\( \\) delimiters', () => {
    expect(prepareMathForRender('Use \\(x^2\\) inline', 'auto')).toContain('$x^2$');
  });

  it('keeps normalized inline and display delimiters at their original levels', () => {
    expect(prepareMathForRender('Use \\(x^2\\) and \\[E = mc^2\\]')).toBe(
      'Use $x^2$ and $$E = mc^2$$',
    );
  });

  it('rewrites \\parallel to \\mathbin{\\|} so KaTeX does not read \\par', () => {
    const out = prepareMathForRender('Z_{th} = Z_3 + (Z_2 \\parallel (Z_1 + Z_s))', 'display');
    expect(out).toContain('\\mathbin{\\|}');
  });

  it('wraps undelimited lines even when other lines use $ math', () => {
    const body = [
      'Substitute the values: $Z_1 + Z_s = 10 + j15 \\, \\Omega$.',
      'Z_{th} = Z_3 + \\frac{Z_2(Z_1+Z_s)}{Z_2+Z_1+Z_s}',
    ].join('\n');
    const out = prepareMathForRender(body, 'auto');
    expect(out).toContain('$$');
    expect(out).toContain('\\frac{Z_2');
  });

  it('is idempotent when content is already wrapped', () => {
    const once = prepareMathForRender('Z_{th} = Z_3 + \\frac{Z_2}{Z_1}', 'display');
    expect(prepareMathForRender(once, 'display')).toBe(once);
  });

  it('dedupes garbled duplicate math from composer paste before wrapping', () => {
    const raw = 'R1=6 ΩR_1 = 6\\ \\Omega is in series.';
    const out = prepareMathForRender(raw, 'auto');
    expect(out).not.toMatch(/R1=6/);
    expect(out).toContain('R_1 = 6');
  });

  it('keeps spaces in quickcheck prose wrongly wrapped in $ delimiters', () => {
    const q =
      '$Why is the current leaving C towards D written as (V_C - V_D)/24$?';
    const a =
      "$Because Ohm's law states current is the potential difference divided by resistance, and the potential at C minus the potential at D is V_C - V_D, so I = (V_C - V_D)/24Ω.$";
    const qOut = prepareMathForRender(q, 'auto');
    const aOut = prepareMathForRender(a, 'auto');
    expect(qOut).toContain('Why is the current');
    expect(qOut).not.toMatch(/^\$Why is/);
    expect(aOut).toContain("Because Ohm's law states");
    expect(aOut).not.toMatch(/^\$Because/);
  });

  it('handles stray dollar signs without looping forever', () => {
    expect(splitMathSegments('cost is $5 today')).toEqual([
      { math: false, text: 'cost is ' },
      { math: false, text: '$' },
      { math: false, text: '5 today' },
    ]);
  });

  it('keeps an escaped literal dollar from consuming a later math span', () => {
    expect(splitMathSegments(String.raw`Price is \$5 and $x$.`)).toEqual([
      { math: false, text: 'Price is ' },
      { math: false, text: String.raw`\$` },
      { math: false, text: '5 and ' },
      { math: true, text: '$x$' },
      { math: false, text: '.' },
    ]);
  });

  it('wraps inline \\vec commands inside prose exam questions', () => {
    const q =
      'Q.5 Three vectors \\vec{P}, \\vec{Q} and \\vec{R} are shown in the figure. Let S be any point on the vector \\vec{R}. The distance between the points P and S is b|\\vec{R}|.';
    const out = prepareMathForRender(q, 'auto');
    expect(out).toContain('$\\vec{P}$');
    expect(out).toContain('$\\vec{Q}$');
    expect(out).toContain('$|\\vec{R}|$');
    expect(out).not.toContain('Three vectors \\vec{P}');
  });

  it('wraps bare Greek and exponent tokens in mixed-prose problems', () => {
    const q =
      'A particle is rotating in a circular path and at any instant its motion can be described as \\theta = 5t^4/40 - t^3/3. The angular acceleration of the particle after 10 seconds is ______ rad/s^2.';
    const out = prepareMathForRender(q, 'auto');
    expect(out).toContain('\\theta');
    expect(out).toContain('5t^4');
    expect(out).toContain('t^3');
    expect(out).toMatch(/\$s\^2\$|\$rad\/s\^2\$/);
    expect(out).toContain('circular path');
    expect(out).toContain('described as');
    expect(out).not.toContain('described as \\theta');
    expect(out).not.toMatch(/^\$\$/);
    expect(prepareMathForRender(out, 'auto')).toBe(out);
  });

  it('token-wraps V_C in Ohm-law prose and keeps sentence spaces', () => {
    const a =
      "Because Ohm's law states current is the potential difference divided by resistance, and the potential at C minus the potential at D is V_C - V_D, so I = (V_C - V_D)/24Ω.";
    const out = prepareMathForRender(a, 'auto');
    expect(out).toContain('$V_C');
    expect(out).not.toMatch(/^\$Because/);
    expect(out).toContain("Because Ohm's law states");
    expect(out).toContain('potential difference divided');
    expect(out).not.toContain('BecauseOhms');
  });

  it('does not re-wrap Greek inside an already-delimited \\frac snippet', () => {
    const fracOmega = prepareMathForRender('where Z_C = \\frac{1}{j\\omega C} in series', 'auto');
    expect(fracOmega).toContain('\\frac{1}{j\\omega C}');
    expect(fracOmega).toMatch(/\$Z_C = \\frac\{1\}\{j\\omega C\}\$/);
    expect(fracOmega).not.toContain('$\\omega$');
    expect(fracOmega).not.toContain('$$\\omega$$');

    const fracTheta = prepareMathForRender('the angle is \\frac{\\theta}{2} radians', 'auto');
    expect(fracTheta).toContain('$\\frac{\\theta}{2}$');
    expect(fracTheta).not.toContain('$\\theta$');
    expect(fracTheta).not.toContain('$$\\theta$$');
  });

  it('wraps a display-mode decay formula as one equation, including unicode ½', () => {
    const formula = 'A(t) = A_0 \\left(\\frac{1}{2}\\right)^{t / T_{1/2}}';
    const out = prepareMathForRender(formula, 'display');
    expect(out).toBe(`$$${formula}$$`);
    expect(out).not.toContain('$\\frac{1}{2}$');

    const half = prepareMathForRender('A(t) = A_0 \\left(½\\right)^{t / T_{1/2}}', 'display');
    expect(half.startsWith('$$')).toBe(true);
    expect(half.endsWith('$$')).toBe(true);
    expect(half).toContain('\\left(');
    expect(half).toContain('\\frac{1}{2}');
    expect(half).not.toContain('$\\frac{1}{2}$');
    expect(half).toContain('A(t) = A_0');
  });

  it('wraps mixed-prose STEM tokens from the radiation work/check copy', () => {
    const work =
      'A_0 is the initial radiation level, A(t) is the radiation level at time t, and T_{1/2} is the half-life. With initial relative activity A_0 = 64 A_{safe}, permissible activity A(t) = A_{safe}, and half-life T_{1/2} = 18 days: A(t)/A_0 = 1/64.';
    const workOut = prepareMathForRender(work, 'auto');
    expect(workOut).toContain('$A_0$ is the initial radiation');
    expect(workOut).toContain('$A(t)$ is the radiation');
    expect(workOut).toContain('$T_{1/2}$ is the half-life');
    expect(workOut).toMatch(/\$A_0 = 64 A_\{safe\}\$/);
    expect(workOut).toMatch(/\$A\(t\) = A_\{safe\}\$/);
    expect(workOut).toMatch(/\$A\(t\)\/A_0 = 1\/64\$/);
    expect(workOut).not.toMatch(/^\$A_0 is the initial/);
    expect(workOut).toContain('permissible activity');

    const check = '1/2 because A(T_{1/2})/A_0 = (1/2)^1 = 0.5.';
    const checkOut = prepareMathForRender(check, 'auto');
    expect(checkOut).toContain('$1/2$ because');
    expect(checkOut).toMatch(/\$A\(T_\{1\/2\}\)\/A_0/);
    expect(checkOut).not.toMatch(/^\$1\/2 because/);
    expect(prepareMathForRender(workOut, 'auto')).toBe(workOut);
    expect(prepareMathForRender(checkOut, 'auto')).toBe(checkOut);
  });

  it('wraps Greek, mhchem, scientific notation, and \\left...\\right in mixed prose', () => {
    const greek = prepareMathForRender('The wavelength is \\lambda = 500 nm.', 'auto');
    expect(greek).toContain('$\\lambda');
    expect(greek).toContain('The wavelength is');
    expect(greek).not.toContain('is \\lambda');

    const ce = prepareMathForRender('The molecule \\ce{H2O} is water.', 'auto');
    expect(ce).toContain('$\\ce{H2O}$');
    expect(ce).toContain('is water');
    expect(ce).not.toContain('molecule \\ce');

    const sci = prepareMathForRender('A nanometer is 10^{-9} m long.', 'auto');
    expect(sci).toMatch(/\$10\^\{-9\}/);
    expect(sci).toContain('nanometer is');
    expect(sci).not.toContain('is 10^{-9}');

    const lr = prepareMathForRender(
      'Activity is scaled by \\left(\\frac{1}{2}\\right)^{n} after n half-lives.',
      'auto',
    );
    expect(lr).toContain('$\\left(\\frac{1}{2}\\right)^{n}$');
    expect(lr).toContain('scaled by');
    expect(lr).toContain('after');
    expect(lr).not.toContain('by \\left');
  });

});

/**
 * The invariant that keeps remark-math from swallowing a paragraph: an opened
 * `$$` must always close. (A lone `$` is inert — remark-math needs a closing
 * `$` on the same line — so it is not part of this check.)
 */
function delimitersBalanced(src: string): boolean {
  let inline = false;
  let display = false;
  for (let i = 0; i < src.length; i++) {
    if (src[i] !== '$' || src[i - 1] === '\\') continue;
    if (inline) {
      inline = false;
      continue;
    }
    if (display) {
      if (src[i + 1] === '$') {
        display = false;
        i += 1;
      }
      continue;
    }
    if (src[i + 1] === '$') {
      display = true;
      i += 1;
      continue;
    }
    inline = true;
  }
  return !display;
}

describe('prepareMathForRender scientific edge cases', () => {
  const CASES: Array<[string, string, boolean?]> = [
    ['unit ratio in prose', 'The gradient has units of (m/s)/(m) across the slab.'],
    ['degrees and temperature', 'The angle is 30° and the bath sits at 25 °C.'],
    ['scientific notation', 'The elementary charge is 1.6×10^{-19} C in SI units.'],
    ['latex scientific notation', 'Take $q=1.6\\times10^{-19}\\,\\text{C}$ for the electron.'],
    ['greek symbols', 'Use λ = 500 nm and Δx = 2 mm for the fringe spacing.'],
    ['arrows', 'The reaction A → B proceeds forward, and B ← C reverses.'],
    ['subscripts and superscripts', 'Compare n_1 with n_2^2 across the interface.'],
    ['simple fraction', 'That is 3/4 of the incident intensity.'],
    ['multiplication symbols', 'The area is 3 × 4 m², and the torque is 2·5 N·m.'],
    ['balanced inline math', 'Because $n_2>n_1$, light bends toward the normal, and $\\theta_2<\\theta_1$.'],
    ['display math in prose', 'The path difference is\n$$\\Delta L=(n_2-n_1)d$$\nand it is dimensionless.'],
    ['adjacent inline spans', 'The product $x$$y$ is positive.'],
    ['stray display delimiter', 'It is (dimensionless)$$\\times(length/length), so it is a pure number.'],
    ['stray trailing delimiter', 'The value is $x$$ at the boundary.'],
    // `sqrt(x)` / `cbrt(x)` are rewritten to `\sqrt{x}`, so their literal
    // characters are checked by the dedicated root tests instead.
    ['roots of every notation', 'Compare sqrt(x+1), cbrt(y), √(a+b), ∛z, ∜(q^2), √-1, and ∛-8.', true],
    ['roots already delimited', 'Use $sqrt(x+1)$ and $\\sqrt{2}$ together.', true],
    ['inline code is literal', 'Set `n_2 = 1.5` and `$rate$` in the config file.'],
    ['fenced code is literal', '```\nlet x_1 = $2;\n```'],
    ['prose only', 'This step explains why the beam bends, in plain words.'],
    ['markdown table', '| symbol | value |\n| --- | --- |\n| n_1 | 1.0 |'],
    ['list with math', '- The index is $n_1=1.00$\n- The gap is 2 mm'],
  ];

  it.each(CASES)('keeps %s balanced and non-destructive', (_label, input, rewrites) => {
    const out = prepareMathForRender(input);
    expect(delimitersBalanced(out)).toBe(true);
    if (rewrites) return;
    // Nothing may be silently dropped: every non-delimiter character survives.
    const strip = (s: string) => s.replace(/[$\\]/g, '').replace(/\s+/g, '');
    for (const ch of new Set(strip(input))) {
      // Root normalization legitimately rewrites `sqrt(x)` grouping to braces.
      if (/[{}[\]()]/.test(ch)) continue;
      expect(strip(out)).toContain(ch);
    }
  });

  it('does not swallow the sentence after an inline expression', () => {
    const out = prepareMathForRender('With $d=2\\,\\text{mm}$: the fringe count is 12, so the shift is small.');
    expect(out).toContain('so the shift is small.');
    expect(delimitersBalanced(out)).toBe(true);
  });

  it('leaves inline code untouched while wrapping the prose around it', () => {
    const out = prepareMathForRender('Set `n_2 = 1.5` before computing n_2 - n_1.');
    expect(out).toContain('`n_2 = 1.5`');
    expect(delimitersBalanced(out)).toBe(true);
  });

  it('keeps a fenced code block verbatim', () => {
    const src = '```\nlet x_1 = $2;\n```';
    expect(prepareMathForRender(src)).toBe(src);
  });

  it('normalizes unit ratios without eating the trailing punctuation', () => {
    const out = prepareMathForRender('It is (dimensionless), a ratio of (length/length).');
    expect(out).toContain('.');
    expect(out.endsWith('.')).toBe(true);
    expect(delimitersBalanced(out)).toBe(true);
  });

  it('keeps a degree symbol attached to its number', () => {
    const out = prepareMathForRender('The critical angle is 41.8° for this pair.');
    expect(out).toMatch(/41\.8°/);
    expect(delimitersBalanced(out)).toBe(true);
  });

  it('renders a signed root inside an existing math span', () => {
    const out = prepareMathForRender('The imaginary unit is $√-1$ and the cube root is $∛-8$.');
    expect(out).toContain('\\sqrt{-1}');
    expect(out).toContain('\\sqrt[3]{-8}');
    expect(delimitersBalanced(out)).toBe(true);
  });

  it('repairs an unmatched display delimiter at the start of a line', () => {
    const out = prepareMathForRender('$$\\Delta L=(n_2-n_1)d and then the beam exits.');
    expect(out).not.toContain('$$');
    expect(delimitersBalanced(out)).toBe(true);
  });
});

describe('prepareMathForRender literal and currency preservation', () => {
  it('keeps inline code byte-identical even when it contains delimiters', () => {
    expect(prepareMathForRender('`$$not math$$`')).toBe('`$$not math$$`');
    expect(prepareMathForRender('Use `$x$` and `\\frac{1}{2}` verbatim.')).toContain('`$x$`');
  });

  it('keeps unmatched dollars and root notation inside inline code byte-identical', () => {
    const src = 'Use `$$literal`, `price $5`, and `sqrt(x)` beside $y$.';
    const out = prepareMathForRender(src);
    expect(out).toContain('`$$literal`');
    expect(out).toContain('`price $5`');
    expect(out).toContain('`sqrt(x)`');
    expect(out).toContain('$y$');
  });

  it('keeps unmatched dollars and root notation inside fenced code byte-identical', () => {
    const code = '```js\nconst price = "$5";\nconst root = sqrt(y);\n$$literal\n```';
    const src = `${code}\nUse $z$ afterward.`;
    const out = prepareMathForRender(src);
    expect(out.slice(0, code.length)).toBe(code);
    expect(out).toContain('Use $z$ afterward.');
  });

  it('treats an escaped dollar sign as literal, not as a delimiter', () => {
    const src = String.raw`\$5 is escaped but $x$ is math.`;
    expect(prepareMathForRender(src)).toBe(src);
  });

  it('never deletes currency symbols from prose', () => {
    const out = prepareMathForRender('Cost is $5 and $7 for the pair.');
    expect(out).toContain('5 and');
    expect(out).toContain('7 for the pair.');
    expect(out.split('\\$').join('$')).toBe('Cost is $5 and $7 for the pair.');
  });

  it('leaves markdown structure alone', () => {
    for (const src of [
      '| $a$ | b |\n| --- | --- |\n| $c$ | d |',
      '- item $x_1$\n- item $x_2$',
      '> quoted $x_1$ text',
      '# Heading with $x_1$',
      '**bold $x_1$** and _italic $y_2$_',
    ]) {
      expect(prepareMathForRender(src)).toBe(src);
    }
  });

  it('normalizes nested roots without losing an operand', () => {
    expect(prepareMathForRender('sqrt(sqrt(x))')).toContain(String.raw`\sqrt{\sqrt{x}}`);
    expect(prepareMathForRender('cbrt(-8) and √(√4)')).toContain(String.raw`\sqrt[3]{-8}`);
  });

  it('leaves an unterminated root marker as written', () => {
    expect(prepareMathForRender('√')).toBe('√');
    expect(prepareMathForRender('sqrt(')).toBe('sqrt(');
  });
});

describe('prepareMathForRender release fixes', () => {
  const md = (src: string) => prepareMathForRender(src, 'auto', true);

  it('MATH-01 never re-segments well-formed math that names points or units', () => {
    for (const src of [
      String.raw`$\angle ABC = 90^{\circ}$`,
      String.raw`In $\triangle ABC$, $\overline{AB} = 5$ and $\angle PQR = 90^{\circ}$.`,
      String.raw`Angle $30^\circ$ and $\angle ABC = 90^{\circ}$.`,
      String.raw`$Area = lw$ and $n = 2.5 mol$ hold.`,
    ]) {
      expect(md(src)).toBe(src);
    }
  });

  it('MATH-01 still unwraps a whole sentence that was wrapped in delimiters', () => {
    const out = md('$The ball is released from rest$ at the top.');
    expect(out).toContain('The ball is released from rest');
    expect(out).not.toContain('$The ball');
  });

  it('MATH-02 braces multi-letter subscripts and leaves code-like identifiers alone', () => {
    const out = md('The variable x_i and V_out are used; snake_case_name too.');
    expect(out).toContain('$x_i$');
    expect(out).toContain('$V_{out}$');
    expect(out).toContain(' snake_case_name too.');
    expect(out).not.toContain('$V_o$');
    expect(md('Set max_value and read file_name, then x_1_2.')).toBe('Set max_value and read file_name, then x_1_2.');
  });

  it('MATH-03 treats every dollar amount in prose as currency', () => {
    expect(md('The ticket costs $5 and the snack costs $7, so $12 total.')).toBe(
      String.raw`The ticket costs \$5 and the snack costs \$7, so \$12 total.`,
    );
    expect(md('Add $5$ to $x$.')).toBe('Add $5$ to $x$.');
  });

  it('MATH-04 keeps inline math that wraps onto the next line', () => {
    expect(md('Energy $E =\nmc^2$ holds.')).toBe('Energy $E = mc^2$ holds.');
    expect(md('Use $x$ here\n- item $y$')).toBe('Use $x$ here\n- item $y$');
  });

  it('MATH-05 keeps units upright after an auto-wrapped number', () => {
    const out = md('Assume g = 9.81 m/s^2 and v = 3 m/s.');
    expect(out).toContain(String.raw`9.81\,\mathrm{m/s^2}`);
    expect(out).toContain(String.raw`3\,\mathrm{m/s}`);
    expect(out).toContain(' and ');
  });

  it('MATH-06 keeps an escaped dollar inside math from closing the span', () => {
    expect(md(String.raw`Price $\$5$ per unit.`)).toBe(String.raw`Price $\text{\textdollar}5$ per unit.`);
  });
});
