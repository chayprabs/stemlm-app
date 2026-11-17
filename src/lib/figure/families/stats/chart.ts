/**
 * `chart`: statistical charts drawn from the data itself.
 *
 *   kind:   bar | hbar | grouped | stacked | line | histogram | pie | donut | box | scatter
 *           (optional: a type alias such as `pie` or `boxplot` names the kind; otherwise labels + values
 *           is a bar chart, data alone a histogram, points a scatter)
 *   labels: A, B, C                 category names
 *   values: 3, 5, 2                 one series
 *   series: <name> v1, v2, v3       repeatable; grouped, stacked and line charts
 *   data:   4, 8, 15, 16, 23, 42    raw sample (histogram, box); `data: <name> v1, …` repeats for several boxes
 *   bins: 6 | edges: 0, 10, 20      histogram classes (edges + values is a given frequency table)
 *   points: 1,2; 2,3.9; 3,6.1       scatter
 *   fit: linear                     least-squares line with its equation and r², computed here
 *   title: | xlabel: | ylabel: | unit: %
 *
 * Everything derived is computed, never read from the spec: tick positions, percentages, bin counts,
 * quartiles and outliers, the regression line. Every label is placed by this module and the figure is
 * refused when one does not fit; nothing is shrunk, clipped or dropped to make room.
 */
import type { CompileCtx, CompileResult, SceneStroke, SemanticColor } from '../../types';
import { SceneBuilder, frameSize } from '../../scene-build';
import { LIMITS, readChart, type ChartInput, type Unit } from './chart-read';
import { boxSummary, countIntoEdges, histogramBins, linearFit, percentages } from './mathstat';
import { EDGE, LINE, TEXT_H, decimalsOf, finish, fmt, fmtFixed, guard, niceScale, put, putLeft, putRight, refuse, textW, wrapText, type Scale } from './shared';

const MIN_PLOT_H = 64;
/** Room for a value label between a bar end and whatever lies beyond it. */
const VALUE_ROOM = LINE + 2;

type Categorical = Extract<ChartInput, { kind: 'bar' | 'hbar' | 'grouped' | 'stacked' | 'line' | 'pie' | 'donut' }>;

interface Fill {
  color: SemanticColor;
  fill: SceneStroke['fill'];
  pattern?: SceneStroke['pattern'];
}

/**
 * Series identity inside the figure vocabulary. The order keeps neighbours apart in grey as well as in
 * colour (solid, wash, hatch, open, dots), so a chart still reads in monochrome print.
 */
const FILLS: readonly Fill[] = [
  { color: 'accent', fill: 'ink' },
  { color: 'accent', fill: 'tint' },
  { color: 'neutral', fill: 'none', pattern: 'hatch' },
  { color: 'neutral', fill: 'paper' },
  { color: 'neutral', fill: 'none', pattern: 'dots' },
];

/** Line identity: colour pairs with marker shape, a dashed line with an open marker. */
const LINES = [
  { color: 'accent', dash: false },
  { color: 'neutral', dash: true },
  { color: 'neutral', dash: false },
  { color: 'accent', dash: true },
] as const;

/**
 * A symbol (`%`, `$`, `°C`) is printed on every number of its quantity. A unit word (`kg`) is named once,
 * in that quantity's axis title, as a textbook axis does.
 */
function onNumbers(unit: Unit): Unit {
  return /^[A-Za-zµμ]/.test(unit.suffix) ? { prefix: '', suffix: '' } : unit;
}

function titled(title: string | undefined, unit: Unit): string | undefined {
  if (onNumbers(unit) === unit) return title;
  if (!title) return unit.suffix;
  return title.split(/[\s()[\],;:]+/).includes(unit.suffix) ? title : `${title} (${unit.suffix})`;
}

function withUnit(text: string, unit: Unit): string {
  return unit.prefix && text.startsWith('−') ? `−${unit.prefix}${text.slice(1)}${unit.suffix}` : `${unit.prefix}${text}${unit.suffix}`;
}

function oneLine(text: string, width: number, what: string): string {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (textW(clean) > width) refuse(`${what} "${clean}" is too long to print on one line`);
  return clean;
}

/** A frame with the title set at its top; `top` is where the chart may start. */
function begin(ctx: CompileCtx, title: string | undefined): { b: SceneBuilder; top: number } {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('chart', w, h);
  if (!title) return { b, top: EDGE };
  const lines = wrapText(title, w - 2 * EDGE - 8) ?? refuse('title is too long to print on two lines');
  lines.forEach((line, i) => put(b, i ? `title${i + 1}` : 'title', line, w / 2, EDGE + i * LINE + TEXT_H / 2));
  return { b, top: EDGE + lines.length * LINE + 2 };
}

interface Swatch {
  width: number;
  draw: (b: SceneBuilder, id: string, x: number, cy: number) => void;
}

interface LegendItem {
  text: string;
  swatch?: Swatch;
}

