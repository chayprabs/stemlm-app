/**
 * Reads a `chart` spec into typed data. Nothing is drawn here: this module decides what the source
 * said (which kind, which series, which numbers) and refuses what it cannot read unambiguously.
 */
import type { SpecDoc } from '../../spec';
import { parseMeasured, parseNum, plain, present, readAll, readOne, refuse, rejectKeys, splitNames, splitNumbers } from './shared';

export type ChartKind = 'bar' | 'hbar' | 'grouped' | 'stacked' | 'line' | 'histogram' | 'pie' | 'donut' | 'box' | 'scatter';

const KIND_WORDS: Record<string, ChartKind> = {
  bar: 'bar', bars: 'bar', column: 'bar', columns: 'bar', vbar: 'bar', vertical: 'bar',
  hbar: 'hbar', barh: 'hbar', horizontal: 'hbar', horizontalbar: 'hbar',
  grouped: 'grouped', groupedbar: 'grouped', clustered: 'grouped', multibar: 'grouped',
  stacked: 'stacked', stackedbar: 'stacked', stack: 'stacked',
  line: 'line', lines: 'line', timeseries: 'line',
  histogram: 'histogram', hist: 'histogram',
  pie: 'pie',
  donut: 'donut', doughnut: 'donut', ring: 'donut',
  box: 'box', boxandwhisker: 'box', whisker: 'box',
  scatter: 'scatter', xy: 'scatter',
};

const squash = (text: string) => text.toLowerCase().replace(/[\s_-]+/g, '');

/** `Bar chart`, `box-plot`, `scatter_plot` and `pie` all name a kind. */
function kindWord(text: string): ChartKind | undefined {
  return KIND_WORDS[squash(text).replace(/(?:chart|graph|diagram|plot)$/, '')];
}

/**
 * Size limits. A step figure is 300 x 165 units with 12-unit text; beyond these counts the marks or
 * their labels fall below what can be read, so the chart is refused with the limit named.
 */
export const LIMITS = {
  /** Bars of one series, upright or lying. */
  bars: 12,
  /** Series of a grouped or stacked chart: one fill each that survives monochrome print. */
  series: 4,
  groupedBars: 24,
  lineSeries: 4,
  linePoints: 30,
  slices: 8,
  bins: 24,
  boxes: 6,
  sample: 5000,
  points: 200,
} as const;

/** What is printed around a value: a currency sign before it, `%` or a unit word after it. */
export interface Unit {
  prefix: string;
  suffix: string;
}

export interface Series {
  name: string;
  values: number[];
}

export interface Categorical {
  labels: string[];
  series: Series[];
  unit: Unit;
}

export interface ChartText {
  title?: string;
  xlabel?: string;
  ylabel?: string;
}

export type ChartInput = ChartText & (
  | { kind: 'bar' | 'hbar' | 'grouped' | 'stacked' | 'line' | 'pie' | 'donut'; data: Categorical }
  | { kind: 'histogram'; sample?: number[]; bins?: number; edges?: number[]; counts?: number[]; unit: Unit }
  | { kind: 'box'; samples: Series[]; unit: Unit }
  | { kind: 'scatter'; points: { x: number; y: number }[]; fit: boolean }
);

function numbers(raw: string, what: string, expected?: number): { values: number[]; units: Unit[] } {
  const values: number[] = [];
  const units: Unit[] = [];
  for (const item of splitNumbers(raw, expected)) {
    if (!item) refuse(`${what} has an empty entry`);
    const measured = parseMeasured(item);
    if (!measured) refuse(`"${item}" in ${what} is not a number`);
    values.push(measured.value);
    units.push({ prefix: measured.prefix, suffix: measured.suffix });
  }
  return { values, units };
}

/** `unit:` as stated; otherwise the unit written on the numbers, when every number carries the same one. */
function readUnit(spec: SpecDoc, written: Unit[]): Unit {
  const stated = readOne(spec, 'unit');
  if (stated === undefined) {
    const first = written[0];
    const shared = first && written.every((unit) => unit.prefix === first.prefix && unit.suffix === first.suffix);
    return shared ? first : { prefix: '', suffix: '' };
  }
  const text = plain(stated);
  if (text.length > 8) refuse(`unit "${text}" is too long to print beside a value`);
  return /^[$€£¥]$/.test(text) ? { prefix: text, suffix: '' } : { prefix: '', suffix: text };
}

