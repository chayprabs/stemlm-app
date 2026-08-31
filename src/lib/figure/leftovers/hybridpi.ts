import type { CompileCtx, CompileResult } from '../types';
import { specGet, specHas, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

/** Semantic small-signal BJT model. Missing branch parameters reject rather than drawing a motif. */
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

  b.label('vin', specGet(spec, 'vin') ?? 'vin', xVin, yB - 16, { protected: true, slot: 'N', anchorId: 'vin-w' });
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
  b.labelPair('rpi-label', { id: 'rpi', text: 'rπ' }, { id: 'rpi-val', text: specGet(spec, 'rpi') ?? '' }, xB - 22, (yB + yE) / 2, {
    slot: 'W', protected: true, anchorId: 'rpi',
  });

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
  b.labelPair('gm-label', { id: 'gm', text: 'gm vπ' }, { id: 'gm-val', text: specGet(spec, 'gm') ?? '' }, dx, midY - 18, {
    slot: 'N', protected: true, anchorId: 'gm',
  });
  b.line('gm-c', dx, midY - 22, xC, yC, { width: 1.4 });
  b.line('gm-e', dx, midY + 22, xE, yE, { width: 1.4 });

  b.circle('C', xC, yC, 3, { fill: 'solid' });
  b.label('C', 'C', xC + 12, yC - 12, { protected: true });

  // RC up to VCC
  b.polyline('RC', [xC, yC, xC, 28, xC - 6, 20, xC + 6, 12, xC, 6], { width: 1.8 });
  b.line('vcc', xC - 24, 6, xC + 24, 6, { width: 1.6 });
  b.labelPair('rc-label', { id: 'RC', text: 'RC' }, { id: 'RC-val', text: specGet(spec, 'rc') ?? '' }, xC + 20, 30, {
    slot: 'E', protected: true, anchorId: 'RC',
  });
  b.label('supply', specGet(spec, 'supply') ?? 'VCC', xC + 36, 6, { protected: true });

  // RE to GND from the emitter rail
  b.polyline('RE', [xRe, yE, xRe, yE + 8, xRe - 6, yE + 14, xRe + 6, yE + 20, xRe, h - 18], {
    width: 1.8,
  });
  b.labelPair('re-label', { id: 'RE', text: 'RE' }, { id: 'RE-val', text: specGet(spec, 're') ?? '' }, xRe + 18, yE + 14, {
    slot: 'E', protected: true, anchorId: 'RE',
  });

  if (specHas(spec, 'ro')) {
    b.polyline('ro', [xC, yC, xC + 30, yC, xC + 30, yE, xE, yE], { dash: true, color: 'muted' });
    b.label('ro', `ro=${specGet(spec, 'ro')}`, xC + 42, (yC + yE) / 2, { slot: 'E', protected: true, anchorId: 'ro' });
  }

  return layoutAndCompile(b.scene());
}

