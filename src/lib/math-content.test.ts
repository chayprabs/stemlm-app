import { describe, it, expect } from 'vitest';
import {
  looksLikeRawLatex,
  prepareMathForRender,
  hasMathDelimiters,
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
});
