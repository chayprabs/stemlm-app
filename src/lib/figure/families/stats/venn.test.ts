import { describe, expect, it } from 'vitest';
import { samplePathD } from '../../geom';
import { compile, draw, expectCleanLabels, reason, type Drawn } from '../cs/testing';

const venn = (content: string) => draw('venn', content);
const refused = (content: string) => reason('venn', content);
/** The atomic regions that are tinted, as sorted bit masks (bit i = inside set i; 0 = outside every set). */
const shadedRegions = (drawn: Drawn) => drawn.scene.strokes.filter((stroke) => stroke.id.startsWith('region-')).map((stroke) => Number(stroke.id.slice(7))).sort((a, b) => a - b);
const shade = async (sets: string, expression: string) => shadedRegions(await venn(`sets: ${sets}\nshade: ${expression}`));

const [A, B, C] = [1, 2, 4];

describe('venn: the shade expression', () => {
  it.each([
    ['A & B', [A | B]],
    ['A ∩ B', [A | B]],
    ['A and B', [A | B]],
    ['A | B', [A, B, A | B]],
    ['A ∪ B', [A, B, A | B]],
    ['A or B', [A, B, A | B]],
    ['A - B', [A]],
    ['A \\ B', [A]],
    ['A', [A, A | B]],
    ["A'", [0, B]],
    ['not A', [0, B]],
    ["(A | B)'", [0]],
    ["A' ∩ B'", [0]],
    ["(A & B)'", [0, A, B]],
    ['(A - B) ∪ (B - A)', [A, B]],
    ["A & A'", []],
    ["A''", [A, A | B]],
    ['A ∩ B′', [A]],
  ])('two sets: %s', async (expression, regions) => {
    expect(await shade('A, B', expression)).toEqual(regions);
  });

  it.each([
    ['A & B & C', [A | B | C]],
    ['(A ∪ B) - C', [A, B, A | B]],
    ['A ∩ (B ∪ C)', [A | B, A | C, A | B | C]],
    ['(A ∩ B) ∪ C', [A | B, C, A | C, B | C, A | B | C]],
    ["A' ∩ B ∩ C'", [B]],
    ['A - B - C', [A]],
    ['A | B | C', [1, 2, 3, 4, 5, 6, 7]],
    ["(A | B | C)'", [0]],
    ['not (A or B) and C', [C]],
  ])('three sets: %s', async (expression, regions) => {
    expect(await shade('A, B, C', expression)).toEqual(regions);
  });

  it('reads set names of several words and the universe as a set', async () => {
    expect(await shade('Plays football, Plays tennis', 'Plays football and not Plays tennis')).toEqual([A]);
    expect(shadedRegions(await venn('sets: A, B\nuniverse: U\nshade: U - A'))).toEqual([0, B]);
  });

  it('refuses an expression it would have to guess at', async () => {
    expect(await refused('sets: A, B, C\nshade: A ∪ B ∩ C')).toBe('shade "A ∪ B ∩ C" mixes operators: add parentheses to say which is done first');
    expect(await refused('sets: A, B\nshade: A & D')).toBe('shade "A & D" has "D", which is not one of the sets (A, B) or an operator');
    expect(await refused('sets: A, B\nshade: (A & B')).toBe('shade "(A & B" has an unclosed parenthesis');
    expect(await refused('sets: A, B\nshade: A &')).toBe('shade "A &" is not a complete set expression');
    expect(await refused('sets: A, B\nshade: A B')).toBe('shade "A B" is not a complete set expression');
  });
});

