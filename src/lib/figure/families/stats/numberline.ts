/**
 * `numberline`: points, intervals and solution sets of inequalities on a number line.
 *
 *   range: -5 5            optional; otherwise chosen to hold everything drawn
 *   point: 2               repeatable; `point: 2 open`; text after the value labels the point
 *   interval: [-3, 2)      repeatable; a bracket closes an end, a parenthesis opens it; `(-inf, 4]` is a ray
 *   ineq: -3 <= x < 2      repeatable; `x > 1`, `x <= -2 or x > 3`, `2x + 1 < 7` (solved here)
 *
 * A closed end is a filled dot, an open end a hollow one, an end at infinity an arrowhead. One set is
 * drawn on the line itself; sets that overlap are stacked on separate rails above it.
 */
import { SceneBuilder, frameSize } from '../../scene-build';
import type { SpecDoc } from '../../spec';
import { parseInequality, parseIntervals, parseQuantity, type Piece, type Quantity } from './intervals';
import { EDGE, LINE, TEXT_H, finish, fmt, guard, nameAxis, plain, put, readAll, readOne, refuse, textW } from './shared';

const MAX_RAILS = 4;
const RAIL_PITCH = 13;
const DOT = 3.2;

interface Dot {
  at: Quantity;
  open: boolean;
  label: string;
}

function readPoints(spec: SpecDoc): Dot[] {
  return readAll(spec, 'point').flatMap((raw) => {
    const text = plain(raw).replace(/^[A-Za-z]\s*=\s*/, '');
    // `point: 1, 2.5, 4` is several points.
    const several = /[,;]/.test(text) ? text.split(/\s*[,;]\s*/).filter(Boolean).map((part) => parseQuantity(part)) : [];
    if (several.length && several.every((at) => at)) return several.map((at) => ({ at: at!, open: false, label: '' }));
    const match = /^(\S+)(?:\s+\(?(open|hollow|closed|filled|solid)\)?)?(?:\s+(.+))?$/i.exec(text);
    const at = match ? parseQuantity(match[1]!) : null;
    if (!at || !Number.isFinite(at.value)) refuse(`point "${text}" needs a number first (point: 2, point: 2 open, point: 2 A)`);
    return [{ at, open: /^(?:open|hollow)$/i.test(match![2] ?? ''), label: (match![3] ?? '').trim() }];
  });
}

function readRange(spec: SpecDoc): { lo: number; hi: number } | undefined {
  const raw = readOne(spec, 'range');
  if (raw === undefined) return undefined;
  const ends = plain(raw).replace(/^[[(]|[\])]$/g, '').split(/\s*(?:[,;]|\.\.+|\bto\b)\s*|\s+/i).filter(Boolean).map((part) => parseQuantity(part));
  const [lo, hi] = ends;
  if (ends.length !== 2 || !lo || !hi || !Number.isFinite(lo.value) || !Number.isFinite(hi.value) || !(lo.value < hi.value)) {
    refuse(`range "${plain(raw)}" needs two increasing numbers (range: -5 5)`);
  }
  return { lo: lo.value, hi: hi.value };
}

interface Ticks {
  lo: number;
  hi: number;
  ticks: number[];
}

/**
 * The finest 1, 2, 5 x 10^k ticks whose numbers print side by side along `width`. A range that was not
 * stated is widened to whole steps, so the line ends on a tick. `whole` keeps the ticks on integers.
 */
function chooseTicks(lo: number, hi: number, width: number, snap: boolean, whole: boolean): Ticks {
  for (let exponent = whole ? 0 : Math.floor(Math.log10(hi - lo)) - 1; ; exponent++) {
    for (const mantissa of [1, 2, 5]) {
      const step = mantissa * 10 ** exponent;
      const from = snap ? Math.floor(lo / step + 1e-9) * step : lo;
      const to = snap ? Math.ceil(hi / step - 1e-9) * step : hi;
      const first = Math.ceil(from / step - 1e-9);
      const count = Math.floor(to / step + 1e-9) - first + 1;
      if (count > 25) continue;
      const ticks = Array.from({ length: Math.max(0, count) }, (_, i) => Number(((first + i) * step).toPrecision(12)));
      const texts = ticks.map((tick) => fmt(tick));
      const pitch = (step / (to - from)) * width;
      if (count <= 2 || texts.every((text, i) => i === 0 || (textW(text) + textW(texts[i - 1]!)) / 2 + 4 <= pitch)) return { lo: from, hi: to, ticks };
    }
  }
}

