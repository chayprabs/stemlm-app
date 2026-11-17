import { describe, expect, it } from 'vitest';
import { compile, draw, expectCleanLabels, reason } from '../cs/testing';
import { direction, parseVector } from './vectors';

const lengthOf = (points: number[]) => Math.hypot(points[2]! - points[0]!, points[3]! - points[1]!);

describe('vector notation', () => {
  it.each([
    ['A 3 4', 'A', 3, 4],
    ['A = (3, 4)', 'A', 3, 4],
    ['A = ⟨−3, 4⟩', 'A', -3, 4],
    ['F_1: 3,4', 'F_1', 3, 4],
    ['3 4', '', 3, 4],
    ['B 5∠30', 'B', 4.330127, 2.5],
    ['B 5 ∠ 30°', 'B', 4.330127, 2.5],
    ['B 5 at 30 deg', 'B', 4.330127, 2.5],
    ['B 5 @ 30', 'B', 4.330127, 2.5],
    ['B = 5 N ∠ π/6', 'B', 4.330127, 2.5],
    ['5∠90', '', 0, 5],
    ['W 300 at -90 deg', 'W', 0, -300],
    ['v = 3i + 4j', 'v', 3, 4],
    ['v = -3i − 4j', 'v', -3, -4],
    ['v = 2.5î - ĵ', 'v', 2.5, -1],
  ])('reads %s', (raw, name, x, y) => {
    const vector = parseVector(raw);
    expect(vector?.name).toBe(name);
    expect(vector!.x).toBeCloseTo(x, 5);
    expect(vector!.y).toBeCloseTo(y, 5);
  });

  it('gives exact zeros for vectors along an axis', () => {
    expect(parseVector('A 5∠90')).toEqual({ name: 'A', x: 0, y: 5 });
    expect(parseVector('A 5∠180')).toEqual({ name: 'A', x: -5, y: 0 });
  });

  it.each(['A north 5', 'A 3', 'A 3 4 5', 'A ∠30', 'A 5∠', 'A 5∠north', '', 'a_very_long_vector_name 3 4'])('refuses %s', (raw) => {
    expect(parseVector(raw)).toBeNull();
  });

  it('measures direction anticlockwise from +x in (−180°, 180°]', () => {
    expect(direction({ x: 1, y: 1 })).toBeCloseTo(45, 9);
    expect(direction({ x: -1, y: 0 })).toBeCloseTo(180, 9);
    expect(direction({ x: 0, y: -2 })).toBeCloseTo(-90, 9);
  });
});

