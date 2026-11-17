import { describe, expect, it } from 'vitest';
import { boxOf, compile, draw, expectCleanLabels, reason, type Drawn } from '../cs/testing';

const chart = (content: string) => draw('chart', content);
const refused = (content: string) => reason('chart', content);
const strokeIds = (drawn: Drawn, prefix: string) => drawn.scene.strokes.map((stroke) => stroke.id).filter((id) => id.startsWith(prefix));
const labelTexts = (drawn: Drawn, prefix: string) => drawn.scene.labels.filter((label) => label.id.startsWith(prefix)).map((label) => label.text);

const SCORES = '62, 65, 67, 68, 70, 71, 71, 72, 73, 74, 74, 75, 76, 77, 78, 79, 81, 83, 85, 91';
const BUDGET = 'labels: Rent, Food, Transport, Savings, Other\nvalues: 900, 450, 200, 300, 150';

describe('chart: which kind is drawn', () => {
  it('infers the kind from the keys', async () => {
    expect(strokeIds(await chart('labels: A, B, C\nvalues: 3, 5, 2'), 'bar-')).toEqual(['bar-0', 'bar-1', 'bar-2']);
    expect(strokeIds(await chart('data: 4, 8, 15, 16, 23, 42'), 'bin-').length).toBeGreaterThan(0);
    expect(strokeIds(await chart('points: 1,2; 2,3.9'), 'point-')).toEqual(['point-0', 'point-1']);
    expect(strokeIds(await chart('labels: A, B\nseries: x 1, 2\nseries: y 3, 4'), 'bar-')).toEqual(['bar-0-0', 'bar-1-0', 'bar-0-1', 'bar-1-1']);
    expect(strokeIds(await chart('data: a 1, 2, 3\ndata: b 2, 3, 4'), 'median-')).toEqual(['median-0', 'median-1']);
  });

  it('reads the kind however it is spelled', async () => {
    for (const kind of ['Pie', 'pie chart', 'PIE-CHART', 'piechart']) expect(strokeIds(await chart(`kind: ${kind}\n${BUDGET}`), 'slice-0')).toEqual(['slice-0', 'slice-0-edge']);
    expect(strokeIds(await chart('kind: box-and-whisker plot\ndata: 1, 2, 3, 4'), 'box-0')).toContain('box-0');
    expect(strokeIds(await chart('kind: Line Graph\nlabels: a, b\nvalues: 1, 2'), 'line-')).toEqual(['line-0']);
    expect(await refused('kind: radar\nlabels: a, b\nvalues: 1, 2')).toMatch(/unknown chart kind "radar"/);
  });

  it('lets the type alias name the kind when there is no kind line', async () => {
    expect(strokeIds(await draw('pie', BUDGET), 'bar-')).toEqual([]);
    expect(strokeIds(await draw('pie', BUDGET), 'slice-').length).toBe(10);
    expect(strokeIds(await draw('donut', BUDGET), 'slice-0')).toContain('slice-0');
    expect(strokeIds(await draw('histogram', `data: ${SCORES}`), 'bin-').length).toBe(7);
    // The keys alone would make this a histogram.
    expect(strokeIds(await draw('boxplot', `data: ${SCORES}`), 'box-0')).toContain('box-0');
    expect(strokeIds(await draw('box-plot', `data: ${SCORES}`), 'bin-')).toEqual([]);
    expect(strokeIds(await draw('scatter', 'points: 1,2; 2,3'), 'point-').length).toBe(2);
    expect(strokeIds(await draw('linechart', 'labels: a, b, c\nvalues: 1, 2, 3'), 'line-')).toEqual(['line-0']);
    expect(strokeIds(await draw('barchart', 'labels: a, b, c\nvalues: 1, 2, 3'), 'bar-').length).toBe(3);
  });

  it('lets an explicit kind line win over the alias', async () => {
    const drawn = await draw('pie', `kind: bar\n${BUDGET}`);
    expect(strokeIds(drawn, 'slice-')).toEqual([]);
    expect(strokeIds(drawn, 'bar-').length).toBe(5);
  });
});

