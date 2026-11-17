import { describe, expect, it } from 'vitest';
import { compile, draw, expectCleanLabels, reason } from '../cs/testing';
import { exactPoint } from './format';
import { pointText } from './unitcircle';

describe('exact unit-circle values', () => {
  it('come from the table of special angles, with the quadrant’s signs', () => {
    expect(pointText(0)).toBe('(1, 0)');
    expect(pointText(30)).toBe('(√3/2, 1/2)');
    expect(pointText(45)).toBe('(√2/2, √2/2)');
    expect(pointText(60)).toBe('(1/2, √3/2)');
    expect(pointText(90)).toBe('(0, 1)');
    expect(pointText(150)).toBe('(−√3/2, 1/2)');
    expect(pointText(180)).toBe('(−1, 0)');
    expect(pointText(225)).toBe('(−√2/2, −√2/2)');
    expect(pointText(270)).toBe('(0, −1)');
    expect(pointText(300)).toBe('(1/2, −√3/2)');
    expect(pointText(15)).toBe('((√6+√2)/4, (√6−√2)/4)');
    expect(pointText(105)).toBe('((√2−√6)/4, (√6+√2)/4)');
    // Coterminal and negative angles land on the same point.
    expect(pointText(-210)).toBe(pointText(150));
    expect(pointText(510)).toBe(pointText(150));
  });

  it('agree with the numeric cosine and sine at every multiple of 15°', () => {
    const value = (text: string) => {
      const sign = text.startsWith('−') ? -1 : 1;
      const table: Record<string, number> = {
        '0': 0, '1': 1, '1/2': 0.5, '√2/2': Math.SQRT1_2, '√3/2': Math.sqrt(3) / 2,
        '(√6−√2)/4': (Math.sqrt(6) - Math.sqrt(2)) / 4, '(√6+√2)/4': (Math.sqrt(6) + Math.sqrt(2)) / 4, '(√2−√6)/4': (Math.sqrt(2) - Math.sqrt(6)) / 4,
      };
      const magnitude = table[text.replace(/^−/, '')];
      expect(magnitude, text).toBeDefined();
      return sign * magnitude!;
    };
    for (let degrees = -360; degrees <= 720; degrees += 15) {
      const exact = exactPoint(degrees)!;
      expect(value(exact.cos), `cos ${degrees}`).toBeCloseTo(Math.cos((degrees * Math.PI) / 180), 12);
      expect(value(exact.sin), `sin ${degrees}`).toBeCloseTo(Math.sin((degrees * Math.PI) / 180), 12);
    }
  });

  it('are decimals for every other angle', () => {
    expect(exactPoint(100)).toBeNull();
    expect(pointText(100)).toBe('(−0.174, 0.985)');
    expect(pointText(-40)).toBe('(0.766, −0.643)');
  });
});

