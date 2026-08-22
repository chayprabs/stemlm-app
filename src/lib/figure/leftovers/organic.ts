import type { CompileCtx, CompileResult } from '../types';
import { parseCsv, specGet, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

export function compileNewman(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('newman', w, h);
  b.hl(spec.highlight);
  const view = (specGet(spec, 'view') ?? '').toLowerCase();
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.28;
  const deg = specNumber(spec, 'deg', 0) ?? 0;
  const front = parseCsv(specGet(spec, 'front') ?? 'H,H,H');
  const back = parseCsv(specGet(spec, 'back') ?? 'H,H,H');

  if (view === 'sawhorse') {
    b.line('cc', 80, 50, w - 80, h - 40, { width: 2 });
    front.forEach((s, i) => {
      const a = (-90 + i * 120) * (Math.PI / 180);
      b.line(`f${i}`, 80, 50, 80 + Math.cos(a) * 40, 50 + Math.sin(a) * 40, { width: 1.6 });
      b.label(`fl${i}`, s, 80 + Math.cos(a) * 52, 50 + Math.sin(a) * 52, { slot: 'auto' });
    });
    back.forEach((s, i) => {
      const a = ((-90 + deg + i * 120) * Math.PI) / 180;
      b.line(`b${i}`, w - 80, h - 40, w - 80 + Math.cos(a) * 40, h - 40 + Math.sin(a) * 40, { width: 1.6, dash: true });
      b.label(`bl${i}`, s, w - 80 + Math.cos(a) * 52, h - 40 + Math.sin(a) * 52, { slot: 'auto' });
    });
    b.label('axis', specGet(spec, 'axis') ?? '', w / 2, 14, { protected: true });
    return layoutAndCompile(b.scene());
  }

  b.circle('front', cx, cy, r, { width: 1.8 });
  front.forEach((s, i) => {
    const a = ((-90 + i * 120) * Math.PI) / 180;
    const x2 = cx + Math.cos(a) * (r + 18);
    const y2 = cy + Math.sin(a) * (r + 18);
    b.line(`fs${i}`, cx, cy, x2, y2, { width: 1.8 });
    b.label(`fl${i}`, s, cx + Math.cos(a) * (r + 32), cy + Math.sin(a) * (r + 32), { slot: 'auto' });
  });
  back.forEach((s, i) => {
    const a = ((-90 + deg + i * 120) * Math.PI) / 180;
    const x2 = cx + Math.cos(a) * (r + 8);
    const y2 = cy + Math.sin(a) * (r + 8);
    b.line(`bs${i}`, cx, cy, x2, y2, { width: 1.4, dash: true, color: 'muted' });
    b.label(`bl${i}`, s, cx + Math.cos(a) * (r + 44), cy + Math.sin(a) * (r + 44), { slot: 'auto' });
  });
  b.label('axis', specGet(spec, 'axis') ?? '', cx, 12, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileFischer(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('fischer', w, h);
  b.hl(spec.highlight);
  const chain = parseCsv(specGet(spec, 'backbone') ?? specGet(spec, 'chain') ?? 'CHO,H,OH,CH2OH');
  const n = Math.max(2, chain.length);
  const x = w / 2;
  const y0 = 20;
  const dy = (h - 40) / (n - 1);
  for (let i = 0; i < n; i++) {
    const y = y0 + i * dy;
    b.circle(`c${i}`, x, y, 3, { fill: 'solid' });
    if (i < n - 1) b.line(`v${i}`, x, y, x, y + dy, { width: 1.8 });
    if (i > 0 && i < n - 1) {
      b.line(`h${i}l`, x, y, x - 40, y, { width: 1.8 });
      b.line(`h${i}r`, x, y, x + 40, y, { width: 1.8 });
    }
    b.label(`t${i}`, chain[i] ?? '', i === 0 ? x : x + (i % 2 ? -56 : 56), y, { slot: i === 0 ? 'N' : i % 2 ? 'W' : 'E' });
  }
  return layoutAndCompile(b.scene());
}

export function compileChair(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('chair', w, h);
  b.hl(spec.highlight);
  const pts = [70, 90, 110, 60, 190, 60, 230, 90, 190, 120, 110, 120];
  b.polygon('chair', pts, { fill: 'none', width: 1.8 });
  const subst = parseCsv(specGet(spec, 'subst') ?? specGet(spec, 'substituents') ?? '');
  subst.forEach((s, i) => {
    const ax = i % 2 === 0;
    const x = 90 + (i % 6) * 22;
    const y = ax ? 48 : 78;
    b.line(`b${i}`, x, 70, x, y, { width: 1.4 });
    b.label(`s${i}`, s, x, y - (ax ? 8 : -8), { slot: ax ? 'N' : 'S' });
  });
  return layoutAndCompile(b.scene());
}

export function compileHaworth(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('haworth', w, h);
  b.hl(spec.highlight);
  b.polygon('ring', [80, 90, 120, 50, 200, 50, 240, 90, 200, 130, 120, 130], { fill: 'none', width: 1.8 });
  b.line('thick', 120, 130, 200, 130, { width: 3.2 });
  const sugar = specGet(spec, 'sugar') ?? 'Glc';
  const anomer = specGet(spec, 'anomer') ?? 'α';
  b.label('sugar', sugar, w / 2, 16, { protected: true });
  b.label('anomer', anomer, 70, 70, { slot: 'W' });
  return layoutAndCompile(b.scene());
}

export function compileLewis(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('lewis', w, h);
  b.hl(spec.highlight);
  const atoms = parseCsv(specGet(spec, 'atoms') ?? specGet(spec, 'formula') ?? 'C,O');
  atoms.forEach((a, i) => {
    const x = 50 + i * 60;
    const y = h / 2;
    b.circle(`a${i}`, x, y, 14, { fill: 'none' });
    b.label(`al${i}`, a, x, y, { protected: true });
    if (i < atoms.length - 1) b.line(`bond${i}`, x + 14, y, x + 46, y, { width: 2 });
  });
  return layoutAndCompile(b.scene());
}

export function compileVsepr(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('vsepr', w, h);
  b.hl(spec.highlight);
  const geom = (specGet(spec, 'geom') ?? specGet(spec, 'ax') ?? 'AX4').toUpperCase();
  const cx = w / 2;
  const cy = h / 2;
  b.circle('center', cx, cy, 8, { fill: 'solid' });
  b.label('center', specGet(spec, 'center') ?? 'A', cx, cy, { protected: true });
  const n = /AX5|TBP|PBP/.test(geom) ? 5 : /AX6|OCT/.test(geom) ? 6 : /AX3|TRIG/.test(geom) ? 3 : /AX2|LIN/.test(geom) ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
    const x2 = cx + Math.cos(a) * 50;
    const y2 = cy + Math.sin(a) * 50;
    b.line(`l${i}`, cx, cy, x2, y2, { width: 1.6 });
    b.label(`lig${i}`, specGet(spec, 'ligands')?.split(',')[i] ?? 'X', x2, y2, { slot: 'auto' });
  }
  return layoutAndCompile(b.scene());
}

export function compileComplex(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('complex', w, h);
  b.hl(spec.highlight);
  const cx = w / 2;
  const cy = h / 2;
  b.circle('m', cx, cy, 8, { fill: 'solid' });
  b.label('metal', specGet(spec, 'metal') ?? 'M', cx, cy - 18, { protected: true });
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, -1],
    [0, 1],
    [0.7, 0.7],
    [-0.7, 0.7],
  ];
  dirs.forEach((d, i) => {
    const dash = i >= 4;
    b.line(`b${i}`, cx, cy, cx + d[0]! * 50, cy + d[1]! * 50, { width: 1.6, dash });
  });
  return layoutAndCompile(b.scene());
}
