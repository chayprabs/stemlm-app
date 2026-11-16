/**
 * Shared plumbing of the science families: tolerant readers for model-written values, text metrics,
 * number formatting, and the placement certificate every figure passes before it is shown.
 *
 * A science family places each label itself (measured, then asserted). The layout kernel acts as the
 * checker: a label it would have to move, shrink or push out of the frame hides the figure.
 */
import { FONT_MIN, type CompileCtx, type CompileFailCode, type CompileResult, type Scene } from '../../types';
import { measureText } from '../../geom';
import { emitSvg } from '../../emit';
import { layoutScene, overlaysFromLayout, strokeSegments } from '../../slk';
import type { SceneBuilder } from '../../scene-build';
import type { SpecDoc } from '../../spec';
import type { FamilyCompiler } from '../types';

/** Raised for input a family cannot draw faithfully; `guard` turns it into a failed compile. */
export class FigureError extends Error {
  constructor(message: string, readonly code: CompileFailCode = 'malformed') {
    super(message);
  }
}

export function refuse(reason: string, code: CompileFailCode = 'malformed'): never {
  throw new FigureError(reason, code);
}

export function guard(compile: (spec: SpecDoc, ctx: CompileCtx) => CompileResult): FamilyCompiler {
  return (spec, ctx) => {
    try {
      return compile(spec, ctx);
    } catch (error) {
      if (error instanceof FigureError) return { ok: false, code: error.code, reason: error.message };
      return { ok: false, code: 'throw', reason: error instanceof Error ? error.message : 'figure failed' };
    }
  };
}

/** Every value of a key, inline (`key: v`) and listed (`  - v`), marked as read. */
export function readAll(spec: SpecDoc, ...keys: string[]): string[] {
  const all: string[] = [];
  for (const key of keys) {
    const k = key.toLowerCase();
    const found = [...(spec.values.get(k) ?? []), ...(spec.lists.get(k) ?? [])];
    if (found.length) spec.consumed?.set(k, Math.max(found.length, spec.consumed.get(k) ?? 0));
    all.push(...found);
  }
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

/** The words of a `show:`-style option list: commas, semicolons, `+`, `and` or spaces separate. */
export function readOptions(spec: SpecDoc, ...keys: string[]): string[] {
  return readAll(spec, ...keys)
    .flatMap((value) => plain(value).toLowerCase().split(/[,;+&]|\band\b|\s+/))
    .map((item) => item.trim())
    .filter(Boolean);
}

const SUPERSCRIPTS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-',
};
const SUPERSCRIPT_RUN = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g;
const DASHES = /[−‒–—﹣－]/g;
const SPACES = /[  -   　]/g;

/** Typographic minus signs and no-break spaces, as a model or a paste may write them. */
export function plain(raw: string): string {
  return raw.replace(DASHES, '-').replace(SPACES, ' ').trim();
}

/** `plain`, with Unicode superscripts rewritten as `^…` so `3d⁶4s²` and `Fe³⁺` read like their ASCII forms. */
export function plainSuperscripts(raw: string): string {
  return plain(raw).replace(SUPERSCRIPT_RUN, (run) => `^${[...run].map((ch) => SUPERSCRIPTS[ch]).join('')}`);
}

const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

