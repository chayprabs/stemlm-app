import { describe, expect, it } from 'vitest';
import { compile, draw, expectCleanLabels, reason } from '../cs/testing';
import { solveTriangle, type SolvedTriangle, type TriangleInput } from './triangle-solve';

function solve(input: Partial<TriangleInput>): SolvedTriangle {
  const solved = solveTriangle({ sides: [undefined, undefined, undefined], angles: [undefined, undefined, undefined], ...input });
  expect(solved.ok ? 'solved' : solved.reason).toBe('solved');
  return solved as SolvedTriangle;
}
function refusal(input: Partial<TriangleInput>): string {
  const solved = solveTriangle({ sides: [undefined, undefined, undefined], angles: [undefined, undefined, undefined], ...input });
  expect(solved.ok).toBe(false);
  return solved.ok ? '' : solved.reason;
}
const close = (actual: readonly number[], expected: readonly number[], digits = 2) => {
  actual.forEach((value, i) => expect(value, `value ${i}`).toBeCloseTo(expected[i]!, digits));
};
const lengthOf = (points: number[]) => Math.hypot(points[2]! - points[0]!, points[3]! - points[1]!);

describe('triangle solver', () => {
  it('SSS: angles by the law of cosines', () => {
    const t = solve({ sides: [3, 4, 5] });
    expect(t.method).toBe('SSS');
    close(t.angles, [36.87, 53.13, 90]);
  });

  it('SAS: the third side by the law of cosines', () => {
    const t = solve({ sides: [7, 10, undefined], angles: [undefined, undefined, 40] });
    expect(t.method).toBe('SAS');
    close(t.sides, [7, 10, 6.461]);
    close(t.angles, [44.14, 95.86, 40], 1);
  });

  it('ASA and AAS: the other sides by the law of sines', () => {
    const asa = solve({ sides: [undefined, undefined, 10], angles: [50, 60, undefined] });
    expect(asa.method).toBe('ASA');
    close(asa.sides, [8.152, 9.216, 10]);
    close(asa.angles, [50, 60, 70]);
    const aas = solve({ sides: [5, undefined, undefined], angles: [30, 45, undefined] });
    expect(aas.method).toBe('AAS');
    close(aas.sides, [5, 7.071, 9.659]);
  });

  it('SSA: refuses the ambiguous case by name and solves either triangle once the case is given', () => {
    const ssa = { sides: [7, 10, undefined], angles: [30, undefined, undefined] } satisfies Partial<TriangleInput>;
    const why = refusal(ssa);
    expect(why).toMatch(/ambiguous case \(SSA\)/);
    expect(why).toContain('B = 45.6° or 134.4°');
    expect(why).toContain('case: acute or case: obtuse');
    const acute = solve({ ...ssa, ssaCase: 'acute' });
    close(acute.angles, [30, 45.58, 104.42]);
    close(acute.sides, [7, 10, 13.559]);
    const obtuse = solve({ ...ssa, ssaCase: 'obtuse' });
    close(obtuse.angles, [30, 134.42, 15.58]);
    close(obtuse.sides, [7, 10, 3.761]);
  });

  it('SSA: one triangle when the side facing the angle is the longer, or when it just reaches', () => {
    close(solve({ sides: [10, 7, undefined], angles: [30, undefined, undefined] }).angles, [30, 20.49, 129.51]);
    close(solve({ sides: [5, 10, undefined], angles: [30, undefined, undefined] }).angles, [30, 90, 60]);
    expect(refusal({ sides: [10, 7, undefined], angles: [30, undefined, undefined], ssaCase: 'obtuse' })).toMatch(/case: obtuse is impossible/);
  });

  it('SSA: a right triangle from its hypotenuse and a leg', () => {
    close(solve({ sides: [3, undefined, 5], angles: [undefined, undefined, 90] }).sides, [3, 4, 5]);
  });

  it('refuses impossible data with the reason', () => {
    expect(refusal({ sides: [1, 2, 5] })).toBe('triangle inequality fails: a + b < c (1 + 2 < 5)');
    expect(refusal({ sides: [1, 2, 3] })).toMatch(/a \+ b = c/);
    expect(refusal({ angles: [100, 90, undefined], sides: [1, undefined, undefined] })).toMatch(/A \+ B = 190° leaves no third angle/);
    expect(refusal({ angles: [60, 60, 70] })).toBe('the angles sum to 190°, not 180°');
    expect(refusal({ sides: [3, 10, undefined], angles: [30, undefined, undefined] })).toMatch(/no such triangle/);
    expect(refusal({ sides: [3, 4, 5], angles: [undefined, undefined, 80] })).toMatch(/C = 80° contradicts the three sides \(it would be 90°\)/);
    expect(refusal({ sides: [5, 20, undefined], angles: [30, 60, undefined] })).toMatch(/b = 20 contradicts/);
    expect(refusal({ sides: [-3, 4, 5] })).toMatch(/side a must be a positive length/);
    expect(refusal({ angles: [0, 90, undefined] })).toMatch(/angle A must lie between 0° and 180°/);
    expect(refusal({ sides: [3, 4, undefined] })).toMatch(/two sides alone/);
    expect(refusal({ sides: [3, undefined, undefined], angles: [40, undefined, undefined] })).toMatch(/one side/);
    expect(refusal({ angles: [40, undefined, undefined] })).toMatch(/not enough data/);
  });

  it('angles alone fix the shape but no length', () => {
    const t = solve({ angles: [30, 60, 90] });
    expect(t.scaleFree).toBe(true);
    expect(t.sides[0] / t.sides[2]).toBeCloseTo(0.5, 9);
  });
});