describe('unitcircle figure', () => {
  it('puts the point at the angle, on a circle that is round', async () => {
    const drawn = await draw('unitcircle', 'angle: 150\nshow: coords, triangle');
    const [cx, cy, r] = drawn.stroke('circle')!.points as [number, number, number];
    const [px, py] = drawn.stroke('point-0')!.points as [number, number];
    expect((px - cx) / r).toBeCloseTo(Math.cos((150 * Math.PI) / 180), 9);
    expect((cy - py) / r).toBeCloseTo(Math.sin((150 * Math.PI) / 180), 9);
    expect(drawn.text('point-0-coords')).toBe('(−√3/2, 1/2)');
    expect(drawn.text('angle-0')).toBe('150°');
    // The reference triangle: a height dropped to the x-axis, and the base along it.
    const [hx1, hy1, hx2, hy2] = drawn.stroke('triangle-0-height')!.points;
    expect([hx1, hy1, hx2, hy2]).toEqual([px, py, px, cy]);
    expect(drawn.stroke('triangle-0-base')!.points).toEqual([cx, cy, px, cy]);
    expectCleanLabels(drawn);
  });

  it('reads degrees, radians and multiples of π, and labels each angle as it was written', async () => {
    const drawn = await draw('unit-circle', 'angle: 5π/6\nangle: 7pi/4\nshow: coords');
    expect([drawn.text('angle-0'), drawn.text('angle-1')]).toEqual(['5π/6', '7π/4']);
    expect(drawn.text('point-0-coords')).toBe('(−√3/2, 1/2)');
    expect(drawn.text('point-1-coords')).toBe('(√2/2, −√2/2)');
    const radians = await draw('unitcircle', 'angle: 1 rad\nshow: coords');
    expect(radians.text('angle-0')).toBe('1 rad');
    expect(radians.text('point-0-coords')).toBe('(0.54, 0.841)');
    // 2.618 rad is close to 150° but not it: decimals, not surds.
    expect((await draw('unitcircle', 'angle: 2.618 rad\nshow: coords')).text('point-0-coords')).toBe('(−0.866, 0.5)');
    const sloppy = await draw('trig-circle', 'angle: θ = 150°, 45 deg');
    expect([sloppy.text('angle-0'), sloppy.text('angle-1')]).toEqual(['150°', '45°']);
  });

  it('sweeps anticlockwise for a positive angle, clockwise for a negative one, and at most one turn', async () => {
    const drawn = await draw('unitcircle', 'angle: 90\nangle: -90\nangle: 405');
    const [cx, cy] = drawn.stroke('circle')!.points as [number, number];
    const end = (id: string) => drawn.stroke(id)!.points.slice(-2) as [number, number];
    expect(end('sweep-0')[0]).toBeCloseTo(cx, 6);
    expect(end('sweep-0')[1]).toBeLessThan(cy);
    expect(end('sweep-1')[1]).toBeGreaterThan(cy);
    // 405° is drawn as its 45° remainder but named in full.
    expect(end('sweep-2')[0] - cx).toBeCloseTo(cy - end('sweep-2')[1], 6);
    expect(drawn.text('angle-2')).toBe('405°');
  });

  it('draws no reference triangle for an angle on an axis', async () => {
    const drawn = await draw('unitcircle', 'angle: 90\nangle: 60\nshow: triangle');
    expect(drawn.stroke('triangle-0-height')).toBeUndefined();
    expect(drawn.stroke('triangle-1-height')).toBeDefined();
  });

  it.each([
    ['one angle', 'angle: 45'],
    ['eight angles', 'angle: 30, 60, 120, 135, 210, 240, 300, 330'],
    ['quadrantal angles with coordinates', 'angle: 0, 90, 180, 270\nshow: coords'],
    ['four angles with coordinates', 'angle: 30, 135, 240, 315\nshow: coords'],
    ['narrow, more than a turn, negative', 'angle: 15\nangle: 405°\nangle: -5π/6\nshow: triangle'],
    ['decimals with triangles', 'angle: 100°\nangle: -40\nangle: 2.618 rad\nangle: 270\nshow: coords, triangle'],
  ])('%s: every label is clear of the others and inside the frame', async (_name, content) => {
    expectCleanLabels(await draw('unitcircle', content));
  });

  it('refuses what it cannot draw faithfully', async () => {
    expect(await reason('unitcircle', 'angle: north-east')).toBe('unitcircle: angle: north-east is not an angle');
    expect(await reason('unitcircle', 'angle: 10, 20, 30, 40, 50, 60, 70, 80, 90')).toMatch(/at most 8 are drawn/);
    expect(await reason('unitcircle', 'angle: 30\nshow: tangent')).toBe('unitcircle: show: tangent is not coords or triangle');
    expect(await reason('unitcircle', 'angle: 30, 60, 120, 135, 210, 240, 300, 330\nshow: coords')).toMatch(/no room to label/);
  });

  it('never throws on garbage', async () => {
    for (const content of ['angle: ', 'angle: ,,,', 'angle: °', 'angle: 1e999', 'angle: π/0', `angle: ${'9'.repeat(300)}`]) {
      const result = await compile('unitcircle', content);
      expect(result.ok ? 'drawn' : result.code, content.slice(0, 30)).not.toBe('throw');
    }
  });
});
