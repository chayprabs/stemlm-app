import type { CompileCtx, CompileResult } from '../types';
import { specGet, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function parsePieces(raw: string | undefined): { x: number; y: number }[] {
  if (!raw) return [];
  return raw.split(';').flatMap((p) => {
    const nums = p.trim().split(/[\s,]+/).map(Number);
    if (nums.length >= 2 && Number.isFinite(nums[0]) && Number.isFinite(nums[1])) {
      return [{ x: nums[0]!, y: nums[1]! }];
    }
    return [];
  });
}

export function compileSfd(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const L = specNumber(spec, 'l', 8) ?? 8;
  const V = parsePieces(specGet(spec, 'v'));
  const M = parsePieces(specGet(spec, 'm'));
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('sfd', w, h);
  b.hl(spec.highlight);
  const bands = 3;
  const bandH = (h - 12) / bands;
  const padL = 36;
  const padR = 12;
  const mapX = (x: number) => padL + (x / L) * (w - padL - padR);

  const drawPlot = (name: string, pts: { x: number; y: number }[], band: number, ylabel: string) => {
    const top = 6 + band * bandH;
    const mid = top + bandH * 0.55;
    b.line(`${name}-x`, padL, mid, w - padR, mid, { color: 'guide', width: 1 });
    b.line(`${name}-y`, padL, top + 8, padL, top + bandH - 8, { color: 'muted', width: 1 });
    b.label(`${name}-yl`, ylabel, 14, mid, { protected: true });
    if (!pts.length) return;
    const ys = pts.map((p) => p.y);
    const yMax = Math.max(...ys.map(Math.abs), 1);
    const poly: number[] = [];
    for (const p of pts) {
      poly.push(mapX(p.x), mid - (p.y / yMax) * (bandH * 0.35));
    }
    b.polyline(name, poly, { color: spec.highlight.includes(name) ? 'accent' : 'neutral', width: 1.8, fill: 'none' });
    pts.forEach((p, i) => {
      if (i === 0 || i === pts.length - 1 || i === Math.floor(pts.length / 2)) {
        b.label(`${name}-o${i}`, String(p.y), mapX(p.x), mid - (p.y / yMax) * (bandH * 0.35) - 8, { slot: 'N' });
      }
    });
  };

  // Load diagram (supports)
  const top = 6;
  const beamY = top + 18;
  b.line('beam', padL, beamY, w - padR, beamY, { width: 2.4 });
  b.polygon('pin', [mapX(0) - 6, beamY + 14, mapX(0) + 6, beamY + 14, mapX(0), beamY], { fill: 'none' });
  b.circle('roller', mapX(L), beamY + 10, 5, { fill: 'none' });
  b.label('L', `L=${L}`, w / 2, top + 8, { protected: true });
  drawPlot('V', V, 1, 'V');
  drawPlot('M', M, 2, 'M');
  const sign = specGet(spec, 'sign') ?? 'sagging+';
  b.label('sign', sign, w - 40, h - 8, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileBeam(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  return compileSfd(spec, ctx);
}
