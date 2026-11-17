import { describe, expect, it } from 'vitest';
import { boxOf, draw, expectCleanLabels, reason, type Drawn } from '../cs/testing';

const PEOPLE = (rows: string[]) => rows.map((row) => `person: ${row}`).join('\n');
const THREE = `${PEOPLE([
  'I-1 male affected deceased', 'I-2 female', 'II-1 male', 'II-2 female affected', 'II-3 male', 'II-4 female', 'II-5 male affected',
  'III-1 female', 'III-2 male affected', 'III-3 unknown', 'III-4 female carrier',
])}\ncouple: I-1 I-2\nchild: I-1 I-2 II-2 II-4 II-5\nchild: II-1 II-2 III-1 III-2\nchild: II-3 II-4 III-3 III-4`;

const centre = (drawn: Drawn, id: string) => {
  const box = boxOf(drawn.stroke(id)!);
  return { x: (box.x1 + box.x2) / 2, y: (box.y1 + box.y2) / 2 };
};
/** Ids grouped by the row they are drawn on, top row first, each row left to right. */
function rows(drawn: Drawn, ids: string[]): string[][] {
  const byY = new Map<number, string[]>();
  for (const id of ids) {
    const y = Math.round(centre(drawn, id).y);
    byY.set(y, [...(byY.get(y) ?? []), id]);
  }
  return [...byY.entries()].sort((a, b) => a[0] - b[0]).map(([, row]) => row.sort((a, b) => centre(drawn, a).x - centre(drawn, b).x));
}
const horizontals = (drawn: Drawn) => drawn.scene.strokes.filter((stroke) => /^(?:couple|sibship)-/.test(stroke.id)).map((stroke) => stroke.points);
const verticals = (drawn: Drawn) => drawn.scene.strokes.filter((stroke) => /^descent-/.test(stroke.id)).map((stroke) => stroke.points);

/** No vertical descent line passes through the interior of a horizontal line it does not end on. */
function expectNoCrossings(drawn: Drawn): void {
  for (const [x, y1, , y2] of verticals(drawn)) {
    for (const [hx1, hy, hx2] of horizontals(drawn)) {
      const crosses = x! > hx1! + 0.01 && x! < hx2! - 0.01 && hy! > Math.min(y1!, y2!) + 0.01 && hy! < Math.max(y1!, y2!) - 0.01;
      expect(crosses, `descent at x=${x} crosses a line at y=${hy}`).toBe(false);
    }
  }
}

