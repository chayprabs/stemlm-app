import { describe, expect, it } from 'vitest';
import { compile, draw, expectCleanLabels, reason } from '../cs/testing';
import { distanceText, parseCircle, parseLine, slopeText } from './coord';

/** Slope and y-intercept of a parsed line (or the x it stands at when vertical). */
function slopeIntercept(equation: string): { m: number; k: number } | { x: number } | null {
  const line = parseLine(equation);
  if (!line) return null;
  return Math.abs(line.b) < 1e-12 ? { x: -line.c / line.a } : { m: -line.a / line.b, k: -line.c / line.b };
}
const centreOf = (index: number, drawn: Awaited<ReturnType<typeof draw>>) => drawn.stroke(`point-${index}`)!.points as [number, number, number];

describe('line and circle equations', () => {
  it.each([
    ['y = 2x + 1', { m: 2, k: 1 }],
    ['2x + 3y = 6', { m: -2 / 3, k: 2 }],
    ['y − 1 = 2(x − 3)', { m: 2, k: -5 }],
    ['y = −½x + 4', { m: -0.5, k: 4 }],
    ['y = \\frac{1}{2}x - 3', { m: 0.5, k: -3 }],
    ['x/2 + y/3 = 1', { m: -1.5, k: 3 }],
    ['2x + 1', { m: 2, k: 1 }],
    ['Y = 3', { m: 0, k: 3 }],
    ['x = 3', { x: 3 }],
    ['2x = -5', { x: -2.5 }],
  ])('reads %s', (equation, expected) => {
    const got = slopeIntercept(equation);
    expect(got).not.toBeNull();
    for (const [key, value] of Object.entries(expected)) expect((got as Record<string, number>)[key], key).toBeCloseTo(value, 9);
  });

  it.each(['y = x^2', 'y = 1/x', 'xy = 1', 'y = sin(x)', '0 = 0', '3 = 4', 'y = 2x + 1 = 3', 'y = 2z + 1', 'y = ', '', 'y = tau'])('refuses %s as a line', (equation) => {
    expect(parseLine(equation)).toBeNull();
  });

  it('reads a circle in standard and in expanded form', () => {
    expect(parseCircle('(x-1)^2 + (y+2)^2 = 9')).toEqual({ cx: 1, cy: -2, r: 3 });
    const general = parseCircle('x² + y² − 4x + 6y − 3 = 0')!;
    expect([general.cx, general.cy, general.r].map((value) => Number(value.toFixed(9)))).toEqual([2, -3, 4]);
    expect(parseCircle('2x^2 + 2y^2 = 8')!.r).toBeCloseTo(2, 9);
    expect(parseCircle('x^2 + y^2 = 25')).toEqual({ cx: 0, cy: 0, r: 5 });
  });

  it.each(['x^2 + 4y^2 = 4', 'x^2 + y^2 = -1', 'x^2 + y^2 + xy = 1', 'x^2 - y^2 = 1', 'y = 2x + 1', 'x^2 + y^2', 'x^3 + y^2 = 1'])('refuses %s as a circle', (equation) => {
    expect(parseCircle(equation)).toBeNull();
  });
});

describe('computed annotations', () => {
  it('distance: exact when it is one, a simplified surd when its square is whole', () => {
    expect(distanceText({ x: 1, y: 2 }, { x: 5, y: 5 })).toBe('= 5');
    expect(distanceText({ x: 0, y: 0 }, { x: 2, y: 3 })).toBe('= √13 ≈ 3.61');
    expect(distanceText({ x: 0, y: 0 }, { x: 2, y: 4 })).toBe('= 2√5 ≈ 4.47');
    expect(distanceText({ x: 0, y: 0 }, { x: 0.5, y: 0.5 })).toBe('≈ 0.707');
    expect(distanceText({ x: 0, y: 0 }, { x: 2.5, y: 0 })).toBe('= 2.5');
  });

  it('slope: a fraction in lowest terms, with its sign, or undefined', () => {
    expect(slopeText({ x: -2, y: -1 }, { x: 5, y: 3 })).toBe('= 4/7');
    expect(slopeText({ x: 0, y: 0 }, { x: 4, y: -2 })).toBe('= −1/2');
    expect(slopeText({ x: 0, y: 0 }, { x: 3, y: 6 })).toBe('= 2');
    expect(slopeText({ x: 0, y: 0 }, { x: 0.3, y: 0.1 })).toBe('= 1/3');
    expect(slopeText({ x: 2, y: 7 }, { x: 5, y: 7 })).toBe('= 0');
    expect(slopeText({ x: 1, y: 1 }, { x: 1, y: 5 })).toBe('is undefined (vertical)');
    expect(slopeText({ x: 0, y: 0 }, { x: Math.PI, y: 1 })).toBe('≈ 0.318');
  });
});

