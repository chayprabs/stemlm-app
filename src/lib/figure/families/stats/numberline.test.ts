import { describe, expect, it } from 'vitest';
import { compile, draw, expectCleanLabels, reason, type Drawn } from '../cs/testing';
import { parseInequality, parseIntervals, parseQuantity, type Piece } from './intervals';
import { StatsError } from './shared';

const line = (content: string) => draw('numberline', content);
const refused = (content: string) => reason('numberline', content);
const ticks = (drawn: Drawn) => drawn.scene.labels.filter((label) => label.id.startsWith('tickl-')).map((label) => label.text);
/** A set in interval notation, e.g. `[-3, 2) (3, ∞)`. */
const show = (pieces: Piece[]) => pieces.map((piece) => `${piece.lo.closed ? '[' : '('}${piece.lo.at.text}, ${piece.hi.at.text}${piece.hi.closed ? ']' : ')'}`).join(' ');
const error = (run: () => unknown) => {
  try {
    run();
  } catch (caught) {
    if (caught instanceof StatsError) return caught.message;
    throw caught;
  }
  return 'no error';
};

describe('quantities', () => {
  it('reads numbers, ratios and constant expressions exactly', () => {
    expect(parseQuantity('−3.5')).toEqual({ value: -3.5, text: '−3.5' });
    expect(parseQuantity('1/2')).toEqual({ value: 0.5, text: '1/2' });
    expect(parseQuantity('6/4')).toEqual({ value: 1.5, text: '3/2' });
    expect(parseQuantity('4/2')).toEqual({ value: 2, text: '2' });
    expect(parseQuantity('sqrt(2)')).toEqual({ value: Math.SQRT2, text: '√2' });
    expect(parseQuantity('2pi')?.value).toBeCloseTo(2 * Math.PI, 12);
    expect(parseQuantity('2pi')?.text).toBe('2π');
    expect(parseQuantity('-inf')).toEqual({ value: -Infinity, text: '−∞' });
    expect(parseQuantity('1,200')?.value).toBe(1200);
  });

  it('never reads two numbers, or words, as one value', () => {
    for (const text of ['3 4', '1/0', 'two', '', '1 / 2 / x', '3..4']) expect(parseQuantity(text), text).toBeNull();
  });
});

describe('interval notation', () => {
  it('reads which ends belong from the brackets', () => {
    expect(show(parseIntervals('[-3, 2)'))).toBe('[−3, 2)');
    expect(show(parseIntervals('(-inf, 4]'))).toBe('(−∞, 4]');
    expect(show(parseIntervals('[-∞, ∞]'))).toBe('(−∞, ∞)');
    expect(show(parseIntervals(']0, 1['))).toBe('(0, 1)');
    expect(show(parseIntervals('[ 1/2 ; sqrt(2) )'))).toBe('[1/2, √2)');
    expect(show(parseIntervals('(-inf, -2] U (3, inf)'))).toBe('(−∞, −2] (3, ∞)');
    expect(show(parseIntervals('[0, 2] ∪ [1, 5)'))).toBe('[0, 5)');
  });

  it('refuses what it would have to guess', () => {
    expect(error(() => parseIntervals('-3, 2'))).toMatch(/needs brackets/);
    expect(error(() => parseIntervals('[2, -3]'))).toMatch(/wrong order/);
    expect(error(() => parseIntervals('(2, 2)'))).toMatch(/is empty/);
    expect(error(() => parseIntervals('[a, b]'))).toMatch(/not a number/);
  });
});

