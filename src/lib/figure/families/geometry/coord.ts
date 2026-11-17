/**
 * Analytic geometry on a coordinate grid, to scale, with one scale on both axes.
 *
 *   point:   A 1 2                      repeatable; also `A(1, 2)`, `A = (1, 2)`, or unnamed `(1, 2)`
 *   segment: A B                        between declared points
 *   line:    y = 2x + 1                 repeatable; any equation linear in x and y (`x = 3`, `2x + 3y = 6`), or `A B` through two points
 *   circle:  C 2                        centre (a point name or `0,0`) and radius; or any circle equation (`(x-1)^2 + (y+2)^2 = 9`)
 *   polygon: A B C D                    tinted, repeatable
 *   window:  -5 5 -5 5                  xmin xmax ymin ymax; inferred from the figure otherwise
 *   show:    distance A B, midpoint A B, slope A B      computed here and printed
 *
 * Equations are read by evaluating them, not by matching their text: a line is whatever is linear
 * in x and y, a circle whatever has equal x² and y² terms and no others of that degree.
 */
import type { CompileCtx, CompileResult } from '../../types';
import { specGet, specList, type SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { layoutAndCompile } from '../../pipeline';
import { evaluateConstant } from '../../intel/expr-repair';
import { Placer, clip, drawReadout, fan, malformed, readout, ring, textSize, type Pt } from './canvas';
import { compileXY, parseNamedPair, type NamedPair } from './expr';
import { MINUS, fmt, isExactAt } from './format';
import { Plane, clipPolyline, clipSegment, windowAround, type Window } from './plane';

type Dot = NamedPair;
export interface LineEq { a: number; b: number; c: number }
export interface CircleEq { cx: number; cy: number; r: number }

const SAMPLES: ReadonlyArray<readonly [number, number]> = [[2, 3], [-1.5, 0.5], [7, -4]];
const near = (actual: number, expected: number, scale: number) => Math.abs(actual - expected) <= 1e-9 * (1 + scale);

/** `lhs = rhs` as the function lhs − rhs of x and y; an expression alone is read as `y = …`. */
function residual(equation: string): ((x: number, y: number) => number) | null {
  const sides = equation.includes('=') ? equation.split('=') : ['y', equation];
  if (sides.length !== 2) return null;
  const lhs = compileXY(sides[0]!);
  const rhs = compileXY(sides[1]!);
  return lhs && rhs ? (x, y) => lhs(x, y) - rhs(x, y) : null;
}

/** Coefficients of a·x + b·y + c = 0 when the equation is linear in x and y. */
export function parseLine(equation: string): LineEq | null {
  const f = residual(equation);
  if (!f) return null;
  const c = f(0, 0);
  const a = f(1, 0) - c;
  const b = f(0, 1) - c;
  if (![a, b, c].every(Number.isFinite) || Math.hypot(a, b) < 1e-12) return null;
  // Linear means the plane through three samples predicts every other one.
  const linear = SAMPLES.every(([x, y]) => near(f(x, y), a * x + b * y + c, Math.abs(a * x) + Math.abs(b * y) + Math.abs(c)));
  return linear ? { a, b, c } : null;
}

/** Centre and radius when the equation is a circle's, in standard or expanded form. */
export function parseCircle(equation: string): CircleEq | null {
  const f = equation.includes('=') ? residual(equation) : null;
  if (!f) return null;
  const g = f(0, 0);
  const q = (f(1, 0) + f(-1, 0)) / 2 - g;
  const d = (f(1, 0) - f(-1, 0)) / 2;
  const e = (f(0, 1) - f(0, -1)) / 2;
  if (![g, q, d, e].every(Number.isFinite) || Math.abs(q) < 1e-12) return null;
  const fits = [...SAMPLES, [0, 1] as const].every(([x, y]) => near(f(x, y), q * (x * x + y * y) + d * x + e * y + g, Math.abs(q) * (x * x + y * y) + Math.abs(d * x) + Math.abs(e * y) + Math.abs(g)));
  // Adding zero turns −0 into 0.
  const cx = -d / (2 * q) + 0;
  const cy = -e / (2 * q) + 0;
  const r2 = cx * cx + cy * cy - g / q;
  return fits && r2 > 1e-12 ? { cx, cy, r: Math.sqrt(r2) } : null;
}

const coords = (p: Pt) => `(${fmt(p.x)}, ${fmt(p.y)})`;

function gcd(a: number, b: number): number {
  return b ? gcd(b, a % b) : Math.abs(a);
}

/** A length whose square is a whole number, as a simplified surd: 5, √13, 2√5. */
function surd(squared: number): string | null {
  const n = Math.round(squared);
  if (n < 1 || n > 1e6 || Math.abs(squared - n) > 1e-9) return null;
  let outside = 1;
  for (let k = 2; k * k <= n; k++) if (n % (k * k) === 0) outside = k;
  const inside = n / (outside * outside);
  return inside === 1 ? String(outside) : `${outside === 1 ? '' : outside}√${inside}`;
}

export function distanceText(p: Pt, q: Pt): string {
  const d = Math.hypot(q.x - p.x, q.y - p.y);
  const exact = surd((q.x - p.x) ** 2 + (q.y - p.y) ** 2);
  if (exact) return exact.includes('√') ? `= ${exact} ≈ ${fmt(d)}` : `= ${exact}`;
  return `${isExactAt(d, fmt(d)) ? '=' : '≈'} ${fmt(d)}`;
}

/** rise/run as a fraction in lowest terms when the coordinates are (short) decimals. */
export function slopeText(p: Pt, q: Pt): string {
  const run = q.x - p.x;
  const rise = q.y - p.y;
  if (Math.abs(run) < 1e-12) return 'is undefined (vertical)';
  for (const scale of [1, 10, 100, 1000]) {
    const [top, bottom] = [rise * scale, run * scale];
    if (Math.abs(top - Math.round(top)) > 1e-9 || Math.abs(bottom - Math.round(bottom)) > 1e-9) continue;
    const divisor = gcd(Math.round(top), Math.round(bottom)) || 1;
    const sign = top * bottom < 0 ? MINUS : '';
    const [n, d] = [Math.abs(Math.round(top)) / divisor, Math.abs(Math.round(bottom)) / divisor];
    if (n > 999 || d > 999) break;
    return `= ${sign}${n}${d === 1 ? '' : `/${d}`}`;
  }
  const m = rise / run;
  return `${isExactAt(m, fmt(m)) ? '=' : '≈'} ${fmt(m)}`;
}

/** The equation as the problem wrote it when that is plain text, otherwise slope-intercept form. */
function lineLabel(raw: string, line: LineEq): string {
  const written = raw.trim().replace(/\s+/g, ' ').replace(/\*/g, '').replace(/[-−]/g, MINUS);
  if (raw.includes('=') && written.length <= 22 && /^[\dxy+−/^(). =]+$/i.test(written)) return written;
  if (Math.abs(line.b) < 1e-12) return `x = ${fmt(-line.c / line.a)}`;
  const m = -line.a / line.b;
  const k = -line.c / line.b;
  const slope = Math.abs(m) < 1e-12 ? '' : `${Math.abs(Math.abs(m) - 1) < 1e-12 ? (m < 0 ? MINUS : '') : fmt(m)}x`;
  const shift = Math.abs(k) < 1e-12 ? '' : slope ? ` ${k < 0 ? MINUS : '+'} ${fmt(Math.abs(k))}` : fmt(k);
  return `y = ${slope || shift ? `${slope}${shift}` : '0'}`;
}

export function compileCoord(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const fail = (reason: string) => malformed(`coord: ${reason}`);
  const pointRaw = specList(spec, 'point');
  const segmentRaw = specList(spec, 'segment');
  const lineRaw = specList(spec, 'line');
  const circleRaw = specList(spec, 'circle');
  const polygonRaw = specList(spec, 'polygon');
  const windowRaw = specGet(spec, 'window');
  const showRaw = specList(spec, 'show').flatMap((line) => line.split(/[,;]/)).map((item) => item.trim()).filter(Boolean);

  const dots: Dot[] = [];
  for (const raw of pointRaw) {
    const dot = parseNamedPair(raw);
    if (!dot) return fail(`point: ${clip(raw)} is not a name and two coordinates, as in A 1 2`);
    if (dot.name && dots.some((other) => other.name === dot.name)) return fail(`point ${dot.name} is declared twice`);
    dots.push(dot);
  }
  const find = (name: string) => dots.find((dot) => dot.name === name) ?? dots.find((dot) => dot.name && dot.name.toLowerCase() === name.toLowerCase());
  /** Declared points named in `raw`: `A B`, `A, B`, `A-B`, `A to B`, or `AB` when every letter is a point. */
  const refs = (raw: string): Dot[] | string => {
    const out: Dot[] = [];
    for (const token of raw.split(/[\s,;→–—-]+|\bto\b/).filter(Boolean)) {
      const whole = find(token);
      const letters = whole ? [whole] : [...token].map((letter) => find(letter));
      if (letters.some((dot) => !dot)) return `${clip(token)} is not a declared point`;
      out.push(...(letters as Dot[]));
    }
    return out;
  };
  const pair = (key: string, raw: string): [Dot, Dot] | string => {
    const found = refs(raw);
    if (typeof found === 'string') return `${key}: ${found}`;
    if (found.length !== 2 || found[0] === found[1]) return `${key}: ${clip(raw)} needs two different points`;
    return [found[0]!, found[1]!];
  };

  const segments: Array<[Dot, Dot]> = [];
  for (const raw of segmentRaw) {
    const ends = pair('segment', raw);
    if (typeof ends === 'string') return fail(ends);
    segments.push(ends);
  }

  const polygons: Dot[][] = [];
  for (const raw of polygonRaw) {
    const corners = refs(raw);
    if (typeof corners === 'string') return fail(`polygon: ${corners}`);
    if (corners.length < 3) return fail(`polygon: ${clip(raw)} needs at least three points`);
    polygons.push(corners);
  }

  const lines: Array<LineEq & { label?: string }> = [];
  for (const raw of lineRaw) {
    const through = raw.includes('=') ? null : refs(raw);
    if (through && typeof through !== 'string' && through.length === 2 && through[0] !== through[1]) {
      const [p, q] = through as [Dot, Dot];
      lines.push({ a: q.y - p.y, b: p.x - q.x, c: q.x * p.y - p.x * q.y });
      continue;
    }
    const line = parseLine(raw);
    if (!line) return fail(`line: ${clip(raw)} is neither an equation linear in x and y nor two declared points`);
    lines.push({ ...line, label: lineLabel(raw, line) });
  }

  const circles: Array<CircleEq & { marked: boolean }> = [];
  for (const raw of circleRaw) {
    const fromEquation = parseCircle(raw);
    if (fromEquation) {
      circles.push({ ...fromEquation, marked: true });
      continue;
    }
    // `C 2`, `0,0 2`, `centre C radius 2`, `(1, 2) r = 3`
    const tokens = raw.replace(/\b(?:cent(?:er|re)|radius|at|r)\b/gi, ' ').replace(/[()[\]=:,]/g, ' ').trim().split(/\s+/);
    const numbers = tokens.map((token) => evaluateConstant(token));
    const named = tokens.length === 2 ? find(tokens[0]!) : undefined;
    const r = numbers.at(-1);
    const centre = named ?? (tokens.length === 3 && numbers[0] != null && numbers[1] != null ? { x: numbers[0], y: numbers[1] } : null);
    if (!centre || r == null) {
      return fail(tokens.length === 2 && r != null ? `circle: ${clip(tokens[0]!)} is not a declared point` : `circle: ${clip(raw)} is neither a centre and radius nor the equation of a circle`);
    }
    if (!(r > 0)) return fail('circle: the radius must be positive');
    circles.push({ cx: centre.x, cy: centre.y, r, marked: !named });
  }

  const results: string[] = [];
  const guides: Array<[Dot, Dot]> = [];
  const midpoints: Pt[] = [];
  for (const item of showRaw) {
    const match = /^(distance|dist|length|midpoint|mid|slope|gradient)\b\s*(?:of|between|from)?\s*(.*)$/i.exec(item);
    if (!match) return fail(`show: ${clip(item)} is not distance, midpoint or slope of two points`);
    const ends = pair('show', match[2]!.replace(/\band\b/gi, ' '));
    if (typeof ends === 'string') return fail(ends);
    const [p, q] = ends;
    const verb = match[1]!.toLowerCase();
    const name = p.name.length === 1 && q.name.length === 1 ? `${p.name}${q.name}` : `${p.name}–${q.name}`;
    if (verb.startsWith('mid')) midpoints.push({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    else results.push(/^(?:slope|gradient)$/.test(verb) ? `slope ${name} ${slopeText(p, q)}` : `${name} ${distanceText(p, q)}`);
    guides.push(ends);
  }

  let window: Window;
  if (windowRaw !== undefined) {
    // `-5 5 -5 5`, `[-5, 5] x [-5, 5]`, `x: -5..5, y: -5..5`
    const bounds = windowRaw.replace(/[()[\]{},;×]|\.\.+|\bto\b|\b[xy]\b\s*[=:∈]?/gi, ' ').trim().split(/\s+/).map((token) => evaluateConstant(token));
    const [x0, x1, y0, y1] = bounds;
    if (bounds.length !== 4 || x0 == null || x1 == null || y0 == null || y1 == null || !(x1 > x0) || !(y1 > y0)) return fail('window needs xmin xmax ymin ymax, each pair increasing');
    window = { x0, x1, y0, y1 };
    const outside = dots.find((dot) => dot.x < x0 || dot.x > x1 || dot.y < y0 || dot.y > y1);
    if (outside) return fail(`point ${outside.name || coords(outside)} lies outside the window`);
  } else {
    const marks: Pt[] = [...dots];
    for (const circle of circles) marks.push({ x: circle.cx - circle.r, y: circle.cy - circle.r }, { x: circle.cx + circle.r, y: circle.cy + circle.r });
    // Lines alone have no extent: they are shown in the standard window, widened to reach their intercepts.
    if (!marks.length && lines.length) marks.push({ x: -5, y: -5 }, { x: 5, y: 5 });
    for (const line of lines) {
      if (Math.abs(line.a) > 1e-12) marks.push({ x: -line.c / line.a, y: 0 });
      if (Math.abs(line.b) > 1e-12) marks.push({ x: 0, y: -line.c / line.b });
    }
    if (!marks.length) return fail('nothing to draw: give a point, line, circle or polygon');
    window = windowAround(marks);
  }
  if (![window.x0, window.x1, window.y0, window.y1].every((value) => Math.abs(value) < 1e9)) return fail('the figure is too large to draw');

  const nominal = frameSize(ctx.profile);
  const computed = readout(results, nominal.w);
  const solid = dots.length > 0 || circles.length > 0;

  const render = (tall: boolean): CompileResult => {
    // Lines alone never ask for a tall canvas: the window inferred for them is a convention, not an extent.
    const plane = new Plane({
      window, nominal, equal: true, numbers: 'axis', grid: true, fill: windowRaw === undefined, footer: computed.height,
      ...(tall ? { tallAbove: 0 } : solid || windowRaw !== undefined ? {} : { tallAbove: Infinity }),
    });
    const b = new SceneBuilder('coord', plane.width, plane.height);
    const placer = new Placer({ width: plane.width, height: plane.height });
    plane.drawGrid(b);
    plane.drawAxes(b, placer);
    drawReadout(b, placer, computed);

    const flat = (points: Pt[]) => points.flatMap((p) => [plane.x(p.x), plane.y(p.y)]);
    polygons.forEach((corners, i) => {
      b.polygon(`polygon-${i}`, flat(corners), { color: 'accent', fill: 'tint', role: 'geometry' });
      placer.path(flat(corners), true);
    });
    circles.forEach((circle, i) => {
      const outline = Array.from({ length: 73 }, (_, k) => ({ x: circle.cx + circle.r * Math.cos((k * Math.PI) / 36), y: circle.cy + circle.r * Math.sin((k * Math.PI) / 36) }));
      clipPolyline(plane.window, outline).forEach((run, part) => {
        b.polyline(`circle-${i}${part ? `-${part}` : ''}`, flat(run), { color: 'accent', role: 'geometry', fill: 'none' });
        placer.path(flat(run));
      });
    });
    const lineEnds = lines.map((line, i) => {
      const norm = Math.hypot(line.a, line.b);
      const foot = { x: (-line.a * line.c) / (norm * norm), y: (-line.b * line.c) / (norm * norm) };
      const far = Math.hypot(foot.x, foot.y) + Math.abs(plane.window.x0) + Math.abs(plane.window.x1) + Math.abs(plane.window.y0) + Math.abs(plane.window.y1);
      const along = { x: (line.b / norm) * far, y: (-line.a / norm) * far };
      const ends = clipSegment(plane.window, { x: foot.x - along.x, y: foot.y - along.y }, { x: foot.x + along.x, y: foot.y + along.y });
      if (!ends) return null;
      b.line(`line-${i}`, plane.x(ends[0].x), plane.y(ends[0].y), plane.x(ends[1].x), plane.y(ends[1].y), { color: 'accent', role: 'geometry' });
      placer.path(flat(ends));
      return ends;
    });
    const joined = new Set<string>();
    const key = (p: Dot, q: Dot) => [dots.indexOf(p), dots.indexOf(q)].sort().join('-');
    polygons.forEach((corners) => corners.forEach((corner, i) => joined.add(key(corner, corners[(i + 1) % corners.length]!))));
    segments.forEach(([p, q], i) => {
      b.line(`segment-${i}`, plane.x(p.x), plane.y(p.y), plane.x(q.x), plane.y(q.y), { role: 'geometry' });
      placer.path(flat([p, q]));
      joined.add(key(p, q));
    });
    // A measured pair that nothing joins gets a dashed guide, so the reader sees what was measured.
    guides.forEach(([p, q], i) => {
      if (joined.has(key(p, q))) return;
      joined.add(key(p, q));
      b.line(`measure-${i}`, plane.x(p.x), plane.y(p.y), plane.x(q.x), plane.y(q.y), { color: 'guide', width: 1.2, role: 'guide' });
      placer.path(flat([p, q]));
    });

    plane.drawNames(b, placer);

    const marked: Array<{ id: string; at: Pt; texts: string[] }> = [
      ...dots.map((dot, i) => ({ id: `point-${i}`, at: dot, texts: dot.name ? [`${dot.name}${coords(dot)}`, dot.name] : [coords(dot)] })),
      ...circles.flatMap((circle, i) => (circle.marked ? [{ id: `centre-${i}`, at: { x: circle.cx, y: circle.cy }, texts: [coords({ x: circle.cx, y: circle.cy })] }] : [])),
      ...midpoints.map((at, i) => ({ id: `midpoint-${i}`, at, texts: [coords(at)] })),
    ].filter((mark) => plane.contains(mark.at));
    for (const mark of marked) {
      b.circle(mark.id, plane.x(mark.at.x), plane.y(mark.at.y), 2.4, { fill: 'ink', role: 'geometry' });
      placer.dot(plane.x(mark.at.x), plane.y(mark.at.y), 2.4);
    }
    // Labels lean away from the middle of the figure, so a polygon's corners are named outside it.
    const middle = { x: marked.reduce((sum, mark) => sum + plane.x(mark.at.x), 0) / (marked.length || 1), y: marked.reduce((sum, mark) => sum + plane.y(mark.at.y), 0) / (marked.length || 1) };
    for (const mark of marked) {
      const at = plane.at(mark.at);
      const away = Math.hypot(at.x - middle.x, at.y - middle.y) > 1 ? Math.atan2(at.y - middle.y, at.x - middle.x) : -Math.PI / 4;
      // The coordinates ride on the name while there is room for them.
      const fits = mark.texts.some((text) => {
        const spot = placer.claim(textSize(text), ring(at, textSize(text), fan(away), [5, 9, 14, 20, 27]));
        if (spot) b.label(`${mark.id}-name`, text, spot.x, spot.y, { protected: true });
        return spot !== null;
      });
      if (!fits) return fail(`no room to label ${mark.texts.at(-1)}`);
    }

    for (const [i, line] of lines.entries()) {
      const ends = lineEnds[i];
      if (!line.label || !ends) continue;
      const [p, q] = [plane.at(ends[0]), plane.at(ends[1])];
      const size = textSize(line.label);
      const normal = Math.atan2(q.x - p.x, -(q.y - p.y));
      const spots = function* (): Generator<Pt> {
        for (const part of [0.82, 0.18, 0.66, 0.34, 0.5, 0.9, 0.1, 0.74, 0.26, 0.58, 0.42]) yield* ring({ x: p.x + (q.x - p.x) * part, y: p.y + (q.y - p.y) * part }, size, [normal, normal + Math.PI], [3]);
      };
      const spot = placer.claim(size, spots());
      if (!spot) return fail(`no room to label the line ${line.label}`);
      b.label(`line-${i}-equation`, line.label, spot.x, spot.y, { protected: true });
    }

    plane.drawNumbers(b, placer);
    return layoutAndCompile(b.scene());
  };

  // The nominal canvas first; a figure too crowded to label there is drawn on the tall one.
  const compact = render(false);
  return compact.ok || !/no room/.test(compact.reason) ? compact : render(true);
}
