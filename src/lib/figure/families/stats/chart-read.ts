/**
 * Reads a `chart` spec into typed data. Nothing is drawn here: this module decides what the source
 * said (which kind, which series, which numbers) and refuses what it cannot read unambiguously.
 */
import type { SpecDoc } from '../../spec';
import type { QuartileMethod } from './mathstat';
import { parseMeasured, parseNum, plain, present, readAll, readOne, refuse, rejectKeys, splitNames, splitNumbers } from './shared';

export type ChartKind = 'bar' | 'hbar' | 'grouped' | 'stacked' | 'line' | 'histogram' | 'pie' | 'donut' | 'box' | 'scatter';

const KIND_WORDS: Record<string, ChartKind> = {
  bar: 'bar', bars: 'bar', barchart: 'bar', column: 'bar', columns: 'bar', vbar: 'bar', vertical: 'bar',
  hbar: 'hbar', barh: 'hbar', horizontal: 'hbar', horizontalbar: 'hbar',
  grouped: 'grouped', groupedbar: 'grouped', clustered: 'grouped', multibar: 'grouped', sidebyside: 'grouped',
  stacked: 'stacked', stackedbar: 'stacked', stack: 'stacked',
  line: 'line', linechart: 'line', lines: 'line', timeseries: 'line',
  histogram: 'histogram', hist: 'histogram',
  pie: 'pie', piechart: 'pie',
  donut: 'donut', doughnut: 'donut', ring: 'donut',
  box: 'box', boxplot: 'box', boxandwhisker: 'box', whisker: 'box',
  scatter: 'scatter', scatterplot: 'scatter', xy: 'scatter',
};

const squash = (text: string) => text.toLowerCase().replace(/[\s_-]+/g, '');

function kindWord(text: string): ChartKind | undefined {
  const key = squash(text).replace(/(?:chart|graph|diagram)$/, '');
  return KIND_WORDS[key] ?? KIND_WORDS[key.replace(/plot$/, '')];
}

/**
 * Size limits. A step figure is about 300 x 165 units with 12-unit text; beyond these counts the marks
 * or their labels fall below what can be read, so the chart is refused with the limit named.
 */
export const LIMITS = {
  bars: 20,
  series: 6,
  groupedBars: 24,
  stackedCategories: 12,
  lineSeries: 4,
  linePoints: 30,
  slices: 10,
  bins: 30,
  boxes: 8,
  sample: 5000,
  points: 300,
} as const;

export interface Unit {
  prefix: string;
  suffix: string;
}

export interface NamedSeries {
  name: string;
  values: number[];
}

export interface Categorical {
  labels: string[];
  series: NamedSeries[];
  unit: Unit;
}

export interface Sample {
  name: string;
  values: number[];
}

export interface FiveNumber {
  name: string;
  min: number;
  q1: number;
  median: number;
  q3: number;
  max: number;
}

export interface ChartText {
  title?: string;
  xlabel?: string;
  ylabel?: string;
}

export type ChartInput = ChartText & (
  | { kind: 'bar' | 'hbar' | 'grouped' | 'stacked' | 'line' | 'pie' | 'donut'; data: Categorical; explicitKind: boolean }
  | { kind: 'histogram'; sample?: number[]; bins?: number; edges?: number[]; counts?: number[]; unit: Unit }
  | { kind: 'box'; samples: Sample[]; summaries: FiveNumber[]; method: QuartileMethod; unit: Unit }
  | { kind: 'scatter'; points: { x: number; y: number }[]; fit: boolean }
);

function numbers(raw: string, what: string, expected?: number): { values: number[]; units: Unit[] } {
  const items = splitNumbers(raw, expected);
  const values: number[] = [];
  const units: Unit[] = [];
  for (const item of items) {
    if (!item) refuse(`${what} has an empty entry`);
    const measured = parseMeasured(item);
    if (!measured) refuse(`"${item}" in ${what} is not a number`);
    values.push(measured.value);
    units.push({ prefix: measured.prefix, suffix: measured.suffix });
  }
  return { values, units };
}

/** A unit written on the numbers themselves counts only when every number carries the same one. */
function sharedUnit(units: Unit[]): Unit {
  const first = units[0];
  if (!first || units.some((unit) => unit.prefix !== first.prefix || unit.suffix !== first.suffix)) return { prefix: '', suffix: '' };
  return first;
}

