/**
 * A coordinate plane drawn to scale: window → canvas mapping, 1-2-5 grid, axes with arrowheads and
 * tick numbers that give way to the figure's own geometry. Shared by every family that plots in x–y.
 */
import type { SceneBuilder } from '../../scene-build';
import { MINUS } from './format';
import { Placer, TEXT_H, canvasHeight, clipToBox, textSize, type Pt } from './canvas';

export interface Window { x0: number; x1: number; y0: number; y1: number }

export interface PlaneOptions {
  window: Window;
  nominal: { w: number; h: number };
  /** One scale for both axes, so angles and circles are drawn true. */
  equal: boolean;
  /** `axis`: numbers beside the axes, inside the plot. `edge`: a framed plot with numbers outside it. */
  numbers: 'axis' | 'edge';
  grid: boolean;
  /** Grow the window to fill the canvas (a window inferred from content); an explicit window is kept as given. */
  fill: boolean;
  /** Window aspect (height / width) above which the canvas goes tall; 0.8 unless given. */
  tallAbove?: number;
  names?: { x: string; y: string };
  /** Room kept under the plot for a readout, in canvas units. */
  footer?: number;
}

const LADDER = [1, 2, 5];

/** The smallest 1-2-5 step that is at least `least`. */
function niceStep(least: number): number {
  const exponent = Math.floor(Math.log10(least));
  for (let e = exponent; e <= exponent + 1; e++) {
    for (const mantissa of LADDER) {
      const step = mantissa * 10 ** e;
      if (step >= least * (1 - 1e-9)) return step;
    }
  }
  return 10 ** (exponent + 1);
}

function multiples(step: number, lo: number, hi: number): number[] {
  const out: number[] = [];
  for (let i = Math.ceil(lo / step - 1e-9); i * step <= hi + step * 1e-9; i++) out.push(Number((i * step).toPrecision(12)));
  return out;
}

/** Tick text at the step's own precision, with a true minus sign. */
function tickText(value: number, step: number): string {
  if (Math.abs(value) < step * 1e-9) return '0';
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const text = String(Number(Math.abs(value).toFixed(Math.min(decimals + 1, 12))));
  return `${value < 0 ? MINUS : ''}${text}`;
}

/**
 * A window around a figure's marks: the axes are brought in unless the figure sits far from them, a
 * degenerate extent is opened up, and a margin keeps the marks off the frame.
 */
export function windowAround(marks: Pt[]): Window {
  const range = (values: number[]) => ({ lo: Math.min(...values), hi: Math.max(...values) });
  const x = range(marks.map((p) => p.x));
  const y = range(marks.map((p) => p.y));
  const size = Math.max(x.hi - x.lo, y.hi - y.lo);
  for (const axis of [x, y]) {
    if (!size || Math.max(axis.lo, -axis.hi) <= 1.5 * size) {
      axis.lo = Math.min(axis.lo, 0);
      axis.hi = Math.max(axis.hi, 0);
    }
  }
  const span = Math.max(x.hi - x.lo, y.hi - y.lo) || 8;
  for (const axis of [x, y]) {
    const short = 0.5 * span - (axis.hi - axis.lo);
    if (short > 0) {
      axis.lo -= short / 2;
      axis.hi += short / 2;
    }
    axis.lo -= 0.12 * span;
    axis.hi += 0.12 * span;
  }
  return { x0: x.lo, x1: x.hi, y0: y.lo, y1: y.hi };
}

const AXIS_OVERSHOOT = 9;

export class Plane {
  readonly width: number;
  readonly height: number;
  readonly window: Window;
  /** Plot rectangle in canvas units. */
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
  readonly kx: number;
  readonly ky: number;
  /** Spacing of the numbered ticks, in world units. */
  readonly step: { x: number; y: number };
  private readonly options: PlaneOptions;

