import type { CompileCtx, CompileResult } from '../types';
import { specGet, specHas, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

/** Frozen Sedra hybrid-π canvas. Missing RC rejects. Nodes rpi, gm, RE, RC, B, C, E always present when valid. */
export function compileHybridPi(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const need = ['rpi', 'gm', 're', 'rc'];
  const missing = need.filter((k) => !specHas(spec, k));
  if (missing.length) {
    return { ok: false, code: 'malformed', reason: `hybridpi missing ${missing.join(', ')}` };
  }
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('hybridpi', w, h);
  b.hl(spec.highlight);

  const yB = 50;
  const yE = h - 36;
  const yC = 50;
  const xVin = 28;
  const xB = 70;
  // Frozen Sedra: rπ is the B–E branch, so E sits on the same vertical as B.
  const xE = xB;
  const xC = 200;
  const xRe = 150;

  b.label('vin', specGet(spec, 'vin') ?? 'vin', xVin, yB - 16, { protected: true, slot: 'N' });
  b.line('vin-w', xVin, yB, xB, yB, { width: 1.6 });
  b.circle('B', xB, yB, 3, { fill: 'solid' });
  b.label('B', 'B', xB, yB - 14, { protected: true });

  // rπ B–E: zigzag starts at B and ends at E (same x, emitter rail).
  const yZig = yB + 20;
  b.polyline(
    'rpi',
    [
      xB,
      yB,
      xB,
      yZig,
      xB - 6,
      yZig + 8,
      xB + 6,
      yZig + 16,
      xB - 6,
      yZig + 24,
      xB,
      yZig + 32,
      xE,
      yE,
    ],
    { width: 1.8 },
  );
  b.label('rpi', 'rπ', xB - 22, (yB + yE) / 2, { slot: 'W', protected: true });
  b.label('rpi-val', specGet(spec, 'rpi') ?? '', xB - 22, (yB + yE) / 2 + 12, { slot: 'W', protected: true });

  b.circle('E', xE, yE, 3, { fill: 'solid' });
  b.label('E', 'E', xE - 12, yE + 12, { protected: true });
  // Emitter rail: E across to RE / gm foot, then down to GND.
  b.line('e-rail', xE, yE, xRe + 40, yE, { width: 1.4 });
  b.line('e-gnd', xE, yE, xE, h - 18, { width: 1.4 });
  b.line('gnd', 40, h - 18, w - 40, h - 18, { width: 1.4 });
  b.label('gnd', specGet(spec, 'gnd') ?? '0', 48, h - 8, { protected: true });

  // gm diamond C–E
  const dx = xC - 40;
  const midY = (yC + yE) / 2;
  b.polygon('gm', [dx, midY - 22, dx + 18, midY, dx, midY + 22, dx - 18, midY], { fill: 'none', color: 'accent' });
  b.label('gm', 'gm vbe', dx, midY - 34, { slot: 'N', protected: true });
  b.label('gm-val', specGet(spec, 'gm') ?? '', dx, midY + 34, { slot: 'S', protected: true });
  b.line('gm-c', dx, midY - 22, xC, yC, { width: 1.4 });
  b.line('gm-e', dx, midY + 22, xE, yE, { width: 1.4 });

  b.circle('C', xC, yC, 3, { fill: 'solid' });
  b.label('C', 'C', xC + 12, yC - 12, { protected: true });

  // RC up to VCC
  b.polyline('RC', [xC, yC, xC, 28, xC - 6, 20, xC + 6, 12, xC, 6], { width: 1.8 });
  b.line('vcc', xC - 24, 6, xC + 24, 6, { width: 1.6 });
  b.label('RC', 'RC', xC + 20, 24, { slot: 'E', protected: true });
  b.label('RC-val', specGet(spec, 'rc') ?? '', xC + 20, 36, { slot: 'E', protected: true });
  b.label('supply', specGet(spec, 'supply') ?? 'VCC', xC + 36, 6, { protected: true });

  // RE to GND from the emitter rail
  b.polyline('RE', [xRe, yE, xRe, yE + 8, xRe - 6, yE + 14, xRe + 6, yE + 20, xRe, h - 18], {
    width: 1.8,
  });
  b.label('RE', 'RE', xRe + 18, yE + 8, { slot: 'E', protected: true });
  b.label('RE-val', specGet(spec, 're') ?? '', xRe + 18, yE + 20, { slot: 'E', protected: true });

  if (specHas(spec, 'ro')) {
    b.polyline('ro', [xC, yC, xC + 30, yC, xC + 30, yE, xE, yE], { dash: true, color: 'muted' });
    b.label('ro', 'ro', xC + 42, (yC + yE) / 2, { slot: 'E', protected: true });
  }

  return layoutAndCompile(b.scene());
}

export function compileMosPi(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('mospi', w, h);
  b.hl(spec.highlight);
  b.polygon('gm', [140, 70, 160, 90, 140, 110, 120, 90], { fill: 'none', color: 'accent' });
  b.label('gm', 'gm', 140, 56, { protected: true });
  b.label('gmb', specGet(spec, 'gmb') ?? 'gmb', 90, 90, { protected: true });
  b.label('RD', 'RD', 200, 30, { protected: true });
  b.label('RS', 'RS', 140, h - 24, { protected: true });
  b.label('Cgs', specGet(spec, 'cgs') ?? 'Cgs', 70, 50, { protected: true });
  b.line('vcc', 40, 20, w - 40, 20, { width: 1.4 });
  b.line('gnd', 40, h - 18, w - 40, h - 18, { width: 1.4 });
  b.rect('RD', 188, 28, 24, 12, { fill: 'solid' });
  b.rect('RS', 128, h - 40, 24, 12, { fill: 'solid' });
  return layoutAndCompile(b.scene());
}

export function compileOpamp(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const missing = ['rf', 'rg'].filter((k) => !specHas(spec, k));
  if (missing.length) return { ok: false, code: 'malformed', reason: `opamp missing ${missing.join(', ')}` };
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('opamp', w, h);
  b.hl(spec.highlight);
  const tx = w * 0.45;
  const ty = h * 0.5;
  b.polygon('oa', [tx - 40, ty - 36, tx - 40, ty + 36, tx + 40, ty], { fill: 'none', width: 1.8 });
  b.label('plus', '+', tx - 28, ty - 14, { protected: true });
  b.label('minus', '−', tx - 28, ty + 14, { protected: true });
  b.line('out', tx + 40, ty, w - 36, ty, { width: 1.6 });
  b.label('Vout', 'Vout', w - 28, ty - 12, { protected: true });
  // Rf north hop
  b.polyline('Rf', [tx + 20, ty - 8, tx + 20, 28, 80, 28, 80, ty + 14], { width: 1.6 });
  b.rect('Rfbox', tx - 10, 22, 28, 12, { fill: 'solid' });
  b.label('Rf', 'Rf', tx + 4, 14, { protected: true });
  b.label('Rf-val', specGet(spec, 'rf') ?? '', tx + 4, 44, { protected: true });
  b.line('Rg', 40, ty + 14, tx - 40, ty + 14, { width: 1.6 });
  b.rect('Rgbox', 70, ty + 8, 28, 12, { fill: 'solid' });
  b.label('Rg', 'Rg', 84, ty + 34, { protected: true });
  b.label('Rg-val', specGet(spec, 'rg') ?? '', 84, ty - 4, { protected: true });
  b.line('gnd', 36, h - 20, w - 36, h - 20, { width: 1.4 });
  b.label('GND', 'GND', 44, h - 8, { protected: true });
  b.line('in', 24, ty - 14, tx - 40, ty - 14, { width: 1.6 });
  b.label('Vin', 'Vin', 28, ty - 28, { protected: true });
  return layoutAndCompile(b.scene());
}