export const compileNumberline = guard((spec, ctx) => {
  const sets = [
    ...readAll(spec, 'interval').map((raw) => ({ source: plain(raw), pieces: parseIntervals(raw) })),
    ...readAll(spec, 'ineq').map((raw) => ({ source: plain(raw), pieces: parseInequality(raw) })),
  ];
  const points = readPoints(spec);
  const stated = readRange(spec);
  const empty = sets.find((set) => !set.pieces.length);
  if (empty) refuse(`"${empty.source}" has no solution to draw`);
  if (!sets.length && !points.length) refuse('numberline needs a point, an interval or an ineq');

  // Every finite end and every point is named on the line.
  const ends = sets.flatMap((set) => set.pieces.flatMap((piece) => [piece.lo.at, piece.hi.at])).filter((at) => Number.isFinite(at.value));
  const named = [...ends, ...points.map((point) => point.at)].filter((at, i, all) => all.findIndex((other) => other.value === at.value) === i);
  const values = named.map((at) => at.value);
  const outside = stated && named.find((at) => at.value < stated.lo || at.value > stated.hi);
  if (outside) refuse(`${outside.text} lies outside the range ${fmt(stated.lo)} to ${fmt(stated.hi)}`);
  const low = Math.min(...values);
  const high = Math.max(...values);
  // An unstated range leaves room on both sides: a ray needs line to run along.
  const air = values.length ? (high > low ? (high - low) * 0.3 : Math.max(2, Math.abs(low) / 2)) : 5;
  const wanted = stated ?? (values.length ? { lo: low - air, hi: high + air } : { lo: -5, hi: 5 });

  const { w } = frameSize(ctx.profile);
  const x0 = EDGE + 18;
  const x1 = w - EDGE - 18;
  // Whole numbers in, whole numbers on the line.
  const whole = values.every((value) => Number.isInteger(value)) && (!stated || (Number.isInteger(stated.lo) && Number.isInteger(stated.hi)));
  const { lo, hi, ticks } = chooseTicks(wanted.lo, wanted.hi, x1 - x0, !stated, whole);
  const xAt = (value: number) => x0 + ((value - lo) / (hi - lo)) * (x1 - x0);
  /** Where the line's arrowheads end: a ray runs out to here. */
  const tips = { lo: x0 - 12, hi: x1 + 12 };

  // Sets that overlap (or touch) go on separate rails; the first free rail from the line upward.
  const rails: Piece[][] = [];
  const railOf = sets.map((set) => {
    const meets = (other: Piece) => set.pieces.some((piece) => piece.lo.at.value <= other.hi.at.value && other.lo.at.value <= piece.hi.at.value);
    let rail = rails.findIndex((taken) => !taken.some(meets));
    if (rail < 0) rail = rails.push([]) - 1;
    rails[rail]!.push(...set.pieces);
    return rail;
  });
  if (rails.length > MAX_RAILS) refuse(`${rails.length} overlapping sets are more than the ${MAX_RAILS} a number line can stack legibly`);

  // A single rail lies on the line; several float above it, clear of the point labels.
  const lifted = rails.length > 1;
  const b = new SceneBuilder('numberline', w, 0);
  /** Height above the line taken by its dots and, when any point is labelled, the row of labels. */
  const above = points.some((point) => point.label) ? DOT + 3 + LINE : DOT + 1;
  const axisY = EDGE + above + (lifted ? rails.length * RAIL_PITCH + 2 : 0);
  const railY = (rail: number) => (lifted ? axisY - above - 2 - (rail + 0.5) * RAIL_PITCH : axisY);

  b.line('axis', tips.lo, axisY, tips.hi, axisY, { role: 'axis', width: 1.2, markerStart: true, markerEnd: true, protected: true });
  // Every tick is marked, like a ruler; a number is dropped only where a named value needs its place.
  [...new Set([...ticks, ...values])].forEach((value, i) => b.line(`tick-${i}`, xAt(value), axisY - 3.5, xAt(value), axisY + 3.5, { role: 'axis', width: 1, protected: true }));
  nameAxis(b, xAt, axisY + 7 + TEXT_H / 2, named, ticks);

  sets.forEach((set, s) => {
    const y = railY(railOf[s]!);
    set.pieces.forEach((piece, p) => {
      const id = `set-${s}-${p}`;
      const from = Number.isFinite(piece.lo.at.value) ? xAt(piece.lo.at.value) : tips.lo;
      const to = Number.isFinite(piece.hi.at.value) ? xAt(piece.hi.at.value) : tips.hi;
      // The stroke stops at the base of an arrowhead so that the tip stays sharp.
      const head = (tip: number, sign: 1 | -1) => b.polygon(`${id}-${sign < 0 ? 'lo' : 'hi'}`, [tip, y, tip - sign * 9, y - 4.2, tip - sign * 9, y + 4.2], { color: 'accent', fill: 'ink', width: 0.8, role: 'geometry' });
      const dot = (x: number, closed: boolean, end: 'lo' | 'hi') => b.circle(`${id}-${end}`, x, y, DOT, { color: 'accent', fill: closed ? 'ink' : 'paper', width: 1.6, role: 'geometry' });
      const finiteLo = from !== tips.lo;
      const finiteHi = to !== tips.hi;
      if (to > from) b.line(id, finiteLo ? from : from + 8, y, finiteHi ? to : to - 8, y, { color: 'accent', width: 3.2, role: 'geometry' });
      if (finiteLo) dot(from, piece.lo.closed, 'lo');
      else head(from, -1);
      if (!finiteHi) head(to, 1);
      else if (to > from) dot(to, piece.hi.closed, 'hi');
    });
  });

  const tags: { x: number; half: number; text: string }[] = [];
  points.forEach((point, i) => {
    const x = xAt(point.at.value);
    b.circle(`point-${i}`, x, axisY, DOT, { fill: point.open ? 'paper' : 'ink', width: 1.6, role: 'geometry' });
    if (!point.label) return;
    const half = textW(point.label) / 2;
    if (2 * half > w - 2 * EDGE) refuse(`label "${point.label}" is too long to print`);
    const cx = Math.min(Math.max(x, EDGE + half), w - EDGE - half);
    const other = tags.find((tag) => Math.abs(tag.x - cx) < tag.half + half + 4);
    if (other) refuse(`labels "${other.text}" and "${point.label}" are too close together to print`);
    put(b, `pointl-${i}`, point.label, cx, axisY - DOT - 3 - TEXT_H / 2);
    tags.push({ x: cx, half, text: point.label });
  });

  b.height = axisY + 7 + TEXT_H + EDGE;
  return finish(b.scene());
});