describe('chart: bars', () => {
  it('stands every bar on a zero baseline, negative bars hanging below it', async () => {
    const drawn = await chart('labels: A, B, C\nvalues: 4, -2, 0');
    const base = drawn.stroke('baseline')!.points[1]!;
    const up = boxOf(drawn.stroke('bar-0')!);
    const down = boxOf(drawn.stroke('bar-1')!);
    expect(up.y2).toBeCloseTo(base, 6);
    expect(down.y1).toBeCloseTo(base, 6);
    expect((up.y2 - up.y1) / (down.y2 - down.y1)).toBeCloseTo(2, 6);
    expect(drawn.stroke('bar-2')).toBeUndefined();
    expect(labelTexts(drawn, 'value-')).toEqual(['4', '−2', '0']);
    expect(labelTexts(drawn, 'ytickl-')).toEqual(['−2', '−1', '0', '1', '2', '3', '4']);
    expectCleanLabels(drawn);
  });

  it('starts the value axis at zero even when the values are far from it', async () => {
    const drawn = await chart('labels: a, b, c\nvalues: 410, 415, 421');
    expect(labelTexts(drawn, 'ytickl-')[0]).toBe('0');
  });

  it('uses nice tick steps', async () => {
    expect(labelTexts(await chart('labels: Mon, Tue, Wed, Thu\nvalues: 12, 19, 7, 15'), 'ytickl-')).toEqual(['0', '5', '10', '15', '20']);
    expect(labelTexts(await chart('labels: A, B, C, D\nvalues: 0.0012, 0.0031, 0.0024, 0.0008'), 'ytickl-')).toEqual(['0', '0.001', '0.002', '0.003', '0.004']);
  });

  it('prints a value on each bar only when every value fits its bar', async () => {
    expect(labelTexts(await chart('labels: Mon, Tue, Wed\nvalues: 12, 19, 7'), 'value-')).toEqual(['12', '19', '7']);
    const crowded = await chart('labels: a, b, c, d, e, f, g, h, i, j, k, l\nvalues: 12345, 23456, 34567, 45678, 12345, 23456, 34567, 45678, 12345, 23456, 34567, 45678');
    expect(labelTexts(crowded, 'value-')).toEqual([]);
    expectCleanLabels(crowded);
  });

  it('draws one bar per series in a group and a legend entry per series', async () => {
    const drawn = await chart('kind: grouped\nlabels: 2021, 2022, 2023\nseries: Boys 12, 15, 9\nseries: Girls 14, 11, 13');
    expect(labelTexts(drawn, 'legend-')).toEqual(['Boys', 'Girls']);
    expect(strokeIds(drawn, 'bar-').length).toBe(6);
    const [boys, girls] = [boxOf(drawn.stroke('bar-0-0')!), boxOf(drawn.stroke('bar-1-0')!)];
    expect(girls.x1).toBeCloseTo(boys.x2, 6);
    expect(drawn.stroke('bar-0-0')!.fill).not.toBe(drawn.stroke('bar-1-0')!.fill);
    expectCleanLabels(drawn);
  });

  it('stacks the series of a stacked chart', async () => {
    const drawn = await chart('kind: stacked\nlabels: Mon, Tue\nseries: Walk 3, 4\nseries: Cycle 2, 1\nseries: Bus 5, 6');
    const [walk, cycle, bus] = ['bar-0-0', 'bar-1-0', 'bar-2-0'].map((id) => boxOf(drawn.stroke(id)!));
    expect(cycle!.y2).toBeCloseTo(walk!.y1, 6);
    expect(bus!.y2).toBeCloseTo(cycle!.y1, 6);
    expect((walk!.y2 - walk!.y1) / (bus!.y2 - bus!.y1)).toBeCloseTo(3 / 5, 6);
    expect(await refused('kind: stacked\nlabels: a, b\nseries: x 1, -2\nseries: y 3, 4')).toMatch(/cannot stack a negative value/);
  });

  it('lays bars on their side when the names cannot go under them, keeping each title with its axis', async () => {
    const drawn = await chart('kind: bar\nlabels: Photosynthesis, Cellular respiration, Fermentation, Chemosynthesis\nvalues: 38, 36, 2, 12\nylabel: ATP yield\nxlabel: Pathway');
    const bar = boxOf(drawn.stroke('bar-0')!);
    expect(bar.x2 - bar.x1).toBeGreaterThan(bar.y2 - bar.y1);
    expect(drawn.text('xlabel')).toBe('ATP yield');
    expect(drawn.text('ylabel')).toBe('Pathway');
    expect(labelTexts(drawn, 'value-')).toEqual(['38', '36', '2', '12']);
    expectCleanLabels(drawn);
  });

  it('draws kind: hbar with negative values on both sides of zero', async () => {
    const drawn = await chart('kind: hbar\nlabels: Mercury, Mars\nvalues: 167, −65\nunit: °C');
    const zero = drawn.stroke('baseline')!.points[0]!;
    expect(boxOf(drawn.stroke('bar-0')!).x1).toBeCloseTo(zero, 6);
    expect(boxOf(drawn.stroke('bar-1')!).x2).toBeCloseTo(zero, 6);
    expect(labelTexts(drawn, 'value-')).toEqual(['167°C', '−65°C']);
    expectCleanLabels(drawn);
  });
});