export function compileMosPi(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const missing = ['gmb', 'cgs', 'rd', 'rs'].filter((key) => !specHas(spec, key));
  if (missing.length) return { ok: false, code: 'malformed', reason: `mospi missing ${missing.join(', ')}` };
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('mospi', w, h);
  b.hl(spec.highlight);
  const x = 176;
  const yTop = 20;
  const yBot = h - 18;
  const yD = 45;
  const yS = h - 48;
  const yG = h / 2;
  b.line('vcc', 42, yTop, w - 42, yTop, { width: 1.4, role: 'boundary' });
  b.line('gnd', 42, yBot, w - 42, yBot, { width: 1.4, role: 'boundary' });
  b.label('supply', specGet(spec, 'supply') ?? 'VDD', w - 36, yTop - 8, { protected: true, anchorId: 'vcc' });
  b.label('ground', specGet(spec, 'gnd') ?? '0', w - 36, yBot - 8, { protected: true, anchorId: 'gnd' });

  b.polyline('RD', [x, yTop, x, yD - 8, x - 6, yD, x + 6, yD + 8, x, yD + 16], { width: 1.8, role: 'geometry' });
  b.polyline('RS', [x, yS - 16, x - 6, yS - 8, x + 6, yS, x - 6, yS + 8, x, yBot], { width: 1.8, role: 'geometry' });
  b.labelPair('rd-label', { id: 'rd-name', text: 'RD' }, { id: 'rd-value', text: specGet(spec, 'rd')! }, x + 20, yD, {
    slot: 'E', protected: true, anchorId: 'RD',
  });
  b.labelPair('rs-label', { id: 'rs-name', text: 'RS' }, { id: 'rs-value', text: specGet(spec, 'rs')! }, x + 20, yS, {
    slot: 'E', protected: true, anchorId: 'RS',
  });

  b.line('channel', x, yD + 20, x, yS - 20, { width: 2, role: 'geometry' });
  b.line('drain', x, yD + 16, x, yD + 20, { width: 1.4, role: 'connector' });
  b.line('source', x, yS - 20, x, yS - 16, { width: 1.4, role: 'connector' });
  b.line('gate', 52, yG, x - 14, yG, { width: 1.6, role: 'connector' });
  b.line('gate-plate', x - 14, yG - 25, x - 14, yG + 25, { width: 2, role: 'geometry' });
  b.label('gate-label', 'G', 48, yG - 10, { protected: true, anchorId: 'gate' });
  b.label('drain-label', 'D', x + 10, yD + 18, { protected: true, anchorId: 'drain' });
  b.label('source-label', 'S', x + 10, yS - 18, { protected: true, anchorId: 'source' });

  b.polygon('gm', [x + 42, yG - 18, x + 58, yG, x + 42, yG + 18, x + 26, yG], { fill: 'none', color: 'accent', role: 'annotation' });
  b.labelPair('gm-label', { id: 'gm-name', text: 'gm' }, { id: 'gm-value', text: specGet(spec, 'gm') ?? 'gm' }, x + 42, yG - 28, {
    slot: 'N', protected: true, anchorId: 'gm',
  });
  b.line('gm-drain', x + 42, yG - 18, x, yD + 20, { width: 1.2, color: 'accent', role: 'connector' });
  b.line('gm-source', x + 42, yG + 18, x, yS - 20, { width: 1.2, color: 'accent', role: 'connector' });

  b.path('cgs', `M 74 ${yG - 18} q 8 8 0 16 q -8 8 0 16`, { width: 1.6, role: 'geometry' });
  b.line('cgs-g', 52, yG, 74, yG, { width: 1.2, role: 'connector' });
  b.line('cgs-s', 74, yG + 14, 110, yG + 14, { width: 1.2, role: 'connector' });
  b.label('cgs-label', `Cgs=${specGet(spec, 'cgs')}`, 78, yG - 30, { slot: 'N', protected: true, anchorId: 'cgs' });

  b.path('gmb', `M 238 ${yG - 16} q 8 8 0 16 q -8 8 0 16`, { width: 1.6, color: 'muted', role: 'annotation' });
  b.label('gmb-label', `gmb=${specGet(spec, 'gmb')}`, 238, yG + 34, { slot: 'S', protected: true, anchorId: 'gmb' });
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
  const input = specGet(spec, 'vin') ?? 'Vin';
  const output = specGet(spec, 'vout') ?? 'Vout';
  const ground = specGet(spec, 'gnd') ?? 'GND';
  const feedback = specGet(spec, 'feedback')?.trim();
  const feedbackLower = feedback?.toLowerCase();
  if (feedback && !['inverting', 'non-inverting', 'noninverting'].includes(feedbackLower!)) {
    return { ok: false, code: 'malformed', reason: `opamp unsupported feedback ${feedback}` };
  }
  b.polygon('oa', [tx - 40, ty - 36, tx - 40, ty + 36, tx + 40, ty], { fill: 'none', width: 1.8, role: 'geometry' });
  b.label('plus', '+', tx - 28, ty - 14, { protected: true, anchorId: 'oa' });
  b.label('minus', '−', tx - 28, ty + 14, { protected: true, anchorId: 'oa' });
  b.line('out', tx + 40, ty, w - 36, ty, { width: 1.6, role: 'connector' });
  b.label('Vout', output, w - 28, ty - 12, { protected: true, anchorId: 'out' });
  const inputY = feedback ? (feedbackLower === 'inverting' ? ty + 14 : ty - 14) : ty - 14;
  b.line('in', 24, inputY, tx - 40, inputY, { width: 1.6, role: 'connector' });
  b.label('Vin', input, 64, inputY - 28, { protected: true, anchorId: 'in' });

  // The feedback branch must leave the output apex and return to the inverting node
  // outside the amplifier body; starting inside the triangle creates a false connection.
  b.polyline('Rf', [tx + 40, ty, tx + 56, ty, tx + 56, 28, 108, 28, 108, ty + 14, tx - 40, ty + 14], {
    width: 1.6, role: 'connector',
  });
  b.rect('Rfbox', tx - 10, 22, 28, 12, { fill: 'solid', role: 'geometry' });
  b.labelPair('rf-label', { id: 'Rf', text: 'Rf' }, { id: 'Rf-val', text: specGet(spec, 'rf')! }, tx + 4, 30, {
    slot: 'N', protected: true, anchorId: 'Rf',
  });
  b.line('Rg', 40, ty + 14, tx - 40, ty + 14, { width: 1.6, role: 'connector' });
  b.rect('Rgbox', 70, ty + 8, 28, 12, { fill: 'solid', role: 'geometry' });
  b.labelPair('rg-label', { id: 'Rg', text: 'Rg' }, { id: 'Rg-val', text: specGet(spec, 'rg')! }, 84, ty + 36, {
    slot: 'S', protected: true, anchorId: 'Rg',
  });
  b.line('gnd', 36, h - 20, w - 36, h - 20, { width: 1.4, role: 'boundary' });
  b.label('GND', ground, w - 44, h - 8, { protected: true, anchorId: 'gnd' });
  if (feedback) {
    const toY = feedbackLower === 'inverting' ? ty + 14 : ty - 14;
    const referenceY = feedbackLower === 'inverting' ? ty - 14 : ty + 14;
    b.line('plus-ground', tx - 40, referenceY, tx - 52, referenceY, { width: 1.2, role: 'connector' });
    b.line('plus-ground-up', tx - 52, referenceY, tx - 52, 32, { width: 1.2, role: 'connector' });
    b.line('plus-ground-over', tx - 52, 32, 12, 32, { width: 1.2, role: 'connector' });
    b.line('plus-ground-drop', 12, 32, 12, h - 20, { width: 1.2, role: 'connector' });
    b.line('plus-ground-rail', 12, h - 20, 36, h - 20, { width: 1.2, role: 'connector' });
    b.line('feedback', tx + 40, ty, tx + 56, ty, { width: 1.4, color: 'accent', role: 'connector' });
    b.line('feedback-return', tx + 56, ty, tx + 56, 28, { width: 1.4, color: 'accent', role: 'connector' });
    b.line('feedback-top', tx + 56, 28, 108, 28, { width: 1.4, color: 'accent', role: 'connector' });
    b.line('feedback-down', 108, 28, 108, toY, { width: 1.4, color: 'accent', role: 'connector' });
    b.line('feedback-input', 108, toY, tx - 40, toY, { width: 1.4, color: 'accent', role: 'connector', markerEnd: true });
    b.label('feedback-label', feedback, tx + 58, toY, { slot: 'E', protected: true, anchorId: 'feedback' });
  }
  return layoutAndCompile(b.scene());
}
