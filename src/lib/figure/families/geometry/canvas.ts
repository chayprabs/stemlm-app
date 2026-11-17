/**
 * Shared drawing kit for the geometry pack: results, canvas sizing, a label placer that keeps text
 * clear of strokes and other text, and the small marks geometry figures use.
 *
 * Families here place every label themselves and hand it to the kernel as `protected`: a label's
 * position carries meaning (which side, which angle), so the kernel must not move it.
 */
import { FONT_MIN, type CompileResult } from '../../types';
import { measureText, type Box, type Segment } from '../../geom';
import type { SceneBuilder } from '../../scene-build';

export interface Pt { x: number; y: number }
export interface Size { w: number; h: number }

export const malformed = (reason: string): CompileResult => ({ ok: false, code: 'malformed', reason });
export const refused = (reason: string): CompileResult => ({ ok: false, code: 'refused', reason });

/**
 * The panel shows a figure at full text size while its canvas is the nominal height, and again once
 * it is tall enough to switch to the full-width layout; anything in between is shrunk, text included.
 * A canvas therefore keeps the nominal height or jumps past that threshold.
 */
export function canvasHeight(needed: number, nominalHeight: number): number {
  if (needed <= nominalHeight) return nominalHeight;
  return Math.max(Math.ceil(needed), Math.floor(1.5 * nominalHeight) + 1);
}

export function textSize(text: string): Size {
  return measureText(text, FONT_MIN);
}

export const TEXT_H = textSize('0').h;

function boxAround(x: number, y: number, size: Size): Box {
  return { x1: x - size.w / 2, y1: y - size.h / 2, x2: x + size.w / 2, y2: y + size.h / 2 };
}

/** A text box is cut to its glyphs sideways but carries leading above and below; this evens the air around it. */
const SIDE_BEARING = 2;

/** Centre of a text box that lies wholly beyond the line at `gap` from `p`, in the direction `angle` (screen radians). */
export function beyond(p: Pt, angle: number, gap: number, size: Size): Pt {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const reach = gap + Math.abs(ux) * (size.w / 2 + SIDE_BEARING) + (Math.abs(uy) * size.h) / 2;
  return { x: p.x + ux * reach, y: p.y + uy * reach };
}

/** The part of segment pq inside `box`, or null when it misses (Liang–Barsky). */
export function clipToBox(box: Box, p: Pt, q: Pt): [Pt, Pt] | null {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  let enter = 0;
  let leave = 1;
  const edges: Array<[number, number]> = [[-dx, p.x - box.x1], [dx, box.x2 - p.x], [-dy, p.y - box.y1], [dy, box.y2 - p.y]];
  for (const [a, c] of edges) {
    if (a === 0) {
      if (c < 0) return null;
      continue;
    }
    const t = c / a;
    if (a < 0) {
      if (t > leave) return null;
      enter = Math.max(enter, t);
    } else {
      if (t < enter) return null;
      leave = Math.min(leave, t);
    }
  }
  return [{ x: p.x + dx * enter, y: p.y + dy * enter }, { x: p.x + dx * leave, y: p.y + dy * leave }];
}

/** Model text quoted in a refusal, cut short. */
export const clip = (text: string) => (text.length > 20 ? `${text.slice(0, 20)}…` : text);

/**
 * Tracks what is already drawn and answers "is this spot free?". Strokes are obstacles as segments,
 * placed labels and solid marks as boxes. With a frame, a free spot is also inside the canvas.
 */
export class Placer {
  private readonly segments: Segment[] = [];
  private readonly boxes: Box[] = [];

  constructor(private readonly frame?: { width: number; height: number }) {}

  line(x1: number, y1: number, x2: number, y2: number): this {
    this.segments.push({ x1, y1, x2, y2 });
    return this;
  }

  /** A polyline given as flattened points; `closed` adds the closing edge. */
  path(points: number[], closed = false): this {
    for (let i = 0; i + 3 < points.length; i += 2) this.line(points[i]!, points[i + 1]!, points[i + 2]!, points[i + 3]!);
    if (closed && points.length >= 6) this.line(points.at(-2)!, points.at(-1)!, points[0]!, points[1]!);
    return this;
  }

  /** A circle, sampled finely enough that no label slips between chords. */
  circle(cx: number, cy: number, r: number): this {
    const steps = Math.ceil(Math.max(24, r * 0.9));
    const points: number[] = [];
    for (let i = 0; i <= steps; i++) points.push(cx + r * Math.cos((2 * Math.PI * i) / steps), cy + r * Math.sin((2 * Math.PI * i) / steps));
    return this.path(points);
  }

  box(box: Box): this {
    this.boxes.push(box);
    return this;
  }