describe('pedigree: generations and layout', () => {
  it('computes generations from parentage and labels them I, II, III', async () => {
    const drawn = await draw('pedigree', THREE);
    expect(rows(drawn, ['I-1', 'I-2', 'II-1', 'II-2', 'II-3', 'II-4', 'II-5', 'III-1', 'III-2', 'III-3', 'III-4'])).toEqual([
      ['I-1', 'I-2'], ['II-1', 'II-2', 'II-3', 'II-4', 'II-5'], ['III-1', 'III-2', 'III-3', 'III-4'],
    ]);
    expect(drawn.texts()).toEqual(expect.arrayContaining(['I', 'II', 'III', 'I-1', 'III-4', 'affected', 'carrier', 'deceased']));
    for (const [numeral, id] of [['1', 'I-1'], ['2', 'II-3'], ['3', 'III-2']] as const) {
      expect(drawn.scene.labels.find((label) => label.id === `generation-${numeral}`)!.y).toBeCloseTo(centre(drawn, id).y, 6);
    }
    expectNoCrossings(drawn);
    expectCleanLabels(drawn);
  });

  it('takes generations from the lines, not from the ids', async () => {
    const drawn = await draw('pedigree', `${PEOPLE(['kid female', 'gran female', 'pa male', 'ma female', 'gramps male'])}\nchild: pa ma kid\nchild: gramps gran pa`);
    expect(rows(drawn, ['kid', 'gran', 'pa', 'ma', 'gramps'])).toEqual([['gramps', 'gran'], ['pa', 'ma'], ['kid']]);
  });

  it('draws the standard symbols', async () => {
    const drawn = await draw('pedigree', THREE);
    expect(drawn.stroke('I-1')).toMatchObject({ kind: 'rect', fill: 'ink' });
    expect(drawn.stroke('I-1-slash')?.kind).toBe('line');
    expect(drawn.stroke('I-2')).toMatchObject({ kind: 'circle', fill: 'paper' });
    expect(drawn.stroke('III-3')).toMatchObject({ kind: 'polygon', fill: 'paper' });
    expect(drawn.stroke('III-4')).toMatchObject({ kind: 'circle', fill: 'paper' });
    expect(drawn.stroke('III-4-half')).toMatchObject({ kind: 'path', fill: 'ink' });
    expect(drawn.stroke('I-2-slash')).toBeUndefined();
    expect(drawn.stroke('I-2-half')).toBeUndefined();
  });

  it('centres parents over their children and joins every child to the sibship line', async () => {
    const drawn = await draw('pedigree', `${PEOPLE(['I-1 male', 'I-2 female carrier', 'II-1 female', 'II-2 male affected', 'II-3 female carrier'])}\nchild: I-1 I-2 II-1 II-2 II-3`);
    const middle = (centre(drawn, 'I-1').x + centre(drawn, 'I-2').x) / 2;
    expect(middle).toBeCloseTo(centre(drawn, 'II-2').x, 6);
    const bar = drawn.stroke('sibship-0')!.points;
    expect(bar[0]).toBeCloseTo(centre(drawn, 'II-1').x, 6);
    expect(bar[2]).toBeCloseTo(centre(drawn, 'II-3').x, 6);
    expect(bar[1]).toBe(bar[3]);
    for (const [k, id] of ['II-1', 'II-2', 'II-3'].entries()) {
      const drop = drawn.stroke(`descent-0-${k}`)!.points;
      expect(drop[0]).toBeCloseTo(centre(drawn, id).x, 6);
      expect(drop[0]).toBe(drop[2]);
      expect(drop[1]).toBe(bar[1]);
    }
    // Only the statuses that occur are explained.
    expect(drawn.texts()).toEqual(expect.arrayContaining(['affected', 'carrier']));
    expect(drawn.texts()).not.toContain('deceased');
    expectCleanLabels(drawn);
  });

  it('stands two founding families side by side when their children marry', async () => {
    const drawn = await draw('pedigree', `${PEOPLE([
      'I-1 male', 'I-2 female carrier', 'I-3 male carrier', 'I-4 female', 'II-1 female', 'II-2 male carrier', 'II-3 female carrier', 'II-4 male',
      'III-1 male affected', 'III-2 female', 'III-3 female carrier',
    ])}\nchild: I-1 I-2 II-1 II-2\nchild: I-3 I-4 II-3 II-4\nchild: II-2 II-3 III-1 III-2 III-3`);
    expect(rows(drawn, ['I-1', 'I-2', 'I-3', 'I-4', 'II-1', 'II-2', 'II-3', 'II-4', 'III-1', 'III-2', 'III-3'])).toEqual([
      ['I-1', 'I-2', 'I-3', 'I-4'], ['II-1', 'II-2', 'II-3', 'II-4'], ['III-1', 'III-2', 'III-3'],
    ]);
    expectNoCrossings(drawn);
    expectCleanLabels(drawn);
  });

  it('moves the marrying children next to each other whatever order they were listed in', async () => {
    const drawn = await draw('pedigree', `${PEOPLE(['a male', 'b female', 'c male', 'd female', 'a1 male', 'a2 female', 'c1 male', 'c2 female', 'z unknown'])}\nchild: a b a1 a2\nchild: c d c1 c2\nchild: c2 a1 z`);
    expect(rows(drawn, ['a1', 'a2', 'c1', 'c2'])).toEqual([['a2', 'a1', 'c2', 'c1']]);
    expectNoCrossings(drawn);
  });

  it('keeps unrelated families apart and never overlaps two symbols', async () => {
    const drawn = await draw('pedigree', `${PEOPLE(['A male', 'B female', 'C male', 'D female', 'E male', 'A1 female', 'C1 male'])}\nchild: A B A1\nchild: C D C1`);
    const ids = ['A', 'B', 'C', 'D', 'E', 'A1', 'C1'];
    ids.forEach((id, i) => ids.slice(i + 1).forEach((other) => {
      const [p, q] = [centre(drawn, id), centre(drawn, other)];
      expect(Math.abs(p.x - q.x) > 20 || Math.abs(p.y - q.y) > 20, `${id} and ${other}`).toBe(true);
    }));
    expect(rows(drawn, ['A', 'B', 'C', 'D', 'E'])).toEqual([['A', 'B', 'C', 'D', 'E']]);
  });

  it('accents a highlighted person', async () => {
    const drawn = await draw('pedigree', `${THREE}\nhighlight: III-2`);
    expect(drawn.stroke('III-2')?.semanticColor).toBe('accent');
    expect(drawn.stroke('III-1')?.semanticColor).toBe('neutral');
  });

  it('draws four generations without crossing lines or touching labels', async () => {
    const drawn = await draw('pedigree', `${PEOPLE([
      'I-1 male', 'I-2 female affected', 'II-1 male affected', 'II-2 female', 'II-3 female', 'II-4 male', 'II-5 male affected', 'II-6 female',
      'III-1 male', 'III-2 female affected', 'III-3 male', 'III-4 female', 'III-5 male affected', 'III-6 female', 'III-7 male', 'IV-1 female affected', 'IV-2 male', 'IV-3 male affected',
    ])}\nchild: I-1 I-2 II-1 II-3 II-5\nchild: II-1 II-2 III-1 III-2\nchild: II-3 II-4 III-3 III-4\nchild: II-5 II-6 III-5 III-7\nchild: III-5 III-6 IV-1 IV-2 IV-3`);
    expect(drawn.texts()).toEqual(expect.arrayContaining(['I', 'II', 'III', 'IV']));
    expectNoCrossings(drawn);
    expectCleanLabels(drawn);
  });
});