describe('inequalities', () => {
  it.each([
    ['-3 <= x < 2', '[−3, 2)'],
    ['x > 1', '(1, ∞)'],
    ['x ≤ −2 or x > 3', '(−∞, −2] (3, ∞)'],
    ['x >= 0', '[0, ∞)'],
    ['3 > x', '(−∞, 3)'],
    ['2 ≥ t ≥ -1', '[−1, 2]'],
    ['x > 1 and x < 4', '(1, 4)'],
    ['x < 4 or x < 6', '(−∞, 6)'],
    ['x = 2', '[2, 2]'],
    ['x != 2', '(−∞, 2) (2, ∞)'],
    ['x < sqrt(2)', '(−∞, √2)'],
    ['x >= 1/2', '[1/2, ∞)'],
    ['2x + 1 < 7', '(−∞, 3)'],
    ['-2x >= 4', '(−∞, −2]'],
    ['3 - x <= 5', '[−2, ∞)'],
    ['3x > 1', '(1/3, ∞)'],
    ['x/2 + 1 > x', '(−∞, 2)'],
    ['-1 < 2x + 1 <= 5', '(−1, 2]'],
    ['x < inf', '(−∞, ∞)'],
    ['x + 1 > x', '(−∞, ∞)'],
  ])('%s', (source, set) => {
    expect(show(parseInequality(source))).toBe(set);
  });

  it('gives the empty set for a contradiction', () => {
    expect(parseInequality('x < 1 and x > 2')).toEqual([]);
    expect(parseInequality('x > x + 1')).toEqual([]);
  });

  it('refuses what it cannot solve', () => {
    expect(error(() => parseInequality('x < y'))).toMatch(/more than one variable \(x, y\)/);
    expect(error(() => parseInequality('3 < 5'))).toMatch(/names no variable/);
    expect(error(() => parseInequality('x^2 < 4'))).toMatch(/only linear inequalities/);
    expect(error(() => parseInequality('x <'))).toMatch(/is not an inequality/);
    expect(error(() => parseInequality('x < -2, x > 3'))).toMatch(/cannot be solved|more than one|not an inequality/);
  });
});