/** A finite number in ordinary writing: `−3.5`, `+2`, `1,200`, `4e3`. Null for anything else. */
export function parseNum(raw: string): number | null {
  let text = plain(raw);
  if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text)) text = text.replace(/,/g, '');
  if (!DECIMAL.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** Decimals a number was written with (`12.50` → 2), which is the precision its differences are quoted to. */
export function writtenDecimals(raw: string): number {
  const match = /\.(\d+)/.exec(plain(raw).replace(/e[+-]?\d+$/i, ''));
  return match ? match[1]!.length : 0;
}

/** Significant figures a number was written with; trailing zeros of an integer are not counted (`200` → 1). */
export function writtenSigFigs(raw: string): number {
  const digits = plain(raw).replace(/e[+-]?\d+$/i, '').replace(/^[+-]/, '');
  if (digits.includes('.')) return digits.replace('.', '').replace(/^0+/, '').length || 1;
  return digits.replace(/^0+/, '').replace(/0+$/, '').length || 1;
}

export const MINUS = '−';

const signed = (negative: boolean, body: string) => (negative && /[1-9]/.test(body) ? `${MINUS}${body}` : body);

/** Fixed decimals with a true minus sign (`−40`, `9.30`). */
export function fmtFixed(value: number, decimals: number): string {
  return signed(value < 0, Math.abs(value).toFixed(Math.max(0, Math.min(8, decimals))));
}

/**
 * A value to `digits` significant figures, as a worked answer quotes it: trailing zeros kept (`20.0`),
 * integer digits never rounded away (`1235`, not `1240`), and m×10^k outside 10^-3 .. 10^6.
 */
export function fmtSig(value: number, digits = 3): string {
  if (!Number.isFinite(value)) return '';
  const abs = Math.abs(value);
  if (abs < 1e-12) return '0';
  if (abs >= 1e6 || abs < 1e-3) {
    const exponent = Math.floor(Math.log10(abs) + 1e-12);
    const mantissa = (abs / 10 ** exponent).toPrecision(digits);
    return signed(value < 0, `${mantissa}×10^${exponent < 0 ? `${MINUS}${-exponent}` : exponent}`);
  }
  if (abs >= 10 ** digits) return signed(value < 0, String(Math.round(abs)));
  // Round first: 9.996 at three figures is 10.0, one digit wider than its unrounded magnitude suggests.
  const rounded = Number(abs.toPrecision(digits));
  const whole = Math.floor(Math.log10(rounded) + 1e-12) + 1;
  return signed(value < 0, rounded.toFixed(Math.max(0, digits - whole)));
}

export const TEXT_H = measureText('0', FONT_MIN).h;

export function textW(text: string): number {
  return measureText(text, FONT_MIN).w;
}

/** A label asserted at its centre. Science labels never rely on the kernel to find them room. */
export function put(b: SceneBuilder, id: string, text: string, cx: number, cy: number, notation?: 'chem' | 'orbital'): void {
  b.label(id, text, cx, cy, { protected: true, priority: 'required', notation });
}

export function putLeft(b: SceneBuilder, id: string, text: string, left: number, cy: number): void {
  put(b, id, text, left + textW(text) / 2, cy);
}

export function putRight(b: SceneBuilder, id: string, text: string, right: number, cy: number): void {
  put(b, id, text, right - textW(text) / 2, cy);
}

/** Lines no wider than `width`, broken at spaces and balanced; null when a word alone is too wide or `maxLines` is exceeded. */
export function wrapText(text: string, width: number, maxLines = 2): string[] | null {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.some((word) => textW(word) > width)) return null;
  for (let count = 1; count <= maxLines; count++) {
    const lines = balance(words, count, width);
    if (lines) return lines;
  }
  return null;
}

/** `words` in `count` lines, each within `width`, with the widest line as narrow as possible. */
function balance(words: string[], count: number, width: number): string[] | null {
  if (count === 1) return textW(words.join(' ')) <= width ? [words.join(' ')] : null;
  let best: string[] | null = null;
  let bestWidest = Infinity;
  for (let cut = 1; cut <= words.length - (count - 1); cut++) {
    const head = words.slice(0, cut).join(' ');
    const headW = textW(head);
    if (headW > width) break;
    const rest = balance(words.slice(cut), count - 1, width);
    if (!rest) continue;
    const widest = Math.max(headW, ...rest.map(textW));
    if (widest < bestWidest) {
      best = [head, ...rest];
      bestWidest = widest;
    }
  }
  return best;
}

export function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_.-]+/g, '-');
}

export interface Ticks {
  lo: number;
  hi: number;
  ticks: number[];
  texts: string[];
}

/**
 * Nice ticks at 1, 2, 2.5 or 5 × 10^k, the same steps as the plot engine. The range snaps outward to whole
 * steps so the first and last tick bound every value; `maxTicks` is how many labels the axis has room for.
 */
export function niceTicks(min: number, max: number, maxTicks: number): Ticks {
  const lo = Math.min(min, max);
  let hi = Math.max(min, max);
  if (hi - lo < 1e-12 * Math.max(1, Math.abs(hi))) hi = lo + (lo === 0 ? 1 : Math.abs(lo));
  const span = hi - lo;
  const top = Math.floor(Math.log10(span));
  let best: { from: number; step: number; count: number; score: number } | undefined;
  for (let e = top - 2; e <= top + 1; e++) {
    for (const mantissa of [1, 2, 2.5, 5]) {
      const step = mantissa * 10 ** e;
      const from = Math.floor(lo / step + 1e-9) * step;
      const to = Math.ceil(hi / step - 1e-9) * step;
      const count = Math.round((to - from) / step) + 1;
      if (count < 2 || count > Math.max(2, maxTicks)) continue;
      const score = (count < 4 ? (4 - count) * 1.5 : Math.max(0, count - 7)) + (mantissa === 2.5 ? 1 : 0) + ((to - from) / span - 1) * 3;
      if (!best || score < best.score - 1e-9) best = { from, step, count, score };
    }
  }
  const ticks = best
    ? Array.from({ length: best.count }, (_, i) => Number((best.from + i * best.step).toPrecision(12)))
    : [lo, hi];
  const decimals = Math.max(...ticks.map((tick) => {
    for (let d = 0; d <= 6; d++) if (Math.abs(tick - Number(tick.toFixed(d))) < 1e-9 * Math.max(1, Math.abs(tick))) return d;
    return 6;
  }));
  return { lo: ticks[0]!, hi: ticks.at(-1)!, ticks, texts: ticks.map((tick) => fmtFixed(tick, decimals)) };
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
