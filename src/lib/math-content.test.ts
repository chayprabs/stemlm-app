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