describe('numberline', () => {
  it('draws a closed end filled, an open end hollow, and names both on the line', async () => {
    const drawn = await line('ineq: -3 <= x < 2\npoint: 4 open');
    expect(drawn.stroke('set-0-0-lo')!.fill).toBe('ink');
    expect(drawn.stroke('set-0-0-hi')!.fill).toBe('paper');
    expect(drawn.stroke('point-0')!.fill).toBe('paper');
    expect(ticks(drawn)).toEqual(expect.arrayContaining(['−3', '2', '4', '0']));
    const [x1, y, x2] = drawn.stroke('set-0-0')!.points as [number, number, number];
    expect(drawn.stroke('set-0-0-lo')!.points[0]).toBeCloseTo(x1, 6);
    expect(drawn.stroke('set-0-0-hi')!.points[0]).toBeCloseTo(x2, 6);
    // One set lies on the line itself.
    expect(y).toBeCloseTo(drawn.stroke('axis')!.points[1]!, 6);
    // -3, 2 and 4 are evenly scaled: 2 is five sevenths of the way from -3 to 4.
    const at4 = drawn.stroke('point-0')!.points[0]!;
    expect((x2 - x1) / (at4 - x1)).toBeCloseTo(5 / 7, 6);
    expectCleanLabels(drawn);
  });

  it('ends a ray in an arrowhead at the end of the line', async () => {
    const drawn = await line('ineq: x > 1');
    expect(drawn.stroke('set-0-0-lo')!.kind).toBe('circle');
    expect(drawn.stroke('set-0-0-hi')!.kind).toBe('polygon');
    expect(drawn.stroke('set-0-0-hi')!.points[0]).toBeCloseTo(drawn.stroke('axis')!.points[2]!, 6);
    const left = await line('range: -5 5\ninterval: (-inf, 4]');
    expect(left.stroke('set-0-0-lo')!.kind).toBe('polygon');
    expect(left.stroke('set-0-0-hi')!.fill).toBe('ink');
    expect(ticks(left).sort((a, b) => Number(a!.replace('−', '-')) - Number(b!.replace('−', '-')))).toEqual(['−5', '−4', '−3', '−2', '−1', '0', '1', '2', '3', '4', '5']);
  });

  it('draws both pieces of a union on one rail', async () => {
    const drawn = await line('ineq: x <= -2 or x > 3');
    expect(drawn.stroke('set-0-0')!.points[1]).toBe(drawn.stroke('set-0-1')!.points[1]);
    expect(drawn.stroke('set-0-0-hi')!.fill).toBe('ink');
    expect(drawn.stroke('set-0-1-lo')!.fill).toBe('paper');
    expectCleanLabels(drawn);
  });

  it('stacks overlapping sets on separate rails above the line, and keeps separate sets on it', async () => {
    const stacked = await line('ineq: x > -1\nineq: x <= 3\ninterval: [-1, 3]');
    const axis = stacked.stroke('axis')!.points[1]!;
    const ys = ['set-0-0', 'set-1-0', 'set-2-0'].map((id) => stacked.stroke(id)!.points[1]!);
    expect(new Set(ys).size).toBe(3);
    for (const y of ys) expect(y).toBeLessThan(axis - 5);
    expectCleanLabels(stacked);
    const apart = await line('interval: [0, 1]\ninterval: [3, 4]');
    expect(apart.stroke('set-0-0')!.points[1]).toBe(apart.stroke('axis')!.points[1]);
    expect(apart.stroke('set-1-0')!.points[1]).toBe(apart.stroke('axis')!.points[1]);
  });

  it('reads points with their state and label', async () => {
    const drawn = await line('range: 0 10\npoint: 1 A\npoint: 3.5 closed B\npoint: 9 open D\npoint: x = 7');
    expect(drawn.text('pointl-0')).toBe('A');
    expect(drawn.text('pointl-1')).toBe('B');
    expect(drawn.text('pointl-2')).toBe('D');
    expect(drawn.stroke('point-2')!.fill).toBe('paper');
    expect(drawn.stroke('point-3')!.fill).toBe('ink');
    expect(ticks(drawn)).toContain('3.5');
    expectCleanLabels(drawn);
    expect((await line('point: 1, 2.5, 4')).scene.strokes.filter((stroke) => stroke.id.startsWith('point-')).length).toBe(3);
  });

  it('names exact ends as they were written and solves what it is given', async () => {
    const exact = await line('interval: [1/2, sqrt(2))');
    expect(ticks(exact)).toEqual(expect.arrayContaining(['1/2', '√2']));
    const solved = await line('ineq: 2x + 1 < 7');
    expect(ticks(solved)).toContain('3');
    expect(solved.stroke('set-0-0-hi')!.fill).toBe('paper');
    expectCleanLabels(exact);
  });

  it('chooses a range that holds everything, or keeps the stated one', async () => {
    const wide = await line('interval: [1200, 4800)\npoint: 2500 median');
    const numbers = ticks(wide).map((text) => Number(text));
    expect(Math.min(...numbers)).toBeLessThan(1200);
    expect(Math.max(...numbers)).toBeGreaterThan(4800);
    expectCleanLabels(wide);
    expect(await refused('range: 0 5\npoint: 7')).toBe('7 lies outside the range 0 to 5');
    expect(await refused('range: 5 0\npoint: 2')).toMatch(/needs two increasing numbers/);
    expect(ticks(await line('range: -2 to 2\npoint: 0'))).toEqual(expect.arrayContaining(['−2', '2']));
  });

  it('refuses with the reason', async () => {
    expect(await refused('interval: -3, 2')).toBe('interval "-3, 2" needs brackets, e.g. [-3, 2) or (-inf, 4]');
    expect(await refused('ineq: x < 1 and x > 2')).toBe('"x < 1 and x > 2" has no solution to draw');
    expect(await refused('ineq: x^2 < 4')).toMatch(/only linear inequalities/);
    expect(await refused('point: here')).toMatch(/needs a number first/);
    expect(await refused('point: inf')).toMatch(/needs a number first/);
    expect(await refused('ineq: x > 0\nineq: x > 1\nineq: x > 2\nineq: x > 3\nineq: x > 4')).toBe('5 overlapping sets are more than the 4 a number line can stack legibly');
    expect(await refused('point: 1 alpha\npoint: 1.2 beta\nrange: 0 10')).toMatch(/too close together/);
  });

  it('never throws on garbage', async () => {
    for (const content of ['point: 1', 'interval: 1', 'ineq: 1', 'range: 1\npoint: 1', 'ineq: <<<', 'interval: [[[', 'point: 1e999', 'ineq: x < 1e400', 'interval: (-inf, inf)', 'point: 0\nrange: -1e308 1e308', 'point: 1e-12\npoint: 0']) {
      const result = await compile('numberline', content);
      if (!result.ok) expect(`${result.code}: ${result.reason}`, content).not.toMatch(/^throw|undefined|Cannot read/);
    }
  });
});