describe('chart: line', () => {
  it('draws one line per series with a legend, and thins crowded category names', async () => {
    const multi = await chart('kind: line\nlabels: Jan, Feb, Mar\nseries: Lisbon 11, 12, 15\nseries: Oslo −4, −3, 1');
    expect(strokeIds(multi, 'line-')).toEqual(['line-0', 'line-1']);
    expect(multi.stroke('line-1')!.dash).toBe(true);
    expect(labelTexts(multi, 'legend-')).toEqual(['Lisbon', 'Oslo']);
    expectCleanLabels(multi);
    const hours = Array.from({ length: 24 }, (_, hour) => hour);
    const long = await chart(`kind: line\nlabels: ${hours.join(', ')}\nvalues: ${hours.map((hour) => 10 + hour % 7).join(', ')}`);
    expect(labelTexts(long, 'cat-')).toEqual(hours.filter((hour) => hour % 2 === 0).map(String));
    expect(strokeIds(long, 'xtick-').length).toBe(24);
    expectCleanLabels(long);
  });

  it('does not force a line chart down to zero', async () => {
    const drawn = await chart('kind: line\nlabels: 2018, 2019, 2020\nvalues: 410, 415, 421');
    expect(Number(labelTexts(drawn, 'ytickl-')[0])).toBeGreaterThan(400);
  });
});

describe('chart: pie and donut', () => {
  it('prints computed percentages that add up to 100', async () => {
    const drawn = await chart(`kind: pie\ntitle: Monthly budget\n${BUDGET}`);
    expect(labelTexts(drawn, 'slicel-').sort()).toEqual(['Food 23%', 'Other 7%', 'Rent 45%', 'Savings 15%', 'Transport 10%']);
    expect(drawn.text('title')).toBe('Monthly budget');
    expectCleanLabels(drawn);
    const thirds = await chart('kind: pie\nlabels: a, b, c\nvalues: 1, 1, 1');
    expect(labelTexts(thirds, 'slicel-')).toEqual(['a 34%', 'b 33%', 'c 33%']);
  });

  it('starts at 12 o\'clock and runs clockwise', async () => {
    const drawn = await chart('kind: pie\nlabels: a, b, c\nvalues: 1, 1, 2');
    const numbers = (id: string) => drawn.stroke(id)!.d!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
    // M x y A r r 0 large sweep x2 y2 L cx cy
    const [x, y, r, , , , sweep, x2, y2, cx, cy] = numbers('slice-0') as [number, number, number, number, number, number, number, number, number, number, number];
    expect(x).toBeCloseTo(cx, 1);
    expect(y).toBeCloseTo(cy - r, 1);
    expect(sweep).toBe(1);
    // A quarter turn clockwise from the top ends at 3 o'clock.
    expect(x2).toBeCloseTo(cx + r, 1);
    expect(y2).toBeCloseTo(cy, 1);
    const last = numbers('slice-2');
    expect(last[7]).toBeCloseTo(cx, 1);
    expect(last[8]).toBeCloseTo(cy - r, 1);
  });

  it('labels slivers without overlap and never prints a real slice as 0%', async () => {
    const drawn = await chart('kind: pie\nlabels: Nitrogen, Oxygen, Argon, Carbon dioxide, Neon, Helium, Methane\nvalues: 78.08, 20.95, 0.93, 0.04, 0.002, 0.0005, 0.0002');
    const texts = labelTexts(drawn, 'slicel-');
    expect(texts).toContain('Nitrogen 78.1%');
    expect(texts).toContain('Oxygen 21.0%');
    expect(texts).toContain('Argon 0.9%');
    expect(texts.join(' ')).toContain('Methane <0.1%');
    expectCleanLabels(drawn);
  });

  it('draws a whole pie for a single slice and a ring for a donut', async () => {
    const whole = await chart('kind: pie\nlabels: Passed, Failed\nvalues: 30, 0');
    expect(whole.stroke('slice-0')!.kind).toBe('circle');
    expect(whole.stroke('slice-1')).toBeUndefined();
    expect(labelTexts(whole, 'slicel-')).toEqual(['Passed 100%', 'Failed 0%']);
    const donut = await chart(`kind: donut\n${BUDGET}`);
    expect(donut.stroke('slice-0')!.d!.match(/A /g)!.length).toBe(2);
    expectCleanLabels(donut);
  });

  it('refuses what a pie cannot show', async () => {
    expect(await refused('kind: pie\nlabels: A, B\nvalues: 3, -1')).toBe('a pie chart cannot show a negative value');
    expect(await refused('kind: pie\nlabels: A, B\nvalues: 0, 0')).toBe('a pie chart needs a positive total');
    expect(await refused('kind: donut\nlabels: a, b, c, d, e, f, g, h, i\nvalues: 1, 2, 3, 4, 5, 6, 7, 8, 9')).toBe('9 slices is more than the 8 a donut chart can label legibly');
    expect(await refused('kind: pie\nlabels: a, b\nseries: x 1, 2\nseries: y 3, 4')).toMatch(/shows one series/);
  });
});

