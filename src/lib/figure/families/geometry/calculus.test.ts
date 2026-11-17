import { describe, expect, it } from 'vitest';
import { compile, draw, expectCleanLabels, reason } from '../cs/testing';
import { sampleCurve } from './curve';
import { compileIn, compileXY } from './expr';
import { integrate } from './slopefield';

const WIDE = { x0: -10, x1: 10, y0: -1e6, y1: 1e6 };

describe('expressions in one and two variables', () => {
  it('reads what people write through the shared expression repair', () => {
    expect(compileXY('x - y')!(3, 1)).toBe(2);
    expect(compileXY('x − y')!(3, 1)).toBe(2);
    expect(compileXY('2xy')!(3, 2)).toBe(12);
    expect(compileXY('y(1 − y)')!(0, 0.25)).toBeCloseTo(0.1875, 12);
    expect(compileXY('x² + y²')!(3, 4)).toBe(25);
    expect(compileXY('\\frac{x}{y}')!(6, 3)).toBe(2);
    expect(compileXY('sin x + cos y')!(0, 0)).toBe(1);
    expect(compileXY('Y - X')!(1, 5)).toBe(4);
    expect(compileIn('1 + cos θ', 'theta')!(0)).toBe(2);
    expect(compileIn('r = 2 sin 3t', 't')!(Math.PI / 6)).toBeCloseTo(2, 12);
    expect(compileIn('x(t) = t − sin t', 't')!(Math.PI)).toBeCloseTo(Math.PI, 12);
  });

  it('refuses a name it cannot resolve rather than guessing', () => {
    expect(compileXY('x - z')).toBeNull();
    expect(compileXY('x + tau')).toBeNull();
    expect(compileXY('')).toBeNull();
    expect(compileIn('1 + cos(phi)', 'theta')).toBeNull();
  });
});

describe('RK4 integration', () => {
  it("follows y' = y to e at x = 1", () => {
    const path = integrate((_x, y) => y, 0, 1, 0.01, 100, WIDE);
    expect(path.at(-1)!.x).toBeCloseTo(1, 9);
    expect(path.at(-1)!.y).toBeCloseTo(Math.E, 8);
  });

  it("follows y' = x − y to its closed form, forwards and backwards", () => {
    const exact = (x: number) => x - 1 + 2 * Math.exp(-x);
    const forward = integrate((x, y) => x - y, 0, 1, 0.015, 200, WIDE).at(-1)!;
    expect(forward.y).toBeCloseTo(exact(forward.x), 7);
    const backward = integrate((x, y) => x - y, 0, 1, -0.015, 100, WIDE).at(-1)!;
    expect(backward.x).toBeCloseTo(-1.5, 9);
    expect(backward.y).toBeCloseTo(exact(-1.5), 6);
  });

  it('stops at a blow-up instead of drawing through it', () => {
    // y' = y² through (0, 1) is 1/(1 − x): it never reaches x = 1.
    const path = integrate((_x, y) => y * y, 0, 1, 0.01, 400, { x0: -2, x1: 2, y0: -4, y1: 4 });
    expect(path.at(-1)!.x).toBeLessThan(1);
    expect(path.every((p) => Number.isFinite(p.y) && p.y <= 12)).toBe(true);
    expect(integrate(() => Number.NaN, 0, 0, 0.1, 10, WIDE)).toHaveLength(1);
  });
});

