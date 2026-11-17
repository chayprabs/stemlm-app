import { describe, expect, it } from 'vitest';
import { draw, expectCleanLabels, reason } from '../cs/testing';

const URN = 'branch: root R 3/10 Red\nbranch: root B 7/10 Blue\nbranch: R RR 2/9 Red\nbranch: R RB 7/9 Blue\nbranch: B BR 3/9 Red\nbranch: B BB 6/9 Blue';
const products = (drawn: Awaited<ReturnType<typeof draw>>) => Object.fromEntries(
  drawn.scene.labels.filter((label) => label.id.startsWith('product-')).map((label) => [label.id.slice('product-'.length), label.text]),
);

describe('probtree: path products', () => {
  it('multiplies fractions exactly and reduces the result', async () => {
    const drawn = await draw('probtree', `${URN}\nshow: products`);
    expect(products(drawn)).toEqual({ RR: '1/15', RB: '7/30', BR: '7/30', BB: '7/15' });
    // Edge probabilities are printed as written, unreduced.
    expect(drawn.text('probability-BR')).toBe('3/9');
    expect(drawn.texts().filter((text) => text === 'Red')).toHaveLength(3);
    expectCleanLabels(drawn);
  });

  it('prints decimal products in full', async () => {
    const drawn = await draw('probtree', 'branch: root A 0.3\nbranch: root B 0.7\nbranch: A AA 0.2 A\nbranch: A AB 0.8 B\nbranch: B BA 0.25 A\nbranch: B BB 0.75 B\nshow: products');
    expect(products(drawn)).toEqual({ AA: '0.06', AB: '0.24', BA: '0.175', BB: '0.525' });
    expectCleanLabels(drawn);
  });

  it('answers in percent when every input was a percent', async () => {
    const drawn = await draw('probtree', 'branch: root D 2% Has disease\nbranch: root N 98% No disease\nbranch: D DP 95% Positive\nbranch: D DN 5% Negative\nbranch: N NP 10% Positive\nbranch: N NN 90% Negative\nshow: products');
    expect(products(drawn)).toEqual({ DP: '1.9%', DN: '0.1%', NP: '9.8%', NN: '88.2%' });
    expectCleanLabels(drawn);
  });

  it('keeps a tree of fractions exact when a branch is certain, and falls back to decimals when notations mix', async () => {
    const exact = await draw('probtree', 'branch: root A 1/4\nbranch: root B 3/4\nbranch: A AA 1 sure\nshow: products');
    expect(products(exact)).toEqual({ AA: '1/4', B: '3/4' });
    const mixed = await draw('probtree', 'branch: root A 1/3\nbranch: root B 2/3\nbranch: A AA 0.5\nbranch: A AB 0.5\nshow: products');
    expect(products(mixed)).toEqual({ AA: '0.167', AB: '0.167', B: '0.667' });
  });

  it('gives a leaf at any depth its own product and draws nothing at the leaves unless asked', async () => {
    const drawn = await draw('probtree', 'branch: root W 0.3 Win\nbranch: root L 0.7 Lose\nbranch: L LW 0.3 Win\nbranch: L LL 0.7 Lose\nshow: products');
    expect(products(drawn)).toEqual({ W: '0.3', LW: '0.21', LL: '0.49' });
    const bare = await draw('probtree', URN);
    expect(products(bare)).toEqual({});
    expect(bare.scene.strokes.some((stroke) => stroke.id.startsWith('leader-'))).toBe(false);
  });
});

