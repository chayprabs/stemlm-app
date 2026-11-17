import { describe, expect, it } from 'vitest';
import { prepareMathForRender } from './math-content';
import { cpuMs } from './cpu-time';
import {
  KNOWN_GAPS,
  PROSE_MATH_CORPUS,
  corpusExpected,
  corpusInput,
  isProseOnly,
} from './__fixtures__/prose-math-corpus';

const md = (src: string) => prepareMathForRender(src, 'auto', true);

describe('prose and math classification corpus', () => {
  const proseOnly = PROSE_MATH_CORPUS.filter(isProseOnly);

  it('covers enough prose and enough math to gate the classifier', () => {
    expect(PROSE_MATH_CORPUS.length).toBeGreaterThanOrEqual(120);
    expect(proseOnly.length).toBeGreaterThanOrEqual(80);
    expect(PROSE_MATH_CORPUS.length - proseOnly.length).toBeGreaterThanOrEqual(35);
    const inputs = PROSE_MATH_CORPUS.map(corpusInput);
    expect(new Set(inputs).size).toBe(inputs.length);
  });

  it.each(PROSE_MATH_CORPUS.map((c) => [c.group, corpusInput(c), corpusExpected(c)] as const))(
    '%s: classifies every span of %j',
    (_group, input, expected) => {
      expect(md(input)).toBe(expected);
    },
  );

  it.each(proseOnly.map((c) => [corpusInput(c)] as const))('returns prose %j as written outside Markdown mode', (input) => {
    // Plain mode escapes a currency dollar too; that is the only permitted difference.
    expect(prepareMathForRender(input).replaceAll('\\$', '$')).toBe(input);
  });

  it.each(PROSE_MATH_CORPUS.map((c) => [corpusInput(c)] as const))('is stable when %j is prepared twice', (input) => {
    const once = md(input);
    expect(md(once)).toBe(once);
  });

  // Each of these still fails: when one starts passing, move it into the corpus.
  for (const gap of KNOWN_GAPS) {
    it.fails(`known gap: ${JSON.stringify(corpusInput(gap))}`, () => {
      expect(md(corpusInput(gap))).toBe(corpusExpected(gap));
    });
  }
});

describe('evidence a bare span needs before it is typeset', () => {
  it('does not read a hyphen, slash, arrow or plus between tokens as an operator', () => {
    for (const src of ['A-B', 'u-v', 'i-1', 'n+1', 'a/b', 'x + y', 'a - b', 'A → B', 'A->B', '3-5', '24/7', '2(a)', '(x, y)']) {
      expect(md(`Take ${src} here.`)).toBe(`Take ${src} here.`);
    }
  });

  it('does read a relation, a script, a call, a product or a proper fraction as math', () => {
    for (const src of ['x = 5', 'n > 0', 'p ≤ q', 'x_1', 't^2', 'f(x)', 'a*b', '3/4', 'x-y = 2', '(a + b)/2 = 5']) {
      expect(md(`Take ${src} here.`)).toBe(`Take $${src}$ here.`);
    }
  });

  it('keeps a bond, a comparison in code and an arrow out of the relation rule', () => {
    for (const src of ['C=O', 'O=C=O', 'N≡N', 'a == b', 'x += 1', 'a => b', 'p -> q']) {
      expect(md(`Take ${src} here.`)).toBe(`Take ${src} here.`);
    }
  });

  it('never opens a span in the tail of a joined token', () => {
    expect(md('Weights: A-B = 4.')).toBe('Weights: A-B = 4.');
    expect(md('The ratio x:y = 2:3.')).toBe('The ratio x:y = 2:3.');
    expect(md('km/h = 5 here')).toBe('km/h = 5 here');
    expect(md('P(heads) = 0.5')).toBe('P(heads) = 0.5');
  });

  it('leaves a plain-text expression alone when it could only typeset half of it', () => {
    for (const src of ['a = g sin(theta)', 'v = u + at', 'total = a + b = 7', 'd[v] > d[u] + w(u, v)', 'x = 5 a day']) {
      expect(md(src)).toBe(src);
    }
    // Raw TeX or a script would otherwise show, so those are still typeset.
    expect(md('so v_f = v_i + at here')).toBe('so $v_f = v_i$ + at here');
  });

  it('does not let a label, an article or the next word join an expression', () => {
    expect(md('(a) x^2 = 4 (b) x^3 = 8')).toBe('(a) $x^2 = 4$ (b) $x^3 = 8$');
    expect(md('edges A-B 4, A-C 2')).toBe('edges A-B 4, A-C 2');
    expect(md('x = 5 e y = 3')).toBe('$x = 5$ e $y = 3$');
    expect(md('If \\alpha a constant is used')).toBe('If $\\alpha$ a constant is used');
    expect(md('the impedance Z_L = j\\omega L grows')).toBe('the impedance $Z_L = j\\omega L$ grows');
  });

  it('treats a spelled Greek name or a word with a script as text', () => {
    for (const src of ['mu_k', 'theta_1', 'omega^2', 'max_i', 'mu_k = 0.3']) {
      expect(md(src)).toBe(src);
    }
    expect(md('kx_1 + mc^2')).toBe('$kx_1 + mc^2$');
    expect(md('\\mu_k = 0.3')).toBe('$\\mu_k = 0.3$');
  });

  it('typesets the times sign a student types as a letter', () => {
    expect(md('k = 3.2 x 10^12')).toBe('$k = 3.2 \\times 10^{12}$');
    expect(md('a 2 x 4 plank')).toBe('a 2 x 4 plank');
  });

  it('gives a signed operand and number-led arithmetic the same treatment as the rest', () => {
    expect(md('x = -5')).toBe('$x = -5$');
    expect(md('12/4 = 3')).toBe('$12/4 = 3$');
    expect(md('x -- y')).toBe('x -- y');
  });
});

describe('budget for text that is parsed and then left alone', () => {
  it.each([
    ['edge list', 'A-B 4, '.repeat(5_000)],
    ['labels', '(a) '.repeat(8_000)],
    ['sums', 'a + '.repeat(8_000)],
    ['relations', 'x = 5 y '.repeat(4_000)],
    ['indexing', 'd[u] + w(u, v) '.repeat(2_500)],
    ['spelled words', 'mu_k g sin(theta) '.repeat(2_000)],
  ])('prepares a long run of %s within 600 ms of CPU', (_label, input) => {
    // The work is linear: 15-50 ms of CPU for these inputs, about twice that at twice the length.
    // CPU time, the fastest of three runs: the budget measures the code, and its headroom covers a
    // machine busy enough to slow every core (two full suites at once took about 300 ms). A runaway
    // regression (backtracking, a quadratic pass) takes seconds.
    let output = '';
    let fastest = Infinity;
    for (let run = 0; run < 3; run++) {
      const start = cpuMs();
      output = md(input);
      fastest = Math.min(fastest, cpuMs() - start);
    }
    expect(fastest).toBeLessThan(600);
    expect(output.length).toBeGreaterThanOrEqual(input.trimEnd().length);
  }, 60_000);
});