describe('venn: drawing', () => {
  it('tints each shaded atomic region with its own closed path of arcs', async () => {
    const drawn = await venn('sets: A, B\nshade: A & B');
    const lens = drawn.stroke('region-3')!;
    expect(lens.fill).toBe('tint');
    expect(lens.d!.match(/A /g)!.length).toBe(2);
    expect(lens.d!.trim().endsWith('Z')).toBe(true);
    // The lens lies between the two centres and inside both circles.
    const [a, b] = [drawn.stroke('set-0')!.points, drawn.stroke('set-1')!.points] as [number[], number[]];
    for (const segment of samplePathD(lens.d!)) {
      expect(Math.hypot(segment.x1 - a[0]!, segment.y1 - a[1]!)).toBeLessThanOrEqual(a[2]! + 0.05);
      expect(Math.hypot(segment.x1 - b[0]!, segment.y1 - b[1]!)).toBeLessThanOrEqual(b[2]! + 0.05);
    }
  });

  it('shades a crescent with a path that never enters the other circle', async () => {
    const drawn = await venn('sets: A, B, C\nshade: A - B - C');
    const circles = ['set-0', 'set-1', 'set-2'].map((id) => drawn.stroke(id)!.points as [number, number, number]);
    for (const segment of samplePathD(drawn.stroke('region-1')!.d!)) {
      expect(Math.hypot(segment.x1 - circles[0]![0], segment.y1 - circles[0]![1])).toBeLessThanOrEqual(circles[0]![2] + 0.05);
      expect(Math.hypot(segment.x1 - circles[1]![0], segment.y1 - circles[1]![1])).toBeGreaterThanOrEqual(circles[1]![2] - 0.05);
      expect(Math.hypot(segment.x1 - circles[2]![0], segment.y1 - circles[2]![1])).toBeGreaterThanOrEqual(circles[2]![2] - 0.05);
    }
  });

  it('writes each value inside its own region', async () => {
    const drawn = await venn('sets: A, B, C\nonly: A=8, B=6, C=9, A&B=3, A&C=4, B&C=2, A&B&C=1, none=7\nuniverse: ξ');
    const circles = ['set-0', 'set-1', 'set-2'].map((id) => drawn.stroke(id)!.points as [number, number, number]);
    const regionOf = (x: number, y: number) => circles.reduce((mask, [cx, cy, r], i) => (Math.hypot(x - cx, y - cy) < r ? mask | (1 << i) : mask), 0);
    const expected: Record<number, string> = { 1: '8', 2: '6', 4: '9', 3: '3', 5: '4', 6: '2', 7: '1', 0: '7' };
    for (const [region, text] of Object.entries(expected)) {
      const placed = drawn.placed.find((item) => item.label.id === `value-${region}`)!;
      expect(placed.label.text).toBe(text);
      // All four corners of the text lie in the region the value belongs to.
      for (const [x, y] of [[placed.box.x1, placed.box.y1], [placed.box.x2, placed.box.y1], [placed.box.x1, placed.box.y2], [placed.box.x2, placed.box.y2]] as const) {
        expect(regionOf(x, y), `value-${region}`).toBe(Number(region));
      }
    }
    expect(drawn.text('universe-name')).toBe('ξ');
    expect(drawn.stroke('universe')).toBeDefined();
    expect(['name-0', 'name-1', 'name-2'].map((id) => drawn.text(id))).toEqual(['A', 'B', 'C']);
    expectCleanLabels(drawn);
  });

  it('draws the rectangle only when the universe is named or the outside is used', async () => {
    expect((await venn('sets: A, B')).stroke('universe')).toBeUndefined();
    expect((await venn('sets: A, B\nshade: A & B')).stroke('universe')).toBeUndefined();
    expect((await venn("sets: A, B\nshade: A'")).stroke('universe')).toBeDefined();
    expect((await venn('sets: A, B\nonly: none=3')).stroke('universe')).toBeDefined();
    expect((await venn('sets: A, B\nuniverse: U')).stroke('universe')).toBeDefined();
  });

  it('cuts the circles out of a shaded outside', async () => {
    const drawn = await venn("sets: A, B\nshade: (A | B)'");
    const d = drawn.stroke('region-0')!.d!;
    // The rectangle, then the union of the circles traced the other way round (sweep flag 0).
    expect(d.startsWith('M ')).toBe(true);
    expect(d.match(/Z/g)!.length).toBe(2);
    expect(d.match(/A \d+ \d+ 0 [01] 0 /g)!.length).toBe(2);
  });

  it('accepts other spellings of regions and lists', async () => {
    const drawn = await venn('sets: [A, B]\nonly: A only = 12; B: 7, A ∩ B = 5\nonly: neither = 3');
    expect(['value-1', 'value-2', 'value-3', 'value-0'].map((id) => drawn.text(id))).toEqual(['12', '7', '5', '3']);
    const words = await venn('sets: Cats, Dogs\nonly: cats and dogs = 4');
    expect(words.text('value-3')).toBe('4');
    expectCleanLabels(drawn);
  });

  it('wraps long set names and keeps every label clear', async () => {
    const drawn = await venn('sets: Plays football, Plays tennis, Swims regularly\nonly: Plays football=14, Plays tennis=9, Plays football & Plays tennis=4\nshade: Plays football and not Swims regularly\nuniverse: Class 9B');
    expect(shadedRegions(drawn)).toEqual([A, A | B]);
    expectCleanLabels(drawn);
  });

  it('refuses with the reason', async () => {
    expect(await refused('sets: A, B, C, D')).toBe('a Venn diagram of 4 sets cannot be drawn faithfully with circles; at most 3 sets are drawn');
    expect(await refused('sets: A')).toBe('a Venn diagram needs 2 or 3 sets (sets: A, B)');
    expect(await refused('sets: A, a')).toBe('sets names the same set twice');
    expect(await refused('sets: A, B\nonly: C=3')).toBe('only "C=3" names "C", which is not one of the sets (A, B)');
    expect(await refused('sets: A, B\nonly: A=3, A=4')).toBe('only states the region A twice');
    expect(await refused('sets: A, B\nonly: A')).toMatch(/needs a region and what to write in it/);
    expect(await refused('sets: A, B, C\nonly: A&B&C=a very long description')).toBe('"a very long description" does not fit in the region A&B&C');
    expect(await refused(`sets: ${'Very long set name '.repeat(6)}, B`)).toMatch(/is too long to print/);
  });

  it('never throws on garbage', async () => {
    for (const content of ['sets: 1', 'sets: ,', 'sets: A, B\nshade: ((((', 'sets: A, B\nshade: \'\'\'', 'sets: A, B\nonly: ===', 'sets: A, B\nshade: A & & B', 'sets: (, )\nshade: (', 'sets: A, B\nuniverse: A\nshade: A']) {
      const result = await compile('venn', content);
      if (!result.ok) expect(`${result.code}: ${result.reason}`, content).not.toMatch(/^throw|undefined|Cannot read/);
    }
  });
});
