/**
 * Shared drawing kit for the geometry pack: results, canvas sizing, a label placer that keeps text
 * clear of strokes and other text, and the small marks (right angle, arc, ticks) geometry figures use.
 *
 * Families here place every label themselves and hand it to the kernel as `protected`: a label's
 * position carries meaning (which side, which angle), so the kernel must not move it.
 */
import { FONT_MIN, type CompileResult } from '../../types';
import { measureText, type Box, type Segment } from '../../geom';
import type { SceneBuilder } from '../../scene-build';
import type { SpecDoc } from '../../spec';

export interface Pt { x: number; y: number }
export interface Size { w: number; h: number }

export const malformed = (reason: string): CompileResult => ({ ok: false, code: 'malformed', reason });
export const refused = (reason: string): CompileResult => ({ ok: false, code: 'refused', reason });

/**
 * Every value of a repeatable key, whether repeated inline or written as an indented list. Both forms
 * may appear for one key, so the read certificate is marked with their combined count.
 */
export function records(spec: SpecDoc, ...keys: string[]): string[] {
  return keys.flatMap((key) => {
    const k = key.toLowerCase();
    const all = [...(spec.values.get(k) ?? []), ...(spec.lists.get(k) ?? [])];
    if (all.length) spec.consumed?.set(k, Math.max(all.length, spec.consumed.get(k) ?? 0));
    return all;
  });
}

/** Comma/semicolon separated items of every record of the given keys. */
export function items(spec: SpecDoc, ...keys: string[]): string[] {
  return records(spec, ...keys).flatMap((raw) => raw.split(/[,;]+/)).map((item) => item.trim()).filter(Boolean);
}

/** Lowercased option words of `show:`-style keys, split on commas, semicolons and spaces. */
export function words(spec: SpecDoc, ...keys: string[]): string[] {
  return records(spec, ...keys).flatMap((raw) => raw.toLowerCase().split(/[,;\s]+/)).filter(Boolean);
}

/**
 * The panel shows a figure at full text size while its canvas is the nominal height, and again once
 * it is tall enough to switch to the full-width layout; anything in between is shrunk, text included.
 * A canvas therefore keeps the nominal height or jumps past that threshold.
 */
export function canvasHeight(needed: number, nominalHeight: number): number {
  if (needed <= nominalHeight) return nominalHeight;
  return Math.max(Math.ceil(needed), Math.floor(1.5 * nominalHeight) + 1);
}

export function textSize(text: string, katex = false): Size {
  return measureText(text, FONT_MIN, katex);
}

export function boxAround(x: number, y: number, size: Size): Box {
  return { x1: x - size.w / 2, y1: y - size.h / 2, x2: x + size.w / 2, y2: y + size.h / 2 };
}

/** Centre of a box that lies wholly beyond the line at `gap` from `p`, in the direction `angle` (screen radians). */
export function beyond(p: Pt, angle: number, gap: number, size: Size): Pt {
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const reach = gap + (Math.abs(ux) * size.w) / 2 + (Math.abs(uy) * size.h) / 2;
  return { x: p.x + ux * reach, y: p.y + uy * reach };
}

/** Exact segment/rectangle test (Liang–Barsky), with the rectangle grown by `pad`. */
export function segmentHitsBox(s: Segment, box: Box, pad = 0): boolean {
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
    if (p < 0) {
      if (t > leave) return false;
      enter = Math.max(enter, t);
    } else {
      if (t < enter) return false;
      leave = Math.min(leave, t);
    }
  }
  return true;
}

const boxesTouch = (a: Box, b: Box, pad: number) => a.x1 < b.x2 + pad && a.x2 > b.x1 - pad && a.y1 < b.y2 + pad && a.y2 > b.y1 - pad;

/**
 * Tracks what is already drawn and answers "is this spot free?". Strokes are obstacles as segments,
 * placed labels and solid marks as boxes. With a frame, a free spot is also inside the canvas.
 */
export class Placer {
  private readonly segments: Segment[] = [];
  private readonly boxes: Box[] = [];

  constructor(private readonly frame?: { width: number; height: number; margin?: number }) {}

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

  /** A circle or arc (screen degrees), sampled finely enough that no label slips between chords. */
  circle(cx: number, cy: number, r: number, fromDeg = 0, toDeg = 360): this {
    const steps = Math.max(4, Math.ceil((Math.abs(toDeg - fromDeg) / 360) * Math.max(24, r * 0.9)));
    const points: number[] = [];
    for (let i = 0; i <= steps; i++) {
      const a = ((fromDeg + ((toDeg - fromDeg) * i) / steps) * Math.PI) / 180;
      points.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
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
    if (this.frame) {
      const margin = this.frame.margin ?? 5;
      if (box.x1 < margin || box.y1 < margin || box.x2 > this.frame.width - margin || box.y2 > this.frame.height - margin) return false;
    }
    return !this.boxes.some((other) => boxesTouch(other, box, pad)) && !this.segments.some((segment) => segmentHitsBox(segment, box, pad));
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
export function* ring(p: Pt, size: Size, angles: readonly number[], gaps: readonly number[] = [5, 9, 14, 20, 27]): Generator<Pt> {
  for (const gap of gaps) for (const angle of angles) yield beyond(p, angle, gap, size);
}

const DEG = Math.PI / 180;

/** Eight compass directions starting from `first` (screen degrees), alternating outward from it. */
export function fan(first: number): number[] {
  return [0, 45, -45, 90, -90, 135, -135, 180].map((offset) => (first + offset) * DEG);
}

/** The square corner mark of a right angle at `v`, between unit directions `u1` and `u2`. */
export function rightAngleMark(b: SceneBuilder, id: string, v: Pt, u1: Pt, u2: Pt, size = 7): void {
  b.polyline(id, [
    v.x + u1.x * size, v.y + u1.y * size,
    v.x + (u1.x + u2.x) * size, v.y + (u1.y + u2.y) * size,
    v.x + u2.x * size, v.y + u2.y * size,
  ], { width: 1, role: 'annotation', fill: 'none' });
}

/** Signed sweep from screen angle `from` to `to` (radians) by the shorter way, in (−π, π]. */
export function sweep(from: number, to: number): number {
  let delta = (to - from) % (2 * Math.PI);
  if (delta > Math.PI) delta -= 2 * Math.PI;
  if (delta <= -Math.PI) delta += 2 * Math.PI;
  return delta;
}

/** `count` short strokes across the middle of segment pq: the mark for equal lengths. */
export function tickMarks(b: SceneBuilder, id: string, p: Pt, q: Pt, count: number, at = 0.5): void {
  const length = Math.hypot(q.x - p.x, q.y - p.y) || 1;
  const ux = (q.x - p.x) / length;
  const uy = (q.y - p.y) / length;
  const mx = p.x + (q.x - p.x) * at;
  const my = p.y + (q.y - p.y) * at;
  for (let k = 0; k < count; k++) {
    const shift = (k - (count - 1) / 2) * 3.2;
    const cx = mx + ux * shift;
    const cy = my + uy * shift;
    b.line(`${id}-${k}`, cx - uy * 4, cy + ux * 4, cx + uy * 4, cy - ux * 4, { width: 1.1, role: 'annotation', protected: true });
  }
}
