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

});