describe('chart: histogram', () => {
  it('counts the sample into round bins and names the bin edges', async () => {
    const drawn = await chart(`kind: histogram\ndata: ${SCORES}\nxlabel: Exam score`);
    expect(labelTexts(drawn, 'value-')).toEqual(['1', '3', '7', '5', '2', '1', '1']);
    expect(labelTexts(drawn, 'xtickl-')).toEqual(['60', '65', '70', '75', '80', '85', '90', '95']);
    expect(drawn.text('ylabel')).toBe('Frequency');
    expect(drawn.text('xlabel')).toBe('Exam score');
    const [first, second] = [boxOf(drawn.stroke('bin-0')!), boxOf(drawn.stroke('bin-1')!)];
    expect(second.x1).toBeCloseTo(first.x2, 6);
    expectCleanLabels(drawn);
  });

  it('honours bins and edges', async () => {
    expect(labelTexts(await chart('kind: histogram\ndata: 4, 8, 15, 16, 23, 42\nbins: 4'), 'xtickl-')).toEqual(['0', '12', '24', '36', '48']);
    const edged = await chart('kind: histogram\ndata: 1.2, 1.9, 2.4, 2.5, 2.7, 3.1, 3.3, 3.8, 4.4, 4.9\nedges: 1, 2, 3, 4, 5');
    expect(labelTexts(edged, 'value-')).toEqual(['2', '3', '3', '2']);
  });

  it('draws a given frequency table', async () => {
    const drawn = await chart('edges: 150, 160, 170, 180\nvalues: 2, 11, 7');
    expect(labelTexts(drawn, 'value-')).toEqual(['2', '11', '7']);
    expect(strokeIds(drawn, 'bin-').length).toBe(3);
  });

  it('refuses classes it cannot draw truthfully', async () => {
    expect(await refused('kind: histogram\ndata: 1, 2, 3\nedges: 0, 1, 5')).toMatch(/equally spaced/);
    expect(await refused('kind: histogram\ndata: 1, 2, 30\nedges: 0, 5, 10')).toBe('1 data value lies outside the edges');
    expect(await refused('kind: histogram\ndata: 1, 2, 3\nbins: 0')).toMatch(/bins must be a whole number from 1 to 24/);
    expect(await refused('kind: histogram\ndata: 1, 2, 3\nbins: 3\nedges: 0, 2, 4')).toBe('a histogram takes bins or edges, not both');
    expect(await refused('kind: histogram\nedges: 0, 5, 10\nvalues: 1, 2, 3')).toBe('values has 3 frequencies for 2 bins');
    expect(await refused('kind: histogram\nlabels: a, b\nvalues: 1, 2')).toBe('a histogram does not use labels');
  });
});