  constructor(options: PlaneOptions) {
    this.options = options;
    const { nominal } = options;
    const given = options.window;
    const spanX = given.x1 - given.x0;
    const spanY = given.y1 - given.y0;
    const footer = options.footer ?? 0;
    const nameW = options.names ? Math.max(textSize(options.names.x).w, textSize(options.names.y).w) : 0;
    const base = options.numbers === 'edge'
      ? { l: 12, r: options.names ? nameW + 12 : 10, t: options.names ? TEXT_H + 8 : 8, b: TEXT_H + 13 + footer }
      : { l: 9, r: AXIS_OVERSHOOT + (options.names ? nameW + 12 : 4), t: AXIS_OVERSHOOT + 6, b: 9 + footer };
    let plan = this.fit(given, spanX, spanY, base);
    // Tick numbers need room that depends on the scale they are drawn at; two passes settle it.
    for (let pass = 0; pass < 2; pass++) {
      const need = this.numberRoom(plan);
      plan = this.fit(given, spanX, spanY, { ...base, l: Math.max(base.l, need.l), b: Math.max(base.b, need.b + footer) });
    }
    this.width = nominal.w;
    this.height = plan.height;
    this.window = plan.window;
    this.left = plan.left;
    this.top = plan.top;
    this.kx = plan.kx;
    this.ky = plan.ky;
    this.right = plan.left + (plan.window.x1 - plan.window.x0) * plan.kx;
    this.bottom = plan.top + (plan.window.y1 - plan.window.y0) * plan.ky;
    this.step = plan.step;
  }

  private fit(given: Window, spanX: number, spanY: number, margin: { l: number; r: number; t: number; b: number }) {
    const { nominal, equal, fill } = this.options;
    const availW = nominal.w - margin.l - margin.r;
    let height = nominal.h;
    let availH = height - margin.t - margin.b;
    let kx = availW / spanX;
    let ky = availH / spanY;
    let window = given;
    if (equal) {
      const aspect = spanY / spanX;
      // A squarish figure would use only half the width of the nominal canvas.
      const tall = aspect > (this.options.tallAbove ?? 0.8);
      let k = Math.min(kx, ky);
      if (tall) {
        const limit = Math.round(1.75 * nominal.h) - margin.t - margin.b;
        k = Math.min(availW / spanX, limit / spanY);
        height = canvasHeight(k * spanY + margin.t + margin.b, nominal.h);
        availH = height - margin.t - margin.b;
      }
      kx = k;
      ky = k;
      if (fill) {
        const growX = (availW / k - spanX) / 2;
        const growY = (availH / k - spanY) / 2;
        window = { x0: given.x0 - growX, x1: given.x1 + growX, y0: given.y0 - growY, y1: given.y1 + growY };
      }
    }
    const plotW = (window.x1 - window.x0) * kx;
    const plotH = (window.y1 - window.y0) * ky;
    const left = margin.l + (availW - plotW) / 2;
    const top = margin.t + (availH - plotH) / 2;
    // Numbered ticks: far enough apart for their own text, and the same step on both axes of a true-scale plane.
    const widest = (step: number) => Math.max(...multiples(step, window.x0, window.x1).map((v) => textSize(tickText(v, step)).w), 0);
    let stepX = niceStep(12 / kx);
    for (let guard = 0; guard < 8 && (widest(stepX) + 9) / kx > stepX; guard++) stepX = niceStep(stepX * 1.01);
    let stepY = niceStep((TEXT_H + 4) / ky);
    if (equal) stepX = stepY = Math.max(stepX, stepY);
    return { height, window, left, top, kx, ky, step: { x: stepX, y: stepY } };
  }

  /** Canvas room the tick numbers need left of and below the plot rectangle. */
  private numberRoom(plan: ReturnType<Plane['fit']>): { l: number; b: number } {
    const { numbers } = this.options;
    const { window, kx, ky, step } = plan;
    const yText = Math.max(...multiples(step.y, window.y0, window.y1).map((v) => textSize(tickText(v, step.y)).w), 0);
    if (numbers === 'edge') return { l: yText + 11, b: TEXT_H + 13 };
    // Numbers sit beside the axes; they reach outside the plot only when an axis runs near its edge.
    const axisX = Math.min(Math.max(0, window.x0), window.x1);
    const axisY = Math.min(Math.max(0, window.y0), window.y1);
    return {
      l: Math.max(0, yText + 10 - (axisX - window.x0) * kx),
      b: Math.max(0, TEXT_H + 9 - (axisY - window.y0) * ky),
    };
  }

  x(value: number): number {
    return this.left + (value - this.window.x0) * this.kx;
  }

  y(value: number): number {
    return this.bottom - (value - this.window.y0) * this.ky;
  }

  at(p: Pt): Pt {
    return { x: this.x(p.x), y: this.y(p.y) };
  }

  /** Where the axes are drawn: through zero when the window holds it, else along the nearer edge. */
  get axis(): Pt {
    return {
      x: this.x(Math.min(Math.max(0, this.window.x0), this.window.x1)),
      y: this.y(Math.min(Math.max(0, this.window.y0), this.window.y1)),
    };
  }