describe('triangle figure', () => {
  it('labels exactly what was given, and names the unknown side', async () => {
    const drawn = await draw('triangle', 'sides: a=7, b=10\nangles: C=40');
    expect(drawn.texts().sort()).toEqual(['40°', 'A', 'B', 'C', 'a = 7', 'b = 10', 'c']);
    expectCleanLabels(drawn);
  });

  it('show: solved adds every computed side and angle, rounded, with ≈ where the value is not exact', async () => {
    const drawn = await draw('triangle', 'sides: a=7, b=10\nangles: C=40\nshow: solved\nunit: cm');
    expect(drawn.texts().sort()).toEqual(['40°', '44.1°', '95.9°', 'A', 'B', 'C', 'a = 7 cm', 'b = 10 cm', 'c ≈ 6.46 cm']);
    expectCleanLabels(drawn);
    const exact = await draw('triangle', 'sides: a=3, b=4\nangles: C=90\nshow: solved');
    expect(exact.text('side-c-value')).toBe('c = 5');
  });

  it('is drawn to scale', async () => {
    const drawn = await draw('triangle', 'sides: a=7, b=10\nangles: C=40');
    const [a, b, c] = ['side-a', 'side-b', 'side-c'].map((id) => lengthOf(drawn.stroke(id)!.points));
    expect(a! / b!).toBeCloseTo(0.7, 6);
    expect(c! / b!).toBeCloseTo(0.6461, 3);
  });

  it('marks a right angle with a square and stands the triangle on its longer leg', async () => {
    const drawn = await draw('triangle', 'sides: a=3, b=4\nangles: C=90');
    expect(drawn.stroke('angle-C')!.points).toHaveLength(6);
    expect(drawn.texts()).not.toContain('90°');
    const [x1, y1, x2, y2] = drawn.stroke('side-b')!.points;
    expect(y1).toBeCloseTo(y2!, 6);
    expect(Math.abs(x2! - x1!)).toBeGreaterThan(lengthOf(drawn.stroke('side-a')!.points));
    // A right angle that was computed, not given, is marked only when the solution is shown.
    expect((await draw('triangle', 'sides: a=3, b=4, c=5')).stroke('angle-C')).toBeUndefined();
    expect((await draw('triangle', 'sides: a=3, b=4, c=5\nshow: solved')).stroke('angle-C')).toBeDefined();
  });

  it('type=right-triangle puts the right angle at the third vertex when none is named', async () => {
    const legs = await draw('right-triangle', 'sides: a=3, b=4\nshow: solved');
    expect(legs.text('side-c-value')).toBe('c = 5');
    expect(legs.stroke('angle-C')!.points).toHaveLength(6);
    const hypotenuse = await draw('right-triangle', 'sides: a=3, c=5\nshow: solved');
    expect(hypotenuse.text('side-b-value')).toBe('b = 4');
    expect(await reason('right-triangle', 'sides: a=3\nangles: C=30')).toMatch(/needs its right angle named/);
    // Without the alias two sides fix nothing.
    expect(await reason('triangle', 'sides: a=3, b=4')).toMatch(/two sides alone/);
  });

  it('drops an altitude to its computed foot, inside or outside the base', async () => {
    const inside = await draw('triangle', 'sides: a=5, b=6, c=7\naltitude: C\nshow: solved');
    expect(lengthOf(inside.stroke('altitude')!.points) / lengthOf(inside.stroke('side-c')!.points)).toBeCloseTo(4.199 / 7, 3);
    expect(inside.text('altitude-value')).toBe('h ≈ 4.2');
    expect(inside.stroke('altitude-base')).toBeUndefined();
    expectCleanLabels(inside);
    const outside = await draw('triangle', 'sides: a=4, b=6\nangles: C=120\naltitude: A\nshow: solved');
    expect(outside.stroke('altitude-base')).toBeDefined();
    expect(outside.text('altitude-value')).toBe('h ≈ 5.2');
    expectCleanLabels(outside);
    // From an acute vertex of a right triangle the altitude is the leg itself.
    expect((await draw('triangle', 'sides: a=3, b=4\nangles: C=90\naltitude: A')).stroke('altitude')).toBeUndefined();
    expect(await reason('triangle', 'sides: a=5, b=6, c=7\naltitude: D')).toMatch(/names no vertex/);
  });

  it('reads sloppy but unambiguous notation', async () => {
    const units = await draw('tri', 'vertices: P, Q, R\nsides: p = 5√3 cm, q = 5 cm\nangles: ∠R = 90°\nshow: solved');
    expect(units.texts()).toEqual(expect.arrayContaining(['P', 'Q', 'R', 'p = 5√3 cm', 'q = 5 cm', 'r = 10 cm', '30°', '60°']));
    const ends = await draw('triangle', 'sides: AB = 8, AC = 6\nangles: ∠BAC = π/3\nshow: solved');
    expect(ends.texts()).toEqual(expect.arrayContaining(['c = 8', 'b = 6', 'π/3', 'a ≈ 7.21']));
    const bare = await draw('triangle', 'sides: 3, 4, 5');
    expect(bare.texts()).toEqual(expect.arrayContaining(['a = 3', 'b = 4', 'c = 5']));
    const spaced = await draw('triangle', 'sides: a=3 b=4\nangles:   C  =  90 deg ');
    expect(spaced.texts()).toEqual(expect.arrayContaining(['a = 3', 'b = 4', 'c']));
    const greek = await draw('triangle', 'sides: c = 10\nangles: α = 50, β = 60\nshow: solved');
    expect(greek.texts()).toEqual(expect.arrayContaining(['50°', '60°', '70°']));
  });

  it('accents a highlighted side or angle', async () => {
    const drawn = await draw('triangle', 'sides: a=3, b=4, c=5\nshow: solved\nhighlight: c, A');
    expect(drawn.stroke('side-c')!.semanticColor).toBe('accent');
    expect(drawn.stroke('side-a')!.semanticColor).toBe('neutral');
    expect(drawn.stroke('angle-A')!.semanticColor).toBe('accent');
  });

  it.each([
    ['equilateral', 'sides: 5, 5, 5\nshow: solved'],
    ['narrow angles', 'angles: A=15, B=15\nsides: c=10\nshow: solved'],
    ['obtuse SSA', 'sides: a=7, b=10\nangles: A=30\ncase: obtuse\nshow: solved'],
    ['long labels', 'sides: a=1234.5, b=987.65, c=1500.25\nunit: furlongs\nshow: solved'],
    ['shape only', 'angles: A=30, B=60, C=90'],
    ['squat with an altitude', 'sides: a=1, b=1\nangles: C=90\naltitude: C\nshow: solved'],
  ])('%s: every label is clear of the others and inside the frame', async (_name, content) => {
    expectCleanLabels(await draw('triangle', content));
  });

  it('refuses what it cannot draw faithfully', async () => {
    expect(await reason('triangle', 'sides: a=1, b=2, c=5')).toBe('triangle: triangle inequality fails: a + b < c (1 + 2 < 5)');
    expect(await reason('triangle', 'sides: a=7, b=10\nangles: A=30')).toMatch(/ambiguous case \(SSA\)/);
    expect(await reason('triangle', 'sides: a=2, b=9\nangles: C=178')).toMatch(/too flat to draw legibly/);
    expect(await reason('triangle', 'sides: a=3, b=4, d=5')).toMatch(/d is not a side of triangle ABC/);
    expect(await reason('triangle', 'sides: 3, 4')).toMatch(/name each side/);
    expect(await reason('triangle', 'sides: a=3, a=4, c=5')).toMatch(/side a is given twice/);
    expect(await reason('triangle', 'sides: a=three, b=4, c=5')).toMatch(/side a: three is not a length/);
    expect(await reason('triangle', 'sides: a=3 cm, b=4 m, c=5 cm')).toMatch(/different units/);
    expect(await reason('triangle', 'sides: a=3, b=4, c=5\nshow: everything')).toMatch(/show: everything is not given or solved/);
    expect(await reason('triangle', 'sides: a=3, b=4, c=5\nvertices: A, A, B')).toMatch(/three distinct short names/);
    expect(await reason('triangle', 'sides: a=7, b=10\nangles: A=30\ncase: both')).toMatch(/case: both is not acute or obtuse/);
  });

  it('never throws on garbage', async () => {
    for (const content of ['sides: 1', 'angles: 1', 'sides: =,=,=', 'angles: ∠∠∠=°', 'sides: a=1e400, b=1, c=1', `sides: ${'a=1,'.repeat(400)}`]) {
      const result = await compile('triangle', content);
      expect(result.ok ? 'drawn' : result.code, content.slice(0, 30)).not.toBe('throw');
    }
  });
});
