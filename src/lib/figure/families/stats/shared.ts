/**
 * Shared plumbing of the statistics families: tolerant readers for model-written numbers and lists,
 * text metrics, number formatting, and the placement certificate every stats figure passes.
 *
 * Every label a stats family draws is placed by the family itself (measured, then asserted). The
 * layout kernel is used as a checker: a label it would have to move means the figure is refused.
 */
import { FONT_MIN, type CompileCtx, type CompileResult, type Scene, type SceneStroke, type SemanticColor } from '../../types';
import { measureText } from '../../geom';
import { emitSvg } from '../../emit';
import { layoutScene, overlaysFromLayout, strokeSegments } from '../../slk';
import type { SceneBuilder } from '../../scene-build';
import type { SpecDoc } from '../../spec';
import type { FamilyCompiler } from '../types';

/** Raised for input the family cannot draw faithfully; `guard` turns it into a `malformed` result. */
export class StatsError extends Error {}

export function refuse(reason: string): never {
  throw new StatsError(reason);
}

export function guard(compile: (spec: SpecDoc, ctx: CompileCtx) => CompileResult): FamilyCompiler {
  return (spec, ctx) => {
    try {
      return compile(spec, ctx);
    } catch (error) {
      if (error instanceof StatsError) return { ok: false, code: 'malformed', reason: error.message };
      return { ok: false, code: 'throw', reason: error instanceof Error ? error.message : 'figure failed' };
    }
  };
}

/** Every value of a key, inline (`key: v`) and listed (`  - v`), marked as read. */
export function readAll(spec: SpecDoc, key: string): string[] {
  const k = key.toLowerCase();
  const all = [...(spec.values.get(k) ?? []), ...(spec.lists.get(k) ?? [])];
  if (all.length) spec.consumed?.set(k, Math.max(all.length, spec.consumed.get(k) ?? 0));
  return all;
}

/** The single value of a scalar key. A key stated twice with different values is refused, never guessed. */
export function readOne(spec: SpecDoc, ...keys: string[]): string | undefined {
  const found = keys.flatMap((key) => readAll(spec, key).map((value) => ({ key, value: value.trim() })));
  const first = found[0];
  if (!first) return undefined;
  const clash = found.find((entry) => entry.value.toLowerCase() !== first.value.toLowerCase());
  if (clash) refuse(`${first.key} is stated twice (${first.value}, ${clash.value})`);
  return first.value;
}

export function present(spec: SpecDoc, key: string): boolean {
  return spec.values.has(key.toLowerCase()) || spec.lists.has(key.toLowerCase());
}

/** Keys a figure kind has no use for are named in the refusal instead of surfacing as "unconsumed". */
export function rejectKeys(spec: SpecDoc, what: string, keys: string[]): void {
  const stray = keys.filter((key) => present(spec, key));
  if (stray.length) refuse(`${what} does not use ${stray.join(', ')}`);
}

const DASHES = /[−‒–—﹣－]/g;
const SPACES = /[    ]/g;

/** Typographic minus signs and no-break spaces, as a model or a paste may write them. */
export function plain(raw: string): string {
  return raw.replace(DASHES, '-').replace(SPACES, ' ').trim();
}

const THOUSANDS = /^[+-]?[1-9]\d{0,2}(?:[, _]\d{3})+(?:\.\d+)?$/;
const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