  contains(p: Pt, slack = 1e-9): boolean {
    const { x0, x1, y0, y1 } = this.window;
    return p.x >= x0 - slack * (x1 - x0) && p.x <= x1 + slack * (x1 - x0) && p.y >= y0 - slack * (y1 - y0) && p.y <= y1 + slack * (y1 - y0);
  }

  /** Grid lines, and the frame of an `edge` plane. Drawn first, so everything else sits on top. */
  drawGrid(b: SceneBuilder): void {
    const { grid, numbers } = this.options;
    if (grid) {
      for (const [axis, step] of [['x', this.gridStep(this.step.x, this.kx)], ['y', this.gridStep(this.step.y, this.ky)]] as const) {
        const [lo, hi] = axis === 'x' ? [this.window.x0, this.window.x1] : [this.window.y0, this.window.y1];
        multiples(step, lo, hi).forEach((value, index) => {
          if (axis === 'x') b.line(`grid-x${index}`, this.x(value), this.top, this.x(value), this.bottom, { color: 'muted', width: 0.4, role: 'guide', protected: true });
          else b.line(`grid-y${index}`, this.left, this.y(value), this.right, this.y(value), { color: 'muted', width: 0.4, role: 'guide', protected: true });
        });
      }
    }
    if (numbers === 'edge') b.rect('plane-frame', this.left, this.top, this.right - this.left, this.bottom - this.top, { color: 'muted', width: 1, role: 'boundary' });
  }

  /** Grid lines may be finer than the numbered ticks (every unit under numbers at every 2 or 5). */
  private gridStep(step: number, k: number): number {
    const mantissa = Math.round(step / 10 ** Math.floor(Math.log10(step) + 1e-9));
    const finer = mantissa === 1 ? step : step / mantissa;
    return finer * k >= 9 ? finer : step;
  }

  /** Axis lines. In an `axis` plane they carry arrowheads; an `edge` plane is framed, with its numbers and names outside. */
  drawAxes(b: SceneBuilder, placer: Placer): void {
    const { numbers, names } = this.options;
    const { x: ax, y: ay } = this.axis;
    if (numbers === 'edge') {
      const { x0, x1, y0, y1 } = this.window;
      if (y0 < 0 && y1 > 0) b.line('x-axis', this.left, ay, this.right, ay, { color: 'muted', width: 1, role: 'guide', protected: true });
      if (x0 < 0 && x1 > 0) b.line('y-axis', ax, this.bottom, ax, this.top, { color: 'muted', width: 1, role: 'guide', protected: true });
      multiples(this.step.x, x0, x1).forEach((value, index) => {
        const text = tickText(value, this.step.x);
        b.line(`x-tick${index}`, this.x(value), this.bottom, this.x(value), this.bottom + 3, { color: 'muted', width: 1, role: 'guide', protected: true });
        b.label(`x-number${index}`, text, this.x(value), this.bottom + 8 + TEXT_H / 2, { protected: true, priority: 'required' });
      });
      multiples(this.step.y, y0, y1).forEach((value, index) => {
        const text = tickText(value, this.step.y);
        b.line(`y-tick${index}`, this.left - 3, this.y(value), this.left, this.y(value), { color: 'muted', width: 1, role: 'guide', protected: true });
        b.label(`y-number${index}`, text, this.left - 6 - textSize(text).w / 2, this.y(value), { protected: true, priority: 'required' });
      });
      if (names) {
        b.label('x-name', names.x, this.right + 6 + textSize(names.x).w / 2, this.bottom, { protected: true, priority: 'required' });
        b.label('y-name', names.y, this.left, this.top - 3 - TEXT_H / 2, { protected: true, priority: 'required' });
      }
      placer.path([this.left, this.top, this.right, this.top, this.right, this.bottom, this.left, this.bottom], true);
      return;
    }
    const xEnd = this.right + AXIS_OVERSHOOT;
    const yEnd = this.top - AXIS_OVERSHOOT;
    b.line('x-axis', this.left - 4, ay, xEnd, ay, { width: 1.2, role: 'axis', markerEnd: true, protected: true });
    b.line('y-axis', ax, this.bottom + 4, ax, yEnd, { width: 1.2, role: 'axis', markerEnd: true, protected: true });
    placer.line(this.left - 4, ay, xEnd, ay).line(ax, this.bottom + 4, ax, yEnd);
  }