function readUnit(spec: SpecDoc, written: Unit[]): Unit {
  const stated = readOne(spec, 'unit');
  if (stated === undefined) return sharedUnit(written);
  const text = plain(stated);
  if (text.length > 12) refuse(`unit "${text}" is too long to print beside a value`);
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
    const tail = words.slice(k).join(' ').replace(/^[:=|]\s*/, '');
    if (!tail) break;
    const items = splitNumbers(tail, expected);
    if (!items.every((item) => item && parseMeasured(item))) continue;
    const name = words.slice(0, k).join(' ').replace(/\s*[:=|]$/, '').replace(/^(["'])(.*)\1$/, '$2');
    if (expected === undefined || items.length === expected) return { name, ...numbers(tail, what, expected) };
    fallback ??= { name, tail };
  }
  if (fallback) return { name: fallback.name, ...numbers(fallback.tail, what, expected) };
  return refuse(`${what} "${text}" needs numbers after its name`);
}

function readCategorical(spec: SpecDoc, kind: ChartKind): Categorical {
  let labels = readAll(spec, 'labels').flatMap(splitNames);
  const valueLines = readAll(spec, 'values');
  const seriesLines = readAll(spec, 'series');
  const series: NamedSeries[] = [];
  const units: Unit[] = [];
  if (!labels.length && valueLines.length === 1 && !seriesLines.length) {
    // `values: Apples 3, Pears 5` or `values: A = 3; B = 5`: each entry names its own category.
    const pairs = splitNames(valueLines[0]!).map((item) => {
      const match = /^(.+?)\s*[:=]\s*(\S+)$/.exec(item) ?? /^(.+)\s+(\S+)$/.exec(item);
      const measured = match ? parseMeasured(match[2]!) : null;
      return match && measured && parseNum(match[1]!) === null ? { name: match[1]!.trim(), measured } : null;
    });
    if (pairs.length && pairs.every((pair) => pair)) {
      labels = pairs.map((pair) => pair!.name);
      series.push({ name: '', values: pairs.map((pair) => pair!.measured.value) });
      units.push(...pairs.map((pair) => ({ prefix: pair!.measured.prefix, suffix: pair!.measured.suffix })));
    }
  }
  if (!labels.length) refuse(`${kind} chart needs labels (the category names)`);
  if (labels.some((label) => !label)) refuse('labels has an empty name');
  if (!series.length) {
    // Several `values:` lines are one series continued when together they match the labels, else one series each.
    const continued = valueLines.length > 1 && valueLines.reduce((count, line) => count + splitNumbers(line).length, 0) === labels.length;
    const reads = valueLines.map((line) => numbers(line, 'values', continued ? undefined : labels.length));
    if (continued) series.push({ name: '', values: reads.flatMap((read) => read.values) });
    else series.push(...reads.map((read) => ({ name: '', values: read.values })));
    units.push(...reads.flatMap((read) => read.units));
    for (const line of seriesLines) {
      const read = namedNumbers(line, 'series', labels.length);
      series.push({ name: read.name, values: read.values });
      units.push(...read.units);
    }
  }
  if (!series.length) refuse(`${kind} chart needs values (one number per label)`);
  series.forEach((entry, index) => {
    if (entry.values.length !== labels.length) {
      const which = entry.name ? `series "${entry.name}"` : series.length > 1 ? `series ${index + 1}` : 'values';
      refuse(`${which} has ${entry.values.length} ${entry.values.length === 1 ? 'number' : 'numbers'} for ${labels.length} ${labels.length === 1 ? 'label' : 'labels'}`);
    }
  });
  // Unnamed series still need telling apart in the legend; an ordinal is identification, not content.
  if (series.length > 1) series.forEach((entry, index) => { if (!entry.name) entry.name = `Series ${index + 1}`; });
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
  if (/^(?:linear|line|leastsquares|regression|linearregression|ols|bestfit|lineofbestfit|trend|trendline|yes|true|on)$/.test(word)) return true;
  return refuse(`fit "${raw}" is not supported: only a linear least-squares fit is computed`);
}

function readQuartileMethod(spec: SpecDoc): QuartileMethod {
  const raw = readOne(spec, 'quartiles');
  if (raw === undefined) return 'exclusive';
  const word = squash(raw);
  if (/^(?:exclusive|exc|medianofhalves|ti83|ti84|mooremccabe)$/.test(word)) return 'exclusive';
  if (/^(?:inclusive|inc|tukey|hinges|tukeyhinges)$/.test(word)) return 'inclusive';
  if (/^(?:linear|interpolation|interpolated|r7|type7|excel|numpy)$/.test(word)) return 'linear';
  return refuse(`quartiles "${raw}" is not a known method (exclusive, inclusive, linear)`);
}

function readSummaries(spec: SpecDoc): { summaries: FiveNumber[]; units: Unit[] } {
  const units: Unit[] = [];
  const summaries = readAll(spec, 'summary').map((raw) => {
    const read = namedNumbers(raw, 'summary', 5);
    if (read.values.length !== 5) refuse(`summary "${plain(raw)}" needs five numbers: min, Q1, median, Q3, max`);
    const [min, q1, median, q3, max] = read.values as [number, number, number, number, number];
    if (!(min <= q1 && q1 <= median && median <= q3 && q3 <= max)) refuse(`summary "${plain(raw)}" is not in order (min <= Q1 <= median <= Q3 <= max)`);
    units.push(...read.units);
    return { name: read.name, min, q1, median, q3, max };
  });
  return { summaries, units };
}

function readSamples(spec: SpecDoc, keys: string[]): { samples: Sample[]; units: Unit[] } {
  const units: Unit[] = [];
  const samples = keys.flatMap((key) => readAll(spec, key)).map((raw) => {
    const read = namedNumbers(raw, 'data');
    if (read.values.length > LIMITS.sample) refuse(`a sample of ${read.values.length} values is more than the ${LIMITS.sample} this figure reads`);
    units.push(...read.units);
    return { name: read.name, values: read.values };
  });
  return { samples, units };
}

/** `0-10`, `10 to 20`, `[20, 30)`: class intervals written as histogram labels. */
function edgesFromClassLabels(labels: string[]): number[] | null {
  const edges: number[] = [];
  for (const label of labels) {
    const match = /^[[(]?\s*([+-]?[\d.,]+)\s*(?:-|to|,|\.\.)\s*([+-]?[\d.,]+)\s*[\])]?$/i.exec(plain(label).replace(/\s*-\s*/g, ' - ').replace(/^\s*-\s+(?=\d)/, '-'));
    const lo = match ? parseNum(match[1]!) : null;
    const hi = match ? parseNum(match[2]!) : null;
    if (lo === null || hi === null || !(hi > lo)) return null;
    if (edges.length && Math.abs(edges[edges.length - 1]! - lo) > 1e-9 * Math.max(1, Math.abs(lo))) return null;
    if (!edges.length) edges.push(lo);
    edges.push(hi);
  }
  return edges.length >= 2 ? edges : null;
}

function readHistogram(spec: SpecDoc, text: ChartText): ChartInput {
  rejectKeys(spec, 'a histogram', ['series', 'points', 'fit', 'summary', 'quartiles']);
  const { samples, units } = readSamples(spec, ['data']);
  if (samples.length > 1) refuse('a histogram takes one data sample (use kind: box to compare samples)');
  const sample = samples[0]?.values;
  const binsRaw = readOne(spec, 'bins');
  const bins = binsRaw === undefined ? undefined : parseNum(binsRaw);
  if (binsRaw !== undefined && (bins === null || !Number.isInteger(bins) || bins < 1 || bins > LIMITS.bins)) {
    refuse(`bins must be a whole number from 1 to ${LIMITS.bins} (got "${binsRaw}")`);
  }
  let edges = present(spec, 'edges') ? readAll(spec, 'edges').flatMap((raw) => numbers(raw, 'edges').values) : undefined;
  const valueLines = readAll(spec, 'values');
  const labels = readAll(spec, 'labels').flatMap(splitNames);
  if (labels.length) {
    if (edges) refuse('a histogram takes edges or class labels, not both');
    edges = edgesFromClassLabels(labels) ?? refuse('histogram labels must be adjoining class intervals such as 0-10, 10-20 (or give edges)');
  }
  if (edges) {
    if (bins !== undefined && bins !== null) refuse('a histogram takes bins or edges, not both');
    if (edges.length < 2 || edges.some((edge, index) => index > 0 && !(edge > edges![index - 1]!))) refuse('edges must be at least two increasing numbers');
    if (edges.length - 1 > LIMITS.bins) refuse(`${edges.length - 1} bins is more than the ${LIMITS.bins} a histogram can show legibly`);
  }
  let counts: number[] | undefined;
  if (valueLines.length) {
    if (sample) refuse('a histogram takes raw data or class frequencies (values), not both');
    if (!edges) refuse('histogram frequencies (values) need edges or class-interval labels');
    counts = valueLines.flatMap((line) => numbers(line, 'values', valueLines.length === 1 ? edges!.length - 1 : undefined).values);
    if (counts.length !== edges.length - 1) refuse(`values has ${counts.length} frequencies for ${edges.length - 1} bins`);
    if (counts.some((count) => count < 0)) refuse('a frequency cannot be negative');
  } else if (!sample) {
    refuse('a histogram needs data (the raw sample) or edges with values (the class frequencies)');
  } else if (!sample.length) {
    refuse('data is empty');
  }
  return { kind: 'histogram', sample, bins: bins ?? undefined, edges, counts, unit: readUnit(spec, units), ...text };
}

function inferKind(spec: SpecDoc): ChartKind {
  if (present(spec, 'points')) return 'scatter';
  if (present(spec, 'summary')) return 'box';
  if (present(spec, 'values') || present(spec, 'series')) {
    if (present(spec, 'edges')) return 'histogram';
    return readCount(spec, 'series') + readCount(spec, 'values') > 1 ? 'grouped' : 'bar';
  }
  if (present(spec, 'data')) return readCount(spec, 'data') > 1 ? 'box' : 'histogram';
  return refuse('chart needs labels with values, a data sample, or points');
}

function readCount(spec: SpecDoc, key: string): number {
  return (spec.values.get(key)?.length ?? 0) + (spec.lists.get(key)?.length ?? 0);
}

export function readChart(spec: SpecDoc): ChartInput {
  const kindRaw = readOne(spec, 'kind');
  // The type token is canonical (`chart`) by the time a family runs; when a caller preserves an alias
  // such as `pie` it names the kind.
  const stated = kindRaw !== undefined ? kindWord(kindRaw) : kindWord(spec.type);
  if (kindRaw !== undefined && !stated) {
    refuse(`unknown chart kind "${kindRaw}" (bar, hbar, grouped, stacked, line, histogram, pie, donut, box, scatter)`);
  }
  let kind = stated ?? inferKind(spec);
  const text: ChartText = { title: readOne(spec, 'title'), xlabel: readOne(spec, 'xlabel'), ylabel: readOne(spec, 'ylabel') };

  if (kind === 'scatter') {
    rejectKeys(spec, 'a scatter chart', ['labels', 'values', 'series', 'data', 'bins', 'edges', 'summary', 'quartiles', 'unit']);
    const points = readPoints(spec);
    if (!points.length) refuse('a scatter chart needs points (points: 1,2; 2,3.9; 3,6.1)');
    if (points.length > LIMITS.points) refuse(`${points.length} points is more than the ${LIMITS.points} a scatter chart can show legibly`);
    const fit = readFit(spec);
    if (fit && points.length < 2) refuse('a fitted line needs at least 2 points');
    return { kind, points, fit, ...text };
  }
  if (kind === 'histogram') return readHistogram(spec, text);
  if (kind === 'box') {
    rejectKeys(spec, 'a box plot', ['labels', 'values', 'points', 'fit', 'bins', 'edges']);
    const { samples, units } = readSamples(spec, ['data', 'series']);
    const read = readSummaries(spec);
    const method = readQuartileMethod(spec);
    if (!samples.length && !read.summaries.length) refuse('a box plot needs data (the raw sample) or summary (min, Q1, median, Q3, max)');
    if (samples.some((sample) => !sample.values.length)) refuse('data is empty');
    if (samples.length + read.summaries.length > LIMITS.boxes) refuse(`${samples.length + read.summaries.length} boxes is more than the ${LIMITS.boxes} a box plot can show legibly`);
    return { kind, samples, summaries: read.summaries, method, unit: readUnit(spec, [...units, ...read.units]), ...text };
  }

  rejectKeys(spec, `a ${kind} chart`, ['data', 'points', 'fit', 'bins', 'edges', 'summary', 'quartiles']);
  const data = readCategorical(spec, kind);
  const many = data.series.length > 1;
  if (kind === 'pie' || kind === 'donut') {
    if (many) refuse(`a ${kind} chart shows one series (got ${data.series.length})`);
    const values = data.series[0]!.values;
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
    if (kind === 'grouped' && data.labels.length * data.series.length > LIMITS.groupedBars) {
      refuse(`${data.labels.length * data.series.length} bars is more than the ${LIMITS.groupedBars} a grouped chart can show legibly`);
    }
    if (kind === 'stacked' && data.labels.length > LIMITS.stackedCategories) refuse(`${data.labels.length} stacks is more than the ${LIMITS.stackedCategories} a stacked chart can show legibly`);
    if (!many && data.labels.length > LIMITS.bars) refuse(`${data.labels.length} bars is more than the ${LIMITS.bars} a bar chart can show legibly`);
  }
  return { kind, data, explicitKind: kindRaw !== undefined, ...text } as ChartInput;
}
