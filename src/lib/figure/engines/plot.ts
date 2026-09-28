import type { CompileCtx, CompileResult, Scene } from '../types';
import { ExprError, compileExpr } from '../pratt';
import { specGet, specGetAll, specHas, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { emitSvg } from '../emit';
import { layoutScene, overlaysFromLayout, strokeSegments, type LayoutResult } from '../slk';
import { boxFrom, boxHitsAny, boxesOverlap, measureText } from '../geom';
import { FONT_MIN } from '../types';

type Scale = 'linear' | 'log';
type Point = { x: number; y: number };
type Segment = { xs: number[]; ys: number[] };
type Series = { id: string; kind: 'function' | 'data'; xs: number[]; ys: number[]; segments: Segment[]; source?: string };
type EqSlot = 'N' | 'E' | 'S' | 'W' | 'NE' | 'NW' | 'SE' | 'SW' | 'auto';
type PlotErrorCode = 'malformed';

const EQ_SLOTS = new Set<EqSlot>(['N', 'E', 'S', 'W', 'NE', 'NW', 'SE', 'SW', 'auto']);
const PANEL_ROLES = 'function|waveform|continuous|step|discrete|sample|observation';
const PLOT_DECLARATION = /^\s*([A-Za-z][A-Za-z0-9_.-]*)\s*:/;
const PLOT_DECLARATION_KEYS = new Set([
  'kind', 'domain', 'var', 'fn', 'fn2', 'data', 'logx', 'logy', 'scale', 'panel', 'label',
  'xlabel', 'ylabel', 'eq', 'eq_slot', 'point', 'point_label', 'marker', 'poles', 'zeros',
  'peaks', 'guide', 'drop', 'asymptote', 'region', 'shade', 'caption', 'highlight',
]);

class PlotSpecError extends Error {
  constructor(public code: PlotErrorCode, message: string) { super(message); }
}

function fail(code: PlotErrorCode, message: string): never { throw new PlotSpecError(code, message); }

function strokeBoundsCertificate(scene: Scene, layout: LayoutResult): boolean {
  const epsilon = 0.5;
  if (layout.strokes.some((segment) => ![segment.x1, segment.y1, segment.x2, segment.y2].every(Number.isFinite))) return false;
  return scene.strokes.every((stroke) => {
    if (!Number.isFinite(stroke.width ?? 1) || (stroke.width ?? 1) < 0) return false;
    const segments = strokeSegments({ ...scene, strokes: [{ ...stroke, protected: false }] });
    if (!segments.length) return false;
    const extent = (stroke.width ?? 1) / 2;
    return segments.every((segment) => [
      segment.x1 - extent, segment.y1 - extent, segment.x2 - extent,
      segment.y2 - extent, segment.x1 + extent, segment.y1 + extent,
      segment.x2 + extent, segment.y2 + extent,
    ].every(Number.isFinite) &&
      segment.x1 - extent >= -epsilon && segment.x2 - extent >= -epsilon &&
      segment.y1 - extent >= -epsilon && segment.y2 - extent >= -epsilon &&
      segment.x1 + extent <= scene.width + epsilon && segment.x2 + extent <= scene.width + epsilon &&
      segment.y1 + extent <= scene.height + epsilon && segment.y2 + extent <= scene.height + epsilon);
  });
}

function parseNumber(value: string): number | null {
  const n = Number(value.trim());
  return Number.isFinite(n) ? n : null;
}

function parseDomain(spec: SpecDoc): { min: number; max: number } {
  const raw = specGet(spec, 'domain') ?? '0 10';
  const parts = raw.replace(/\b[xy]\s*=/gi, ' ').split(/[,;\s]+/).filter(Boolean);
  if (parts.length !== 2) fail('malformed', 'plot domain needs exactly two finite bounds');
  const min = parseNumber(parts[0]!);
  const max = parseNumber(parts[1]!);
  if (min === null || max === null || !(max > min)) fail('malformed', 'plot domain must be increasing and finite');
  return { min, max };
}

function parseScale(spec: SpecDoc): { x: Scale; y: Scale } {
  let x: Scale = specHas(spec, 'logx') ? 'log' : 'linear';
  let y: Scale = specHas(spec, 'logy') ? 'log' : 'linear';
  for (const raw of specGetAll(spec, 'scale')) {
    for (const part of raw.split(/[,;\s]+/).filter(Boolean)) {
      const match = /^([xy])=(linear|log)$/i.exec(part);
      if (!match) {
        if (/^y2=/i.test(part)) fail('malformed', 'unsupported: plot second dependent axis is not yet representable');
        fail('malformed', `invalid plot scale ${part}`);
      }
      if (match[1]!.toLowerCase() === 'x') x = match[2]!.toLowerCase() as Scale;
      else y = match[2]!.toLowerCase() as Scale;
    }
  }
  return { x, y };
}

function strictPair(raw: string): Point | null {
  const match = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*[,;\s]\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*$/.exec(raw);
  if (!match) return null;
  const x = Number(match[1]);
  const y = Number(match[2]);
  return Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
}

function parseData(raw: string): Point[] {
  const pairs = raw.split(';').map(strictPair);
  if (!pairs.length || pairs.some((point) => !point)) fail('malformed', 'data contains an invalid x,y sample');
  return pairs as Point[];
}

function sampleFn(fn: (vars: Record<string, number>) => number, variable: string, min: number, max: number, splitAt: number[] = [], log = false, n = 160): Segment[] {
  const values: Array<{ x: number; y: number }> = [];
  let previousX: number | undefined;
  for (let i = 0; i <= n; i++) {
    // A logarithmic axis needs samples evenly spaced on screen, i.e. in log10(x).
    const x = log ? 10 ** (Math.log10(min) + ((Math.log10(max) - Math.log10(min)) * i) / n) : min + ((max - min) * i) / n;
    if (splitAt.some((pole) => Math.abs(x - pole) < (max - min) / n / 3 || (previousX !== undefined && previousX < pole && pole < x))) {
      values.push({ x, y: Number.NaN });
      previousX = x;
      continue;
    }
    values.push({ x, y: fn({ [variable]: x }) });
    previousX = x;
  }
  const segments: Segment[] = [];
  let current: Segment = { xs: [], ys: [] };
  for (const value of values) {
    const previousY = current.ys[current.ys.length - 1];
    const finite = Number.isFinite(value.y);
    const jump = previousY !== undefined && Math.abs(value.y - previousY) > 1e6;
    if (!finite || jump) {
      if (current.xs.length > 1) segments.push(current);
      current = { xs: [], ys: [] };
      continue;
    }
    current.xs.push(value.x);
    current.ys.push(value.y);
  }
  if (current.xs.length > 1) segments.push(current);
  return segments;
}

/** Tick text; very large or small magnitudes are written as powers of ten (label notation superscripts them). */
function formatTick(n: number): string {
  if (!Number.isFinite(n)) return '';
  if (Math.abs(n) < 1e-12) return '0';
  const abs = Math.abs(n);
  const exponent = Math.floor(Math.log10(abs) + 1e-9);
  if (exponent >= 5 || exponent <= -4) {
    const mantissa = Number((n / 10 ** exponent).toPrecision(3));
    return Math.abs(mantissa) === 1 ? `${mantissa < 0 ? '-' : ''}10^${exponent}` : `${mantissa}×10^${exponent}`;
  }
  const rounded = abs >= 100 ? Math.round(n) : abs >= 10 ? Number(n.toPrecision(4)) : Number(n.toPrecision(3));
  return Math.abs(rounded) < 1e-12 ? '0' : String(rounded);
}

/** How far a label's superscript rises above, or its subscript drops below, its line (label notation offsets). */
const raised = (text: string) => (/\^/.test(text) ? 0.4 * FONT_MIN : 0);
const dropped = (text: string) => (/_/.test(text) ? 0.3 * FONT_MIN : 0);

/** One notation per axis: once any tick needs a power of ten, every non-zero tick is written m×10^k. */
function formatTicks(ticks: number[]): string[] {
  const scientific = ticks.some((tick) => /\^/.test(formatTick(tick)));
  if (!scientific) return ticks.map(formatTick);
  return ticks.map((tick) => {
    if (Math.abs(tick) < 1e-12) return '0';
    const exponent = Math.floor(Math.log10(Math.abs(tick)) + 1e-9);
    return `${Number((tick / 10 ** exponent).toPrecision(3))}×10^${exponent}`;
  });
}

type TickSet = { ticks: number[]; lo: number; hi: number };

const tickRange = (lo: number, hi: number, step: number): number[] => {
  const ticks: number[] = [];
  for (let i = Math.ceil(lo / step - 1e-9); i * step <= hi + step * 1e-9; i++) ticks.push(Number((i * step).toPrecision(12)));
  return ticks;
};

/**
 * Nice linear ticks (1, 2, 2.5 or 5 x 10^k). Four to seven labelled ticks read best; a 2.5 step wins
 * only when it is clearly better. `expand` snaps the range outward to whole steps, so the first and
 * last tick bound every plotted value; `fits` rejects steps whose labels would not fit.
 */
function niceTicks(lo: number, hi: number, expand: boolean, fits: (ticks: number[], span: number) => boolean): TickSet {
  const top = Math.floor(Math.log10(hi - lo));
  let best: (TickSet & { score: number; step: number }) | undefined;
  for (let e = top - 2; e <= top + 1; e++) {
    for (const mantissa of [1, 2, 2.5, 5]) {
      const step = mantissa * 10 ** e;
      const from = expand ? Math.floor(lo / step + 1e-9) * step : lo;
      const to = expand ? Math.ceil(hi / step - 1e-9) * step : hi;
      const ticks = tickRange(from, to, step);
      if (ticks.length < 2 || ticks.length > 12 || !fits(ticks, to - from)) continue;
      const count = ticks.length;
      const score = (count < 4 ? (4 - count) * 1.5 : Math.max(0, count - 7)) + (mantissa === 2.5 ? 1 : 0) + (expand ? ((to - from) / (hi - lo) - 1) * 3 : 0);
      if (!best || score < best.score - 1e-9 || (Math.abs(score - best.score) <= 1e-9 && step > best.step)) best = { ticks, lo: from, hi: to, score, step };
    }
  }
  return best ? { ticks: best.ticks, lo: best.lo, hi: best.hi } : { ticks: [lo, hi], lo, hi };
}

/** Decade ticks (with 2 and 5 between them when the range spans fewer than two decades). */
function logTicks(lo: number, hi: number, expand: boolean): TickSet {
  const kLo = expand ? Math.floor(Math.log10(lo) + 1e-9) : Math.ceil(Math.log10(lo) - 1e-9);
  const kHi = expand ? Math.ceil(Math.log10(hi) - 1e-9) : Math.floor(Math.log10(hi) + 1e-9);
  const from = expand ? 10 ** kLo : lo;
  const to = expand ? 10 ** kHi : hi;
  const ticks: number[] = [];
  for (let k = kLo; k <= kHi; k++) {
    for (const mantissa of kHi - kLo < 2 ? [1, 2, 5] : [1]) {
      const value = Number((mantissa * 10 ** k).toPrecision(12));
      if (value >= from * (1 - 1e-9) && value <= to * (1 + 1e-9)) ticks.push(value);
    }
  }
  return { ticks: ticks.length >= 2 ? ticks : [from, to], lo: from, hi: to };
}

function formatLogTick(value: number, ticks: number[]): string {
  // One notation per axis: plain numbers while every decade is short, otherwise 10^k throughout.
  const plain = ticks.every((tick) => tick >= 0.01 && tick < 1e4);
  if (plain) return formatTick(value);
  const exponent = Math.log10(value);
  return Number.isInteger(Number(exponent.toFixed(9))) ? (Math.round(exponent) === 0 ? '1' : `10^${Math.round(exponent)}`) : formatTick(value);
}

function assignments(raw: string): { kind?: string; target?: string; value?: string } {
  const kind = /(?:^|\s)(curve|axis|region|panel|title)\s*=\s*([^\s]+)/i.exec(raw);
  const value = /(?:^|\s)value\s*=\s*(.*)$/i.exec(raw);
  const bare = /^(curve|axis|region|panel|title)\b/i.exec(raw.trim());
  return { kind: (kind?.[1] ?? bare?.[1])?.toLowerCase(), target: kind?.[2], value: value?.[1]?.trim() };
}

function targetSeries(series: Series[], id: string): Series | undefined {
  return series.find((candidate) => candidate.id.toLowerCase() === id.trim().toLowerCase());
}

type PlotDropMode = 'both' | 'x' | 'y';

function parseDropMode(spec: SpecDoc): PlotDropMode | undefined {
  const declarations = specGetAll(spec, 'drop').map((raw) => raw.trim());
  for (const raw of specGetAll(spec, 'guide')) {
    const match = /^\s*drop\s*=\s*(.*?)\s*$/i.exec(raw);
    if (match) declarations.push(match[1]!);
  }
  if (!declarations.length) return undefined;
  const modes = declarations.map((raw) => {
    const mode = raw.toLowerCase();
    if (mode !== 'both' && mode !== 'x' && mode !== 'y') fail('malformed', `unsupported plot drop direction ${raw}`);
    return mode as PlotDropMode;
  });
  if (new Set(modes).size !== 1) fail('malformed', 'plot drop declarations disagree');
  return modes[0];
}

function validateLabelAssignments(spec: SpecDoc, allSeries: Series[]): void {
  for (const raw of specGetAll(spec, 'label')) {
    const assignment = assignments(raw);
    if (!assignment.kind || !/^(curve|axis|region)$/.test(assignment.kind)) fail('malformed', `unsupported plot label assignment ${raw}`);
    if (!assignment.value) fail('malformed', `plot label ${raw} needs a value`);
    if (assignment.kind === 'curve') {
      if (!assignment.target || !targetSeries(allSeries, assignment.target)) fail('malformed', `plot label target ${assignment.target ?? ''} is missing`);
    } else if (assignment.kind === 'axis') {
      if (!assignment.target || !/^(x|y)$/i.test(assignment.target)) fail('malformed', `plot axis label target ${assignment.target ?? ''} is unsupported`);
    } else if (assignment.target) {
      fail('malformed', `plot region label target ${assignment.target} is unsupported`);
    } else if (!specGetAll(spec, 'region').length && !specGet(spec, 'shade')) {
      // Without a region the label has nowhere faithful to go; never drop it silently.
      fail('malformed', 'plot region label needs a region declaration');
    }
  }
}

function seriesPoint(series: Series, fraction: number): Point {
  const segment = series.segments[0] ?? { xs: series.xs, ys: series.ys };
  const index = Math.max(0, Math.min(segment.xs.length - 1, Math.floor(segment.xs.length * fraction)));
  return { x: segment.xs[index]!, y: segment.ys[index]! };
}

/**
 * Slot beside a marked point on the side away from the curve through it (screen y grows downward):
 * up-left of a rising curve, up-right of a falling one, above a maximum, below a minimum.
 */
function pointLabelSlot(series: Series[], at: Point, mapX: (v: number) => number, mapY: (v: number) => number): 'N' | 'S' | 'NE' | 'NW' {
  let best: { gap: number; slope: number; bend: number } | null = null;
  for (const segment of series.flatMap((entry) => entry.segments)) {
    if (segment.xs.length < 2) continue;
    let i = 0;
    for (let k = 1; k < segment.xs.length; k++) if (Math.abs(segment.xs[k]! - at.x) < Math.abs(segment.xs[i]! - at.x)) i = k;
    const a = Math.max(0, i - 1);
    const b = Math.min(segment.xs.length - 1, i + 1);
    const dx = mapX(segment.xs[b]!) - mapX(segment.xs[a]!);
    const [ya, yi, yb] = [mapY(segment.ys[a]!), mapY(segment.ys[i]!), mapY(segment.ys[b]!)];
    const gap = Math.abs(yi - mapY(at.y));
    if (dx && (!best || gap < best.gap)) best = { gap, slope: (yb - ya) / dx, bend: ya + yb - 2 * yi };
  }
  if (!best) return 'N';
  if (Math.abs(best.slope) < 0.35) return best.bend < 0 ? 'S' : 'N';
  return best.slope < 0 ? 'NW' : 'NE';
}

function stepPoints(series: Series): number[] {
  if (series.xs.length < 2 || series.xs.some((value, index) => index > 0 && value === series.xs[index - 1])) {
    return series.xs.flatMap((value, index) => [value, series.ys[index]!]);
  }
  const points: number[] = [series.xs[0]!, series.ys[0]!];
  for (let index = 1; index < series.xs.length; index++) {
    points.push(series.xs[index]!, series.ys[index - 1]!, series.xs[index]!, series.ys[index]!);
  }
  return points;
}

function parsePoleValues(spec: SpecDoc): number[] {
  const values = [...specGetAll(spec, 'poles'), ...specGetAll(spec, 'marker').filter((raw) => /^pole\s*=\s*/i.test(raw)).map((raw) => raw.replace(/^pole\s*=\s*/i, ''))];
  return values.map((value) => {
    const n = parseNumber(value);
    if (n === null) fail('malformed', 'pole marker needs a finite x value');
    return n;
  });
}

const MATH_WORDS = new Set(['sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'sinh', 'cosh', 'tanh', 'log', 'exp', 'max', 'min', 'lim', 'det']);

/** Words in an equation label ("no inhibitor: v=…") are text; bare in KaTeX they read as italic products. */
function proseAsText(equation: string): string {
  return equation.replace(/(?<![\\A-Za-z_^{])[A-Za-z]{2,}(?:\s+[A-Za-z]{2,})*(?![A-Za-z{])/g, (run, offset: number) => {
    const words = run.split(/\s+/);
    const prose = words.length > 1 || (run.length >= 4 && !MATH_WORDS.has(run.toLowerCase()) && equation[offset + run.length] !== '(');
    return prose ? `\\text{${run}}` : run;
  });
}

/** Two balanced lines for an axis title wider than `width`; null when even that does not fit. */
function wrapTitle(text: string, width: number): string[] | null {
  const words = text.trim().split(/\s+/);
  let best: string[] | null = null;
  let bestWidth = Infinity;
  for (let k = 1; k < words.length; k++) {
    const lines = [words.slice(0, k).join(' '), words.slice(k).join(' ')];
    const widest = Math.max(...lines.map((line) => measureText(line, FONT_MIN).w));
    if (widest <= width && widest < bestWidth) { best = lines; bestWidth = widest; }
  }
  return best;
}

function parseEqSlot(spec: SpecDoc): EqSlot {
  const raw = specGet(spec, 'eq_slot');
  const slot = (raw ?? 'NE').trim().toUpperCase();
  if (!EQ_SLOTS.has(slot as EqSlot)) fail('malformed', `invalid plot equation slot ${raw ?? ''}`);
  return slot as EqSlot;
}

function ensureSupportedKind(spec: SpecDoc): string {
  const kind = (specGet(spec, 'kind') ?? 'function').trim().toLowerCase();
  if (['pie', 'graph', 'portrait', 'photograph', 'prose', 'construction', 'infographic'].includes(kind)) fail('malformed', `unsupported: plot does not represent ${kind}`);
  if (!['function', 'waveform', 'discrete', 'step', 'comparison', 'bode'].includes(kind)) fail('malformed', `unsupported: plot kind ${kind}`);
  return kind;
}

function validatePlotDeclarations(spec: SpecDoc): void {
  for (const [index, line] of spec.raw.replace(/\r\n?/g, '\n').split('\n').entries()) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue;
    const declaration = PLOT_DECLARATION.exec(line);
    if (!declaration) fail('malformed', `invalid plot declaration on line ${index + 1}`);
    if (!PLOT_DECLARATION_KEYS.has(declaration[1]!.toLowerCase())) fail('malformed', `unsupported plot declaration ${declaration[1]}`);
  }
}

function parsePanels(spec: SpecDoc): Array<{ id: string; role: string }> {
  const ids = new Set<string>();
  return specGetAll(spec, 'panel').map((raw, index) => {
    const match = new RegExp(`^\\s*([A-Za-z][\\w.-]*)\\s+role\\s*=\\s*(${PANEL_ROLES})\\s*$`, 'i').exec(raw);
    if (!match) fail('malformed', `invalid plot panel declaration ${raw}`);
    const id = match[1]!.toLowerCase();
    if (ids.has(id)) fail('malformed', `duplicate plot panel declaration ${id}`);
    ids.add(id);
    return { id, role: match[2]!.toLowerCase() || `panel${index + 1}` };
  });
}

function panelSeries(panel: { role: string }, index: number, panels: Array<{ role: string }>, functions: Series[], data: Series[]): Series[] {
  const role = panel.role.toLowerCase();
  const selected = /step|discrete|sample|observation/.test(role)
    ? data
    : /continuous|function|wave/.test(role)
      ? functions
      : [...functions, ...data].filter((_, itemIndex) => itemIndex % panels.length === index);
  if (!selected.length) fail('malformed', 'plot panel ' + panel.role + ' has no plotted series');
  return selected;
}

/** Space between the lines of a wrapped axis title: touching boxes read as an overlap to the label kernel. */
const TITLE_GAP = 1;

function drawPlotPanel(b: SceneBuilder, panel: { role: string; x: number; y: number; w: number; h: number; prefix: string }, series: Series[], allSeries: Series[], spec: SpecDoc, domain: { min: number; max: number }, scale: { x: Scale; y: Scale }, kind: string, referenceIds: Set<string>, panelTitle: boolean, eqSlot: EqSlot, legend = false, pointKey = false): void {
  const labels = !panel.prefix ? specGetAll(spec, 'label').map(assignments) : [];
  const xlabel = !panel.prefix ? specGet(spec, 'xlabel') ?? labels.find((entry) => entry.kind === 'axis' && entry.target?.toLowerCase() === 'x')?.value : undefined;
  const ylabel = !panel.prefix ? specGet(spec, 'ylabel') ?? labels.find((entry) => entry.kind === 'axis' && entry.target?.toLowerCase() === 'y')?.value : undefined;
  const xlabelSize = xlabel ? measureText(xlabel, FONT_MIN) : { w: 0, h: 0 };
  const ylabelSize = ylabel ? measureText(ylabel, FONT_MIN) : { w: 0, h: 0 };
  // A y title wider than ~30% of the frame takes two balanced lines, still left of the axis, so it
  // does not squeeze the plot into a sliver.
  const yTitle = ylabel && !panelTitle && ylabelSize.w + 10 > panel.w * 0.3 ? wrapTitle(ylabel, ylabelSize.w) ?? [ylabel] : ylabel ? [ylabel] : [];
  const yTitleW = Math.max(0, ...yTitle.map((line) => measureText(line, FONT_MIN).w));
  const tickH = measureText('0', FONT_MIN).h;
  // Legend rows (one per equation) sit in a band above the axes: a colour swatch, then the equation.
  const legendEqs = legend && !panel.prefix ? specGetAll(spec, 'eq').map(proseAsText) : [];
  const legendSizes = legendEqs.map((equation) => measureText(equation, FONT_MIN, true));
  const legendRowH = legendSizes.map((size) => size.h + 3);
  const legendW = Math.max(0, ...legendSizes.map((size) => size.w));
  const assertedPoints = [...specGetAll(spec, 'point'), ...specGetAll(spec, 'marker').filter((raw) => /^(?:open|closed|point)\s*=/i.test(raw)).map((raw) => raw.replace(/^(?:open|closed|point)\s*=\s*/i, ''))].map((raw) => strictPair(raw));
  if (assertedPoints.some((point) => !point)) fail('malformed', 'point marker needs x,y');
  const yValues = [...series.flatMap((entry) => entry.ys), ...(assertedPoints as Point[]).map((point) => point.y)].filter((value) => scale.y === 'linear' || value > 0);
  if (scale.y === 'log' && series.some((entry) => entry.ys.some((value) => !(value > 0)))) fail('malformed', 'log y scale needs positive samples');
  let dataYMin = yValues.length ? Math.min(...yValues) : scale.y === 'log' ? 1 : 0;
  let dataYMax = yValues.length ? Math.max(...yValues) : scale.y === 'log' ? 10 : 1;
  // The x axis is y = 0 whenever the plot reaches negative values; otherwise it is the frame bottom.
  const axisAtZero = scale.y === 'linear' && dataYMin < 0;
  if (scale.y === 'linear') { dataYMin = Math.min(dataYMin, 0); dataYMax = Math.max(dataYMax, 0); }
  if (dataYMax === dataYMin) dataYMax = dataYMin + 1;
  if (scale.x === 'log' && !(domain.min > 0)) fail('malformed', 'log x scale needs a positive domain');
  // Vertical budget: the y title sits above the top tick label, the x title under the plot area
  // (below the tick row when the axis is the frame bottom).
  // The band keeps the kernel's 4-unit frame margin above its first row.
  const legendBand = legendRowH.length ? 4 + legendRowH.reduce((sum, rowH) => sum + rowH, 0) : 0;
  let frameH = panel.h;
  // Axis budget. A superscript (10^5, m^3) sits above its line and a subscript (V_NaOH) below it, so
  // their labels reserve that extra height; the plan runs again once the tick texts are known. An x title
  // wider than the plot wraps onto `titleLines` lines.
  const planAxes = (raiseTop: number, raiseBottom: number, titleLines = 1) => {
    const padT = legendBand + (panelTitle ? 18 : ylabel ? Math.ceil(yTitle.length * ylabelSize.h + (yTitle.length - 1) * TITLE_GAP + tickH / 2 + 5 + raiseTop + dropped(ylabel)) : 14 + raiseTop);
    const titleRow = xlabel ? titleLines * xlabelSize.h + (titleLines - 1) * TITLE_GAP + 7 + raised(xlabel) : 6;
    let padB = axisAtZero ? titleRow : tickH + 4 + raiseBottom + titleRow;
    let plotH = frameH - padT - padB;
    const yScale = scale.y === 'log'
      ? logTicks(dataYMin, dataYMax, true)
      : niceTicks(dataYMin, dataYMax, true, (ticks) => plotH / (ticks.length - 1) >= tickH + 2.5);
    // A zero axis close to the frame bottom needs room for its tick row below the plot area.
    const zeroDepth = ((0 - yScale.lo) / (yScale.hi - yScale.lo)) * plotH;
    if (axisAtZero && zeroDepth < tickH + 5 + raiseBottom) { padB += tickH + 5 + raiseBottom - zeroDepth; plotH = frameH - padT - padB; }
    const yTickText = scale.y === 'log' ? yScale.ticks.map((tick) => formatLogTick(tick, yScale.ticks)) : formatTicks(yScale.ticks);
    const padL = Math.max(38, ...yTickText.map((text) => measureText(text, FONT_MIN).w + 10), ylabel ? yTitleW + 10 : 0);
    let plotW = panel.w - padL - 11;
    const xTexts = (ticks: number[]) => (scale.x === 'log' ? ticks.map((tick) => formatLogTick(tick, ticks)) : formatTicks(ticks));
    const xFits = (ticks: number[], span: number) => plotW * (scale.x === 'log' ? 1 / Math.max(1, ticks.length - 1) : (ticks[1]! - ticks[0]!) / span)
      >= Math.max(...xTexts(ticks).map((text) => measureText(text, FONT_MIN).w)) + 10;
    let xTicks = scale.x === 'log' ? logTicks(domain.min, domain.max, false).ticks : niceTicks(domain.min, domain.max, false, xFits).ticks;
    // Thin decades that would crowd their labels.
    while (xTicks.length > 2 && !xFits(xTicks, domain.max - domain.min)) xTicks = xTicks.filter((_, index) => index % 2 === 0);
    const xTickText = xTexts(xTicks);
    plotW = panel.w - padL - Math.max(11, measureText(xTickText.at(-1)!, FONT_MIN).w / 2 + 4);
    return { padT, padB, plotH, yScale, yTickText, padL, plotW, xTicks, xTickText, raiseTop };
  };
  let plan = planAxes(0, 0);
  const raiseTop = Math.max(...plan.yTickText.map(raised));
  const raiseBottom = Math.max(...plan.xTickText.map(raised));
  if (raiseTop || raiseBottom) plan = planAxes(raiseTop, raiseBottom);
  const xTitle = !xlabel || xlabelSize.w <= plan.plotW - 8 ? (xlabel ? [xlabel] : []) : wrapTitle(xlabel, plan.plotW - 8);
  if (!xTitle) fail('malformed', 'unsupported: plot x-axis label cannot remain in frame');
  if (xTitle.length > 1) plan = planAxes(raiseTop, raiseBottom, xTitle.length);
  // A legend band never squeezes the plot below a readable height; the frame grows instead.
  if (legendBand && plan.plotH < 60) {
    frameH += 60 - plan.plotH;
    plan = planAxes(raiseTop, raiseBottom, Math.max(1, xTitle.length));
    b.height = Math.max(b.height, panel.y + frameH);
  }
  const { padT, plotH, yScale, yTickText, padL, plotW, xTicks, xTickText } = plan;
  const { lo: yMin, hi: yMax } = yScale;
  if (!(plotW > 35 && plotH > 28)) fail('malformed', 'unsupported: plot panel cannot retain a readable plotting area');
  if (xTitle.some((line) => measureText(line, FONT_MIN).w > plotW - 8)) fail('malformed', 'unsupported: plot x-axis label cannot remain in frame');
  const x0 = panel.x + padL;
  const plotTop = panel.y + padT;
  const y0 = plotTop + plotH;
  const mapX = (value: number) => x0 + (scale.x === 'log' ? (Math.log10(value) - Math.log10(domain.min)) / (Math.log10(domain.max) - Math.log10(domain.min) || 1) : (value - domain.min) / (domain.max - domain.min)) * plotW;
  const mapY = (value: number) => y0 - (scale.y === 'log' ? (Math.log10(value) - Math.log10(yMin)) / (Math.log10(yMax) - Math.log10(yMin) || 1) : (value - yMin) / (yMax - yMin || 1)) * plotH;
  const xAxisY = axisAtZero ? mapY(0) : y0;
  const id = (name: string) => `${panel.prefix}${name}`;
  b.line(id('xaxis'), x0, xAxisY, x0 + plotW, xAxisY, { markerEnd: true, color: 'neutral', role: 'axis', protected: true });
  // The y axis runs a little past the top tick so its arrowhead never sits on a tick.
  b.line(id('yaxis'), x0, y0, x0, plotTop - 8, { markerEnd: true, color: 'neutral', role: 'axis', protected: true });
  xTicks.forEach((tick, tickIndex) => { const x = mapX(tick); if (x0 + plotW - x > 2) b.line(id(`xtick${tickIndex}`), x, xAxisY - 3, x, xAxisY + 3, { protected: true, width: 1, role: 'axis' }); });
  const yTickBoxes = yScale.ticks.map((tick, tickIndex) => {
    const y = mapY(tick);
    const text = yTickText[tickIndex]!;
    const size = measureText(text, FONT_MIN);
    b.line(id(`ytick${tickIndex}`), x0 - 3, y, x0 + 3, y, { protected: true, width: 1, role: 'axis' });
    b.label(id(`ytickl${tickIndex}`), text, x0 - 6 - size.w / 2, y, { protected: true, priority: 'required', slot: 'W' });
    return boxFrom(x0 - 6 - size.w / 2, y, size.w, size.h);
  });
  // One "0" labels the origin when both axes pass through it.
  const sharedOrigin = scale.x === 'linear' && domain.min === 0 && yScale.ticks.includes(0) && Math.abs(mapY(0) - xAxisY) < 0.5;
  if (panelTitle) b.label(id('panel-title'), panel.role, panel.x + panel.w / 2, panel.y + 8, { protected: true, priority: 'required' });
  // Right-aligned against the axis; the last line sits just above the top tick label.
  yTitle.forEach((line, lineIndex) => b.label(lineIndex ? `ylabel${lineIndex + 1}` : 'ylabel', line, x0 - 6 - measureText(line, FONT_MIN).w / 2, plotTop - tickH / 2 - plan.raiseTop - 1 - dropped(ylabel!) - (ylabelSize.h + TITLE_GAP) * (yTitle.length - lineIndex - 1) - ylabelSize.h / 2, { protected: true, priority: 'required' }));
  const seriesStart = b.strokes.length;
  const colors: Array<'accent' | 'muted' | 'danger'> = ['accent', 'muted', 'danger'];
  const panelKind = /step/.test(panel.role.toLowerCase()) ? 'step' : /discrete|sample/.test(panel.role.toLowerCase()) ? 'discrete' : kind;
  series.forEach((entry, seriesIndex) => {
    const dash = referenceIds.has(entry.id.toLowerCase());
    if (entry.kind === 'data' && (panelKind === 'discrete' || panelKind === 'comparison')) {
      entry.xs.forEach((value, pointIndex) => b.circle(id(`${entry.id}-point${pointIndex}`), mapX(value), mapY(entry.ys[pointIndex]!), 2.8, { color: colors[seriesIndex % colors.length], fill: 'ink', role: 'geometry' }));
    } else if (entry.kind === 'data' && panelKind === 'step') {
      const points = stepPoints(entry).flatMap((value, pointIndex) => pointIndex % 2 ? [mapY(value)] : [mapX(value)]);
      b.polyline(id(entry.id), points, { color: colors[seriesIndex % colors.length], width: 2, role: 'geometry', fill: 'none' });
    } else {
      entry.segments.forEach((segment, segmentIndex) => { const points: number[] = []; for (let i = 0; i < segment.xs.length; i++) points.push(mapX(segment.xs[i]!), mapY(segment.ys[i]!)); b.polyline(id(segmentIndex ? `${entry.id}-segment${segmentIndex}` : entry.id), points, { color: colors[seriesIndex % colors.length], width: 2, dash, role: 'geometry', fill: 'none' }); });
    }
    const label = specGetAll(spec, 'label').map(assignments).find((entryLabel) => entryLabel.kind === 'curve' && entryLabel.target?.toLowerCase() === entry.id.toLowerCase());
    if (label?.value) { const point = seriesPoint(entry, 0.72); const labelY = mapY(point.y); b.label(id(`label-${entry.id}`), label.value, mapX(point.x), labelY, { slot: 'N', priority: 'required', anchorId: id(entry.id) }); }
    const equation = legendEqs.length ? undefined : specGetAll(spec, 'eq')[seriesIndex];
    if (equation) { const point = seriesPoint(entry, 0.28); b.label(id(`eq${seriesIndex || ''}`), proseAsText(equation), mapX(point.x), mapY(point.y), { katex: true, slot: eqSlot, anchorId: id(entry.id), priority: 'required' }); }
  });
  // Every row starts at one x: the y axis when the widest equation fits after it, else the frame edge.
  const legendStart = x0 + 22 + legendW <= panel.x + panel.w - 4 ? x0 : panel.x + 4;
  if (legendStart + 22 + legendW > panel.x + panel.w - 4) fail('malformed', 'unsupported: plot equation label is wider than the figure');
  legendEqs.forEach((equation, index) => {
    const entry = series[index];
    const y = panel.y + 4 + legendRowH.slice(0, index).reduce((sum, rowH) => sum + rowH, 0) + legendRowH[index]! / 2;
    b.line(`legend-swatch${index}`, legendStart, y, legendStart + 16, y, { color: colors[index % colors.length], width: 2, dash: entry ? referenceIds.has(entry.id.toLowerCase()) : false, role: 'annotation', protected: true });
    b.label(`eq${index || ''}`, equation, legendStart + 22 + legendSizes[index]!.w / 2, y, { katex: true, protected: true, priority: 'required' });
  });
  const addPointMarker = (markerKind: 'open' | 'closed' | 'point', raw: string, markerIndex: number) => { const point = strictPair(raw); if (!point) fail('malformed', `${markerKind} marker needs x,y`); if (point.x < domain.min || point.x > domain.max) fail('malformed', 'marker lies outside plot domain'); b.circle(id(`marker-${markerKind}${markerIndex}`), mapX(point.x), mapY(point.y), 3.5, { color: markerKind === 'open' ? 'muted' : 'accent', fill: markerKind === 'open' ? 'none' : markerKind === 'closed' ? 'accent' : 'ink', role: 'annotation' }); };
  const markerCounts = { open: 0, closed: 0, point: 0 };
  for (const raw of specGetAll(spec, 'marker')) { const match = /^(open|closed|point)\s*=\s*(.*)$/i.exec(raw); if (match) { const markerKind = match[1]!.toLowerCase() as 'open' | 'closed' | 'point'; addPointMarker(markerKind, match[2]!, markerCounts[markerKind]++); } }
  for (const raw of specGetAll(spec, 'point')) addPointMarker('point', raw, markerCounts.point++);
  // `point_label`s name the points in order: `point:` records, then `marker: point=` records. A label with no
  // point to name is refused rather than dropped.
  const namedPoints = [...specGetAll(spec, 'point'), ...specGetAll(spec, 'marker').filter((raw) => /^point\s*=/i.test(raw)).map((raw) => raw.replace(/^point\s*=\s*/i, ''))];
  const labelTexts = specGetAll(spec, 'point_label');
  if (labelTexts.length > namedPoints.length) fail('malformed', 'point_label has no point to name');
  const pointLabels = namedPoints.map((_, pointIndex) => labelTexts[pointIndex] ?? (pointIndex < specGetAll(spec, 'point').length ? specGet(spec, 'point_label') : undefined));
  // With `pointKey`, each point carries its label's number and the key under the axes states the label once.
  const keyTexts = pointKey ? [...new Set(pointLabels.filter((text): text is string => Boolean(text)))] : [];
  namedPoints.forEach((raw, pointIndex) => { const point = strictPair(raw); if (!point) fail('malformed', 'point marker needs x,y'); const pointLabel = pointLabels[pointIndex]; if (pointLabel) b.label(id(`pointl${pointIndex}`), pointKey ? String(keyTexts.indexOf(pointLabel) + 1) : pointLabel, mapX(point.x), mapY(point.y), { slot: pointLabelSlot(series, point, mapX, mapY), priority: 'required' }); });
  const drop = parseDropMode(spec);
  const markedPoints = [...specGetAll(spec, 'point'), ...specGetAll(spec, 'marker').filter((raw) => /^point\s*=/i.test(raw)).map((raw) => raw.replace(/^point\s*=\s*/i, ''))];
  markedPoints.forEach((raw, pointIndex) => { const point = strictPair(raw); if (!point) fail('malformed', 'point marker needs x,y'); const px = mapX(point.x); const py = mapY(point.y); if (drop === 'both' || drop === 'x') b.line(id(`dropx${pointIndex}`), px, py, px, xAxisY, { dash: true, color: 'guide', role: 'guide' }); if (drop === 'both' || drop === 'y') b.line(id(`dropy${pointIndex}`), px, py, x0, py, { dash: true, color: 'guide', role: 'guide' }); });
  const guideCounts = { vertical: 0, horizontal: 0 };
  specGetAll(spec, 'peaks').forEach((raw) => {
    const parts = raw.trim().split(/[,\s;]+/);
    if (parts.length !== 1 || parseNumber(parts[0]!) === null) fail('malformed', 'peak declaration contains unsupported fields');
  });
  specGetAll(spec, 'guide').forEach((raw) => { const vertical = /^vertical\s*=\s*(.*)$/i.exec(raw); const horizontal = /^horizontal\s*=\s*(.*)$/i.exec(raw); if (vertical) { const value = parseNumber(vertical[1]!); if (value === null || value < domain.min || value > domain.max) fail('malformed', 'vertical guide lies outside domain'); b.line(id(`guide-vertical${guideCounts.vertical++}`), mapX(value), panel.y + padT, mapX(value), y0, { dash: true, color: 'guide', role: 'guide' }); } else if (horizontal) { const value = parseNumber(horizontal[1]!); if (value === null || (scale.y === 'log' ? value <= 0 : value < yMin || value > yMax)) fail('malformed', 'horizontal guide lies outside plotted range'); b.line(id(`guide-horizontal${guideCounts.horizontal++}`), x0, mapY(value), x0 + plotW, mapY(value), { dash: true, color: 'guide', role: 'guide' }); } else if (!/^reference\s*=/i.test(raw) && !/^drop\s*=/i.test(raw)) fail('malformed', `invalid guide ${raw}`); });
  specGetAll(spec, 'asymptote').forEach((raw, asymptoteIndex) => {
    const match = /^\s*([xy])\s*=\s*(.*?)\s*$/i.exec(raw);
    if (!match) fail('malformed', 'invalid asymptote');
    const axis = match[1]!.toLowerCase();
    const value = parseNumber(match[2]!);
    if (value === null) fail('malformed', 'asymptote needs a finite coordinate');
    if (axis === 'x') {
      if (value < domain.min || value > domain.max) fail('malformed', 'vertical asymptote lies outside domain');
      b.line(id(`asymptote-x${asymptoteIndex}`), mapX(value), panel.y + padT, mapX(value), y0, { dash: true, color: 'guide', role: 'guide' });
    } else {
      if (scale.y === 'log' ? value <= 0 || value < yMin || value > yMax : value < yMin || value > yMax) fail('malformed', 'horizontal asymptote lies outside plotted range');
      b.line(id(`asymptote-y${asymptoteIndex}`), x0, mapY(value), x0 + plotW, mapY(value), { dash: true, color: 'guide', role: 'guide' });
    }
  });
  const addSpecial = (raw: string, special: 'pole' | 'zero', specialIndex: number) => { const value = parseNumber(raw); if (value === null || value < domain.min || value > domain.max) fail('malformed', `${special} lies outside domain`); const x = mapX(value); if (special === 'pole') { const y = mapY(0); b.line(id(`marker-pole${specialIndex}`), x - 4, y - 4, x + 4, y + 4, { color: 'danger', width: 1.8, role: 'annotation' }); b.line(id(`marker-pole${specialIndex}-cross`), x - 4, y + 4, x + 4, y - 4, { color: 'danger', width: 1.8, role: 'annotation' }); } else b.circle(id(`marker-zero${specialIndex}`), x, mapY(0), 4, { color: 'muted', role: 'annotation' }); };
  specGetAll(spec, 'poles').forEach((raw, specialIndex) => addSpecial(raw, 'pole', specialIndex));
  specGetAll(spec, 'zeros').forEach((raw, specialIndex) => addSpecial(raw, 'zero', specialIndex));
  specGetAll(spec, 'marker').forEach((raw, markerSpecialIndex) => { const pole = /^pole\s*=\s*(.*)$/i.exec(raw); const zero = /^zero\s*=\s*(.*)$/i.exec(raw); if (pole) addSpecial(pole[1]!, 'pole', markerSpecialIndex); if (zero) addSpecial(zero[1]!, 'zero', markerSpecialIndex); });
  specGetAll(spec, 'peaks').forEach((raw, peakIndex) => { const value = parseNumber(raw.split(/[,\s]+/)[0]!); if (value === null || value < domain.min || value > domain.max) fail('malformed', 'peak lies outside domain'); const x = mapX(value); b.line(id(`peak${peakIndex}`), x, xAxisY, x, panel.y + padT + 6, { color: 'accent', width: 1.2, role: 'annotation' }); b.label(id(`peakn${peakIndex}`), String(peakIndex + 1), x, panel.y + padT + 5, { slot: 'N', priority: 'optional' }); });
  const regions = [...specGetAll(spec, 'region')]; const legacyShade = specGet(spec, 'shade'); if (legacyShade) regions.push(`between=fn from=${legacyShade.split(/\s+/)[0]} to=${legacyShade.split(/\s+/)[1]}`);
  regions.forEach((raw, regionIndex) => { const between = /^\s*between\s*=\s*([A-Za-z][A-Za-z0-9_.-]*(?:\s*,\s*[A-Za-z][A-Za-z0-9_.-]*)?)\s+from\s*=\s*([^\s]+)\s+to\s*=\s*([^\s]+)\s*$/i.exec(raw); if (!between) fail('malformed', 'region needs between, from, and to'); const from = parseNumber(between[2]!); const to = parseNumber(between[3]!); if (from === null || to === null || !(to > from) || from < domain.min || to > domain.max) fail('malformed', 'region bounds are invalid'); const first = targetSeries(allSeries, between[1]!.split(',')[0]!); if (!first) fail('malformed', `region target ${between[1]} is missing`); const secondName = between[1]!.split(',')[1]; const second = secondName ? targetSeries(allSeries, secondName) : undefined; if (secondName && !second) fail('malformed', 'region target ' + secondName + ' is missing'); const upper = first.xs.map((value, pointIndex) => ({ x: value, y: first.ys[pointIndex]! })).filter((point) => point.x >= from && point.x <= to); if (upper.length < 2) fail('malformed', 'region has too few samples'); const points = upper.map((point) => [mapX(point.x), mapY(point.y)]).flat(); if (second) points.push(...second.xs.map((value, pointIndex) => ({ x: value, y: second.ys[pointIndex]! })).filter((point) => point.x >= from && point.x <= to).reverse().map((point) => [mapX(point.x), mapY(point.y)]).flat()); else points.push(mapX(to), mapY(0), mapX(from), mapY(0)); const regionId = id('region' + regionIndex); b.polygon(regionId, points, { color: 'accent', fill: 'tint', role: 'geometry' }); const regionLabel = specGetAll(spec, 'label').map(assignments).find((label) => label.kind === 'region'); if (regionLabel?.value) { const center = upper[Math.floor(upper.length / 2)]!; b.label(id('region-label' + regionIndex), regionLabel.value, mapX(center.x), mapY(center.y), { slot: 'N', priority: 'required', anchorId: regionId }); } });
  // Tick labels on a zero axis inside the plot go on whichever side of the axis misses every curve.
  const obstacles = strokeSegments({ strokes: [...b.strokes.slice(seriesStart), ...b.strokes.filter((stroke) => stroke.id === id('yaxis'))] } as Scene);
  const xLabels = xTicks.flatMap((tick, tickIndex) => {
    if (sharedOrigin && tick === 0) return [];
    const text = xTickText[tickIndex]!;
    const x = mapX(tick);
    const size = measureText(text, FONT_MIN);
    const below = xAxisY + 4 + size.h / 2 + raised(text);
    // Centred under (or over) the tick first; beside it when a curve crosses the axis right there.
    const shift = size.w / 2 + 3;
    const spot = (axisAtZero ? [below, xAxisY - 4 - size.h / 2] : [below]).flatMap((cy) => [0, shift, -shift].map((dx) => ({ x: x + dx, y: cy })))
      .sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))
      .find((candidate) => {
        // A superscript rises above the measured box.
        const box = boxFrom(candidate.x, candidate.y - raised(text) / 2, size.w, size.h + raised(text));
        return !boxHitsAny(box, obstacles, 1) && !yTickBoxes.some((other) => boxesOverlap(box, other, 1));
      });
    return [{ tickIndex, text, spot, below: { x, y: below }, h: size.h }];
  });
  const readable = xLabels.filter((entry) => entry.spot).length >= 2;
  let tickRowBottom = xAxisY;
  for (const entry of xLabels) {
    const at = readable ? entry.spot : entry.below;
    if (!at) continue;
    b.label(id(`xtickl${entry.tickIndex}`), entry.text, at.x, at.y, { protected: true, priority: 'required' });
    tickRowBottom = Math.max(tickRowBottom, at.y + entry.h / 2);
  }
  xTitle.forEach((line, lineIndex) => b.label(lineIndex ? `xlabel${lineIndex + 1}` : 'xlabel', line, x0 + plotW / 2, Math.max(y0, tickRowBottom) + 2 + raised(xlabel!) + (xlabelSize.h + TITLE_GAP) * lineIndex + xlabelSize.h / 2, { protected: true, priority: 'required' }));
  if (keyTexts.length) {
    // Key rows under the x title (one or two columns, read down each column); the frame grows to hold them.
    const titleBottom = Math.max(y0, tickRowBottom) + (xTitle.length ? 2 + raised(xlabel!) + xlabelSize.h * xTitle.length + (xTitle.length - 1) * TITLE_GAP : 0);
    const numW = measureText(String(keyTexts.length), FONT_MIN).w;
    const sizes = keyTexts.map((text) => measureText(text, FONT_MIN));
    const entryW = numW + 6 + Math.max(...sizes.map((size) => size.w));
    if (entryW > panel.w - 8) fail('malformed', 'unsupported: plot point label is wider than the figure');
    const columns = 2 * entryW + 14 <= panel.w - 8 ? 2 : 1;
    const rows = Math.ceil(keyTexts.length / columns);
    const rowH = Math.max(...sizes.map((size) => size.h)) + 2;
    const keyW = columns * entryW + (columns - 1) * 14;
    const keyX = x0 + keyW <= panel.x + panel.w - 4 ? x0 : panel.x + 4;
    const keyTop = titleBottom + 6;
    keyTexts.forEach((text, k) => {
      const x = keyX + Math.floor(k / rows) * (entryW + 14);
      const y = keyTop + (k % rows) * rowH + rowH / 2;
      b.label(id(`pointkey-n${k}`), String(k + 1), x + numW / 2, y, { protected: true, priority: 'required' });
      b.label(id(`pointkey${k}`), text, x + numW + 6 + sizes[k]!.w / 2, y, { protected: true, priority: 'required' });
    });
    b.height = Math.max(b.height, keyTop + rows * rowH + 4);
  }
}

/** `legend`: equations in a legend band above the axes — always for two or more (curve-side labels crowd). */
export function buildPlotScene(spec: SpecDoc, ctx: CompileCtx, legend = specGetAll(spec, 'eq').length > 1, pointKey = false): Scene {
  validatePlotDeclarations(spec);
  const emptyDeclaration = spec.emptyDeclarations.keys().next().value as string | undefined;
  if (emptyDeclaration) fail('malformed', `plot declaration ${emptyDeclaration} must not be empty`);
  const kind = ensureSupportedKind(spec);
  const domain = parseDomain(spec);
  const scale = parseScale(spec);
  const variable = (specGet(spec, 'var') ?? 'x').trim().toLowerCase();
  if (!/^[a-z_][a-z0-9_]*$/i.test(variable)) fail('malformed', 'plot variable must be an identifier');
  for (const raw of specGetAll(spec, 'marker')) {
    const match = /^\s*(open|closed|point|pole|zero)\s*=\s*(.*?)\s*$/i.exec(raw);
    if (!match || !match[2]) fail('malformed', `unsupported plot marker ${raw}`);
  }
  const poles = parsePoleValues(spec);
  const functions: Series[] = [];
  for (const [index, source] of [...specGetAll(spec, 'fn'), ...specGetAll(spec, 'fn2')].entries()) { const compiled = compileExpr(source); const segments = sampleFn(compiled, variable, domain.min, domain.max, poles, scale.x === 'log' && domain.min > 0); if (!segments.length) fail('malformed', `function ${index + 1} has no finite samples`); functions.push({ id: index ? `fn${index + 1}` : 'fn', kind: 'function', xs: segments.flatMap((segment) => segment.xs), ys: segments.flatMap((segment) => segment.ys), segments, source }); }
  const data: Series[] = [];
  for (const [index, raw] of specGetAll(spec, 'data').entries()) { const points = parseData(raw); if (points.some((point) => point.x < domain.min || point.x > domain.max)) fail('malformed', 'data sample lies outside domain'); if (scale.x === 'log' && points.some((point) => !(point.x > 0))) fail('malformed', 'log x scale needs positive samples'); const id = index ? `data${index + 1}` : 'data'; const segment = { xs: points.map((point) => point.x), ys: points.map((point) => point.y) }; data.push({ id, kind: 'data', xs: segment.xs, ys: segment.ys, segments: [segment] }); }
  if (specGetAll(spec, 'eq').length > functions.length + data.length) fail('malformed', 'plot has more equations than plotted series');
  if (!functions.length && !data.length && !specHas(spec, 'peaks') && !specHas(spec, 'poles')) fail('malformed', 'plot needs fn or data');
  if (scale.x === 'log' && functions.some((series) => series.xs.some((value) => !(value > 0)))) fail('malformed', 'log x scale needs a positive domain');
  const panels = parsePanels(spec); const { w, h } = frameSize(ctx.profile); const b = new SceneBuilder('plot', w, h); b.hl(spec.highlight); const panelGap = 8; const panelHeight = panels.length ? (h - panelGap * (panels.length - 1)) / panels.length : h; const allSeries = [...functions, ...data]; validateLabelAssignments(spec, allSeries); parseDropMode(spec); const referenceIds = new Set<string>(); const eqSlot = parseEqSlot(spec);
  for (const raw of specGetAll(spec, 'guide')) { const reference = /^\s*reference\s*=\s*([A-Za-z][A-Za-z0-9_.-]*)\s*$/i.exec(raw); if (reference) { const target = targetSeries(allSeries, reference[1]!); if (!target) fail('malformed', `guide reference ${reference[1]} is missing`); referenceIds.add(reference[1]!.trim().toLowerCase()); } else if (/^\s*reference\s*=/i.test(raw)) fail('malformed', `invalid guide reference ${raw}`); }
  panels.forEach((panelSpec, index) => { const y = index * (panelHeight + panelGap); const panel = { role: panelSpec.role, x: 0, y, w, h: panelHeight, prefix: `${panelSpec.id}-` }; b.panel(panelSpec.id, panelSpec.role, 0, y, w, panelHeight); drawPlotPanel(b, panel, panelSeries(panelSpec, index, panels, functions, data), allSeries, spec, domain, scale, kind, referenceIds, true, eqSlot); });
  if (!panels.length) drawPlotPanel(b, { role: kind, x: 0, y: 0, w, h, prefix: '' }, allSeries, allSeries, spec, domain, scale, kind, referenceIds, false, eqSlot, legend, pointKey);
  // `caption:` is set under the figure by the panel and the report (wrapped text), not inside the plot.
  return b.scene();
}

export function compilePlot(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  try {
    let legend = specGetAll(spec, 'eq').length > 1;
    let pointKey = false;
    let scene = buildPlotScene(spec, ctx, legend, pointKey);
    let layout = layoutScene(scene);
    // A label with no free slot moves out of the drawing rather than hiding the plot: an equation to the
    // legend band, point labels to a numbered key.
    for (let retry = 0; retry < 2 && !specHas(spec, 'panel'); retry++) {
      if (layout.ok) break;
      if (!legend && /label eq\d*$/.test(layout.reason)) legend = true;
      else if (!pointKey && /label pointl\d+$/.test(layout.reason)) pointKey = true;
      else break;
      scene = buildPlotScene(spec, ctx, legend, pointKey);
      layout = layoutScene(scene);
    }
    if (!layout.ok) return layout;
    if (!strokeBoundsCertificate(scene, layout)) return { ok: false, code: 'unsatisfiable', reason: 'plot stroke bounds exceed the frame' };
    return { ok: true, svg: emitSvg(scene, layout), overlays: overlaysFromLayout(layout), scene };
  } catch (error) { if (error instanceof PlotSpecError) return { ok: false, code: error.code, reason: error.message }; if (error instanceof ExprError) return { ok: false, code: 'expr', reason: error.message }; return { ok: false, code: 'throw', reason: error instanceof Error ? error.message : 'plot failed' }; }
}

export function evaluatePlotFn(source: string, variable: string, value: number): number { return compileExpr(source)({ [variable]: value }); }

export { parseNumber as specNumber, dropped, formatTicks, niceTicks, raised };
