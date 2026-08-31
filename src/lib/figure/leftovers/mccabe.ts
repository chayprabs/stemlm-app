import type { CompileCtx, CompileResult } from '../types';
import { specGet, specHas, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function eqY(x: number, alpha: number): number {
  return (alpha * x) / (1 + (alpha - 1) * x);
}

function fail(reason: string): CompileResult {
  return { ok: false, code: 'malformed', reason };
}

function lineY(x: number, a: number, b: number): number {
  return a * x + b;
}

/** Compiler draws the McCabe–Thiele staircase from α, R, q, zF, xD. */
export function compileMccabe(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const alpha = specNumber(spec, 'alpha', 2.5) ?? 2.5;
  const zF = specNumber(spec, 'zf', 0.4) ?? 0.4;
  const xD = specNumber(spec, 'xd', 0.95) ?? 0.95;
  const xB = specNumber(spec, 'xb', 0.05) ?? 0.05;
  const R = specNumber(spec, 'r', 1.5) ?? 1.5;
  const q = specNumber(spec, 'q', 1) ?? 1;
  if (specHas(spec, 'staircase_corners')) return fail('staircase corners are derived by the compiler');
  if (!Number.isFinite(alpha) || alpha <= 0 || !Number.isFinite(R) || R <= 0) return fail('alpha and R must be positive');
  if (![zF, xD, xB].every((value) => Number.isFinite(value) && value >= 0 && value <= 1)) return fail('compositions must lie between 0 and 1');
  if (xD <= xB) return fail('xD must exceed xB');
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder(ctx.family, w, h);
  b.hl(spec.highlight);
  const pad = 32;
  const x0 = pad;
  const y0 = h - pad;
  const span = Math.min(w, h) - pad * 2;
  const mapX = (x: number) => x0 + x * span;
  const mapY = (y: number) => y0 - y * span;
  b.line('xaxis', x0, y0, x0 + span, y0, { role: 'axis', markerEnd: true });
  b.line('yaxis', x0, y0, x0, y0 - span, { role: 'axis', markerEnd: true });
  b.label('xl', 'x', x0 + span - 4, y0 + 8, { protected: true });
  b.label('yl', 'y', x0 - 8, y0 - span + 4, { protected: true });
  b.line('yx', mapX(0), mapY(0), mapX(1), mapY(1), { color: 'muted', role: 'guide', dash: true });
  const eqPts: number[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = i / 40;
    eqPts.push(mapX(x), mapY(eqY(x, alpha)));
  }
  b.polyline('eq', eqPts, { color: 'accent', role: 'geometry', width: 1.8, fill: 'none' });
  const m = R / (R + 1);
  const rectB = xD / (R + 1);
  const qSlope = Math.abs(q - 1) < 1e-9 ? Number.POSITIVE_INFINITY : q / (q - 1);
  const qIntercept = Number.isFinite(qSlope) ? zF - qSlope * zF : 0;
  const feedX = Number.isFinite(qSlope) ? (qIntercept - rectB) / (m - qSlope) : zF;
  const feedY = Number.isFinite(qSlope) ? lineY(feedX, m, rectB) : lineY(zF, m, rectB);
  const stripSlope = (feedY - xB) / Math.max(feedX - xB, 1e-9);
  const stripB = xB - stripSlope * xB;
  b.line('rectifying-line', mapX(0), mapY(rectB), mapX(1), mapY(m + rectB), { color: 'muted', role: 'geometry', width: 1.3 });
  b.line('stripping-line', mapX(xB), mapY(xB), mapX(feedX), mapY(feedY), { color: 'muted', role: 'geometry', width: 1.3 });
  if (Number.isFinite(qSlope)) {
    b.line('q-line', mapX(0), mapY(qIntercept), mapX(1), mapY(qSlope + qIntercept), { color: 'guide', role: 'guide', dash: true });
  } else {
    b.line('q-line', mapX(zF), mapY(0), mapX(zF), mapY(1), { color: 'guide', role: 'guide', dash: true });
  }
  // Staircase from xD down to xB (compiler-owned).
  const stairs: number[] = [];
  let x = xD;
  let y = xD;
  stairs.push(mapX(x), mapY(y));
  let guard = 0;
  while (x > xB && guard < 24) {
    // Horizontal to the equilibrium curve; the operating line changes at the feed intersection.
    let lo = 0;
    let hi = x;
    for (let k = 0; k < 20; k++) {
      const mid = (lo + hi) / 2;
      if (eqY(mid, alpha) < y) lo = mid;
      else hi = mid;
    }
    const x2 = (lo + hi) / 2;
    const treadMidpoint = (x + x2) / 2;
    stairs.push(mapX(x2), mapY(y));
    const y2 = x2 >= feedX ? lineY(x2, m, rectB) : lineY(x2, stripSlope, stripB);
    stairs.push(mapX(x2), mapY(Math.max(y2, x2)));
    guard += 1;
    const treadWidth = Math.abs(mapX(x) - mapX(x2));
    const labelMinWidth = String(guard).length * 12 * 0.58 + 2 * 6.6;
    if (treadWidth >= labelMinWidth) {
      b.label(`st${guard}`, String(guard), mapX(treadMidpoint), mapY(y) - 5, { slot: 'N', priority: 'optional' });
    }
    x = x2;
    y = Math.max(y2, x2);
  }
  b.polyline('stairs', stairs, { color: 'danger', role: 'geometry', width: 1.6, fill: 'none' });
  b.circle('feed', mapX(zF), mapY(zF), 3, { color: 'accent', role: 'annotation', fill: 'solid' });
  b.label('zf', 'zF', mapX(zF), mapY(zF) + 12, { slot: 'S', priority: 'required' });
  b.label('xd', 'xD', mapX(xD), mapY(xD) - 10, { slot: 'NW', priority: 'optional' });
  b.label('xb', 'xB', mapX(xB), mapY(xB) + 10, { slot: 'SE', priority: 'optional' });
  return layoutAndCompile(b.scene());
}

export function compilePonchon(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  return fail('ponchon requires an enthalpy-composition compiler; McCabe staging is not a valid fallback');
}