/** Rows of entries, each row centred: a swatch (when the entry has one), then its text. Returns the y below the rows. */
function drawLegend(b: SceneBuilder, items: LegendItem[], top: number): number {
  const room = b.width - 2 * EDGE - 4;
  const lead = (item: LegendItem) => (item.swatch ? item.swatch.width + 4 : 0);
  const widths = items.map((item) => lead(item) + textW(item.text));
  const rows: number[][] = [[]];
  let used = 0;
  items.forEach((item, index) => {
    if (widths[index]! > room) refuse(`"${item.text}" is too long to print`);
    if (used && used + 12 + widths[index]! > room) {
      rows.push([]);
      used = 0;
    }
    rows[rows.length - 1]!.push(index);
    used += (used ? 12 : 0) + widths[index]!;
  });
  rows.forEach((row, r) => {
    const total = row.reduce((sum, index) => sum + widths[index]!, 0) + 12 * (row.length - 1);
    let x = (b.width - total) / 2;
    const cy = top + r * LINE + TEXT_H / 2;
    for (const index of row) {
      const item = items[index]!;
      item.swatch?.draw(b, `legend-swatch-${index}`, x, cy);
      putLeft(b, `legend-${index}`, item.text, x + lead(item), cy);
      x += widths[index]! + 12;
    }
  });
  return top + rows.length * LINE + 2;
}

function fillSwatch(style: Fill): Swatch {
  return { width: 10, draw: (b, id, x, cy) => b.rect(id, x, cy - 5, 10, 10, { ...style, width: 1.2, role: 'annotation' }) };
}

function marker(b: SceneBuilder, id: string, x: number, y: number, style: typeof LINES[number]): void {
  const fill = style.dash ? 'paper' : 'ink';
  if (style.color === 'accent') b.circle(id, x, y, 2.4, { color: style.color, fill, width: 1.2, role: 'geometry' });
  else b.rect(id, x - 2.2, y - 2.2, 4.4, 4.4, { color: style.color, fill, width: 1.2, role: 'geometry' });
}

function lineSwatch(style: typeof LINES[number], withMarker: boolean): Swatch {
  return {
    width: 18,
    draw: (b, id, x, cy) => {
      b.line(id, x, cy, x + 18, cy, { color: style.color, dash: style.dash, width: 1.6, role: 'annotation' });
      if (withMarker) marker(b, `${id}-mark`, x + 9, cy, style);
    },
  };
}

