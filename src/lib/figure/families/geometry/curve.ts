/**
 * Polar and parametric curves: what `plot` (y as a function of x) cannot draw.
 *
 *   kind: polar | parametric       the type alias (polar, parametric) or the keys decide when absent
 *   r:    1 + cos(theta)           polar: r as a function of theta (θ and t are read as theta)
 *   x:    cos(t)                   parametric: x and y as functions of t
 *   y:    sin(2*t)
 *   t:    0 2*pi                   parameter range, endpoints may be expressions; 0 to 2π unless given
 *
 * One scale on both axes, axes through the origin, and for a polar curve a faint grid of circles and
 * rays in place of the square one.
 */
import type { CompileCtx, CompileResult } from '../../types';
import { specGet, type SpecDoc } from '../../spec';
import { SceneBuilder, frameSize } from '../../scene-build';
import { layoutAndCompile } from '../../pipeline';
import { repairRange } from '../../intel/expr-repair';
import { Placer, drawReadout, malformed, readout, type Pt } from './canvas';
import { compileIn } from './expr';
import { MINUS } from './format';
import { Plane, clipPolyline, clipSegment, windowAround } from './plane';

const SAMPLES = 720;
/** A coordinate beyond this is an asymptote, not part of the picture. */
const FAR = 1e4;

/** The expression as written, for the readout, when it is plain text; '' otherwise. */
function written(source: string): string {
  const text = source.slice(source.lastIndexOf('=') + 1).trim().replace(/\s+/g, ' ').replace(/\*/g, '·').replace(/-/g, MINUS);
  return text.length <= 28 && /^[\w+−/^(). ·θπ]+$/.test(text) ? text : '';
}

/** Sampled points of the curve, cut into runs wherever it is undefined or runs off to infinity. */
export function sampleCurve(at: (t: number) => Pt, t0: number, t1: number): Pt[][] {
  const runs: Pt[][] = [];
  let run: Pt[] = [];
  for (let i = 0; i <= SAMPLES; i++) {
    const p = at(t0 + ((t1 - t0) * i) / SAMPLES);
    if (Number.isFinite(p.x) && Number.isFinite(p.y) && Math.abs(p.x) < FAR && Math.abs(p.y) < FAR) {
      run.push(p);
      continue;
    }
    if (run.length > 1) runs.push(run);
    run = [];
  }
  if (run.length > 1) runs.push(run);
  return runs;
}

export function compileCurve(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const fail = (reason: string) => malformed(`curve: ${reason}`);
  const kindRaw = specGet(spec, 'kind')?.trim().toLowerCase();
  const rRaw = specGet(spec, 'r');
  const xRaw = specGet(spec, 'x');
  const yRaw = specGet(spec, 'y');
  const tRaw = specGet(spec, 't');
  // Without `kind:`, a type alias that names one (`type=polar`) is that kind; otherwise the keys say.
  const named = /polar/.test(kindRaw ?? ctx.alias ?? '') ? 'polar' : /param/.test(kindRaw ?? ctx.alias ?? '') ? 'parametric' : undefined;
  if (kindRaw !== undefined && !named) return fail(`kind: ${kindRaw.slice(0, 20)} is not polar or parametric`);
  const kind = named ?? (rRaw !== undefined ? 'polar' : 'parametric');

  let t0 = 0;
  let t1 = 2 * Math.PI;
  if (tRaw !== undefined) {
    const bounds = repairRange(tRaw)?.split(' ').map(Number);
    if (!bounds) return fail(`t: ${tRaw.slice(0, 20)} is not a range, as in 0 2*pi`);
    [t0, t1] = bounds as [number, number];
  }

  let at: (t: number) => Pt;
  const equations: string[] = [];
  if (kind === 'polar') {
    if (rRaw === undefined) return fail('a polar curve needs r: as a function of theta');
    const r = compileIn(rRaw, 'theta') ?? compileIn(rRaw, 't');
    if (!r) return fail(`r: ${rRaw.slice(0, 24)} is not an expression in theta`);
    at = (t) => ({ x: r(t) * Math.cos(t), y: r(t) * Math.sin(t) });
    if (written(rRaw)) equations.push(`r = ${written(rRaw)}`);
  } else {
    if (xRaw === undefined || yRaw === undefined) return fail('a parametric curve needs x: and y: as functions of t');
    const x = compileIn(xRaw, 't');
    const y = compileIn(yRaw, 't');
    if (!x) return fail(`x: ${xRaw.slice(0, 24)} is not an expression in t`);
    if (!y) return fail(`y: ${yRaw.slice(0, 24)} is not an expression in t`);
    at = (t) => ({ x: x(t), y: y(t) });
    if (written(xRaw) && written(yRaw)) equations.push(`x = ${written(xRaw)}`, `y = ${written(yRaw)}`);
  }

  const runs = sampleCurve(at, t0, t1);
  const points = runs.flat();
  if (!points.length) return fail('the curve is undefined over this range');
  const span = Math.max(...points.map((p) => p.x)) - Math.min(...points.map((p) => p.x)) + Math.max(...points.map((p) => p.y)) - Math.min(...points.map((p) => p.y));
  if (!(span > 1e-9)) return fail('the curve is a single point over this range');

  const nominal = frameSize(ctx.profile);
  const computed = readout(equations, nominal.w);
  const plane = new Plane({ window: windowAround(points), nominal, equal: true, numbers: 'axis', grid: kind === 'parametric', fill: true, names: { x: 'x', y: 'y' }, footer: computed.height });
  const b = new SceneBuilder('curve', plane.width, plane.height);
  const placer = new Placer({ width: plane.width, height: plane.height });
  plane.drawGrid(b);
  if (kind === 'polar') {
    const { window, step } = plane;
    const reach = Math.max(Math.hypot(window.x0, window.y0), Math.hypot(window.x1, window.y0), Math.hypot(window.x0, window.y1), Math.hypot(window.x1, window.y1));
    const flat = (run: Pt[]) => run.flatMap((p) => [plane.x(p.x), plane.y(p.y)]);
    for (let k = 1; k * step.x <= reach; k++) {
      const circle = Array.from({ length: 121 }, (_, i) => ({ x: k * step.x * Math.cos((i * Math.PI) / 60), y: k * step.x * Math.sin((i * Math.PI) / 60) }));
      clipPolyline(window, circle).forEach((run, part) => b.polyline(`polar-ring-${k}-${part}`, flat(run), { color: 'muted', width: 0.4, role: 'guide', fill: 'none' }));
    }
    for (let k = 0; k < 12; k++) {
      // The axes already draw the rays at 0°, 90°, 180° and 270°.
      if (k % 3 === 0) continue;
      const ray = clipSegment(window, { x: 0, y: 0 }, { x: reach * Math.cos((k * Math.PI) / 6), y: reach * Math.sin((k * Math.PI) / 6) });
      if (ray) b.line(`polar-ray-${k}`, plane.x(ray[0].x), plane.y(ray[0].y), plane.x(ray[1].x), plane.y(ray[1].y), { color: 'muted', width: 0.4, role: 'guide', protected: true });
    }
  }
  plane.drawAxes(b, placer);
  drawReadout(b, placer, computed);
  runs.forEach((run, i) => {
    const flat = run.flatMap((p) => [plane.x(p.x), plane.y(p.y)]);
    b.polyline(`curve-${i}`, flat, { color: 'accent', width: 1.8, role: 'geometry', fill: 'none' });
    placer.path(flat);
  });
  plane.drawNames(b, placer);
  plane.drawNumbers(b, placer);
  return layoutAndCompile(b.scene());
}