describe('chart: box plot', () => {
  it('prints the five-number summary of a single sample', async () => {
    const drawn = await chart('kind: box\ndata: 4, 8, 15, 16, 23, 42');
    expect(labelTexts(drawn, 'legend-')).toEqual(['min 4', 'Q1 8', 'median 15.5', 'Q3 23', 'max 42']);
    const box = boxOf(drawn.stroke('box-0')!);
    const median = drawn.stroke('median-0')!.points[0]!;
    expect(median).toBeGreaterThan(box.x1);
    expect(median).toBeLessThan(box.x2);
    // Q1 = 8, median = 15.5, Q3 = 23: the median sits exactly halfway along the box.
    expect(median - box.x1).toBeCloseTo(box.x2 - median, 6);
    expectCleanLabels(drawn);
  });

  it('marks outliers by the 1.5 IQR rule and stops the whisker short of them', async () => {
    const drawn = await chart('kind: box\ndata: 1, 2, 3, 4, 5, 6, 7, 8, 9, 30');
    expect(strokeIds(drawn, 'outlier-')).toEqual(['outlier-0-0']);
    const whisker = boxOf(drawn.stroke('whisker-hi-0')!);
    const outlier = boxOf(drawn.stroke('outlier-0-0')!);
    expect(whisker.x2).toBeLessThan(outlier.x1);
  });

  it('names several boxes and shares one axis between them', async () => {
    const drawn = await chart('kind: box\ndata: Control 310, 325, 330, 342, 350, 355, 361, 370, 388, 470\ndata: Sleep deprived 350, 372, 390, 401, 420, 433, 450, 462, 610\nunit: ms');
    expect(labelTexts(drawn, 'cat-')).toEqual(['Control', 'Sleep deprived']);
    expect(drawn.text('xlabel')).toBe('ms');
    expect(labelTexts(drawn, 'legend-')).toEqual([]);
    expect(boxOf(drawn.stroke('box-1')!).x1).toBeGreaterThan(boxOf(drawn.stroke('box-0')!).x1);
    expectCleanLabels(drawn);
  });

  it('refuses a name that could be part of the data', async () => {
    expect(await refused('kind: box\ndata: Group 1 4 8 15')).toBe('data "Group 1 4 8 15" is ambiguous: separate the numbers with commas');
    expect(labelTexts(await chart('kind: box\ndata: Group 1: 4 8 15'), 'cat-')).toEqual(['Group 1']);
    expect(labelTexts(await chart('kind: box\ndata: Group 1 4, 8, 15'), 'cat-')).toEqual(['Group 1']);
  });
});

describe('chart: scatter', () => {
  it('computes the least-squares line and prints its equation and r²', async () => {
    const drawn = await chart('kind: scatter\npoints: 1,2; 2,3.9; 3,6.1\nfit: linear');
    expect(labelTexts(drawn, 'legend-')).toEqual(['y = 2.05x − 0.1', 'r² = 0.998']);
    expect(drawn.stroke('fit')).toBeDefined();
    expectCleanLabels(drawn);
    expect((await chart('points: 1,2; 2,3.9; 3,6.1')).stroke('fit')).toBeUndefined();
  });

  it('draws the fitted line through the points of an exact line', async () => {
    const drawn = await chart('points: 0,1; 1,3; 2,5; 4,9\nfit: linear');
    expect(labelTexts(drawn, 'legend-')).toEqual(['y = 2x + 1', 'r² = 1.000']);
    const [x1, y1, x2, y2] = drawn.stroke('fit')!.points as [number, number, number, number];
    for (const id of strokeIds(drawn, 'point-')) {
      const [cx, cy] = drawn.stroke(id)!.points as [number, number];
      expect((cx - x1) * (y2 - y1) - (cy - y1) * (x2 - x1)).toBeCloseTo(0, 4);
    }
  });

  it('reads points however they are paired', async () => {
    for (const points of ['1,2; 2,3.9; 3,6.1', '(1, 2) (2, 3.9) (3, 6.1)', '[1, 2], [2, 3.9], [3, 6.1]', '1 2, 2 3.9, 3 6.1', '1 2; 2 3.9; 3 6.1;']) {
      expect(strokeIds(await chart(`points: ${points}`), 'point-').length, points).toBe(3);
    }
    expect(await refused('points: 1, 2, 3, 4')).toMatch(/x,y pairs/);
  });

  it('refuses a fit it cannot compute', async () => {
    expect(await refused('points: 1,2\nfit: linear')).toBe('a fitted line needs at least 2 points');
    expect(await refused('points: 2,1; 2,5\nfit: linear')).toBe('a fitted line needs points at two or more different x values');
    expect(await refused('points: 1,2; 2,3\nfit: quadratic')).toMatch(/only a linear least-squares fit/);
  });
});