interface Area {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

const along = (scale: Scale, value: number, from: number, to: number) => from + ((value - scale.lo) / (scale.hi - scale.lo)) * (to - from);

function unitTexts(scale: Scale, unit: Unit): string[] {
  return scale.texts.map((text) => withUnit(text, unit));
}

/** As many labelled ticks as a vertical axis of this height can carry. */
function scaleY(lo: number, hi: number, height: number, integer = false): Scale {
  return niceScale(lo, hi, Math.floor(height / (TEXT_H + 3)) + 1, { integer });
}

function drawYAxis(b: SceneBuilder, area: Area, scale: Scale, texts: string[]): void {
  b.line('yaxis', area.x0, area.y0, area.x0, area.y1, { role: 'axis', width: 1.2, protected: true });
  scale.ticks.forEach((tick, i) => {
    const y = along(scale, tick, area.y1, area.y0);
    b.line(`ytick-${i}`, area.x0 - 3, y, area.x0, y, { role: 'axis', width: 1, protected: true });
    putRight(b, `ytickl-${i}`, texts[i]!, area.x0 - 6, y);
  });
}

interface ScaleX {
  scale: Scale;
  texts: string[];
  x0: number;
  x1: number;
}

/**
 * A horizontal numeric scale between `minX0` and `maxX1` with as many ticks as print side by side. A
 * tick label may be centred on either axis end, so the ends move in to keep it in the frame. With
 * `expand` the axis runs between round numbers; without, exactly from `lo` to `hi`.
 */
function scaleX(b: SceneBuilder, lo: number, hi: number, minX0: number, maxX1: number, unit: Unit, expand = true): ScaleX {
  for (let maxTicks = 9; maxTicks >= 2; maxTicks--) {
    const scale = niceScale(lo, hi, maxTicks, { expand });
    const texts = unitTexts(scale, unit);
    const x0 = Math.max(minX0, EDGE + textW(texts[0]!) / 2);
    const x1 = Math.min(maxX1, b.width - EDGE - textW(texts[texts.length - 1]!) / 2);
    const pitch = (scale.step / (scale.hi - scale.lo)) * (x1 - x0);
    if (texts.every((text, i) => i === 0 || (textW(text) + textW(texts[i - 1]!)) / 2 + 5 <= pitch)) return { scale, texts, x0, x1 };
  }
  return refuse('the axis numbers are too long to print side by side');
}

/** The x axis under `area` with its tick labels `drop` below it; returns the y below the labels. */
function drawXAxis(b: SceneBuilder, area: Area, axis: ScaleX, drop: number): number {
  b.line('xaxis', area.x0, area.y1, area.x1, area.y1, { role: 'axis', width: 1.2, protected: true });
  axis.scale.ticks.forEach((tick, i) => {
    const x = along(axis.scale, tick, area.x0, area.x1);
    b.line(`xtick-${i}`, x, area.y1, x, area.y1 + 3, { role: 'axis', width: 1, protected: true });
    put(b, `xtickl-${i}`, axis.texts[i]!, x, area.y1 + drop + TEXT_H / 2);
  });
  return area.y1 + drop + TEXT_H;
}

/** Tick labels sit this far under an x axis: clear of the lowest y tick label at the shared corner. */
const CORNER_DROP = 8;

/** The axis title under the tick row, and the frame closed below it. */
function closeBelow(b: SceneBuilder, area: Area, below: number, xlabel: string | undefined): void {
  if (xlabel) {
    const text = oneLine(xlabel, b.width - 2 * EDGE, 'xlabel');
    const half = textW(text) / 2;
    // Centred under the axis, unless that would push a long title out of the frame.
    put(b, 'xlabel', text, Math.min(Math.max((area.x0 + area.x1) / 2, EDGE + half), b.width - EDGE - half), below + 2 + TEXT_H / 2);
  }
  b.height = below + (xlabel ? LINE + 1 : 0) + EDGE;
}

/** The value-axis title, set on its own line above the axis; returns the y below it. */
function titleAbove(b: SceneBuilder, ylabel: string | undefined, top: number): number {
  if (!ylabel) return top;
  putLeft(b, 'ylabel', oneLine(ylabel, b.width - 2 * EDGE, 'ylabel'), EDGE, top + TEXT_H / 2);
  return top + LINE;
}

/** A zero-inclusive range when the data stays near zero, as a reader expects of an axis; else the data range. */
function looseRange(values: number[]): { lo: number; hi: number } {
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  if (lo >= 0 && lo <= hi / 2) return { lo: 0, hi };
  if (hi <= 0 && hi >= lo / 2) return { lo, hi: 0 };
  return { lo, hi };
}

/** A scatter axis: `looseRange`, with a little air below a lowest value that is not zero so that no point sits on the other axis. */
function scatterRange(values: number[]): { lo: number; hi: number } {
  const { lo, hi } = looseRange(values);
  return { lo: lo === 0 || lo < Math.min(...values) ? lo : lo - (hi - lo) * 0.04, hi };
}

/** Bars, grouped bars, stacked bars and lines over named categories. Null when the category names cannot go under their columns. */
function drawColumns(input: Categorical, ctx: CompileCtx): CompileResult | null {
  const { labels, series } = input.data;
  const unit = onNumbers(input.data.unit);
  const line = input.kind === 'line';
  const stacked = input.kind === 'stacked';
  const n = labels.length;
  const m = series.length;
  const { b, top: headTop } = begin(ctx, input.title);
  let top = headTop;
  if (m > 1) {
    top = drawLegend(b, series.map((entry, s) => ({ text: entry.name, swatch: line ? lineSwatch(LINES[s]!, n <= 16) : fillSwatch(FILLS[s]!) })), top);
  }
  top = titleAbove(b, titled(input.ylabel, input.data.unit), top);

  const extremes = stacked ? labels.map((_, i) => series.reduce((sum, entry) => sum + entry.values[i]!, 0)) : series.flatMap((entry) => entry.values);
  const range = line ? looseRange(extremes) : { lo: Math.min(0, ...extremes), hi: Math.max(0, ...extremes) };
  const valueTexts = series.map((entry) => entry.values.map((value) => withUnit(fmt(value), unit)));
  const nominal = b.height;

  const plan = (catLines: number, valueRoom: boolean) => {
    const below = EDGE + (input.xlabel ? LINE + 1 : 0) + catLines * LINE + 4;
    const y0 = top + (valueRoom && range.hi > 0 ? VALUE_ROOM : TEXT_H / 2 + 1);
    const footroom = valueRoom && range.lo < 0 ? VALUE_ROOM : 0;
    const height = Math.max(nominal, y0 + MIN_PLOT_H + footroom + below);
    const y1 = height - below - footroom;
    const scale = scaleY(range.lo, range.hi, y1 - y0);
    const texts = unitTexts(scale, unit);
    const x0 = EDGE + Math.max(...texts.map((text) => textW(text))) + 6;
    const x1 = b.width - EDGE - 2;
    return { area: { x0, x1, y0, y1 }, scale, texts, slot: (x1 - x0) / n, catTop: y1 + footroom + 4, height };
  };
  type Plan = ReturnType<typeof plan>;

  /** Every name under its own column, on `catLines` lines; a line chart may instead name every k-th point. */
  const names = (p: Plan, catLines: number): (string[] | null)[] | null => {
    if (line) {
      for (let k = 1; k <= n; k++) {
        // Each name that is printed clears the next printed name and stays inside the frame.
        const fits = labels.every((label, i) => i % k !== 0
          || (textW(label) + 6 <= k * p.slot && Math.abs(p.area.x0 + p.slot * (i + 0.5) - b.width / 2) + textW(label) / 2 <= b.width / 2 - EDGE));
        if (fits) return labels.map((label, i) => (i % k === 0 ? [label] : null));
      }
      return null;
    }
    const wrapped = labels.map((label) => wrapText(label, p.slot - 4, catLines));
    return wrapped.every((lines) => lines) ? wrapped : null;
  };

  let chosen: { p: Plan; cats: (string[] | null)[]; values: boolean } | undefined;
  for (const valueRoom of line || stacked ? [false] : [true, false]) {
    for (const catLines of [1, 2]) {
      const p = plan(catLines, valueRoom);
      const cats = names(p, catLines);
      if (!cats) continue;
      const barSlot = m > 1 ? Math.min(p.slot * 0.8, m * 22) / m : p.slot;
      // A number over one of several bars needs air on both sides to read as that bar's.
      if (valueRoom && !valueTexts.flat().every((text) => textW(text) + (m > 1 ? 6 : 2) <= barSlot)) break;
      chosen = { p, cats, values: valueRoom };
      break;
    }
    if (chosen) break;
  }
  if (!chosen) return null;
  const { area, scale, texts, slot, catTop } = chosen.p;

  const yAt = (value: number) => along(scale, value, area.y1, area.y0);
  const centre = (i: number) => area.x0 + slot * (i + 0.5);
  drawYAxis(b, area, scale, texts);

  if (line) {
    b.line('xaxis', area.x0, area.y1, area.x1, area.y1, { role: 'axis', width: 1.2, protected: true });
    labels.forEach((_, i) => b.line(`xtick-${i}`, centre(i), area.y1, centre(i), area.y1 + 3, { role: 'axis', width: 1, protected: true }));
    if (scale.lo < 0 && scale.hi > 0) b.line('zero', area.x0, yAt(0), area.x1, yAt(0), { color: 'guide', width: 1, role: 'guide' });
    series.forEach((entry, s) => {
      const style = LINES[s]!;
      b.polyline(`line-${s}`, entry.values.flatMap((value, i) => [centre(i), yAt(value)]), { color: style.color, dash: style.dash, width: 1.6, role: 'geometry', fill: 'none' });
      if (n <= 16) entry.values.forEach((value, i) => marker(b, `point-${s}-${i}`, centre(i), yAt(value), style));
    });
  } else {
    const base = yAt(0);
    const groupW = m > 1 && !stacked ? Math.min(slot * 0.8, m * 22) : Math.min(slot * 0.64, 34);
    const barW = stacked ? groupW : groupW / m;
    labels.forEach((_, i) => {
      let stack = 0;
      series.forEach((entry, s) => {
        const value = entry.values[i]!;
        const from = stacked ? yAt(stack) : base;
        const to = stacked ? yAt(stack + value) : yAt(value);
        stack += value;
        const x = centre(i) - groupW / 2 + (stacked ? 0 : s * barW);
        const style = m > 1 ? FILLS[s]! : FILLS[0]!;
        if (to !== from) b.rect(m > 1 ? `bar-${s}-${i}` : `bar-${i}`, x, Math.min(from, to), barW, Math.abs(to - from), { ...style, width: 1.2, role: 'geometry' });
        if (chosen.values) {
          put(b, m > 1 ? `value-${s}-${i}` : `value-${i}`, valueTexts[s]![i]!, x + barW / 2, value < 0 ? to + 2 + TEXT_H / 2 : to - 2 - TEXT_H / 2);
        }
      });
    });
    b.line('baseline', area.x0, base, area.x1, base, { role: 'axis', width: 1.2, protected: true });
  }

  let below = catTop;
  chosen.cats.forEach((lines, i) => lines?.forEach((text, j) => {
    put(b, j ? `cat-${i}-${j + 1}` : `cat-${i}`, text, centre(i), catTop + j * LINE + TEXT_H / 2);
    below = Math.max(below, catTop + j * LINE + TEXT_H);
  }));
  closeBelow(b, area, below, input.xlabel);
  b.height = chosen.p.height;
  return finish(b.scene());
}

/** One series as horizontal bars: the names read on the left, each value at the end of its bar. */
function drawRows(input: Categorical, ctx: CompileCtx, flipped: boolean): CompileResult {
  const { labels, series } = input.data;
  const unit = onNumbers(input.data.unit);
  const values = series[0]!.values;
  const { b, top: headTop } = begin(ctx, input.title);
  // A column chart turned on its side keeps each axis title with its axis.
  const [valueTitle, nameTitle] = flipped ? [input.ylabel, input.xlabel] : [input.xlabel, input.ylabel];
  const top = titleAbove(b, nameTitle, headTop) + 2;
  const names = labels.map((label) => wrapText(label, b.width * 0.4) ?? refuse(`label "${label}" is too long to print beside its bar`));
  const nameW = Math.max(...names.flat().map((text) => textW(text)));
  const texts = values.map((value) => withUnit(fmt(value), unit));
  const room = (side: (value: number) => boolean) => Math.max(0, ...texts.filter((_, i) => side(values[i]!)).map((text) => textW(text) + 5));
  const axis = scaleX(b, Math.min(0, ...values), Math.max(0, ...values), EDGE + nameW + 6 + room((value) => value < 0), b.width - EDGE - room((value) => value >= 0), unit);
  const pitch = Math.max(Math.max(...names.map((lines) => lines.length)) * LINE + 3, Math.min(24, (b.height - top - 40) / labels.length));
  const area: Area = { x0: axis.x0, x1: axis.x1, y0: top, y1: top + labels.length * pitch + 2 };
  const xAt = (value: number) => along(axis.scale, value, area.x0, area.x1);
  const thick = Math.min(12, pitch - 7);
  labels.forEach((_, i) => {
    const cy = area.y0 + pitch * (i + 0.5);
    const value = values[i]!;
    if (value) b.rect(`bar-${i}`, Math.min(xAt(0), xAt(value)), cy - thick / 2, Math.abs(xAt(value) - xAt(0)), thick, { ...FILLS[0]!, width: 1.2, role: 'geometry' });
    names[i]!.forEach((text, j) => putRight(b, j ? `cat-${i}-${j + 1}` : `cat-${i}`, text, EDGE + nameW, cy + (j - (names[i]!.length - 1) / 2) * LINE));
    if (value < 0) putRight(b, `value-${i}`, texts[i]!, xAt(value) - 4, cy);
    else putLeft(b, `value-${i}`, texts[i]!, xAt(value) + 4, cy);
  });
  b.line('baseline', xAt(0), area.y0, xAt(0), area.y1, { role: 'axis', width: 1.2, protected: true });
  closeBelow(b, area, drawXAxis(b, area, axis, 5), titled(valueTitle, input.data.unit));
  return finish(b.scene());
}

function drawHistogram(input: Extract<ChartInput, { kind: 'histogram' }>, ctx: CompileCtx): CompileResult {
  const { sample } = input;
  const unit = onNumbers(input.unit);
  const xlabel = titled(input.xlabel, input.unit);
  if (input.edges) {
    const widths = input.edges.slice(1).map((edge, i) => edge - input.edges![i]!);
    if (widths.some((width) => Math.abs(width - widths[0]!) > 1e-9 * Math.abs(widths[0]!))) refuse('histogram edges must be equally spaced: bars of unequal width would need frequency density');
    const outside = sample?.filter((value) => value < input.edges![0]! || value > input.edges![input.edges!.length - 1]!).length;
    if (outside) refuse(`${outside} data ${outside === 1 ? 'value lies' : 'values lie'} outside the edges`);
  }
  const { edges, counts } = input.counts ? { edges: input.edges!, counts: input.counts }
    : input.edges ? { edges: input.edges, counts: countIntoEdges(sample!, input.edges) }
      : histogramBins(sample!, { bins: input.bins });
  const whole = counts.every((count) => Number.isInteger(count));
  const { b, top: headTop } = begin(ctx, input.title);
  const top = titleAbove(b, input.ylabel ?? (whole ? 'Frequency' : undefined), headTop);
  const countTexts = counts.map((count) => fmt(count));
  const decimals = Math.max(...edges.map((edge) => decimalsOf(edge)));
  const edgeTexts = edges.map((edge) => withUnit(fmtFixed(edge, decimals), unit));
  const below = EDGE + (xlabel ? LINE + 1 : 0) + TEXT_H + CORNER_DROP;

  const plan = (valueRoom: boolean) => {
    const y0 = top + (valueRoom ? VALUE_ROOM : TEXT_H / 2 + 1);
    const y1 = Math.max(b.height - below, y0 + MIN_PLOT_H);
    const scale = scaleY(0, Math.max(...counts), y1 - y0, whole);
    const x0 = Math.max(EDGE + Math.max(...scale.texts.map((text) => textW(text))) + 6, EDGE + textW(edgeTexts[0]!) / 2);
    const x1 = b.width - EDGE - Math.max(2, textW(edgeTexts[edgeTexts.length - 1]!) / 2);
    return { area: { x0, x1, y0, y1 }, scale, binW: (x1 - x0) / counts.length };
  };
  let p = plan(true);
  const values = countTexts.every((text) => textW(text) + 2 <= p.binW);
  if (!values) p = plan(false);
  const { area, scale, binW } = p;

  drawYAxis(b, area, scale, scale.texts);
  counts.forEach((count, i) => {
    const y = along(scale, count, area.y1, area.y0);
    if (!count) return;
    b.rect(`bin-${i}`, area.x0 + i * binW, y, binW, area.y1 - y, { color: 'accent', fill: 'tint', width: 1.2, role: 'geometry' });
    if (values) put(b, `value-${i}`, countTexts[i]!, area.x0 + (i + 0.5) * binW, y - 2 - TEXT_H / 2);
  });
  b.line('xaxis', area.x0, area.y1, area.x1, area.y1, { role: 'axis', width: 1.2, protected: true });
  // Every edge gets a tick; when the numbers would touch, every k-th edge is named.
  let every = 1;
  while (every < edges.length && edgeTexts.some((text, i) => i % every === 0 && i + every < edges.length && (textW(text) + textW(edgeTexts[i + every]!)) / 2 + 5 > every * binW)) every += 1;
  edges.forEach((_, i) => {
    const x = area.x0 + i * binW;
    b.line(`xtick-${i}`, x, area.y1, x, area.y1 + 3, { role: 'axis', width: 1, protected: true });
    if (i % every === 0) put(b, `xtickl-${i}`, edgeTexts[i]!, x, area.y1 + CORNER_DROP + TEXT_H / 2);
  });
  closeBelow(b, area, area.y1 + CORNER_DROP + TEXT_H, xlabel);
  return finish(b.scene());
}

/** Three significant figures, as a fitted coefficient is quoted. */
function coefficient(value: number): string {
  return fmt(Number(value.toPrecision(3)), 6);
}

function drawScatter(input: Extract<ChartInput, { kind: 'scatter' }>, ctx: CompileCtx): CompileResult {
  const { points } = input;
  const fit = input.fit ? linearFit(points) ?? refuse('a fitted line needs points at two or more different x values') : null;
  const { b, top: headTop } = begin(ctx, input.title);
  let top = headTop;
  if (fit) {
    const slope = Number(fit.slope.toPrecision(3));
    const intercept = Number(fit.intercept.toPrecision(3));
    const mx = slope === 1 ? 'x' : slope === -1 ? '−x' : `${coefficient(slope)}x`;
    const equation = slope === 0 ? `y = ${coefficient(intercept)}` : `y = ${mx}${intercept ? ` ${intercept < 0 ? '−' : '+'} ${coefficient(Math.abs(intercept))}` : ''}`;
    top = drawLegend(b, [{ text: equation, swatch: lineSwatch(LINES[0], false) }, ...(fit.r2 === null ? [] : [{ text: `r² = ${fit.r2.toFixed(3)}` }])], top);
  }
  top = titleAbove(b, input.ylabel, top);
  const below = EDGE + (input.xlabel ? LINE + 1 : 0) + TEXT_H + CORNER_DROP;
  const y0 = top + TEXT_H / 2 + 1;
  const y1 = Math.max(b.height - below, y0 + MIN_PLOT_H);
  const ys = scatterRange(points.map((point) => point.y));
  const yScale = scaleY(ys.lo, ys.hi, y1 - y0);
  const xs = scatterRange(points.map((point) => point.x));
  const axis = scaleX(b, xs.lo, xs.hi, EDGE + Math.max(...yScale.texts.map((text) => textW(text))) + 6, b.width - EDGE - 3, { prefix: '', suffix: '' });
  const area: Area = { x0: axis.x0, x1: axis.x1, y0, y1 };
  const xAt = (value: number) => along(axis.scale, value, area.x0, area.x1);
  const yAt = (value: number) => along(yScale, value, area.y1, area.y0);
  drawYAxis(b, area, yScale, yScale.texts);
  const tickBottom = drawXAxis(b, area, axis, CORNER_DROP);
  if (fit) {
    // The segment of the line inside the plotted ranges.
    let from = axis.scale.lo;
    let to = axis.scale.hi;
    if (fit.slope !== 0) {
      const cuts = [(yScale.lo - fit.intercept) / fit.slope, (yScale.hi - fit.intercept) / fit.slope];
      from = Math.max(from, Math.min(...cuts));
      to = Math.min(to, Math.max(...cuts));
    }
    const y = (x: number) => fit.slope * x + fit.intercept;
    b.line('fit', xAt(from), yAt(y(from)), xAt(to), yAt(y(to)), { color: 'accent', width: 1.6, role: 'geometry' });
  }
  points.forEach((point, i) => b.circle(`point-${i}`, xAt(point.x), yAt(point.y), 2.3, { color: fit ? 'neutral' : 'accent', fill: 'ink', width: 1, role: 'geometry' }));
  closeBelow(b, area, tickBottom, input.xlabel);
  return finish(b.scene());
}

function drawBox(input: Extract<ChartInput, { kind: 'box' }>, ctx: CompileCtx): CompileResult {
  const { samples } = input;
  const unit = onNumbers(input.unit);
  const xlabel = titled(input.xlabel, input.unit);
  const boxes = samples.map((sample) => boxSummary(sample.values));
  const { b, top: headTop } = begin(ctx, input.title);
  let top = headTop;
  if (boxes.length === 1) {
    // One box has room for its five numbers; they are printed whole, in reading order.
    const box = boxes[0]!;
    const five = [['min', box.min], ['Q1', box.q1], ['median', box.median], ['Q3', box.q3], ['max', box.max]] as const;
    top = drawLegend(b, five.map(([name, value]) => ({ text: `${name} ${withUnit(fmt(value), unit)}` })), top);
  }
  top = titleAbove(b, input.ylabel, top) + 2;
  const names = samples.map((sample) => oneLine(sample.name, b.width * 0.36, 'the name'));
  const nameW = Math.max(...names.map((name) => (name ? textW(name) : 0)));
  const all = samples.flatMap((sample) => sample.values);
  // The axis hugs the data, with a little air at each end, so the boxes get the whole width.
  const air = (Math.max(...all) - Math.min(...all)) * 0.04;
  const axis = scaleX(b, Math.min(...all) - air, Math.max(...all) + air, EDGE + (nameW ? nameW + 8 : 6), b.width - EDGE - 6, unit, false);
  const below = EDGE + (xlabel ? LINE + 1 : 0) + TEXT_H + 5;
  const pitch = Math.max(20, Math.min(34, (b.height - below - top - 4) / boxes.length));
  const area: Area = { x0: axis.x0, x1: axis.x1, y0: top, y1: top + boxes.length * pitch + 4 };
  const xAt = (value: number) => along(axis.scale, value, area.x0, area.x1);
  const half = Math.min(8, pitch / 2 - 4);
  boxes.forEach((box, i) => {
    const cy = area.y0 + pitch * (i + 0.5);
    const stroke = { width: 1.4, role: 'geometry' } as const;
    if (names[i]) putRight(b, `cat-${i}`, names[i]!, EDGE + nameW, cy);
    b.line(`whisker-lo-${i}`, xAt(box.whiskerLo), cy, xAt(box.q1), cy, stroke);
    b.line(`whisker-hi-${i}`, xAt(box.q3), cy, xAt(box.whiskerHi), cy, stroke);
    b.line(`cap-lo-${i}`, xAt(box.whiskerLo), cy - half * 0.6, xAt(box.whiskerLo), cy + half * 0.6, stroke);
    b.line(`cap-hi-${i}`, xAt(box.whiskerHi), cy - half * 0.6, xAt(box.whiskerHi), cy + half * 0.6, stroke);
    b.rect(`box-${i}-wash`, xAt(box.q1), cy - half, xAt(box.q3) - xAt(box.q1), 2 * half, { color: 'accent', fill: 'tint', width: 0, role: 'annotation' });
    b.rect(`box-${i}`, xAt(box.q1), cy - half, xAt(box.q3) - xAt(box.q1), 2 * half, stroke);
    b.line(`median-${i}`, xAt(box.median), cy - half, xAt(box.median), cy + half, { color: 'accent', width: 2.2, role: 'geometry' });
    box.outliers.forEach((value, k) => b.circle(`outlier-${i}-${k}`, xAt(value), cy, 2.2, { fill: 'paper', width: 1.2, role: 'geometry' }));
  });
  closeBelow(b, area, drawXAxis(b, area, axis, 5), xlabel);
  return finish(b.scene());
}

/** The point at `radius` from the centre, `turn` radians clockwise from 12 o'clock. */
function polar(cx: number, cy: number, radius: number, turn: number): [number, number] {
  return [Number((cx + radius * Math.sin(turn)).toFixed(2)), Number((cy - radius * Math.cos(turn)).toFixed(2))];
}

/** A slice from `from` to `to`; `inner` > 0 leaves the hole of a donut. */
function slicePath(cx: number, cy: number, radius: number, inner: number, from: number, to: number): string {
  const large = to - from > Math.PI ? 1 : 0;
  const at = (r: number, turn: number) => polar(cx, cy, r, turn).join(' ');
  const outer = `M ${at(radius, from)} A ${radius} ${radius} 0 ${large} 1 ${at(radius, to)}`;
  return inner
    ? `${outer} L ${at(inner, to)} A ${inner} ${inner} 0 ${large} 0 ${at(inner, from)} Z`
    : `${outer} L ${cx} ${cy} Z`;
}

interface Tag {
  index: number;
  lines: string[];
  turn: number;
  /** Centre of the label, measured down from the centre of the pie. */
  y: number;
}

/**
 * Each label wants to sit level with the point where its leader leaves the pie. Pushing the column
 * apart downward and upward and taking the middle keeps every label clear of its neighbours and each
 * crowd of labels centred on the slices it names.
 */
function spread(side: Tag[], reach: number): void {
  const want = side.map((tag) => -reach * Math.cos(tag.turn));
  const pitch = (i: number) => ((side[i]!.lines.length + side[i + 1]!.lines.length) * LINE) / 2;
  const down = [...want];
  for (let i = 1; i < side.length; i++) down[i] = Math.max(want[i]!, down[i - 1]! + pitch(i - 1));
  const up = [...want];
  for (let i = side.length - 2; i >= 0; i--) up[i] = Math.min(want[i]!, up[i + 1]! - pitch(i));
  side.forEach((tag, i) => { tag.y = (down[i]! + up[i]!) / 2; });
}

function drawPie(input: Categorical, ctx: CompileCtx): CompileResult {
  const { labels, series } = input.data;
  const values = series[0]!.values;
  const total = values.reduce((sum, value) => sum + value, 0);
  // Whole percentages, unless that would print a real slice as 0%.
  const decimals = percentages(values).some((share, i) => share === 0 && values[i]! > 0) ? 1 : 0;
  const shares = percentages(values, decimals);
  const { b, top } = begin(ctx, input.title);
  /** From the rim: the leader's knee, the riser it turns on, the label. */
  const KNEE = 6;
  const RISER = 9;
  const GAP = 17;
  const cap = (b.width - 2 * EDGE) / 2 - 36 - GAP;
  let turn = 0;
  const tags: Tag[] = values.map((value, index) => {
    const sweep = (value / total) * 2 * Math.PI;
    const share = shares[index]! === 0 && value > 0 ? '<0.1%' : `${shares[index]!.toFixed(decimals)}%`;
    const lines = wrapText(`${labels[index]!} ${share}`, cap) ?? refuse(`label "${labels[index]!}" is too long to print beside the ${input.kind}`);
    turn += sweep;
    return { index, lines, turn: turn - sweep / 2, y: 0 };
  });
  // Clockwise from 12 o'clock, the first half turn is the right side; each side reads top to bottom.
  const right = tags.filter((tag) => tag.turn <= Math.PI);
  const left = tags.filter((tag) => tag.turn > Math.PI).reverse();
  const wide = (side: Tag[]) => (side.length ? GAP + Math.max(...side.flatMap((tag) => tag.lines.map((text) => textW(text)))) : KNEE);
  const span = b.width - 2 * EDGE - wide(left) - wide(right);
  const radius = Math.min(52, span / 2);
  const inner = input.kind === 'donut' ? radius * 0.56 : 0;
  spread(right, radius + KNEE);
  spread(left, radius + KNEE);
  const halves = tags.map((tag) => (tag.lines.length * LINE) / 2);
  const above = Math.max(radius + KNEE, ...tags.map((tag, i) => halves[i]! - tag.y));
  const under = Math.max(radius + KNEE, ...tags.map((tag, i) => halves[i]! + tag.y));
  b.height = Math.max(96, top + above + under + EDGE);
  // The pie and its two label columns are centred as one composition.
  const cx = (b.width + wide(left) - wide(right)) / 2;
  const cy = top + above + (b.height - top - EDGE - above - under) / 2;

  let from = 0;
  values.forEach((value, index) => {
    const to = from + (value / total) * 2 * Math.PI;
    // Neighbouring slices never share a fill, including the last with the first.
    const style = FILLS[index && index === values.length - 1 && index % FILLS.length === 0 ? 2 : index % FILLS.length]!;
    // The fill and the outline are separate strokes so that every slice has the same neutral edge.
    const edge = { width: 1.2, role: 'geometry' } as const;
    if (value === total) {
      b.circle(`slice-${index}`, cx, cy, radius, { ...style, width: 0, role: 'geometry' });
      b.circle(`slice-${index}-edge`, cx, cy, radius, edge);
      if (inner) b.circle('hole', cx, cy, inner, { ...edge, fill: 'paper' });
    } else if (value > 0) {
      const d = slicePath(cx, cy, radius, inner, from, to);
      b.path(`slice-${index}`, d, { ...style, width: 0, role: 'geometry' });
      b.path(`slice-${index}-edge`, d, edge);
    }
    from = to;
  });

  for (const [side, sign] of [[right, 1], [left, -1]] as const) {
    const riserX = cx + sign * (radius + RISER);
    const textX = cx + sign * (radius + GAP);
    for (const tag of side) {
      const y = cy + tag.y;
      const knee = polar(cx, cy, radius + KNEE, tag.turn);
      // Out of the slice, level to the riser, along it to the label: a leader never crosses the pie.
      b.polyline(`leader-${tag.index}`, [...polar(cx, cy, radius + 1.5, tag.turn), ...knee, riserX, knee[1], riserX, y, textX - sign * 3, y], { color: 'muted', width: 0.9, role: 'annotation', fill: 'none' });
      tag.lines.forEach((text, j) => {
        const lineY = y + (j - (tag.lines.length - 1) / 2) * LINE;
        if (sign > 0) putLeft(b, j ? `slicel-${tag.index}-${j + 1}` : `slicel-${tag.index}`, text, textX, lineY);
        else putRight(b, j ? `slicel-${tag.index}-${j + 1}` : `slicel-${tag.index}`, text, textX, lineY);
      });
    }
  }
  return finish(b.scene());
}

export const compileChart = guard((spec, ctx) => {
  const input = readChart(spec, ctx.alias);
  switch (input.kind) {
    case 'pie':
    case 'donut':
      return drawPie(input, ctx);
    case 'histogram':
      return drawHistogram(input, ctx);
    case 'scatter':
      return drawScatter(input, ctx);
    case 'box':
      return drawBox(input, ctx);
    case 'hbar':
      return drawRows(input, ctx, false);
    case 'bar':
      // Names too long to sit under upright bars read well beside lying ones; the data is the same.
      return drawColumns(input, ctx) ?? (input.data.labels.length <= LIMITS.bars ? drawRows(input, ctx, true) : refuse('the category names are too long to print under their bars'));
    default:
      return drawColumns(input, ctx) ?? refuse(`the category names are too long to print under a ${input.kind} chart`);
  }
});