  /**
   * Axis names of an `axis` plane, placed once the figure's strokes are known: a name moves to the
   * other side of its arrowhead when a line runs through its usual spot.
   */
  drawNames(b: SceneBuilder, placer: Placer): void {
    const { names, numbers } = this.options;
    if (!names || numbers !== 'axis') return;
    const { x: ax, y: ay } = this.axis;
    const xEnd = this.right + AXIS_OVERSHOOT;
    const yTop = this.top - AXIS_OVERSHOOT;
    const xSize = textSize(names.x);
    const ySize = textSize(names.y);
    const xSpots = [{ x: xEnd + 5 + xSize.w / 2, y: ay }, { x: xEnd - xSize.w / 2, y: ay + 5 + xSize.h / 2 }, { x: xEnd - xSize.w / 2, y: ay - 5 - xSize.h / 2 }];
    const ySpots = [{ x: ax + 6 + ySize.w / 2, y: yTop + ySize.h / 2 - 0.5 }, { x: ax - 6 - ySize.w / 2, y: yTop + ySize.h / 2 - 0.5 }];
    const xAt = placer.claim(xSize, xSpots, 1) ?? xSpots[0]!;
    const yAt = placer.claim(ySize, ySpots, 1) ?? ySpots[0]!;
    b.label('x-name', names.x, xAt.x, xAt.y, { protected: true, priority: 'required' });
    b.label('y-name', names.y, yAt.x, yAt.y, { protected: true, priority: 'required' });
  }

  /**
   * Tick numbers of an `axis` plane, placed last: each goes below (or left of) its axis and is left
   * out when the figure is in the way. The grid still counts the units.
   */
  drawNumbers(b: SceneBuilder, placer: Placer): void {
    if (this.options.numbers !== 'axis') return;
    const { x0, x1, y0, y1 } = this.window;
    const { x: ax, y: ay } = this.axis;
    const crossing = x0 <= 0 && x1 >= 0 && y0 <= 0 && y1 >= 0;
    const ticks = !this.options.grid;
    multiples(this.step.x, x0, x1).forEach((value, index) => {
      const X = this.x(value);
      if (crossing && Math.abs(value) < this.step.x * 1e-9) return;
      if (ticks) b.line(`x-tick${index}`, X, ay - 2.5, X, ay + 2.5, { width: 1, role: 'axis', protected: true });
      const text = tickText(value, this.step.x);
      const size = textSize(text);
      const spot = placer.claim(size, [{ x: X, y: ay + 4 + size.h / 2 }], 1);
      if (spot) b.label(`x-number${index}`, text, spot.x, spot.y, { protected: true, priority: 'required' });
    });
    multiples(this.step.y, y0, y1).forEach((value, index) => {
      const Y = this.y(value);
      if (crossing && Math.abs(value) < this.step.y * 1e-9) return;
      if (ticks) b.line(`y-tick${index}`, ax - 2.5, Y, ax + 2.5, Y, { width: 1, role: 'axis', protected: true });
      const text = tickText(value, this.step.y);
      const size = textSize(text);
      const spot = placer.claim(size, [{ x: ax - 5 - size.w / 2, y: Y }], 1);
      if (spot) b.label(`y-number${index}`, text, spot.x, spot.y, { protected: true, priority: 'required' });
    });
    if (crossing) {
      const size = textSize('0');
      const spot = placer.claim(size, [{ x: ax - 4 - size.w / 2, y: ay + 3 + size.h / 2 }], 1);
      if (spot) b.label('origin-number', '0', spot.x, spot.y, { protected: true, priority: 'required' });
    }
  }
}

/** The part of segment pq inside the window, or null when it misses. */
export function clipSegment(window: Window, p: Pt, q: Pt): [Pt, Pt] | null {
  return clipToBox({ x1: window.x0, y1: window.y0, x2: window.x1, y2: window.y1 }, p, q);
}

/** A sampled curve cut into the runs that lie inside the window, with exact entry and exit points. */
export function clipPolyline(window: Window, points: readonly Pt[]): Pt[][] {
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  for (let i = 0; i + 1 < points.length; i++) {
    const piece = clipSegment(window, points[i]!, points[i + 1]!);
    if (!piece) {
      if (run.length > 1) runs.push(run);
      run = [];
      continue;
    }
    const [a, b] = piece;
    const joined = run.length && Math.abs(run.at(-1)!.x - a.x) < 1e-12 && Math.abs(run.at(-1)!.y - a.y) < 1e-12;
    if (!joined) {
      if (run.length > 1) runs.push(run);
      run = [a];
    }
    run.push(b);
  }
  if (run.length > 1) runs.push(run);
  return runs;
}