/** A finite number in ordinary writing: `−3.5`, `+2`, `1,200`, `1 200`, `4e3`. Null for anything else. */
export function parseNum(raw: string): number | null {
  let text = plain(raw);
  if (THOUSANDS.test(text)) text = text.replace(/[, _]/g, '');
  if (!DECIMAL.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export interface Measured {
  value: number;
  /** `$`, `€`, `£` or `¥` written before the number. */
  prefix: string;
  /** `%` or a unit word written after the number. */
  suffix: string;
}

/** A number with the currency sign or unit a model may attach to it (`45%`, `$1,200`, `12 kg`). */
export function parseMeasured(raw: string): Measured | null {
  const text = plain(raw);
  const bare = parseNum(text);
  if (bare !== null) return { value: bare, prefix: '', suffix: '' };
  const match = /^([+-]?)\s*([$€£¥]?)\s*([+-]?[\d.,_ ]*\d(?:e[+-]?\d+)?)\s*(%|°[A-Za-z]?|[A-Za-zµμ]+(?:\/[A-Za-z]+)?)?$/i.exec(text);
  if (!match || (match[1] && /^[+-]/.test(match[3]!))) return null;
  const value = parseNum(`${match[1]}${match[3]!.trim()}`);
  return value === null ? null : { value, prefix: match[2] ?? '', suffix: match[4] ?? '' };
}

function unbracket(raw: string): string {
  return plain(raw).replace(/^\[(.*)\]$/, '$1').replace(/[,;]\s*$/, '').trim();
}

/**
 * The items of a numeric list. `;` always separates. A comma separates too, except that in a list whose
 * separators are visibly "comma, space" a tight comma before three digits is a thousands separator
 * (`1,200, 3,400`). When the expected length is known it decides between the two readings.
 */
export function splitNumbers(raw: string, expected?: number): string[] {
  const text = unbracket(raw);
  if (!text) return [];
  if (text.includes(';')) return text.split(';').map((item) => item.trim());
  if (!text.includes(',')) return text.split(/\s+/);
  const loose = text.split(',').map((item) => item.trim());
  const grouped = text.split(/,(?=\s)/).map((item) => item.trim());
  const groupedReads = grouped.length < loose.length
    && grouped.every((item) => !item.includes(',') || THOUSANDS.test(item.replace(/^[$€£¥]\s*/, '').replace(/\s*(?:%|[A-Za-zµμ°/]+)$/, '')));
  if (!groupedReads) return loose;
  if (expected !== undefined) return grouped.length === expected ? grouped : loose.length === expected ? loose : grouped;
  return grouped.length > 1 ? grouped : loose;
}

/** Names in a list: `;` or `|` separate when present (so a name may hold a comma), otherwise commas. */
export function splitNames(raw: string): string[] {
  const text = unbracket(raw);
  if (!text) return [];
  const separator = text.includes(';') ? ';' : text.includes('|') ? '|' : ',';
  return text.split(separator).map((item) => item.trim().replace(/^(["'])(.*)\1$/, '$2').trim());
}

export const TEXT_H = measureText('0', FONT_MIN).h;

export function textW(text: string, katex = false): number {
  return measureText(text, FONT_MIN, katex).w;
}

export function textSize(text: string, katex = false): { w: number; h: number } {
  return measureText(text, FONT_MIN, katex);
}

/** A label asserted at its centre. Stats labels never rely on the kernel to find them room. */
export function put(b: SceneBuilder, id: string, text: string, cx: number, cy: number, katex = false): void {
  b.label(id, text, cx, cy, { protected: true, priority: 'required', katex });
}

export function putLeft(b: SceneBuilder, id: string, text: string, left: number, cy: number, katex = false): void {
  put(b, id, text, left + textW(text, katex) / 2, cy, katex);
}

export function putRight(b: SceneBuilder, id: string, text: string, right: number, cy: number, katex = false): void {
  put(b, id, text, right - textW(text, katex) / 2, cy, katex);
}

/** Up to `maxLines` balanced lines no wider than `width`, broken at spaces; null when the text cannot fit. */
export function wrapText(text: string, width: number, maxLines = 2): string[] | null {
  const words = text.trim().split(/\s+/);
  if (textW(words.join(' ')) <= width) return [words.join(' ')];
  if (maxLines < 2) return null;
  let best: string[] | null = null;
  let bestWidth = Infinity;
  for (let k = 1; k < words.length; k++) {
    const lines = [words.slice(0, k).join(' '), words.slice(k).join(' ')];
    const widest = Math.max(...lines.map((line) => textW(line)));
    if (widest <= width && widest < bestWidth) {
      best = lines;
      bestWidth = widest;
    }
  }
  return best;
}

const MINUS = '−';

function group(digits: string): string {
  const [whole, fraction] = digits.split('.') as [string, string | undefined];
  const grouped = whole.length > 4 ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : whole;
  return fraction ? `${grouped}.${fraction}` : grouped;
}

/**
 * A number as a textbook prints it: a true minus sign, at most `decimals` decimals with trailing zeros
 * dropped, thousands grouped from 10,000 up, and a power of ten outside 10^-5 .. 10^9.
 */
export function fmt(value: number, decimals = 4): string {
  if (!Number.isFinite(value)) return Number.isNaN(value) ? '' : value > 0 ? '∞' : `${MINUS}∞`;
  const abs = Math.abs(value);
  let body: string;
  if (abs !== 0 && (abs >= 1e9 || abs < 1e-5)) {
    const exponent = Math.floor(Math.log10(abs) + 1e-12);
    const mantissa = Number((abs / 10 ** exponent).toPrecision(3));
    body = `${mantissa === 1 ? '' : `${mantissa}×`}10^${exponent < 0 ? `${MINUS}${-exponent}` : exponent}`;
  } else {
    const fixed = abs.toFixed(Math.max(0, Math.min(10, decimals)));
    body = group(fixed.includes('.') ? fixed.replace(/\.?0+$/, '') : fixed);
  }
  return value < 0 && body !== '0' ? `${MINUS}${body}` : body;
}

/** Decimals needed to print `value` exactly, up to `cap`. */
export function decimalsOf(value: number, cap = 6): number {
  for (let d = 0; d <= cap; d++) if (Math.abs(value - Number(value.toFixed(d))) < 1e-9 * Math.max(1, Math.abs(value))) return d;
  return cap;
}

/** Fixed decimals, as on an axis whose ticks share one precision (`0`, `0.5`, `1.0`). */
export function fmtFixed(value: number, decimals: number): string {
  const abs = Math.abs(value);
  if (abs < 1e-12) return '0';
  if (abs >= 1e9 || abs < 1e-5) return fmt(value);
  const body = group(abs.toFixed(decimals));
  return value < 0 && Number(abs.toFixed(decimals)) !== 0 ? `${MINUS}${body}` : body;
}

export interface Scale {
  lo: number;
  hi: number;
  step: number;
  ticks: number[];
  texts: string[];
}

/**
 * Nice ticks at 1, 2, 2.5 or 5 x 10^k, the same steps as the plot engine. The range snaps outward to
 * whole steps so the first and last tick bound every value; `maxTicks` is how many labels the axis has
 * room for. Integer axes (counts) never take a fractional step.
 */
export function niceScale(min: number, max: number, maxTicks: number, opts: { integer?: boolean; expand?: boolean } = {}): Scale {
  let lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (hi - lo < 1e-12 * Math.max(1, Math.abs(hi))) {
    const pad = hi === 0 ? 1 : Math.abs(hi) * 0.5;
    lo -= lo === 0 || opts.integer ? 0 : pad;
    hi += opts.integer ? Math.max(1, Math.ceil(pad)) : pad;
  }
  const expand = opts.expand ?? true;
  const span = hi - lo;
  const top = Math.floor(Math.log10(span));
  let best: (Scale & { score: number }) | undefined;
  for (let e = top - 2; e <= top + 1; e++) {
    for (const mantissa of [1, 2, 2.5, 5]) {
      const step = mantissa * 10 ** e;
      if (opts.integer && (step < 1 || !Number.isInteger(Number(step.toPrecision(12))))) continue;
      const from = expand ? Math.floor(lo / step + 1e-9) * step : Math.ceil(lo / step - 1e-9) * step;
      const to = expand ? Math.ceil(hi / step - 1e-9) * step : Math.floor(hi / step + 1e-9) * step;
      const count = Math.round((to - from) / step) + 1;
      if (count < 2 || count > Math.max(2, maxTicks)) continue;
      const score = (count < 4 ? (4 - count) * 1.5 : Math.max(0, count - 7)) + (mantissa === 2.5 ? 1 : 0)
        + (expand ? ((to - from) / span - 1) * 3 : 0);
      if (!best || score < best.score - 1e-9) {
        const ticks = Array.from({ length: count }, (_, i) => Number((from + i * step).toPrecision(12)));
        best = { lo: expand ? from : lo, hi: expand ? to : hi, step, ticks, texts: [], score };
      }
    }
  }
  const scale: Scale = best ? { lo: best.lo, hi: best.hi, step: best.step, ticks: best.ticks, texts: [] } : { lo, hi, step: span, ticks: [lo, hi], texts: [] };
  const decimals = Math.max(...scale.ticks.map((tick) => decimalsOf(tick)));
  scale.texts = scale.ticks.map((tick) => fmtFixed(tick, decimals));
  return scale;
}

export interface FillStyle {
  color: SemanticColor;
  fill: SceneStroke['fill'];
  pattern?: SceneStroke['pattern'];
}

/**
 * Series identity within the figure vocabulary: two colours, a wash, two textures and bare paper. The
 * order keeps neighbours far apart in grey as well as in colour (solid, wash, hatch, dark, dots, open),
 * so a chart still reads in monochrome print.
 */
export const FILL_STYLES: readonly FillStyle[] = [
  { color: 'accent', fill: 'ink' },
  { color: 'accent', fill: 'tint' },
  { color: 'neutral', fill: 'none', pattern: 'hatch' },
  { color: 'neutral', fill: 'ink' },
  { color: 'neutral', fill: 'none', pattern: 'dots' },
  { color: 'neutral', fill: 'paper' },
];

export function fillStyle(index: number): FillStyle {
  return FILL_STYLES[index % FILL_STYLES.length]!;
}

export const SWATCH = 9;

export interface LegendItem {
  text: string;
  draw: (b: SceneBuilder, id: string, x: number, cy: number) => void;
}

/** Legend rows from `left`, wrapped at `right`: a swatch, then the name. Returns the height used. */
export function drawLegend(b: SceneBuilder, items: LegendItem[], left: number, right: number, top: number): number {
  const rowH = TEXT_H + 2;
  let x = left;
  let row = 0;
  items.forEach((item, index) => {
    const width = SWATCH + 4 + textW(item.text);
    if (width > right - left) refuse(`legend entry "${item.text}" is too long to print`);
    if (x > left && x + width > right) {
      x = left;
      row += 1;
    }
    const cy = top + row * rowH + rowH / 2;
    item.draw(b, `legend-swatch-${index}`, x, cy);
    putLeft(b, `legend-${index}`, item.text, x + SWATCH + 4, cy);
    x += width + 12;
  });
  return (row + 1) * rowH;
}

export function swatchRect(style: FillStyle): LegendItem['draw'] {
  return (b, id, x, cy) => b.rect(id, x, cy - SWATCH / 2, SWATCH, SWATCH, { color: style.color, fill: style.fill, pattern: style.pattern, width: 1.2, role: 'annotation' });
}

/**
 * Emit a scene whose labels were all placed by the family. The kernel must accept every label exactly
 * where it was asserted, at the minimum text size, and every stroke must lie inside the frame;
 * otherwise the figure is hidden rather than shown with a displaced or clipped part.
 */
export function finish(scene: Scene): CompileResult {
  const layout = layoutScene(scene);
  if (!layout.ok) return layout;
  if (layout.fontSize !== FONT_MIN) return { ok: false, code: 'unsatisfiable', reason: 'labels do not fit at the minimum text size' };
  for (const placed of layout.placed) {
    if (Math.abs(placed.x - placed.label.x) > 0.01 || Math.abs(placed.y - placed.label.y) > 0.01) {
      return { ok: false, code: 'unsatisfiable', reason: `label ${placed.label.id} does not fit where it belongs` };
    }
  }
  const segments = strokeSegments({ ...scene, strokes: scene.strokes.map((stroke) => ({ ...stroke, protected: false })) });
  const inside = segments.every((segment) => [segment.x1, segment.x2].every((x) => Number.isFinite(x) && x >= -0.5 && x <= scene.width + 0.5)
    && [segment.y1, segment.y2].every((y) => Number.isFinite(y) && y >= -0.5 && y <= scene.height + 0.5));
  if (!inside) return { ok: false, code: 'unsatisfiable', reason: 'figure does not fit its frame' };
  return { ok: true, svg: emitSvg(scene, layout), overlays: overlaysFromLayout(layout), scene };
}
