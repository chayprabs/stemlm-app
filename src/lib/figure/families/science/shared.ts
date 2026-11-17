/**
 * Shared plumbing of the science families: tolerant readers for model-written values, text metrics,
 * number formatting, label placement, and the placement certificate every figure passes before it is shown.
 *
 * A science family places each label itself (measured, then asserted). The layout kernel acts as the
 * checker: a label it would have to move, shrink or push out of the frame hides the figure.
 */
import { FONT_MIN, type CompileCtx, type CompileFailCode, type CompileResult, type Scene } from '../../types';
import { boxesOverlap, type Box, type Segment } from '../../geom';
import { emitSvg } from '../../emit';
import { layoutScene, overlaysFromLayout, strokeSegments } from '../../slk';
import type { SceneBuilder } from '../../scene-build';
import type { SpecDoc } from '../../spec';
import type { FamilyCompiler } from '../types';
import { LINE_PITCH as LINE, TEXT_H, textWidth as textW } from '../cs/common';

/** Text metrics, shared with the computer-science pack: line height, the pitch of stacked lines, and a text's width. */
export { LINE, TEXT_H, textW };

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
      throw error;
    }
  };
}

/** Every value of a key, inline (`key: v`) and listed (`  - v`), marked as read. */
export function readAll(spec: SpecDoc, key: string): string[] {
  const k = key.toLowerCase();
  const found = [...(spec.values.get(k) ?? []), ...(spec.lists.get(k) ?? [])];
  if (found.length) spec.consumed?.set(k, Math.max(found.length, spec.consumed.get(k) ?? 0));
  return found;
}

/** The single value of a scalar key. A key stated twice with different values is refused, never guessed. */
export function readOne(spec: SpecDoc, key: string): string | undefined {
  const found = readAll(spec, key).map((value) => value.trim());
  const first = found[0];
  if (first === undefined) return undefined;
  const clash = found.find((value) => value.toLowerCase() !== first.toLowerCase());
  if (clash !== undefined) refuse(`${key} is stated twice (${first}, ${clash})`);
  return first;
}

/**
 * The options a `show:`-style value names. `vocabulary` maps each option to the spellings that mean it
 * (global patterns over lower-case text). A word that names none is refused rather than ignored, so a
 * request the figure does not honour is never silent.
 */
export function readShow<K extends string>(spec: SpecDoc, key: string, vocabulary: Record<K, RegExp>): Set<K> {
  let rest = readAll(spec, key).map(plain).join(' , ').toLowerCase();
  const found = new Set<K>();
  for (const name of Object.keys(vocabulary) as K[]) {
    const stripped = rest.replace(vocabulary[name], ' ');
    if (stripped !== rest) found.add(name);
    rest = stripped;
  }
  const unknown = rest.replace(/\band\b|[\s,;+&|/()[\]]+/g, ' ').trim();
  if (unknown) refuse(`${key}: "${unknown}" is not one of ${Object.keys(vocabulary).join(', ')}`);
  return found;
}