describe('pedigree: liberal input', () => {
  it('reads short and spelled-out words, separators and arrows', async () => {
    const drawn = await draw('family-tree', 'person: Grandpa, M, deceased\nperson: Grandma F\nperson: Dad male carrier\nperson: Mom female carrier\nperson: Aunt Female\nperson: Me ? affected\ncouple: Grandpa x Grandma\nchild: Grandpa & Grandma -> Dad, Aunt\nchild: Mom Dad Me');
    expect(rows(drawn, ['Grandpa', 'Grandma', 'Dad', 'Mom', 'Aunt', 'Me'])).toEqual([['Grandpa', 'Grandma'], ['Mom', 'Dad', 'Aunt'], ['Me']]);
    expect(drawn.stroke('Me')).toMatchObject({ kind: 'polygon', fill: 'ink' });
    expect(drawn.stroke('Grandpa-slash')).toBeDefined();
    expectCleanLabels(drawn);
  });

  it('matches ids without regard to case and accepts a list', async () => {
    const drawn = await draw('pedigree-chart', 'person:\n  - i-1 male\n  - I-2 female\n  - II-1 male\nchild: I-1 i-2 ii-1');
    expect(rows(drawn, ['i-1', 'I-2', 'II-1'])).toEqual([['i-1', 'I-2'], ['II-1']]);
  });
});

describe('pedigree: refusals', () => {
  const pair = PEOPLE(['A male', 'B female', 'C male', 'D female']);
  it.each([
    ['couple: A B', 'missing person'],
    ['person: A', 'person A needs a sex'],
    ['person: A male tall', '"tall" is not a sex'],
    ['person: A male\nperson: a female', 'person a is declared twice'],
    [`${pair}\nchild: A B X`, 'child names X, which no person line declares'],
    [`${pair}\ncouple: A Q`, 'couple names Q, which no person line declares'],
    [`${pair}\ncouple: A`, 'needs exactly two ids'],
    [`${pair}\ncouple: A A`, 'cannot be a couple with themselves'],
    [`${pair}\nchild: A B`, 'needs two parents and at least one child'],
    [`${pair}\nchild: A B A`, 'A is listed as their own child'],
    [`${pair}\nchild: A B C\nchild: C D A`, 'A is their own ancestor'],
    [`${PEOPLE(['A male', 'B female', 'C male', 'D female', 'E male'])}\nchild: A B E\nchild: C D E`, 'E has more than two parents'],
    [`${pair}\ncouple: A B\ncouple: A D`, 'A has two partners (B and D)'],
    [`${PEOPLE(['A male', 'B female', 'C male', 'D female'])}\nchild: A B C D\ncouple: C D`, 'have the same parents'],
    [`${PEOPLE(['A male', 'B female', 'C female', 'D male'])}\nchild: A B C\ncouple: A D\ncouple: C D`, 'has two partners'],
    [`${PEOPLE(['A male', 'B female', 'C female', 'D male', 'E female'])}\nchild: A B C\nchild: C D E\ncouple: E A`, 'has two partners'],
    [`${PEOPLE(['A male', 'B female', 'C female', 'D male', 'E female', 'F male'])}\nchild: A B C\nchild: C D E\ncouple: F E\nchild: F E A`, 'is their own ancestor'],
    [`${PEOPLE(['A male', 'B female', 'C male', 'D female', 'E male', 'F female', 'k male', 'm female', 'g male', 'h female', 'n male'])}\nchild: A B k\nchild: C D m\nchild: k m g\nchild: E F n\nchild: n h g`, 'more than two parents'],
    [`${PEOPLE(['A male', 'B female', 'C male', 'D female', 'k male', 'm female', 'g male', 'P male', 'Q female', 'h female', 's male', 't female', 'u female'])}\nchild: A B k\nchild: k m g\nchild: P Q s\nchild: s t u\ncouple: g u`, 'both descend from couples in the chart'],
    [`${PEOPLE(['A male', 'B female', 'C male', 'D female', 'E male', 'F female', 'a1 male', 'a2 female', 'c1 female', 'e1 male'])}\nchild: A B a1 a2\nchild: C D c1\nchild: E F e1\ncouple: a1 c1\ncouple: a2 e1`, 'already joined to another'],
    [`${PEOPLE(['A male', 'B female', 'C female', 'D male'])}\nchild: A B C\ncouple: D B`, 'has two partners'],
    [`person: an-id-that-is-far-too-long-to-print-under-a-symbol male`, 'too long to print'],
    [PEOPLE(Array.from({ length: 41 }, (_, i) => `p${i} male`)), 'at most 40 people'],
    [PEOPLE(Array.from({ length: 20 }, (_, i) => `p${i} male`)), 'too wide'],
  ])('%s', async (content, expected) => {
    expect(await reason('pedigree', content)).toContain(expected);
  });

  it('refuses a couple that would straddle two generations', async () => {
    // An uncle and his niece: C is in generation II, E in generation III.
    const content = `${PEOPLE(['A male', 'B female', 'C male', 'D female', 'X male', 'E female'])}\nchild: A B C D\nchild: D X E\ncouple: C E`;
    expect(await reason('pedigree', content)).toContain('partners must belong to the same generation');
  });
});
