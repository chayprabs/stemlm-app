/**
 * The slope field of dy/dx = f(x, y), with solution curves through given points.
 *
 *   dydx:    x - y              an expression in x and y (also `dy/dx = x - y`, `y' = x − y`)
 *   x:       -3 3               window; -3 3 on each axis unless given
 *   y:       -3 3
 *   through: 0,1                repeatable initial condition: the solution is integrated both ways with
 *                               RK4, clipped to the window and stopped where it blows up
 *
 * Each mark is drawn at the slope a ruler would measure on the page, so the two axes share one
 * scale whenever the window allows it.
 */
import type { CompileCtx, CompileResult } from '../../types';
import { specGet, specList, type SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { layoutAndCompile } from '../../pipeline';
import { repairRange } from '../../intel/expr-repair';
import { Placer, fan, malformed, ring, textSize, type Pt } from './canvas';
import { compileXY, parseNamedPair } from './expr';
import { MINUS, fmt } from './format';
import { Plane, clipPolyline, type Window } from './plane';

const SLOPEFIELD_MAX_CURVES = 6;
/** Distance between neighbouring marks, in canvas units. */
const PITCH = 15;
const STEPS = 400;

type Slope = (x: number, y: number) => number;

/**
 * One RK4 pass from (x0, y0) in steps of `h` (negative runs backwards), ending where the solution
 * stops being finite or leaves `window` by more than its own height: past that it is a blow-up.
 */
export function integrate(f: Slope, x0: number, y0: number, h: number, steps: number, window: Window): Pt[] {
  const out: Pt[] = [{ x: x0, y: y0 }];
  const slack = window.y1 - window.y0;
  let x = x0;
  let y = y0;
  for (let i = 0; i < steps; i++) {
    const k1 = f(x, y);
    const k2 = f(x + h / 2, y + (h * k1) / 2);
    const k3 = f(x + h / 2, y + (h * k2) / 2);
    const k4 = f(x + h, y + h * k3);
    y += (h * (k1 + 2 * k2 + 2 * k3 + k4)) / 6;
    x += h;
    if (!Number.isFinite(y) || y < window.y0 - slack || y > window.y1 + slack || x < window.x0 - Math.abs(h) || x > window.x1 + Math.abs(h)) break;
    out.push({ x, y });
  }
  return out;
}

function range(raw: string | undefined, name: string): [number, number] | string {
  if (raw === undefined) return [-3, 3];
  const bounds = repairRange(raw)?.split(' ').map(Number);
  return bounds && Math.abs(bounds[0]!) < 1e6 && Math.abs(bounds[1]!) < 1e6 ? [bounds[0]!, bounds[1]!] : `${name}: ${raw.slice(0, 20)} is not a range, as in -3 3`;
}

export function compileSlopefield(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const fail = (reason: string) => malformed(`slopefield: ${reason}`);
  const source = specGet(spec, 'dydx') ?? '';
  const xRange = range(specGet(spec, 'x'), 'x');
  const yRange = range(specGet(spec, 'y'), 'y');
  const throughRaw = specList(spec, 'through');
  if (typeof xRange === 'string') return fail(xRange);
  if (typeof yRange === 'string') return fail(yRange);

  const rhs = source.slice(source.lastIndexOf('=') + 1);
  const f = compileXY(rhs);
  if (!f) return fail(`dydx: ${source.slice(0, 24)} is not an expression in x and y`);
  const window: Window = { x0: xRange[0], x1: xRange[1], y0: yRange[0], y1: yRange[1] };
  if (throughRaw.length > SLOPEFIELD_MAX_CURVES) return fail(`at most ${SLOPEFIELD_MAX_CURVES} solution curves are drawn; this asks for ${throughRaw.length}`);
  const starts: Pt[] = [];
  for (const raw of throughRaw) {
    const point = parseNamedPair(raw.replace(/^y\s*\(\s*(.+?)\s*\)\s*=\s*(.+)$/i, '$1, $2'));
    if (!point || point.name) return fail(`through: ${raw.slice(0, 20)} is not a point, as in 0,1`);
    if (point.x < window.x0 || point.x > window.x1 || point.y < window.y0 || point.y > window.y1) return fail(`through: (${fmt(point.x)}, ${fmt(point.y)}) lies outside the window`);
    starts.push(point);
  }

  const aspect = (window.y1 - window.y0) / (window.x1 - window.x0);
  const plane = new Plane({ window, nominal: frameSize(ctx.profile), equal: aspect >= 0.4 && aspect <= 2.5, numbers: 'edge', grid: false, fill: false });
  const b = new SceneBuilder('slopefield', plane.width, plane.height);
  const placer = new Placer({ width: plane.width, height: plane.height });
  plane.drawGrid(b);
  plane.drawAxes(b, placer);

  const columns = Math.max(4, Math.round((plane.right - plane.left) / PITCH));
  const rows = Math.max(4, Math.round((plane.bottom - plane.top) / PITCH));
  const reach = 0.36 * Math.min((plane.right - plane.left) / columns, (plane.bottom - plane.top) / rows);
  let drawn = 0;
  for (let i = 0; i < columns; i++) {
    for (let j = 0; j < rows; j++) {
      const x = window.x0 + ((i + 0.5) * (window.x1 - window.x0)) / columns;
      const y = window.y0 + ((j + 0.5) * (window.y1 - window.y0)) / rows;
      const slope = f(x, y);
      // Undefined here (0/0, a root of a negative): no mark. An infinite slope is a vertical one.
      if (Number.isNaN(slope)) continue;
      const [dx, dy] = Number.isFinite(slope) ? [plane.kx, -plane.ky * slope] : [0, 1];
      const norm = Math.hypot(dx, dy);
      const [ux, uy] = [(dx / norm) * reach, (dy / norm) * reach];
      b.line(`slope-${i}-${j}`, plane.x(x) - ux, plane.y(y) - uy, plane.x(x) + ux, plane.y(y) + uy, { color: 'muted', width: 1, role: 'annotation', protected: true });
      drawn++;
    }
  }
  if (!drawn) return fail('the slope is undefined everywhere in this window');

  const h = (window.x1 - window.x0) / STEPS;
  for (const [i, start] of starts.entries()) {
    if (!Number.isFinite(f(start.x, start.y))) return fail(`through: the slope is undefined at (${fmt(start.x)}, ${fmt(start.y)})`);
    const curve = [...integrate(f, start.x, start.y, -h, STEPS, window).reverse(), ...integrate(f, start.x, start.y, h, STEPS, window).slice(1)];
    clipPolyline(window, curve).forEach((run, part) => {
      const points = run.flatMap((p) => [plane.x(p.x), plane.y(p.y)]);
      b.polyline(`solution-${i}${part ? `-${part}` : ''}`, points, { color: 'accent', width: 1.8, role: 'geometry', fill: 'none' });
      placer.path(points);
    });
  }
  for (const [i, start] of starts.entries()) {
    const at = plane.at(start);
    b.circle(`start-${i}`, at.x, at.y, 2.4, { fill: 'ink', role: 'geometry' });
    placer.dot(at.x, at.y, 2.4);
  }
  for (const [i, start] of starts.entries()) {
    const text = `(${fmt(start.x)}, ${fmt(start.y)})`;
    const size = textSize(text);
    const spot = placer.claim(size, ring(plane.at(start), size, fan(-Math.PI / 4), [5, 9, 14]));
    // The dot already marks the point and the axes give its coordinates: a crowded one goes unnamed.
    if (!spot) continue;
    // A plate of paper under the label, so the slope marks do not run through its digits.
    b.rect(`start-${i}-plate`, spot.x - size.w / 2 - 2, spot.y - size.h / 2, size.w + 4, size.h, { fill: 'paper', width: 0, role: 'annotation' });
    b.label(`start-${i}-name`, text, spot.x, spot.y, { protected: true });
  }

  // The equation as written heads the plot when it is plain text; otherwise the field speaks for itself.
  const written = rhs.trim().replace(/\s+/g, ' ').replace(/\*/g, '·').replace(/-/g, MINUS);
  if (written.length <= 26 && /^[\w+−/^(). ·]+$/.test(written)) {
    const text = `dy/dx = ${written}`;
    b.label('equation', text, plane.right - textSize(text).w / 2, plane.top - 3 - textSize(text).h / 2, { protected: true });
  }
  return layoutAndCompile(b.scene());
}
