import type { FamilyManifest } from '../types';

export const STATS_MANIFESTS: FamilyManifest[] = [
  {
    token: 'chart',
    aliases: ['bar', 'barchart', 'bar-chart', 'histogram', 'pie', 'piechart', 'pie-chart', 'donut', 'boxplot', 'box-plot', 'scatter', 'scatterplot', 'linechart', 'line-chart'],
    requiredAny: ['values', 'series', 'data', 'points'],
    keys: ['kind', 'labels', 'values', 'series', 'data', 'bins', 'edges', 'points', 'fit', 'title', 'xlabel', 'ylabel', 'unit'],
    subjects: ['Math', 'Physics', 'Chemistry', 'Biology'],
    grammar: 'chart: kind: bar|hbar|grouped|stacked|line|histogram|pie|donut|box|scatter | labels: A, B, C | values: 3, 5, 2 (one series) | series: <name> v1, v2, v3 (repeat: grouped, stacked, line) | data: 4, 8, 15, 16 (raw sample: histogram, box; repeat data: <name> v1, v2 … for several boxes) | bins: 6 or edges: 0, 10, 20 (histogram) | points: 1,2; 2,3.9 (scatter) | fit: linear | title: | xlabel: | ylabel: | unit: %; ticks, percentages, bin counts, quartiles, outliers and the fitted line with r² are computed',
    specimen: 'kind: bar\nlabels: Mon, Tue, Wed, Thu\nvalues: 12, 19, 7, 15\nylabel: Visitors',
  },
  {
    token: 'dist',
    aliases: ['distribution', 'normal', 'bellcurve', 'bell-curve'],
    requiredAny: ['kind', 'shade', 'mean', 'mu'],
    keys: ['kind', 'mean', 'sd', 'mu', 'sigma', 'df', 'rate', 'lambda', 'min', 'max', 'n', 'p', 'shade', 'mark', 'xlabel'],
    subjects: ['Math', 'Biology'],
    grammar: 'dist: kind: normal|t|chi2|exponential|uniform|binomial|poisson (default normal) | mean: 100 (or mu: 100) | sd: 15 | df: 12 (t, chi2) | rate: 0.5 (exponential, poisson) | min: 0 | max: 10 (uniform) | n: 10 | p: 0.3 (binomial) | shade: 85 115 or < 85 or > 115 or <= 3 or outside 85 115 | mark: 100 (repeat) | xlabel:; drawn to scale, and the shaded probability is computed and printed',
    specimen: 'mean: 100\nsd: 15\nshade: 85 115\nxlabel: IQ score',
  },
  {
    token: 'numberline',
    aliases: ['number-line', 'interval', 'inequality'],
    requiredAny: ['point', 'interval', 'ineq'],
    keys: ['range', 'point', 'interval', 'ineq'],
    subjects: ['Math'],
    grammar: 'numberline: range: -5 5 (optional) | point: 2 [open] [label] (repeat) | interval: [-3, 2) (repeat; [ ] closed end, ( ) open end, (-inf, 4] a ray) | ineq: -3 <= x < 2 (repeat; also x > 1, x <= -2 or x > 3; solved here); closed end = filled dot, open end = hollow dot; overlapping sets stack on separate rails',
    specimen: 'ineq: -3 <= x < 2\npoint: 4 open',
  },
  {
    token: 'venn',
    aliases: ['venn2', 'venn3', 'sets'],
    required: ['sets'],
    keys: ['sets', 'only', 'shade', 'universe'],
    subjects: ['Math', 'CS'],
    grammar: "venn: sets: A, B (2 or 3 names) | only: A=12, B=7, A&B=5, none=3 (what is written in each region: the sets it lies in joined by &; none = outside them all) | shade: A & B (set expression: & ∩ and, | ∪ or, - difference, ' or not = complement, parentheses; mixed operators need parentheses) | universe: U (names the bounding rectangle); exactly the regions the expression holds in are shaded",
    specimen: 'sets: A, B\nonly: A=12, B=7, A&B=5, none=3\nshade: A & B\nuniverse: U',
  },
];