describe('coord figure', () => {
  it('draws to scale with one scale on both axes, and prints what it computed', async () => {
    const drawn = await draw('coord', 'point: A 1 2\npoint: B 5 5\nsegment: A B\nline: y = -x + 3\nshow: distance A B, midpoint A B');
    const [ax, ay] = centreOf(0, drawn);
    const [bx, by] = centreOf(1, drawn);
    expect((bx - ax) / 4).toBeCloseTo((ay - by) / 3, 6);
    const [mx, my] = drawn.stroke('midpoint-0')!.points;
    expect(mx).toBeCloseTo((ax + bx) / 2, 6);
    expect(my).toBeCloseTo((ay + by) / 2, 6);
    expect(drawn.texts()).toEqual(expect.arrayContaining(['A(1, 2)', 'B(5, 5)', '(3, 3.5)', 'AB = 5', 'y = −x + 3', 'x', 'y']));
    expectCleanLabels(drawn);
  });

  it('puts a line where its equation says', async () => {
    const drawn = await draw('coord', 'point: O 0 0\npoint: P 2 5\nline: y = 2x + 1');
    const [ox, oy] = centreOf(0, drawn);
    const [px, py] = centreOf(1, drawn);
    const unit = (px - ox) / 2;
    const [x1, y1, x2, y2] = drawn.stroke('line-0')!.points as [number, number, number, number];
    // Both ends satisfy y = 2x + 1 in figure coordinates, and P lies on the line.
    for (const [x, y] of [[x1, y1], [x2, y2], [px, py]] as const) expect((oy - y) / unit).toBeCloseTo(2 * ((x - ox) / unit) + 1, 6);
  });

  it('draws a circle from its equation with the computed centre marked', async () => {
    const drawn = await draw('coord', 'point: O 0 0\npoint: U 1 0\ncircle: (x-1)^2 + (y+2)^2 = 9');
    const unit = centreOf(1, drawn)[0] - centreOf(0, drawn)[0];
    const [cx, cy] = drawn.stroke('centre-0')!.points as [number, number];
    expect((cx - centreOf(0, drawn)[0]) / unit).toBeCloseTo(1, 6);
    expect((centreOf(0, drawn)[1] - cy) / unit).toBeCloseTo(-2, 6);
    const outline = drawn.stroke('circle-0')!.points;
    for (let i = 0; i < outline.length; i += 2) expect(Math.hypot(outline[i]! - cx, outline[i + 1]! - cy) / unit).toBeCloseTo(3, 6);
    expect(drawn.text('centre-0-name')).toBe('(1, −2)');
  });

  it('reads sloppy but unambiguous notation', async () => {
    const drawn = await draw('cartesian', 'point: A(−2, −1)\npoint: B = (4, −1)\npoint: C (5, 3)\npoint: D(-1,3)\npolygon: ABCD\nsegment: A to C\ncircle: centre B radius 1\nshow: slope of A C; distance between B and D');
    expect(drawn.stroke('polygon-0')!.points).toHaveLength(8);
    expect(drawn.stroke('polygon-0')!.fill).toBe('tint');
    expect(drawn.texts()).toEqual(expect.arrayContaining(['slope AC = 4/7', 'BD = √41 ≈ 6.4']));
    expect((await draw('coord', 'circle: 0,0 2\ncircle: (1, 1) r = 1')).stroke('circle-1')).toBeDefined();
    expect((await draw('coord', 'point: P_1 1 1\npoint: P_2 4 5\nline: P_1 P_2\nshow: distance P_1 P_2')).texts()).toContain('P_1–P_2 = 5');
  });

  it('keeps an explicit window, clipping lines and circles to it', async () => {
    const drawn = await draw('coord', 'circle: 0,0 4\nline: y = x/2\nwindow: [-8, 8] x [-3, 3]');
    expect(drawn.stroke('circle-0-1'), 'the circle is cut into arcs').toBeDefined();
    const square = await draw('coord', 'line: y = x\nwindow: -5 5 -5 5');
    expect(square.scene.height, 'a square window gets the tall canvas').toBeGreaterThan(247);
    expect(await reason('coord', 'point: A 9 9\nwindow: -5 5 -5 5')).toBe('coord: point A lies outside the window');
    expect(await reason('coord', 'point: A 1 1\nwindow: 5 -5 -5 5')).toMatch(/window needs xmin xmax ymin ymax/);
    expect(await reason('coord', 'point: A 1 1\nwindow: -5 5')).toMatch(/window needs xmin xmax ymin ymax/);
  });

  it('infers a window that brings in the axes unless the figure is far from them', async () => {
    const near = await draw('coord', 'point: (3, -2)');
    expect(near.texts()).toEqual(expect.arrayContaining(['0', '(3, −2)']));
    const far = await draw('coord', 'point: A 100 200\npoint: B 104 203\nsegment: A B');
    const ticks = far.texts().filter((text) => /^[0-9]+$/.test(text)).map(Number);
    expect(ticks.length).toBeGreaterThan(2);
    expect(Math.min(...ticks)).toBeGreaterThan(90);
    expect(far.texts()).not.toContain('0');
    const lone = await draw('coord', 'line: y = 2x + 1');
    expect(lone.scene.height, 'a line alone stays on the nominal canvas').toBe(165);
    expect(lone.texts()).toEqual(expect.arrayContaining(['−5', '5', 'y = 2x + 1']));
  });

  it.each([
    ['dense', 'point: A 0 0\npoint: B 6 0\npoint: C 6 4\npoint: D 0 4\npoint: E 3 6\npolygon: A B C D\nsegment: D E\nsegment: E C\ncircle: A 2\nline: y = 0.5x + 1\nshow: distance A C, midpoint A C, slope D E'],
    ['three lines', 'line: 2x + 3y = 6\nline: y = x\nline: x = -2\nwindow: -5 5 -5 5'],
    ['long names and five readouts', 'point: P_1 -3 -2\npoint: P_2 5 4\npoint: Q 1 6\npolygon: P_1 P_2 Q\nshow: distance P_1 P_2, midpoint P_1 P_2, slope P_1 P_2, distance Q P_1, slope Q P_2'],
    ['big numbers', 'point: A -1200 300\npoint: B 2400 1800\nsegment: A B\nshow: midpoint A B, slope A B, distance A B'],
    ['tangent lines', 'circle: (x-1)^2 + (y+2)^2 = 9\nline: y = 1\nline: x = 4'],
  ])('%s: every label is clear of the others and inside the frame', async (_name, content) => {
    expectCleanLabels(await draw('coord', content));
  });

  it('refuses what it cannot draw faithfully', async () => {
    expect(await reason('coord', 'point: A 1 2\nsegment: A Z')).toBe('coord: segment: Z is not a declared point');
    expect(await reason('coord', 'point: A 1 2\nsegment: A A')).toMatch(/needs two different points/);
    expect(await reason('coord', 'line: y = x^2')).toMatch(/neither an equation linear in x and y nor two declared points/);
    expect(await reason('coord', 'circle: x^2 + 4y^2 = 4')).toMatch(/neither a centre and radius nor the equation of a circle/);
    expect(await reason('coord', 'circle: Q 2')).toBe('coord: circle: Q is not a declared point');
    expect(await reason('coord', 'circle: 0,0 -2')).toBe('coord: circle: the radius must be positive');
    expect(await reason('coord', 'point: A one two')).toMatch(/is not a name and two coordinates/);
    expect(await reason('coord', 'point: A 1 2\npoint: A 3 4')).toBe('coord: point A is declared twice');
    expect(await reason('coord', 'point: A 1 2\npoint: B 3 4\npolygon: A B')).toMatch(/needs at least three points/);
    expect(await reason('coord', 'point: A 1 2\npoint: B 3 4\nshow: area A B')).toMatch(/is not distance, midpoint or slope/);
    expect(await reason('coord', 'point: A 1e12 0')).toBe('coord: the figure is too large to draw');
  });

  it('never throws on garbage', async () => {
    for (const content of ['point: 1', 'line: 1', 'circle: 1', 'polygon: 1', 'line: =', 'circle: ===', 'point: ((((', 'window: x\npoint: A 1 1', `point: A ${'9'.repeat(400)} 1`, 'line: y = 1/0']) {
      const result = await compile('coord', content);
      expect(result.ok ? 'drawn' : result.code, content.slice(0, 30)).not.toBe('throw');
    }
  });
});