describe('slopefield figure', () => {
  it('draws each mark at the slope of the equation and the solution through the given point', async () => {
    const drawn = await draw('slopefield', 'dydx: x - y\nx: -3 3\ny: -3 3\nthrough: 0,1');
    const frame = drawn.stroke('plane-frame')!.points as [number, number, number, number];
    const k = frame[2] / 6;
    expect(frame[3] / 6, 'one scale on both axes').toBeCloseTo(k, 6);
    const world = (X: number, Y: number) => ({ x: -3 + (X - frame[0]) / k, y: 3 - (Y - frame[1]) / k });
    const marks = drawn.scene.strokes.filter((stroke) => stroke.id.startsWith('slope-'));
    expect(marks.length).toBeGreaterThan(100);
    for (const mark of marks) {
      const [x1, y1, x2, y2] = mark.points as [number, number, number, number];
      const mid = world((x1 + x2) / 2, (y1 + y2) / 2);
      expect((y1 - y2) / (x2 - x1), mark.id).toBeCloseTo(mid.x - mid.y, 6);
    }
    // The curve passes through (0, 1) and follows x − 1 + 2e^(−x).
    // (Its two ends are where it is cut at the frame, between integration steps.)
    const curve = drawn.stroke('solution-0')!.points;
    for (let i = 40; i < curve.length - 2; i += 40) {
      const p = world(curve[i]!, curve[i + 1]!);
      expect(p.y, `x = ${p.x}`).toBeCloseTo(p.x - 1 + 2 * Math.exp(-p.x), 5);
    }
    expect(drawn.texts()).toEqual(expect.arrayContaining(['(0, 1)', 'dy/dx = x − y']));
    expectCleanLabels(drawn);
  });

  it('reads sloppy input and defaults the window', async () => {
    const drawn = await draw('slope-field', "dydx: y' = −x/y");
    expect(drawn.texts()).toEqual(expect.arrayContaining(['−3', '3', 'dy/dx = −x/y']));
    const ranged = await draw('direction-field', 'dydx: y(1 − y)\nx: 0 to 6\ny: [-0.5, 1.5]\nthrough: 0, 0.1\nthrough: (0, 0.5)\nthrough: y(0) = 1.4');
    expect(['solution-0', 'solution-1', 'solution-2'].every((id) => ranged.stroke(id))).toBe(true);
    expect(ranged.texts()).toEqual(expect.arrayContaining(['6', '1.5']));
    expectCleanLabels(ranged);
  });

  it('clips a solution to the window and ends it at a blow-up', async () => {
    const drawn = await draw('slopefield', 'dydx: y^2\nx: -2 2\ny: -4 4\nthrough: 0,1');
    const frame = drawn.stroke('plane-frame')!.points as [number, number, number, number];
    const curve = drawn.stroke('solution-0')!.points;
    for (let i = 0; i < curve.length; i += 2) {
      expect(curve[i]!).toBeGreaterThanOrEqual(frame[0] - 1e-6);
      expect(curve[i]!).toBeLessThanOrEqual(frame[0] + frame[2] + 1e-6);
      expect(curve[i + 1]!).toBeGreaterThanOrEqual(frame[1] - 1e-6);
      expect(curve[i + 1]!).toBeLessThanOrEqual(frame[1] + frame[3] + 1e-6);
    }
    // 1/(1 − x) leaves the top of the window at x = 0.75, well short of the right edge.
    expect(Math.max(...curve.filter((_, i) => i % 2 === 0))).toBeLessThan(frame[0] + frame[2] * 0.72);
  });

  it('refuses what it cannot draw faithfully', async () => {
    expect(await reason('slopefield', 'dydx: x - z')).toBe('slopefield: dydx: x - z is not an expression in x and y');
    expect(await reason('slopefield', 'dydx: x\nx: 3 -3')).toMatch(/x: 3 -3 is not a range/);
    expect(await reason('slopefield', 'dydx: x\nthrough: 9,9')).toBe('slopefield: through: (9, 9) lies outside the window');
    expect(await reason('slopefield', 'dydx: x\nthrough: here')).toMatch(/through: here is not a point/);
    expect(await reason('slopefield', 'dydx: 1/y\nthrough: 1,0')).toMatch(/the slope is undefined at \(1, 0\)/);
    expect(await reason('slopefield', 'dydx: sqrt(-1 - x^2)')).toMatch(/undefined everywhere/);
  });
});

