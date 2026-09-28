import { describe, expect, it } from 'vitest';
import katex from 'katex';
import { prepareMathForRender } from './math-content';

/** Every $…$ span in prepared text. */
function spans(prepared: string): string[] {
  return [...prepared.matchAll(/\$([^$]+)\$/g)].map((m) => m[1]!);
}

describe('plain-text exponents a student types', () => {
  // Live Claude 2026-09-27: the question "Ka = 1.8 x 10^-5" showed as 10⁻5 in the panel header.
  it.each([
    ['Ka = 1.8 x 10^-5. Using an ICE table', '10^{-5}'],
    ['k = 3.2 x 10^12', '10^{12}'],
    ['E = 2^10', '2^{10}'],
    ['rate 4 s^-1', 's^{-1}'],
    ['a = x^-2 + y^(n+1)', 'y^{n+1}'],
  ])('raises the whole exponent in %j', (text, expected) => {
    const prepared = prepareMathForRender(text, 'auto');
    console.log('PLAIN_EXP', JSON.stringify(text), '->', JSON.stringify(prepared));
    expect(prepared).toContain(expected);
    for (const math of spans(prepared)) expect(() => katex.renderToString(math, { throwOnError: true })).not.toThrow();
    expect(prepared.split('$').length % 2).toBe(1);
  });

  it('keeps one-character exponents and explicit LaTeX as written', () => {
    expect(prepareMathForRender('area 5 m^2', 'auto')).toContain('m^2');
    expect(prepareMathForRender('with $10^{-5}$ M', 'auto')).toContain('$10^{-5}$');
    expect(prepareMathForRender('$x^-1$ as written', 'auto')).toContain('$x^-1$');
  });
});