describe('chart: units and titles', () => {
  it('prints a symbol on every number and names a unit word once, in the axis title', async () => {
    const percent = await chart('labels: A, B\nvalues: 45%, 30%');
    expect(labelTexts(percent, 'value-')).toEqual(['45%', '30%']);
    expect(labelTexts(percent, 'ytickl-').every((text) => text!.endsWith('%'))).toBe(true);
    const dollars = await chart('labels: A, B\nvalues: 5, −2\nunit: $');
    expect(labelTexts(dollars, 'value-')).toEqual(['$5', '−$2']);
    const mass = await chart('labels: A, B\nvalues: 5, 2\nunit: kg\nylabel: Mass');
    expect(mass.text('ylabel')).toBe('Mass (kg)');
    expect(labelTexts(mass, 'value-')).toEqual(['5', '2']);
    expect((await chart('labels: A, B\nvalues: 5, 2\nunit: kg\nylabel: Mass (kg)')).text('ylabel')).toBe('Mass (kg)');
    expect((await chart('labels: A, B\nvalues: 5 kg, 2 kg')).text('ylabel')).toBe('kg');
  });

  it('wraps a long title onto two lines and refuses one that still does not fit', async () => {
    const drawn = await chart('title: Average daily screen time of surveyed students by device category\nlabels: A, B\nvalues: 1, 2');
    expect(`${drawn.text('title')} ${drawn.text('title2')}`).toBe('Average daily screen time of surveyed students by device category');
    expectCleanLabels(drawn);
    expect(await refused(`title: ${'a very long title '.repeat(12)}\nlabels: A, B\nvalues: 1, 2`)).toBe('title is too long to print on two lines');
  });
});

describe('chart: tolerant reading', () => {
  it('accepts sloppy but unambiguous numbers and lists', async () => {
    expect(labelTexts(await chart('labels:  A ,B,  C ,\nvalues:  3 , 5,2,'), 'value-')).toEqual(['3', '5', '2']);
    expect(labelTexts(await chart('labels: [A, B, C]\nvalues: [3, 5, 2]'), 'value-')).toEqual(['3', '5', '2']);
    expect(labelTexts(await chart('labels: A, B, C\nvalues: 1,200, 3,400, 950'), 'value-')).toEqual(['1200', '3400', '950']);
    expect(labelTexts(await chart('labels: A, B\nvalues: −3.5, +2'), 'value-')).toEqual(['−3.5', '2']);
    expect(labelTexts(await chart('Labels: "A", \'B\'\nVALUES: 3; 5'), 'cat-')).toEqual(['A', 'B']);
    expect(labelTexts(await chart('labels: Lisbon, Portugal; Oslo, Norway\nvalues: 3, 5'), 'cat-').join(' ')).toContain('Portugal');
    expect(labelTexts(await chart('labels: a, b\nseries: Year 1 12, 15\nseries: Year 2: 9, 11'), 'legend-')).toEqual(['Year 1', 'Year 2']);
  });

  it('states exactly why it refuses', async () => {
    expect(await refused('kind: bar\nlabels: A, B, C\nvalues: 3, 5')).toBe('values has 2 numbers for 3 labels');
    expect(await refused('labels: A, B\nseries: x 1, 2\nseries: y 3')).toBe('series "y" has 1 number for 2 labels');
    expect(await refused('labels: A, B\nvalues: 3, five')).toBe('"five" in values is not a number');
    expect(await refused('labels: A, B\nvalues: 3, , 5')).toBe('values has an empty entry');
    expect(await refused('values: 3, 5')).toBe('a bar chart needs labels (the category names)');
    expect(await refused('labels: a, b, c, d, e, f, g, h, i, j, k, l, m\nvalues: 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13')).toBe('13 bars is more than the 12 a bar chart can show legibly');
    expect(await refused('labels: a, b\nseries: p 1, 2\nseries: q 1, 2\nseries: r 1, 2\nseries: s 1, 2\nseries: t 1, 2')).toBe('5 series is more than the 4 fills a chart can tell apart');
    expect(await refused('kind: scatter\npoints: 1,2; 2,3\nlabels: a, b')).toBe('a scatter chart does not use labels');
    expect(await refused('kind: bar\nkind: pie\nlabels: A\nvalues: 1')).toBe('kind is stated twice (bar, pie)');
    expect(await refused(`kind: scatter\npoints: ${Array.from({ length: 201 }, (_, i) => `${i},${i}`).join('; ')}`)).toMatch(/201 points is more than the 200/);
  });

  it('never throws on garbage', async () => {
    for (const content of ['values: 1', 'data: 1', 'points: 1', 'series: 1', 'values: NaN, Infinity\nlabels: a, b', 'data: 1e400', 'points: ;;;', 'labels: ,,,\nvalues: ,,,', 'data: x', 'data: 0, 0, 0', 'points: 0,0', 'labels: a\nvalues: 0']) {
      const result = await compile('chart', content);
      if (!result.ok) expect(`${result.code}: ${result.reason}`, content).not.toMatch(/^throw|undefined|Cannot read/);
    }
  });
});