const SUPERSCRIPTS: Record<string, string> = {
  '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', '⁺': '+', '⁻': '-',
};
const SUPERSCRIPT_RUN = /[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g;
const DASHES = /[−‒–—﹣－]/g;
const SPACES = /[  -   　]/g;

/** Typographic minus signs, no-break spaces and the LaTeX a model wraps around a value (`20\,\text{m/s}`, `35^\circ`). */
export function plain(raw: string): string {
  return raw
    .replace(/\\(?:text|mathrm)\s*\{([^{}]*)\}/g, '$1')
    .replace(/\^?\{?\\circ\}?/g, '°')
    .replace(/\\[,;! ]|\$/g, ' ')
    .replace(DASHES, '-')
    .replace(SPACES, ' ')
    .trim();
}

/** `plain`, with Unicode superscripts rewritten as `^…` so `m/s²` and `Fe³⁺` read like their ASCII forms. */
export function plainSuperscripts(raw: string): string {
  return plain(raw).replace(SUPERSCRIPT_RUN, (run) => `^${[...run].map((ch) => SUPERSCRIPTS[ch]).join('')}`);
}

const DECIMAL = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i;

/** A finite number in ordinary writing: `−3.5`, `+2`, `1,200`, `4e3`. Null for anything else. */
function parseNum(raw: string): number | null {
  let text = plain(raw);
  if (/^[+-]?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(text)) text = text.replace(/,/g, '');
  if (!DECIMAL.test(text)) return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

/** Decimals a number was written with (`12.50` → 2), which is the precision its differences are quoted to. */
function writtenDecimals(raw: string): number {
  const match = /\.(\d+)/.exec(plain(raw).replace(/e[+-]?\d+$/i, ''));
  return match ? match[1]!.length : 0;
}

export interface Quantity {
  value: number;
  /** Whatever follows the number (`m/s`, `°`, `kJ/mol`), superscripts as `^…`; empty when nothing does. */
  unit: string;
  decimals: number;
}

/** A number with an optional unit after it: `20`, `20 m/s`, `35°`, `9.81m/s²`. Null when it does not start with a number. */
export function parseQuantity(raw: string): Quantity | null {
  const match = /^([+-]?(?:\d[\d,]*\.?\d*|\.\d+)(?:e[+-]?\d+)?)\s*(.*)$/i.exec(plainSuperscripts(raw));
  if (!match) return null;
  const number = match[1]!.replace(/,$/, '');
  const value = parseNum(number);
  return value === null ? null : { value, unit: match[2]!.trim(), decimals: writtenDecimals(number) };
}

const MINUS = '−';

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

/** The kernel keeps every label this far inside the frame. */
export const EDGE = 5;

/**
 * The panel shows a figure at full text size while its canvas has the nominal height, and again once it
 * is tall enough for the full-width layout; in between the whole figure is shrunk, text included. A canvas
 * therefore keeps the nominal height or jumps past that threshold.
 */
export function canvasHeight(needed: number, nominal: number): number {
  return needed <= nominal ? nominal : Math.max(Math.ceil(needed), Math.floor(1.5 * nominal) + 1);
}

/** A label asserted at its centre. Science labels never rely on the kernel to find them room. */
export function put(b: SceneBuilder, id: string, text: string, cx: number, cy: number): void {
  b.label(id, text, cx, cy, { protected: true, priority: 'required' });
}

export function putLeft(b: SceneBuilder, id: string, text: string, left: number, cy: number): void {
  put(b, id, text, left + textW(text) / 2, cy);
}

/** Stacked lines centred on (cx, cy). */
export function putLines(b: SceneBuilder, id: string, lines: string[], cx: number, cy: number): void {
  const first = cy - ((lines.length - 1) * LINE) / 2;
  lines.forEach((line, i) => put(b, i ? `${id}-${i}` : id, line, cx, first + i * LINE));
}

/** `items` in order, in rows no wider than `width` with `gap` between neighbours. */
export function packRows(items: string[], width: number, gap = 16): string[][] {
  const rows: string[][] = [];
  let used = 0;
  for (const item of items) {
    const w = textW(item);
    const row = rows.at(-1);
    if (row && used + gap + w <= width) {
      row.push(item);
      used += gap + w;
    } else {
      rows.push([item]);
      used = w;
    }
  }
  return rows;
}

/** Rows from `packRows`, each centred on `cx`, the first row's text starting at `top`. */
export function putRows(b: SceneBuilder, id: string, rows: string[][], cx: number, top: number, gap = 16): void {
  rows.forEach((row, r) => {
    const total = row.reduce((sum, item) => sum + textW(item), 0) + gap * (row.length - 1);
    let left = cx - total / 2;
    row.forEach((item, i) => {
      putLeft(b, `${id}-${r}-${i}`, item, left, top + r * LINE + TEXT_H / 2);
      left += textW(item) + gap;
    });
  });
}

export function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_.-]+/g, '-');
}

/** Whether the segment passes within `pad` of the box (Liang–Barsky clip against the grown box). */
function segmentHitsBox(s: Segment, box: Box, pad = 0): boolean {
  const dx = s.x2 - s.x1;
  const dy = s.y2 - s.y1;
  let enter = 0;
  let leave = 1;
  const edges: Array<[number, number]> = [
    [-dx, s.x1 - (box.x1 - pad)],
    [dx, box.x2 + pad - s.x1],
    [-dy, s.y1 - (box.y1 - pad)],
    [dy, box.y2 + pad - s.y1],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) enter = Math.max(enter, t);
    else leave = Math.min(leave, t);
    if (enter > leave) return false;
  }
  return true;
}

/**
 * Finds room for text among what is already drawn. `segments` are the strokes text must stay clear of;
 * every placed text box is remembered so later text avoids it too.
 */
export class Placer {
  readonly taken: Box[] = [];

  constructor(private readonly width: number, private readonly height: number, readonly segments: Segment[] = []) {}

  /** The box of stacked `lines` centred on (cx, cy). */
  box(lines: string[], cx: number, cy: number): Box {
    const w = Math.max(...lines.map(textW));
    const h = TEXT_H + (lines.length - 1) * LINE;
    return { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 };
  }

  free(box: Box, gap = 3): boolean {
    // Half a unit of slack: a box computed to sit exactly on the margin must not fail on rounding.
    const margin = EDGE - 0.5;
    return box.x1 >= margin && box.y1 >= margin && box.x2 <= this.width - margin && box.y2 <= this.height - margin
      && !this.taken.some((other) => boxesOverlap(box, other, 1))
      && !this.segments.some((segment) => segmentHitsBox(segment, box, gap));
  }

  /** The first candidate centre at which `lines` are free; that box is then taken. Null when none is. */
  place(lines: string[], candidates: Array<[number, number]>, gap = 3): [number, number] | null {
    for (const centre of candidates) {
      const box = this.box(lines, centre[0], centre[1]);
      if (!this.free(box, gap)) continue;
      this.taken.push(box);
      return centre;
    }
    return null;
  }
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