describe('vectors figure', () => {
  it('adds tip to tail by default and prints the computed resultant', async () => {
    const drawn = await draw('vectors', 'vec: A 3 4\nvec: B 5∠30\nsum: R\nunit: N');
    const [a, b, r] = ['vec-0', 'vec-1', 'sum'].map((id) => drawn.stroke(id)!);
    // B starts where A ends; R runs from A's tail to B's tip.
    expect(b!.points.slice(0, 2)).toEqual(a!.points.slice(2, 4));
    expect(r!.points.slice(0, 2)).toEqual(a!.points.slice(0, 2));
    expect(r!.points[2]).toBeCloseTo(b!.points[2]!, 6);
    expect(r!.points[3]).toBeCloseTo(b!.points[3]!, 6);
    expect([a, b, r].every((stroke) => stroke!.markerEnd)).toBe(true);
    expect(r!.semanticColor).toBe('accent');
    // To scale, with one scale on both axes: |A| = |B| = 5 and |R| = 9.80.
    expect(lengthOf(a!.points)).toBeCloseTo(lengthOf(b!.points), 6);
    expect(lengthOf(r!.points) / lengthOf(a!.points)).toBeCloseTo(9.7987 / 5, 3);
    expect(drawn.texts()).toEqual(expect.arrayContaining(['A', 'B', 'R', 'R = (7.33, 6.5) N', '|R| = 9.8 N', 'θ = 41.6°']));
    expectCleanLabels(drawn);
  });

  it('origin mode draws every vector from the origin, with the parallelogram for two', async () => {
    const drawn = await draw('vector-addition', 'vec: F_1 6 at 20 deg\nvec: F_2 4 @ 110\nmode: origin\nsum: F_R');
    expect(drawn.stroke('vec-1')!.points.slice(0, 2)).toEqual(drawn.stroke('vec-0')!.points.slice(0, 2));
    expect(drawn.stroke('parallelogram-0')!.points.slice(2, 4)).toEqual(drawn.stroke('sum')!.points.slice(2, 4));
    expect(drawn.stroke('parallelogram-1')).toBeDefined();
    expect(drawn.texts()).toEqual(expect.arrayContaining(['F_R = (4.27, 5.81)', '|F_R| = 7.21', 'θ = 53.7°']));
    expectCleanLabels(drawn);
  });

  it('components mode projects each vector onto the axes and prints its components', async () => {
    const drawn = await draw('vectors', 'vec: A 10∠35°\nvec: B = (−4, 6)\nmode: components\nunit: m/s');
    const [x1, y1, x2, y2] = drawn.stroke('component-0-x')!.points;
    expect(x1).toBeCloseTo(x2!, 6);
    expect(y2).toBeCloseTo(drawn.stroke('vec-0')!.points[3]!, 6);
    expect(y1).toBeGreaterThan(y2!);
    expect(drawn.stroke('component-1-y')).toBeDefined();
    expect(drawn.texts()).toEqual(expect.arrayContaining(['A = (8.19, 5.74) m/s', 'B = (−4, 6) m/s']));
    expect(drawn.stroke('sum')).toBeUndefined();
    // A vector along an axis is its own component.
    expect((await draw('vectors', 'vec: A 5∠0\nmode: components')).stroke('component-0-x')).toBeUndefined();
  });

  it('a single vector starts at the origin; a closed polygon reports a zero resultant without an arrow', async () => {
    const single = await draw('vector', 'vec: v 4 3');
    expect(single.texts()).toContain('v');
    expect(single.stroke('sum')).toBeUndefined();
    const closed = await draw('vectors', 'vec: a 4 0\nvec: b 1.5 3\nvec: c -3 2\nvec: d -4 -2\nvec: e 1.5 -3\nsum: R');
    expect(closed.stroke('sum')).toBeUndefined();
    expect(closed.texts()).toEqual(expect.arrayContaining(['R = (0, 0)', '|R| = 0']));
    expect(closed.texts().some((text) => text.startsWith('θ'))).toBe(false);
    expectCleanLabels(closed);
  });

  it.each([
    ['long names', 'vec: velocity = -3i - 4j\nvec: wind = 2i + 1j\nsum: ground\nunit: km/h'],
    ['three forces', 'vec: T_1 250∠150°\nvec: T_2 400 ∠ 40°\nvec: W 300 at -90 deg\nmode: origin\nsum: R\nunit: N'],
    ['on the axes', 'vec: A 5∠0\nvec: B 5∠90\nmode: components\nsum: R'],
    ['tiny values', 'vec: E_1 0.002 ∠ π/3\nvec: E_2 0.003 ∠ 3π/4\nsum: E'],
  ])('%s: every label is clear of the others and inside the frame', async (_name, content) => {
    expectCleanLabels(await draw('vectors', content));
  });

  it('refuses what it cannot draw faithfully', async () => {
    expect(await reason('vectors', 'vec: A 0 0\nvec: B 1 2')).toBe('vectors: vec A has zero length');
    expect(await reason('vectors', 'vec: A north 5')).toMatch(/is neither components \(A 3 4\) nor magnitude∠degrees/);
    expect(await reason('vectors', 'vec: A 1 2\nvec: A 3 4')).toBe('vectors: vec A is given twice');
    expect(await reason('vectors', 'vec: A 1 2\nmode: sideways')).toMatch(/mode: sideways is not tip-to-tail, origin or components/);
    expect(await reason('vectors', Array.from({ length: 7 }, (_, i) => `vec: v${i} ${i + 1} 1`).join('\n'))).toMatch(/at most 6 are drawn/);
    expect(await reason('vectors', 'vec: A 1e300 1e300\nvec: B 1e300 1e300')).toMatch(/too large to draw/);
  });

  it('never throws on garbage', async () => {
    for (const content of ['vec: 1', 'vec: ∠', 'vec: A ∠∠∠', 'vec: = = =', 'vec: A 1 2\nsum: ', `vec: A ${'9'.repeat(500)} 1`, 'vec: A 5∠1e999']) {
      const result = await compile('vectors', content);
      expect(result.ok ? 'drawn' : result.code, content.slice(0, 30)).not.toBe('throw');
    }
  });
});