  /** A filled dot or other small solid mark. */
  dot(x: number, y: number, r: number): this {
    return this.box({ x1: x - r, y1: y - r, x2: x + r, y2: y + r });
  }

  isFree(box: Box, pad = 2): boolean {
    if (this.frame && (box.x1 < 5 || box.y1 < 5 || box.x2 > this.frame.width - 5 || box.y2 > this.frame.height - 5)) return false;
    const grown = { x1: box.x1 - SIDE_BEARING - pad, y1: box.y1 - pad, x2: box.x2 + SIDE_BEARING + pad, y2: box.y2 + pad };
    return !this.boxes.some((other) => other.x1 < grown.x2 && other.x2 > grown.x1 && other.y1 < grown.y2 && other.y2 > grown.y1)
      && !this.segments.some((s) => clipToBox(grown, { x: s.x1, y: s.y1 }, { x: s.x2, y: s.y2 }));
  }

  /** The first candidate centre where `size` is free; the spot is claimed for later queries. */
  claim(size: Size, candidates: Iterable<Pt>, pad = 2): Pt | null {
    for (const candidate of candidates) {
      const box = boxAround(candidate.x, candidate.y, size);
      if (!this.isFree(box, pad)) continue;
      this.boxes.push(box);
      return candidate;
    }
    return null;
  }

  /** Bounding box of everything registered so far. */
  bounds(): Box {
    const xs = [...this.segments.flatMap((s) => [s.x1, s.x2]), ...this.boxes.flatMap((b) => [b.x1, b.x2])];
    const ys = [...this.segments.flatMap((s) => [s.y1, s.y2]), ...this.boxes.flatMap((b) => [b.y1, b.y2])];
    return { x1: Math.min(...xs), y1: Math.min(...ys), x2: Math.max(...xs), y2: Math.max(...ys) };
  }
}

/** Candidate centres around `p`: each direction (screen radians) tried at each gap, nearest gaps first. */
export function* ring(p: Pt, size: Size, angles: readonly number[], gaps: readonly number[] = [3, 7, 12, 18, 25]): Generator<Pt> {
  for (const gap of gaps) for (const angle of angles) yield beyond(p, angle, gap, size);
}

/** Eight compass directions starting from `first` (screen radians), alternating outward from it. */
export function fan(first: number): number[] {
  return [0, 45, -45, 90, -90, 135, -135, 180].map((offset) => first + (offset * Math.PI) / 180);
}

/** The square corner mark of a right angle at `v`, between unit directions `u1` and `u2`. */
export function rightAngleMark(b: SceneBuilder, id: string, v: Pt, u1: Pt, u2: Pt, size = 7): number[] {
  const points = [
    v.x + u1.x * size, v.y + u1.y * size,
    v.x + (u1.x + u2.x) * size, v.y + (u1.y + u2.y) * size,
    v.x + u2.x * size, v.y + u2.y * size,
  ];
  b.polyline(id, points, { width: 1, role: 'annotation', fill: 'none' });
  return points;
}

const READOUT_GAP = 16;

/** Computed results printed under a figure: entries packed into centred rows, and the strip they need. */
export interface Readout { rows: string[][]; height: number }

export function readout(entries: string[], canvasWidth: number): Readout {
  const rows: string[][] = [];
  let used = 0;
  for (const entry of entries) {
    const w = textSize(entry).w;
    if (rows.length && used + READOUT_GAP + w <= canvasWidth - 16) {
      rows.at(-1)!.push(entry);
      used += READOUT_GAP + w;
    } else {
      rows.push([entry]);
      used = w;
    }
  }
  return { rows, height: rows.length ? rows.length * (TEXT_H + 1) + 3 : 0 };
}

/** Print the readout along the bottom of the canvas and keep every other label out of its strip. */
export function drawReadout(b: SceneBuilder, placer: Placer, { rows, height }: Readout): void {
  if (!height) return;
  placer.box({ x1: 0, y1: b.height - 3 - height, x2: b.width, y2: b.height });
  rows.forEach((row, r) => {
    const widths = row.map((entry) => textSize(entry).w);
    let x = (b.width - widths.reduce((sum, w) => sum + w, 0) - READOUT_GAP * (row.length - 1)) / 2;
    row.forEach((entry, i) => {
      b.label(`readout-${r}-${i}`, entry, x + widths[i]! / 2, b.height - 2 - height + (r + 0.5) * (TEXT_H + 1), { protected: true });
      x += widths[i]! + READOUT_GAP;
    });
  });
}

/** Signed sweep from screen angle `from` to `to` (radians) by the shorter way, in (−π, π]. */
export function sweep(from: number, to: number): number {
  let delta = (to - from) % (2 * Math.PI);
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta <= -Math.PI) delta += 2 * Math.PI;
  return delta;
}
