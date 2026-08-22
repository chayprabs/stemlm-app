import type { CompileCtx, CompileResult } from '../types';
import { specGet, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function eqY(x: number, alpha: number): number {
  return (alpha * x) / (1 + (alpha - 1) * x);
}

/** Compiler draws the McCabe–Thiele staircase from α, R, q, zF, xD. */
export function compileMccabe(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const alpha = specNumber(spec, 'alpha', 2.5) ?? 2.5;
  const zF = specNumber(spec, 'zf', 0.4) ?? 0.4;
  const xD = specNumber(spec, 'xd', 0.95) ?? 0.95;
  const xB = specNumber(spec, 'xb', 0.05) ?? 0.05;
  const R = specNumber(spec, 'r', 1.5) ?? 1.5;
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('mccabe', w, h);
  b.hl(spec.highlight);
  const pad = 32;
  const x0 = pad;
  const y0 = h - pad;
  const span = Math.min(w, h) - pad * 2;
  const mapX = (x: number) => x0 + x * span;
  const mapY = (y: number) => y0 - y * span;
  b.line('xaxis', x0, y0, x0 + span, y0, { markerEnd: true });
  b.line('yaxis', x0, y0, x0, y0 - span, { markerEnd: true });
  b.label('xl', 'x', x0 + span, y0 + 12, { protected: true });
  b.label('yl', 'y', x0 - 12, y0 - span, { protected: true });
  b.line('yx', mapX(0), mapY(0), mapX(1), mapY(1), { color: 'muted', dash: true });
  const eqPts: number[] = [];
  for (let i = 0; i <= 40; i++) {
    const x = i / 40;
    eqPts.push(mapX(x), mapY(eqY(x, alpha)));
  }
  b.polyline('eq', eqPts, { color: 'accent', width: 1.8, fill: 'none' });
  const m = R / (R + 1);
  const intercept = xD / (R + 1);
  b.line('ol', mapX(xD), mapY(xD), mapX(zF), mapY(m * zF + intercept), { color: 'muted', width: 1.6 });
  // Staircase from xD down to xB (compiler-owned).
  const stairs: number[] = [];
  let x = xD;
  let y = xD;
  stairs.push(mapX(x), mapY(y));
  let guard = 0;
  while (x > xB && guard < 24) {
    // horizontal to eq curve (solve y = eq(x2))
    let lo = 0;
    let hi = x;
    for (let k = 0; k < 20; k++) {
      const mid = (lo + hi) / 2;
      if (eqY(mid, alpha) < y) lo = mid;
      else hi = mid;
    }
    const x2 = (lo + hi) / 2;
    stairs.push(mapX(x2), mapY(y));
    const y2 = m * x2 + intercept;
    stairs.push(mapX(x2), mapY(Math.max(y2, x2)));
    x = x2;
    y = Math.max(y2, x2);
    guard += 1;
    b.label(`st${guard}`, String(guard), mapX(x2) + 6, mapY(y) - 6, { slot: 'E' });
  }
  b.polyline('stairs', stairs, { color: 'danger', width: 1.6, fill: 'none' });
  b.circle('feed', mapX(zF), mapY(zF), 3, { color: 'accent', fill: 'solid' });
  b.label('zf', 'zF', mapX(zF), mapY(zF) + 12, { slot: 'S' });
  return layoutAndCompile(b.scene());
}

export function compilePonchon(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  return compileMccabe(spec, ctx);
}
