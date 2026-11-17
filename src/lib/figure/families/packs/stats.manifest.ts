import type { FamilyManifest } from '../types';

export const STATS_MANIFESTS: FamilyManifest[] = [
  {
    token: 'chart',
    aliases: ['bar', 'barchart', 'bar-chart', 'histogram', 'pie', 'piechart', 'pie-chart', 'donut', 'boxplot', 'box-plot', 'scatter', 'scatterplot', 'linechart', 'line-chart'],
    requiredAny: ['values', 'series', 'data', 'points'],
    keys: ['kind', 'labels', 'values', 'series', 'data', 'bins', 'edges', 'points', 'fit', 'title', 'xlabel', 'ylabel', 'unit'],
    subjects: ['Math', 'Physics', 'Chemistry', 'Biology'],
    grammar: 'chart: a statistics chart. kind: bar|hbar|grouped|stacked|line|histogram|pie|donut|box|scatter | labels: A, B, C | values: 3, 5, 2 (one series) | series: <name> 3, 5, 2 (repeat: grouped, stacked, line) | data: 4, 8, 15, 16 (raw values: histogram, box; repeat data: <name> 4, 8 … for several boxes) | bins: 6 or edges: 0, 10, 20 (histogram) | points: 1,2; 2,3.9 (scatter) | fit: linear | title: | xlabel: | ylabel: | unit: %. Ticks, percentages, bin counts, quartiles, outliers and the fitted line with r² are worked out',
    specimen: 'kind: bar\nlabels: Mon, Tue, Wed, Thu\nvalues: 12, 19, 7, 15\nylabel: Visitors',
  },
  {
    token: 'dist',
    aliases: ['distribution', 'normal', 'bellcurve', 'bell-curve'],
    requiredAny: ['kind', 'shade', 'mean', 'mu'],
    keys: ['kind', 'mean', 'sd', 'mu', 'sigma', 'df', 'rate', 'lambda', 'min', 'max', 'n', 'p', 'shade', 'mark', 'xlabel'],
    subjects: ['Math', 'Biology'],
    grammar: 'dist: a probability distribution with a shaded region. kind: normal|t|chi2|exponential|uniform|binomial|poisson (normal if left out) | mean: 100 (or mu:) | sd: 15 (or sigma:) | df: 12 (t, chi2) | rate: 0.5 (or lambda:; exponential, poisson) | min: 0 | max: 10 (uniform) | n: 10 | p: 0.3 (binomial) | shade: 85 115 or < 85 or > 115 or outside 85 115 | mark: 100 (repeat) | xlabel:. The shaded probability is worked out and printed',
    specimen: 'mean: 100\nsd: 15\nshade: 85 115\nxlabel: IQ score',
  },
  {
    token: 'numberline',
    aliases: ['number-line', 'interval', 'inequality'],
    requiredAny: ['point', 'interval', 'ineq'],
    keys: ['range', 'point', 'interval', 'ineq'],
    subjects: ['Math'],
    grammar: 'numberline: points, intervals and inequalities on a number line. range: -5 5 | point: 2 [open] [label] (repeat) | interval: [-3, 2) (repeat; [ ] closed end, ( ) open end, (-inf, 4] a ray) | ineq: -3 <= x < 2 (repeat; also x > 1, or x <= -2 or x > 3). Inequalities are solved here',
    specimen: 'ineq: -3 <= x < 2\npoint: 4 open',
  },
  {
    token: 'venn',
    aliases: ['venn2', 'venn3', 'sets'],
    required: ['sets'],
    keys: ['sets', 'only', 'shade', 'universe'],
    subjects: ['Math', 'CS'],
    grammar: "venn: a Venn diagram of two or three sets. sets: A, B | only: A=12, B=7, A&B=5, none=3 (the number written in each region; none is outside every set) | shade: A & B (a set expression: & for and, | for or, - for difference, ' for complement, with brackets) | universe: U. The regions the expression covers are shaded",
    specimen: 'sets: A, B\nonly: A=12, B=7, A&B=5, none=3\nshade: A & B\nuniverse: U',
  },
];