describe('probtree: sum check', () => {
  it('names the node whose branches do not sum to 1', async () => {
    expect(await reason('probtree', 'branch: root R 0.3\nbranch: root B 0.6')).toBe('the branches from root sum to 0.9, not 1');
    expect(await reason('probtree', 'branch: root R 3/10\nbranch: root B 6/10')).toBe('the branches from root sum to 9/10, not 1');
    expect(await reason('probtree', `${URN.replace('7/9', '6/9')}`)).toBe('the branches from R sum to 8/9, not 1');
    expect(await reason('probtree', 'branch: root R 60%\nbranch: root B 50%')).toBe('the branches from root sum to 1.1, not 1');
  });

  it('is exact for fractions and for one-place decimals', async () => {
    expect(await reason('probtree', 'branch: root A 1/3\nbranch: root B 1/3\nbranch: root C 333/1000')).toContain('sum to 2999/3000');
    expect(await reason('probtree', 'branch: root A 0.3\nbranch: root B 0.3\nbranch: root C 0.3')).toContain('sum to 0.9');
    await draw('probtree', 'branch: root A 0.1\nbranch: root B 0.2\nbranch: root C 0.7');
  });

  it('allows decimals rounded to two or more places to miss 1 by their rounding only', async () => {
    await draw('probtree', 'branch: root A 0.33\nbranch: root B 0.33\nbranch: root C 0.33');
    await draw('probtree', 'branch: root A 0.333\nbranch: root B 0.333\nbranch: root C 0.333');
    await draw('probtree', 'branch: root A 16.7%\nbranch: root B 16.7%\nbranch: root C 16.7%\nbranch: root D 16.7%\nbranch: root E 16.7%\nbranch: root F 16.7%');
    expect(await reason('probtree', 'branch: root A 0.33\nbranch: root B 0.33\nbranch: root C 0.30')).toContain('sum to 0.96');
  });
});

describe('probtree: liberal input', () => {
  it('reads arrows, commas, p =, a leading dot, a probability before the id and any root word', async () => {
    const drawn = await draw('tree-diagram', 'branch: Start -> Win: p = 0.3\nbranch: Start -> Lose: p = 0.7\nbranch: Lose, Win2, .3, Win\nbranch: Lose 0.70 Lose2\nshow: leaf probabilities');
    expect(products(drawn)).toEqual({ Win: '0.3', Win2: '0.21', Lose2: '0.49' });
    expect(drawn.text('probability-Win2')).toBe('0.3');
    expect(drawn.text('probability-Lose2')).toBe('0.70');
    expect(drawn.stroke('root')?.kind).toBe('circle');
    expectCleanLabels(drawn);
  });

  it('names a root that is not called root, reads LaTeX fractions and list items', async () => {
    const drawn = await draw('probability-tree', 'branch:\n  - Bag Red \\frac{2}{5}\n  - Bag Green (3/5)\nshow: products');
    expect(drawn.text('node-Bag')).toBe('Bag');
    expect(products(drawn)).toEqual({ Red: '2/5', Green: '3/5' });
  });

  it('accents the whole path to a highlighted outcome', async () => {
    const drawn = await draw('probtree', `${URN}\nhighlight: BR`);
    expect(drawn.stroke('branch-BR')?.semanticColor).toBe('accent');
    expect(drawn.stroke('branch-B')?.semanticColor).toBe('accent');
    expect(drawn.stroke('branch-R')?.semanticColor).toBe('neutral');
  });

  it('keeps labels apart in a dense three-stage tree and in a tree with long labels', async () => {
    const coin = ['root H', 'root T', 'H HH', 'H HT', 'T TH', 'T TT', 'HH HHH', 'HH HHT', 'HT HTH', 'HT HTT', 'TH THH', 'TH THT', 'TT TTH', 'TT TTT']
      .map((pair) => `branch: ${pair} 0.5 ${pair.at(-1)}`).join('\n');
    const dense = await draw('probtree', `${coin}\nshow: products`);
    expect(Object.values(products(dense))).toEqual(Array(8).fill('0.125'));
    expectCleanLabels(dense);
    const long = await draw('probtree', 'branch: root D 0.02 Has the disease\nbranch: root N 0.98 Does not have it\nbranch: D DP 0.95 Tests positive\nbranch: D DN 0.05 Tests negative\nbranch: N NP 0.10 Tests positive\nbranch: N NN 0.90 Tests negative\nshow: products');
    expectCleanLabels(long);
  });
});