/**
 * `<name> v1, v2, …`: the name is whatever precedes the shortest numeric tail of the right length, so
 * `Year 1 12, 15, 9` is the series "Year 1". A `:`, `=` or `|` after the name is punctuation.
 */
function namedNumbers(raw: string, what: string, expected?: number): { name: string; values: number[]; units: Unit[] } {
  const text = plain(raw);
  const words = text.split(/\s+/);
  let fallback: { name: string; tail: string } | undefined;
  for (let k = 0; k < words.length; k++) {
    const rest = words.slice(k).join(' ');
    const tail = rest.replace(/^[:=|]\s*/, '');
    if (!tail) break;
    const items = splitNumbers(tail, expected);
    if (!items.every((item) => item && parseMeasured(item))) continue;
    const name = words.slice(0, k).join(' ').replace(/\s*[:=|]$/, '').replace(/^(["'])(.*)\1$/, '$2');
    // "Group 1 4 8": without commas or a known length, "1" may be the end of the name or the first value.
    const separated = /[,;]/.test(tail) || tail !== rest || /[:=|]$/.test(words[k - 1] ?? '');
    if (name && expected === undefined && !separated && items.length > 1) {
      refuse(`${what} "${text}" is ambiguous: separate the numbers with commas`);
    }
    if (expected === undefined || items.length === expected) return { name, ...numbers(tail, what, expected) };
    fallback ??= { name, tail };
  }
  if (fallback) return { name: fallback.name, ...numbers(fallback.tail, what, expected) };
  return refuse(`${what} "${text}" needs numbers after its name`);
}

function readCategorical(spec: SpecDoc, kind: ChartKind): Categorical {
  const labels = readAll(spec, 'labels').flatMap(splitNames);
  if (!labels.length) refuse(`a ${kind} chart needs labels (the category names)`);
  if (labels.some((label) => !label)) refuse('labels has an empty name');
  const series: Series[] = [];
  const units: Unit[] = [];
  for (const line of readAll(spec, 'values')) {
    const read = numbers(line, 'values', labels.length);
    series.push({ name: '', values: read.values });
    units.push(...read.units);
  }
  for (const line of readAll(spec, 'series')) {
    const read = namedNumbers(line, 'series', labels.length);
    series.push({ name: read.name, values: read.values });
    units.push(...read.units);
  }
  if (!series.length) refuse(`a ${kind} chart needs values (one number per label)`);
  series.forEach((entry, index) => {
    if (entry.values.length === labels.length) return;
    const which = entry.name ? `series "${entry.name}"` : series.length > 1 ? `series ${index + 1}` : 'values';
    refuse(`${which} has ${entry.values.length} ${entry.values.length === 1 ? 'number' : 'numbers'} for ${labels.length} ${labels.length === 1 ? 'label' : 'labels'}`);
  });
  // Unnamed series still need telling apart in the legend; an ordinal is identification, not content.
  if (series.length > 1) series.forEach((entry, index) => { entry.name ||= `Series ${index + 1}`; });
  return { labels, series, unit: readUnit(spec, units) };
}

function readPoints(spec: SpecDoc): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (const raw of readAll(spec, 'points')) {
    const text = plain(raw).replace(/[,;]\s*$/, '');
    const bracketed = [...text.matchAll(/[([]\s*([^()[\]]*?)\s*[)\]]/g)].map((match) => match[1]!);
    let pairs = bracketed.length ? bracketed : text.split(';');
    if (!bracketed.length && !text.includes(';') && text.includes(',')) {
      // No `;` and no brackets: "1 2, 2 3.9" pairs by spaces and "1, 2" is one point; "1,2,2,3.9" has nothing to pair by.
      const chunks = text.split(',').map((chunk) => chunk.trim().split(/\s+/).length);
      if (chunks.every((count) => count === 2)) pairs = text.split(',');
      else if (chunks.length !== 2 || chunks.some((count) => count !== 1)) refuse('points need x,y pairs separated by ";" (points: 1,2; 2,3.9; 3,6.1)');
    }
    for (const pair of pairs) {
      const parts = pair.trim().split(/\s*,\s*|\s+/).filter(Boolean);
      const x = parts.length === 2 ? parseNum(parts[0]!) : null;
      const y = parts.length === 2 ? parseNum(parts[1]!) : null;
      if (x === null || y === null) refuse(`point "${pair.trim()}" is not an x,y pair of numbers`);
      points.push({ x, y });
    }
  }
  return points;
}

function readFit(spec: SpecDoc): boolean {
  const raw = readOne(spec, 'fit');
  if (raw === undefined) return false;
  const word = squash(raw);
  if (/^(?:none|no|false|off)$/.test(word)) return false;
  if (/^(?:linear|line|leastsquares|regression|linearregression|bestfit|lineofbestfit|trend|trendline|yes|true|on)$/.test(word)) return true;
  return refuse(`fit "${raw}" is not supported: only a linear least-squares fit is computed`);
}

function readSamples(spec: SpecDoc): { samples: Series[]; units: Unit[] } {
  const units: Unit[] = [];
  const samples = readAll(spec, 'data').map((raw) => {
    const read = namedNumbers(raw, 'data');
    if (read.values.length > LIMITS.sample) refuse(`a sample of ${read.values.length} values is more than the ${LIMITS.sample} this figure reads`);
    units.push(...read.units);
    return { name: read.name, values: read.values };
  });
  return { samples, units };
}

function readHistogram(spec: SpecDoc, text: ChartText): ChartInput {
  rejectKeys(spec, 'a histogram', ['labels', 'series', 'points', 'fit']);
  const { samples, units } = readSamples(spec);
  if (samples.length > 1) refuse('a histogram takes one data sample (use kind: box to compare samples)');
  const sample = samples[0]?.values;
  const binsRaw = readOne(spec, 'bins');
  const bins = binsRaw === undefined ? undefined : parseNum(binsRaw) ?? NaN;
  if (bins !== undefined && !(Number.isInteger(bins) && bins >= 1 && bins <= LIMITS.bins)) {
    refuse(`bins must be a whole number from 1 to ${LIMITS.bins} (got "${binsRaw}")`);
  }
  const edges = present(spec, 'edges') ? readAll(spec, 'edges').flatMap((raw) => numbers(raw, 'edges').values) : undefined;
  if (edges) {
    if (bins !== undefined) refuse('a histogram takes bins or edges, not both');
    if (edges.length < 2 || edges.some((edge, index) => index > 0 && !(edge > edges[index - 1]!))) refuse('edges must be at least two increasing numbers');
    if (edges.length - 1 > LIMITS.bins) refuse(`${edges.length - 1} bins is more than the ${LIMITS.bins} a histogram can show legibly`);
  }
  // `edges` with `values` is a frequency table: the class counts are given, not counted from a sample.
  let counts: number[] | undefined;
  if (present(spec, 'values')) {
    if (sample) refuse('a histogram takes raw data or class frequencies (values), not both');
    if (!edges) refuse('histogram frequencies (values) need edges');
    counts = readAll(spec, 'values').flatMap((line) => numbers(line, 'values').values);
    if (counts.length !== edges.length - 1) refuse(`values has ${counts.length} frequencies for ${edges.length - 1} bins`);
    if (counts.some((count) => count < 0)) refuse('a frequency cannot be negative');
  } else if (!sample?.length) {
    refuse('a histogram needs data (the raw sample)');
  }
  return { kind: 'histogram', sample, bins, edges, counts, unit: readUnit(spec, units), ...text };
}

function count(spec: SpecDoc, key: string): number {
  return (spec.values.get(key)?.length ?? 0) + (spec.lists.get(key)?.length ?? 0);
}

function inferKind(spec: SpecDoc): ChartKind {
  if (present(spec, 'points')) return 'scatter';
  if (present(spec, 'edges')) return 'histogram';
  if (present(spec, 'values') || present(spec, 'series')) return count(spec, 'series') + count(spec, 'values') > 1 ? 'grouped' : 'bar';
  if (present(spec, 'data')) return count(spec, 'data') > 1 ? 'box' : 'histogram';
  return refuse('chart needs labels with values, a data sample, or points');
}

/**
 * `alias` is the type token as written (`pie`, `boxplot`). Without a `kind:` line it names the kind, so
 * `type=pie` never comes out as the bar chart its keys alone would suggest.
 */
export function readChart(spec: SpecDoc, alias?: string): ChartInput {
  const kindRaw = readOne(spec, 'kind');
  const stated = kindWord(kindRaw ?? alias ?? '');
  if (kindRaw !== undefined && !stated) {
    refuse(`unknown chart kind "${kindRaw}" (bar, hbar, grouped, stacked, line, histogram, pie, donut, box, scatter)`);
  }
  let kind = stated ?? inferKind(spec);
  const text: ChartText = { title: readOne(spec, 'title'), xlabel: readOne(spec, 'xlabel'), ylabel: readOne(spec, 'ylabel') };

  if (kind === 'scatter') {
    rejectKeys(spec, 'a scatter chart', ['labels', 'values', 'series', 'data', 'bins', 'edges', 'unit']);
    const points = readPoints(spec);
    if (!points.length) refuse('a scatter chart needs points (points: 1,2; 2,3.9; 3,6.1)');
    if (points.length > LIMITS.points) refuse(`${points.length} points is more than the ${LIMITS.points} a scatter chart can show legibly`);
    const fit = readFit(spec);
    if (fit && points.length < 2) refuse('a fitted line needs at least 2 points');
    return { kind, points, fit, ...text };
  }
  if (kind === 'histogram') return readHistogram(spec, text);
  if (kind === 'box') {
    rejectKeys(spec, 'a box plot', ['labels', 'values', 'series', 'points', 'fit', 'bins', 'edges']);
    const { samples, units } = readSamples(spec);
    if (!samples.length || samples.some((sample) => !sample.values.length)) refuse('a box plot needs data (the raw sample)');
    if (samples.length > LIMITS.boxes) refuse(`${samples.length} boxes is more than the ${LIMITS.boxes} a box plot can show legibly`);
    return { kind, samples, unit: readUnit(spec, units), ...text };
  }

  rejectKeys(spec, `a ${kind} chart`, ['data', 'points', 'fit', 'bins', 'edges']);
  const data = readCategorical(spec, kind);
  const values = data.series.flatMap((entry) => entry.values);
  const many = data.series.length > 1;
  if (kind === 'pie' || kind === 'donut') {
    if (many) refuse(`a ${kind} chart shows one series (got ${data.series.length})`);
    if (values.length > LIMITS.slices) refuse(`${values.length} slices is more than the ${LIMITS.slices} a ${kind} chart can label legibly`);
    if (values.some((value) => value < 0)) refuse(`a ${kind} chart cannot show a negative value`);
    if (!(values.reduce((sum, value) => sum + value, 0) > 0)) refuse(`a ${kind} chart needs a positive total`);
  } else if (kind === 'line') {
    if (data.series.length > LIMITS.lineSeries) refuse(`${data.series.length} lines is more than the ${LIMITS.lineSeries} a line chart can tell apart`);
    if (data.labels.length > LIMITS.linePoints) refuse(`${data.labels.length} points per line is more than the ${LIMITS.linePoints} a line chart can show legibly`);
  } else {
    // One series is a plain bar chart whatever it was called; several need grouping or stacking.
    if (!many && (kind === 'grouped' || kind === 'stacked')) kind = 'bar';
    if (many && (kind === 'bar' || kind === 'hbar')) kind = 'grouped';
    if (data.series.length > LIMITS.series) refuse(`${data.series.length} series is more than the ${LIMITS.series} fills a chart can tell apart`);
    if (kind === 'grouped' && values.length > LIMITS.groupedBars) refuse(`${values.length} bars is more than the ${LIMITS.groupedBars} a grouped chart can show legibly`);
    if (kind !== 'grouped' && data.labels.length > LIMITS.bars) refuse(`${data.labels.length} bars is more than the ${LIMITS.bars} a ${kind} chart can show legibly`);
    if (kind === 'stacked' && values.some((value) => value < 0)) refuse('a stacked chart cannot stack a negative value');
  }
  return { kind, data, ...text };
}