describe('curve figure', () => {
  it('samples a curve into runs, cutting at what is undefined or infinite', () => {
    const circle = sampleCurve((t) => ({ x: Math.cos(t), y: Math.sin(t) }), 0, 2 * Math.PI);
    expect(circle).toHaveLength(1);
    expect(circle[0]!.every((p) => Math.abs(Math.hypot(p.x, p.y) - 1) < 1e-12)).toBe(true);
    const branches = sampleCurve((t) => ({ x: t, y: 1 / t }), -1, 1);
    expect(branches.length).toBeGreaterThanOrEqual(2);
    expect(sampleCurve(() => ({ x: Number.NaN, y: 0 }), 0, 1)).toEqual([]);
  });

  it('draws a polar curve to scale with a polar grid', async () => {
    const drawn = await draw('curve', 'kind: polar\nr: 1 + cos(theta)\nt: 0 2*pi');
    const points = drawn.stroke('curve-0')!.points;
    const [ox] = [drawn.stroke('y-axis')!.points[0]!];
    const oy = drawn.stroke('x-axis')!.points[1]!;
    // The cardioid reaches r = 2 at θ = 0 and passes through the origin at θ = π.
    const k = (points[0]! - ox) / 2;
    expect(points[1]).toBeCloseTo(oy, 6);
    expect(Math.hypot(points[720]! - ox, points[721]! - oy)).toBeLessThan(1e-6);
    // One scale on both axes: at θ = π/2 the point is (0, 1).
    expect(points[360]! - ox).toBeCloseTo(0, 6);
    expect((oy - points[361]!) / k).toBeCloseTo(1, 6);
    expect(drawn.stroke('polar-ring-1-0')).toBeDefined();
    expect(drawn.stroke('polar-ray-1')).toBeDefined();
    expect(drawn.texts()).toContain('r = 1 + cos(theta)');
    expectCleanLabels(drawn);
  });

  it('lets the type alias or the keys choose the kind', async () => {
    const lissajous = await draw('parametric', 'x: cos(t)\ny: sin(2*t)');
    expect(lissajous.stroke('polar-ring-1-0')).toBeUndefined();
    expect(lissajous.texts()).toEqual(expect.arrayContaining(['x = cos(t)', 'y = sin(2·t)']));
    const rose = await draw('polar', 'r: r = 2 sin 3θ\nt: 0 to π');
    expect(rose.stroke('polar-ring-1-0')).toBeDefined();
    expect((await draw('curve', 'r: 2')).stroke('polar-ray-1')).toBeDefined();
    expect((await draw('curve', 'x: t\ny: t^2\nt: -2 2')).stroke('curve-0')).toBeDefined();
    expect(await reason('polar', 'x: cos(t)\ny: sin(t)')).toBe('curve: a polar curve needs r: as a function of theta');
  });

  it.each([
    ['spiral', 'polar-plot', 'r: 0.3θ\nt: 0 6π'],
    ['cycloid', 'parametric-plot', 'x: t − sin t\ny: 1 − cos t\nt: 0 4π'],
    ['hyperbola branches', 'curve', 'kind: parametric\nx: 1/cos(t)\ny: tan(t)\nt: -1.2 1.2'],
  ])('%s: every label is clear of the others and inside the frame', async (_name, type, content) => {
    expectCleanLabels(await draw(type, content));
  });

  it('refuses what it cannot draw faithfully', async () => {
    expect(await reason('curve', 'kind: polar\nr: 1 + cos(phi)')).toBe('curve: r: 1 + cos(phi) is not an expression in theta');
    expect(await reason('curve', 'kind: spiral\nr: theta')).toBe('curve: kind: spiral is not polar or parametric');
    expect(await reason('curve', 'x: cos(t)')).toBe('curve: a parametric curve needs x: and y: as functions of t');
    expect(await reason('curve', 'x: cos(t)\ny: sin(u)')).toBe('curve: y: sin(u) is not an expression in t');
    expect(await reason('curve', 'r: theta\nt: 5 1')).toMatch(/t: 5 1 is not a range/);
    expect(await reason('curve', 'x: 2\ny: 3')).toBe('curve: the curve is a single point over this range');
    expect(await reason('curve', 'r: sqrt(-1 - theta^2)')).toBe('curve: the curve is undefined over this range');
  });

  it('never throws on garbage', async () => {
    for (const [type, content] of [['curve', 'r: ((('], ['curve', 'x: 1'], ['curve', 'r: 1e999'], ['curve', `r: ${'theta*'.repeat(200)}1`], ['slopefield', 'dydx: ='], ['slopefield', 'dydx: 1'], ['slopefield', 'dydx: 1/0'], ['slopefield', 'dydx: x\nx: 1'], ['slopefield', 'dydx: x\nthrough: ,']] as const) {
      const result = await compile(type, content);
      expect(result.ok ? 'drawn' : result.code, content.slice(0, 30)).not.toBe('throw');
    }
  });
});