describe('probtree: long labels', () => {
  const lines = (drawn: Awaited<ReturnType<typeof draw>>, id: string) => [drawn.text(`node-${id}`), drawn.text(`node2-${id}`)].filter(Boolean);

  it('wraps a label too wide for its column onto two lines and keeps every word', async () => {
    const drawn = await draw('probtree', 'branch: root D 0.02 Has the disease\nbranch: root N 0.98 Does not have the disease\nbranch: D DP 0.95 Tests positive\nbranch: D DN 0.05 Tests negative\nshow: products');
    expect(lines(drawn, 'N')).toHaveLength(2);
    expect(lines(drawn, 'N').join(' ')).toBe('Does not have the disease');
    expect(lines(drawn, 'D')).toEqual(['Has the disease']);
    expect(drawn.text('probability-D')).toBe('0.02');
    expect(products(drawn)).toEqual({ DP: '0.019', DN: '0.001', N: '0.98' });
    expectCleanLabels(drawn);
  });

  it('cuts only what two lines cannot hold, and never a probability or a product', async () => {
    const label = 'Draws a red marble from the first bag and then another red marble from the second bag';
    const drawn = await draw('probtree', `branch: root R 3/10 ${label}\nbranch: root B 7/10 Blue\nshow: products`);
    const [first, second] = lines(drawn, 'R');
    expect(second!.endsWith('…')).toBe(true);
    // Whole words only: the kept text runs up to a space in the label.
    expect(label.startsWith(`${first} ${second!.slice(0, -1)} `)).toBe(true);
    expect(drawn.text('probability-R')).toBe('3/10');
    expect(products(drawn)).toEqual({ R: '3/10', B: '7/10' });
    expectCleanLabels(drawn);
  });

  it('opens up the rows of a dense tree whose leaves all wrap', async () => {
    const coin = ['root H', 'root T', 'H HH', 'H HT', 'T TH', 'T TT']
      .map((pair) => `branch: ${pair} 0.5 ${pair.endsWith('H') ? 'Lands heads up on the table' : 'Lands tails up on the table'}`).join('\n');
    const drawn = await draw('probtree', `${coin}\nshow: products`);
    expect(drawn.text('node2-HT')).toBeDefined();
    expectCleanLabels(drawn);
  });
});

describe('probtree: refusals', () => {
  const wide = Array.from({ length: 17 }, (_, i) => `branch: root n${i} 1/17`).join('\n');
  const deep = ['root a', 'a b', 'b c', 'c d', 'd e'].map((pair) => `branch: ${pair} 1`).join('\n');
  it.each([
    ['branch: root R', 'is incomplete'],
    ['branch: root R often', 'needs a probability'],
    ['branch: root R 1.3\nbranch: root B 0.2', 'needs a probability from 0 to 1'],
    ['branch: root R 5/4', 'needs a probability from 0 to 1'],
    ['branch: root R 1/0', 'needs a probability from 0 to 1'],
    ['branch: root R -0.5\nbranch: root B 1.5', 'needs a probability from 0 to 1'],
    ['branch: R R 1', 'back to itself'],
    ['branch: root A 0.5\nbranch: root B 0.5\nbranch: A X 1\nbranch: B X 1', 'X is reached by two branches'],
    ['branch: A B 1\nbranch: C D 1', 'more than one starting point (A, C)'],
    ['branch: A B 1\nbranch: B A 1', 'form a loop'],
    ['branch: root A 1\nbranch: X Y 1\nbranch: Y X 1', 'form a loop'],
    [wide, 'at most 16 outcomes'],
    [deep, 'at most 4 stages'],
    [['root a', 'a b', 'b c', 'c d'].map((pair) => `branch: ${pair} 1 an outcome label that goes on and on far past any node`).join('\n'), 'too wide to draw legibly'],
    ['branch: root A 0.5\nbranch: root B 0.5\nshow: sums', '"sums" is not one of products'],
  ])('%s', async (content, expected) => {
    expect(await reason('probtree', content)).toContain(expected);
  });
});
