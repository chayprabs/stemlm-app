import type { CompileCtx, CompileResult } from '../types';
import { parseCsv, specGet, specGetAll, specList, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function frame(family: string, ctx: CompileCtx, spec: SpecDoc): SceneBuilder {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder(family, w, h);
  b.hl(spec.highlight);
  return b;
}

export function compileMechanism(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('mechanism', ctx, spec);
  const { width: w, height: h } = b;
  b.circle('a', 60, h / 2, 16, { fill: 'none' });
  b.circle('c', w / 2, h / 2, 16, { fill: 'none' });
  b.circle('b', w - 60, h / 2, 16, { fill: 'none' });
  b.path('arrow', `M 80 ${h / 2 - 10} Q ${w / 2} ${h / 2 - 40} ${w - 80} ${h / 2 - 10}`, {
    markerEnd: true,
    color: 'accent',
  });
  b.label('from', specGet(spec, 'from') ?? 'lp', 60, h / 2 + 28, { slot: 'S' });
  b.label('to', specGet(spec, 'to') ?? 'atom', w - 60, h / 2 + 28, { slot: 'S' });
  return layoutAndCompile(b.scene());
}

export function compileSplitting(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('splitting', ctx, spec);
  const { width: w, height: h } = b;
  const j = specGet(spec, 'j') ?? '7';
  b.line('stem', w / 2, 20, w / 2, 50, { width: 1.4 });
  b.line('l', w / 2, 50, w / 2 - 40, 90, { width: 1.4 });
  b.line('r', w / 2, 50, w / 2 + 40, 90, { width: 1.4 });
  b.line('ll', w / 2 - 40, 90, w / 2 - 70, h - 24, { width: 1.4 });
  b.line('lr', w / 2 - 40, 90, w / 2 - 10, h - 24, { width: 1.4 });
  b.label('j', `J=${j}`, w / 2 + 20, 40, { slot: 'E' });
  b.label('peak', specGet(spec, 'peak') ?? specGet(spec, 'mult') ?? 't', w / 2, 12, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileEchem(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('echem', ctx, spec);
  const { width: w, height: h } = b;
  b.rect('beak1', 30, 40, 90, 90, { fill: 'none' });
  b.rect('beak2', w - 120, 40, 90, 90, { fill: 'none' });
  b.path('bridge', `M 120 50 Q ${w / 2} 10 ${w - 120} 50`, { color: 'muted' });
  b.line('an', 75, 50, 75, 110, { width: 2 });
  b.line('cat', w - 75, 50, w - 75, 110, { width: 2 });
  b.label('anode', specGet(spec, 'anode') ?? 'anode', 75, 28, { protected: true });
  b.label('cathode', specGet(spec, 'cathode') ?? 'cathode', w - 75, 28, { protected: true });
  b.label('e', 'e−', w / 2, 70, { slot: 'S' });
  return layoutAndCompile(b.scene());
}

export function compileArray(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('array', ctx, spec);
  const cells = parseCsv(specGet(spec, 'cells') ?? specGet(spec, 'arr') ?? '1,2,3,4');
  const { width: w, height: h } = b;
  const cw = Math.min(40, (w - 20) / cells.length);
  cells.forEach((c, i) => {
    const x = 16 + i * cw;
    const y = h / 2 - 16;
    b.rect(`c${i}`, x, y, cw - 4, 32, { fill: 'solid' });
    b.label(`l${i}`, c, x + (cw - 4) / 2, y + 16, { protected: true });
    b.label(`i${i}`, String(i), x + (cw - 4) / 2, y + 42, { protected: true });
  });
  return layoutAndCompile(b.scene());
}

export function compileList(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('list', ctx, spec);
  const nodes = parseCsv(specGet(spec, 'nodes') ?? specGet(spec, 'head') ?? 'A,B,C');
  const { width: w, height: h } = b;
  nodes.forEach((n, i) => {
    const x = 24 + i * 70;
    b.rect(n, x, h / 2 - 14, 40, 28, { fill: 'solid' });
    b.label(`${n}l`, n, x + 16, h / 2, { protected: true });
    if (i < nodes.length - 1) b.line(`n${i}`, x + 40, h / 2, x + 70, h / 2, { markerEnd: true });
  });
  return layoutAndCompile(b.scene());
}

export function compileHash(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('hash', ctx, spec);
  const m = specNumber(spec, 'm', 4) ?? 4;
  const { width: w, height: h } = b;
  for (let i = 0; i < m; i++) {
    const y = 20 + i * ((h - 30) / m);
    b.rect(`b${i}`, 40, y, 50, 20, { fill: 'solid' });
    b.label(`bl${i}`, String(i), 24, y + 10, { protected: true });
    b.line(`c${i}`, 90, y + 10, 140, y + 10, { markerEnd: true, color: 'muted' });
  }
  return layoutAndCompile(b.scene());
}

export function compileGantt(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('gantt', ctx, spec);
  const jobs = parseCsv(specGet(spec, 'jobs') ?? 'A,B,C');
  const { width: w, height: h } = b;
  jobs.forEach((j, i) => {
    const y = 24 + i * 28;
    b.label(j, j, 24, y + 8, { protected: true });
    b.rect(`${j}bar`, 50 + i * 20, y, 80, 16, { fill: 'none', color: 'accent' });
  });
  return layoutAndCompile(b.scene());
}

export function compileStack(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('stack', ctx, spec);
  const layers = parseCsv(specGet(spec, 'layers') ?? 'app,trans,net,link,phys');
  const { width: w, height: h } = b;
  layers.forEach((l, i) => {
    const y = 16 + i * ((h - 24) / layers.length);
    const ww = w - 40 - i * 10;
    b.rect(l, (w - ww) / 2, y, ww, ((h - 24) / layers.length) - 4, { fill: 'solid' });
    b.label(`${l}l`, l, w / 2, y + 10, { protected: true });
  });
  return layoutAndCompile(b.scene());
}

export function compileCd(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('cd', ctx, spec);
  const cells = specGet(spec, 'cells') ?? specGet(spec, 'grid') ?? 'A,B;C,D';
  const rows = cells.split(';').map((r) => parseCsv(r));
  const { width: w, height: h } = b;
  rows.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      const x = 50 + ci * 100;
      const y = 40 + ri * 70;
      b.label(cell, cell, x, y, { protected: true, katex: true });
      if (ci + 1 < row.length) b.line(`e${ri}${ci}`, x + 16, y, x + 84, y, { markerEnd: true });
      if (ri + 1 < rows.length) b.line(`s${ri}${ci}`, x, y + 12, x, y + 58, { markerEnd: true });
    });
  });
  return layoutAndCompile(b.scene());
}

export function compileSchematicPlot(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('schematic', ctx, spec);
  const { width: w, height: h } = b;
  b.line('x', 30, h - 24, w - 16, h - 24, { markerEnd: true });
  b.line('y', 30, h - 24, 30, 16, { markerEnd: true });
  const verts = specGet(spec, 'vertices');
  if (verts) {
    const pts: number[] = [];
    for (const p of verts.split(/[;]/)) {
      const nums = p.trim().split(/[\s,]+/).map(Number);
      if (nums.length >= 2) pts.push(40 + nums[0]! * 8, h - 30 - nums[1]! * 8);
    }
    if (pts.length >= 4) b.polyline('curve', pts, { color: 'accent', width: 1.8, fill: 'none' });
  } else {
    b.path('curve', `M 40 ${h - 40} Q ${w / 2} 30 ${w - 30} ${h - 50}`, { color: 'accent', width: 1.8 });
  }
  b.label('kind', specGet(spec, 'kind') ?? 'schematic', w / 2, 12, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileCycle(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('cycle', ctx, spec);
  const nodes = parseCsv(specGet(spec, 'nodes') ?? specGet(spec, 'name') ?? 'A,B,C,D');
  const { width: w, height: h } = b;
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.32;
  nodes.forEach((n, i) => {
    const a = ((-90 + i * (360 / nodes.length)) * Math.PI) / 180;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    b.circle(n, x, y, 12, { fill: 'solid' });
    b.label(`${n}l`, n, x, y, { protected: true });
    const a2 = ((-90 + (i + 1) * (360 / nodes.length)) * Math.PI) / 180;
    b.path(
      `e${i}`,
      `M ${x + Math.cos(a + 0.4) * 14} ${y + Math.sin(a + 0.4) * 14} Q ${cx} ${cy} ${cx + Math.cos(a2) * r - Math.cos(a2) * 14} ${cy + Math.sin(a2) * r - Math.sin(a2) * 14}`,
      { markerEnd: true, color: 'accent' },
    );
  });
  return layoutAndCompile(b.scene());
}

export function compileEcg(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('ecg', ctx, spec);
  const { width: w, height: h } = b;
  const y = h / 2;
  b.line('base', 16, y, w - 16, y, { color: 'guide' });
  b.path('pqrst', `M 20 ${y} l 30 0 l 10 -8 l 10 8 l 20 0 l 8 20 l 12 -70 l 12 70 l 8 -20 l 30 0 l 20 -12 l 20 12 l 40 0`, {
    color: 'accent',
    width: 1.8,
  });
  b.label('P', 'P', 70, y - 20, { slot: 'N' });
  b.label('QRS', 'QRS', 140, y - 40, { slot: 'N' });
  b.label('T', 'T', 210, y - 20, { slot: 'N' });
  return layoutAndCompile(b.scene());
}

export function compileGel(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('gel', ctx, spec);
  const lanes = parseCsv(specGet(spec, 'lanes') ?? '1,2,3');
  const { width: w, height: h } = b;
  lanes.forEach((l, i) => {
    const x = 40 + i * 50;
    b.rect(`ln${i}`, x, 20, 24, h - 40, { fill: 'none' });
    b.line(`bd${i}`, x + 4, 50 + i * 10, x + 20, 50 + i * 10, { width: 3, color: 'accent' });
    b.label(`ll${i}`, l, x + 12, h - 12, { protected: true });
  });
  return layoutAndCompile(b.scene());
}

export function compileKmap(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('kmap', ctx, spec);
  const { width: w, height: h } = b;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      b.rect(`k${r}${c}`, 60 + c * 40, 30 + r * 28, 40, 28, { fill: 'none' });
    }
  }
  b.ellipse('grp', 100, 58, 50, 36, { color: 'accent' });
  b.label('vars', specGet(spec, 'vars') ?? 'AB\\CD', 30, 20, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileTruss(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('truss', ctx, spec);
  const { width: w, height: h } = b;
  b.polygon('t', [40, h - 30, w / 2, 30, w - 40, h - 30], { fill: 'none', width: 1.8 });
  b.line('mid', w / 2, 30, w / 2, h - 30, { width: 1.4 });
  b.polygon('pin', [34, h - 20, 46, h - 20, 40, h - 30], { fill: 'none' });
  b.circle('roller', w - 40, h - 22, 6, { fill: 'none' });
  return layoutAndCompile(b.scene());
}

export function compileMohr(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('mohr', ctx, spec);
  const { width: w, height: h } = b;
  const sx = specNumber(spec, 'sigma', specNumber(spec, 'sx', 40)) ?? 40;
  const cx = w / 2;
  const cy = h / 2;
  b.line('s', 20, cy, w - 20, cy, { markerEnd: true });
  b.line('t', cx, h - 16, cx, 16, { markerEnd: true });
  b.circle('mohr', cx, cy, Math.min(50, Math.abs(sx)), { color: 'accent' });
  b.label('sx', 'σ', w - 16, cy + 12, { protected: true });
  b.label('tau', 'τ', cx + 12, 18, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileGeneric(family: string, spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame(family, ctx, spec);
  const { width: w, height: h } = b;
  const boxW = Math.min(150, w * 0.46);
  const boxH = Math.min(58, h * 0.38);
  const bx = (w - boxW) / 2;
  const by = Math.max(36, (h - boxH) / 2 - 6);
  b.rect('apparatus', bx, by, boxW, boxH, { fill: 'none', width: 1.6 });
  b.line('stand', bx + boxW / 2, by + boxH, bx + boxW / 2, by + boxH + 14, { width: 1.4 });
  b.line('base', bx + 16, by + boxH + 14, bx + boxW - 16, by + boxH + 14, { width: 1.6 });
  b.label('fam', family, w / 2, 16, { protected: true });

  const skip = new Set(['caption', 'kind', 'std', 'highlight']);
  const params: { k: string; v: string }[] = [];
  for (const [k, vals] of spec.values) {
    if (skip.has(k)) continue;
    const orig = spec.originals.get(k) ?? k;
    params.push({ k: orig, v: vals[0] ?? '' });
    if (params.length >= 8) break;
  }
  const anchors: { x: number; y: number; slot: 'W' | 'E' | 'S' | 'N' }[] = [
    { x: 18, y: by + 10, slot: 'W' },
    { x: w - 18, y: by + 10, slot: 'E' },
    { x: 18, y: by + boxH - 6, slot: 'W' },
    { x: w - 18, y: by + boxH - 6, slot: 'E' },
    { x: w / 2 - 48, y: h - 14, slot: 'S' },
    { x: w / 2 + 48, y: h - 14, slot: 'S' },
    { x: w / 2 - 48, y: 30, slot: 'N' },
    { x: w / 2 + 48, y: 30, slot: 'N' },
  ];
  params.forEach((p, i) => {
    const pos = anchors[i] ?? { x: 20 + i * 10, y: h - 14, slot: 'S' as const };
    b.label(p.k, `${p.k}=${p.v}`, pos.x, pos.y, { slot: pos.slot });
  });
  return layoutAndCompile(b.scene());
}

export function compileTline(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('tline', ctx, spec);
  const { width: w, height: h } = b;
  const y1 = h * 0.36;
  const y2 = h * 0.64;
  const x0 = 48;
  const xLoad = w - 72;
  const midY = (y1 + y2) / 2;

  b.line('cond-top', x0, y1, xLoad, y1, { width: 2.2 });
  b.line('cond-bot', x0, y2, xLoad, y2, { width: 2.2 });

  b.circle('src', 22, midY, 10, { fill: 'none' });
  b.line('src-t', 22, midY - 8, x0, y1, { width: 1.2 });
  b.line('src-b', 22, midY + 8, x0, y2, { width: 1.2 });
  b.label('vs', specGet(spec, 'vs') ?? specGet(spec, 'source') ?? 'Vs', 22, 18, { protected: true });

  const zl = specGet(spec, 'zl') ?? specGet(spec, 'load') ?? specGet(spec, 'zload') ?? 'ZL';
  b.rect('load', xLoad, y1, 22, y2 - y1, { fill: 'none', color: 'accent', width: 1.6 });
  b.label('zl', `ZL=${zl}`, w - 16, midY, { slot: 'E' });

  const z0 = specGet(spec, 'z0') ?? '';
  b.label('z0', `Z0=${z0}`, (x0 + xLoad) / 2, midY, { protected: true });
  const td = specGet(spec, 'td') ?? specGet(spec, 'length');
  if (td) b.label('td', `td=${td}`, (x0 + xLoad) / 2, y1 - 14, { slot: 'N' });
  return layoutAndCompile(b.scene());
}

export function compileOneline(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('oneline', ctx, spec);
  const buses = parseCsv(specGet(spec, 'buses') ?? specGet(spec, 'bus') ?? '1,2,3');
  const { width: w, height: h } = b;
  buses.forEach((bus, i) => {
    const x = 40 + i * ((w - 60) / Math.max(1, buses.length - 1));
    b.line(bus, x, 30, x, h - 30, { width: 2.4 });
    b.circle(`g${i}`, x, 40, 10, { fill: 'none' });
    b.label(`bl${i}`, bus, x, h - 16, { protected: true });
  });
  return layoutAndCompile(b.scene());
}

export function compileTwoport(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('twoport', ctx, spec);
  const { width: w, height: h } = b;
  b.rect('box', w / 2 - 50, h / 2 - 30, 100, 60, { fill: 'solid' });
  b.line('in', 20, h / 2 - 16, w / 2 - 50, h / 2 - 16, { width: 1.6 });
  b.line('in2', 20, h / 2 + 16, w / 2 - 50, h / 2 + 16, { width: 1.6 });
  b.line('out', w / 2 + 50, h / 2 - 16, w - 20, h / 2 - 16, { width: 1.6 });
  b.line('out2', w / 2 + 50, h / 2 + 16, w - 20, h / 2 + 16, { width: 1.6 });
  b.label('z', specGet(spec, 'params') ?? specGet(spec, 'zij') ?? 'Z', w / 2, h / 2, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compilePwm(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('pwm', ctx, spec);
  const { width: w, height: h } = b;
  const D = specNumber(spec, 'd', 0.4) ?? 0.4;
  const y = h / 2;
  b.line('base', 16, y + 20, w - 16, y + 20, { color: 'guide' });
  const n = 4;
  for (let i = 0; i < n; i++) {
    const x0 = 20 + i * ((w - 40) / n);
    const pw = ((w - 40) / n) * D;
    b.polyline(`p${i}`, [x0, y + 20, x0, y - 20, x0 + pw, y - 20, x0 + pw, y + 20], { color: 'accent', width: 1.6 });
  }
  b.label('D', `D=${D}`, w / 2, 14, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileReactor(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('reactor', ctx, spec);
  const { width: w, height: h } = b;
  const type = (specGet(spec, 'type') ?? 'cstr').toLowerCase();
  if (type === 'pfr') {
    b.rect('tube', 40, h / 2 - 16, w - 80, 32, { fill: 'none' });
  } else {
    b.rect('tank', w / 2 - 40, 40, 80, 80, { fill: 'none' });
    b.ellipse('head', w / 2, 40, 40, 10, { fill: 'none' });
  }
  b.line('in', 16, h / 2, 40, h / 2, { markerEnd: true });
  b.line('out', w - 40, h / 2, w - 16, h / 2, { markerEnd: true });
  b.label('X', `X=${specGet(spec, 'x') ?? ''}`, w / 2, h - 16, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileHx(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('hx', ctx, spec);
  const { width: w, height: h } = b;
  b.rect('shell', 40, 40, w - 80, h - 80, { fill: 'none' });
  b.line('hot', 50, 55, w - 50, h - 55, { color: 'danger', markerEnd: true });
  b.line('cold', 50, h - 55, w - 50, 55, { color: 'accent', markerEnd: true });
  b.label('Th', specGet(spec, 'th') ?? 'Th', 60, 30, { protected: true });
  b.label('Tc', specGet(spec, 'tc') ?? 'Tc', 60, h - 16, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileCellBio(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('cell', ctx, spec);
  const { width: w, height: h } = b;
  b.ellipse('cell', w / 2, h / 2, w * 0.4, h * 0.36, { fill: 'none' });
  b.circle('nuc', w / 2, h / 2, 18, { fill: 'none', color: 'accent' });
  b.label('parent', specGet(spec, 'parent') ?? specGet(spec, 'kind') ?? 'cell', w / 2, 16, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileMembrane(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('membrane', ctx, spec);
  const { width: w, height: h } = b;
  for (let i = 0; i < 12; i++) {
    const x = 20 + i * ((w - 40) / 11);
    b.circle(`h${i}`, x, h / 2 - 8, 6, { fill: 'none' });
    b.circle(`t${i}`, x, h / 2 + 8, 6, { fill: 'none' });
  }
  b.rect('pump', w / 2 - 10, h / 2 - 22, 20, 44, { fill: 'solid', color: 'accent' });
  return layoutAndCompile(b.scene());
}

export function compileOperon(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('operon', ctx, spec);
  const { width: w, height: h } = b;
  b.line('dna', 20, h / 2, w - 20, h / 2, { width: 2.4 });
  b.rect('promoter', 40, h / 2 - 12, 40, 24, { fill: 'none' });
  b.rect('operator', 90, h / 2 - 12, 30, 24, { fill: 'solid', color: 'danger' });
  b.rect('gene', 130, h / 2 - 12, 80, 24, { fill: 'none', color: 'accent' });
  b.label('p', specGet(spec, 'promoter') ?? 'P', 60, h / 2 - 22, { protected: true });
  b.label('o', specGet(spec, 'operator') ?? 'O', 105, h / 2 - 22, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileRestriction(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('restriction', ctx, spec);
  const sites = parseCsv(specGet(spec, 'sites') ?? 'EcoRI,BamHI');
  const { width: w, height: h } = b;
  b.line('dna', 20, h / 2, w - 20, h / 2, { width: 3 });
  sites.forEach((s, i) => {
    const x = 40 + i * ((w - 80) / Math.max(1, sites.length - 1));
    b.line(`t${i}`, x, h / 2 - 16, x, h / 2 + 16, { color: 'accent' });
    b.label(`s${i}`, s, x, h / 2 - 24, { slot: 'N' });
  });
  return layoutAndCompile(b.scene());
}

export function compileRama(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('rama', ctx, spec);
  const { width: w, height: h } = b;
  b.rect('axes', 40, 20, w - 60, h - 40, { fill: 'none' });
  b.rect('core', 70, 40, 80, 50, { fill: 'none', color: 'accent' });
  b.rect('gly', 160, 90, 50, 40, { fill: 'none', color: 'muted' });
  b.label('phi', 'φ', w / 2, h - 10, { protected: true });
  b.label('psi', 'ψ', 20, h / 2, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compilePipeline(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('pipeline', ctx, spec);
  const stages = parseCsv(specGet(spec, 'stages') ?? 'IF,ID,EX,MEM,WB');
  const { width: w, height: h } = b;
  stages.forEach((s, i) => {
    b.rect(s, 20 + i * 52, 40, 48, 24, { fill: 'solid' });
    b.label(`${s}l`, s, 44 + i * 52, 52, { protected: true });
  });
  return layoutAndCompile(b.scene());
}

export function compileDatapath(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('datapath', ctx, spec);
  const boxes = ['PC', 'imem', 'ALU', 'regs', 'dmem'];
  const { width: w, height: h } = b;
  boxes.forEach((name, i) => {
    const x = 16 + i * 56;
    b.rect(name, x, h / 2 - 16, 50, 32, { fill: 'solid' });
    b.label(`${name}l`, name, x + 25, h / 2, { protected: true });
    if (i) b.line(`w${i}`, x - 6, h / 2, x, h / 2, { markerEnd: true });
  });
  return layoutAndCompile(b.scene());
}

export function compileRing(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('ring', ctx, spec);
  const { width: w, height: h } = b;
  b.circle('ring', w / 2, h / 2, Math.min(w, h) * 0.32, { width: 1.6 });
  const n = 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    b.circle(`v${i}`, w / 2 + Math.cos(a) * 50, h / 2 + Math.sin(a) * 40, 3, { fill: 'solid', color: 'accent' });
  }
  return layoutAndCompile(b.scene());
}

export function compileXfmr(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('xfmr', ctx, spec);
  const { width: w, height: h } = b;
  const cx = w / 2;
  const top = 32;
  b.path('p', `M ${cx - 30} ${top} q 12 12 0 24 q -12 12 0 24 q 12 12 0 24 q -12 12 0 24`, { width: 1.8 });
  b.path('s', `M ${cx + 30} ${top} q -12 12 0 24 q 12 12 0 24 q -12 12 0 24 q 12 12 0 24`, { width: 1.8 });
  b.line('core1', cx - 6, top - 6, cx - 6, h - 28, { width: 2.2 });
  b.line('core2', cx + 6, top - 6, cx + 6, h - 28, { width: 2.2 });
  b.line('p-lead1', cx - 30, top, 28, top, { width: 1.2 });
  b.line('p-lead2', cx - 30, top + 96, 28, top + 96, { width: 1.2 });
  b.line('s-lead1', cx + 30, top, w - 28, top, { width: 1.2 });
  b.line('s-lead2', cx + 30, top + 96, w - 28, top + 96, { width: 1.2 });
  b.label('plab', 'P', 32, top - 10, { protected: true });
  b.label('slab', 'S', w - 32, top - 10, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileConstel(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('constel', ctx, spec);
  const { width: w, height: h } = b;
  b.line('i', 20, h / 2, w - 20, h / 2, { markerEnd: true, color: 'muted' });
  b.line('q', w / 2, h - 16, w / 2, 16, { markerEnd: true, color: 'muted' });
  const m = specNumber(spec, 'm', 4) ?? 4;
  const n = Math.round(Math.sqrt(m));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      b.circle(`p${i}${j}`, w / 2 - 30 + i * 20, h / 2 - 30 + j * 20, 3, { fill: 'solid', color: 'accent' });
    }
  }
  return layoutAndCompile(b.scene());
}

export function compileEye(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('eye', ctx, spec);
  const { width: w, height: h } = b;
  b.path('u', `M 30 ${h / 2} Q ${w / 2} ${h / 2 - 40} ${w - 30} ${h / 2}`, { color: 'accent' });
  b.path('d', `M 30 ${h / 2} Q ${w / 2} ${h / 2 + 40} ${w - 30} ${h / 2}`, { color: 'accent' });
  b.path('c', `M 30 ${h / 2 - 20} Q ${w / 2} ${h / 2} ${w - 30} ${h / 2 + 20}`, { color: 'muted' });
  return layoutAndCompile(b.scene());
}

export function compileCmos(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('cmos', ctx, spec);
  const { width: w, height: h } = b;
  b.rect('p', w / 2 - 16, 24, 32, 40, { fill: 'none' });
  b.rect('n', w / 2 - 16, h - 64, 32, 40, { fill: 'none' });
  b.line('out', w / 2 + 16, h / 2, w - 24, h / 2, { markerEnd: true });
  b.label('VDD', 'VDD', w / 2, 14, { protected: true });
  b.label('GND', 'GND', w / 2, h - 10, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileMotor(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('motor', ctx, spec);
  const { width: w, height: h } = b;
  b.circle('s', 70, h / 2, 16, { fill: 'none' });
  b.rect('r1', 110, h / 2 - 8, 40, 16, { fill: 'solid' });
  b.rect('r2', 170, h / 2 - 8, 40, 16, { fill: 'solid' });
  b.path('l', `M 220 ${h / 2 - 20} q 10 10 0 20 q -10 10 0 20`, { width: 1.6 });
  return layoutAndCompile(b.scene());
}

export function compileTernary(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('ternary', ctx, spec);
  const { width: w, height: h } = b;
  b.polygon('tri', [w / 2, 20, 30, h - 20, w - 30, h - 20], { fill: 'none' });
  b.line('tie', 80, h - 50, w - 80, h - 70, { color: 'accent', dash: true });
  return layoutAndCompile(b.scene());
}

export function compileOpenchan(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('openchan', ctx, spec);
  const { width: w, height: h } = b;
  b.line('x', 30, h - 24, w - 16, h - 24, { markerEnd: true });
  b.line('y', 30, h - 24, 30, 16, { markerEnd: true });
  b.path('E', `M 40 ${h - 40} Q ${w / 2} 30 ${w - 30} ${h - 50}`, { color: 'accent', width: 1.8 });
  const y1 = specNumber(spec, 'y1', 1) ?? 1;
  b.line('y1', 80, h - 40, 80, 50, { dash: true, color: 'guide' });
  b.label('y1l', `y1=${y1}`, 90, 40, { slot: 'E' });
  return layoutAndCompile(b.scene());
}

export function compileSphere(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('sphere', ctx, spec);
  const { width: w, height: h } = b;
  b.circle('s', w / 2, h / 2, Math.min(w, h) * 0.36, { width: 1.6 });
  b.ellipse('eq', w / 2, h / 2, Math.min(w, h) * 0.36, 12, { color: 'muted' });
  b.line('axis', w / 2, 20, w / 2, h - 20, { dash: true, color: 'guide' });
  return layoutAndCompile(b.scene());
}

export function compileIsometric(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('isometric', ctx, spec);
  const { width: w, height: h } = b;
  b.path('gamma', `M 30 ${h - 30} Q ${w / 2} 20 ${w - 30} ${h - 40}`, { color: 'accent', width: 1.8, markerEnd: true });
  b.line('T', w / 2, 40, w / 2 + 30, 20, { markerEnd: true });
  b.line('N', w / 2, 40, w / 2, 70, { markerEnd: true, color: 'muted' });
  b.line('B', w / 2, 40, w / 2 - 24, 50, { markerEnd: true, color: 'danger' });
  b.label('T', 'T', w / 2 + 36, 16, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileTopology(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('topology', ctx, spec);
  const { width: w, height: h } = b;
  b.rect('sq', 50, 30, w - 100, h - 60, { fill: 'none' });
  b.line('id1', 50, 30, 50, h - 30, { color: 'accent', width: 2 });
  b.line('id2', w - 50, 30, w - 50, h - 30, { color: 'accent', width: 2 });
  return layoutAndCompile(b.scene());
}

export function compileDq(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('dq', ctx, spec);
  const { width: w, height: h } = b;
  const cx = w / 2;
  const cy = h / 2;
  b.line('d', cx, cy, cx + 60, cy, { markerEnd: true, color: 'accent' });
  b.line('q', cx, cy, cx, cy - 50, { markerEnd: true, color: 'danger' });
  b.line('a', cx, cy, cx + 40, cy - 30, { markerEnd: true, color: 'muted', dash: true });
  b.label('d', 'd', cx + 68, cy, { protected: true });
  b.label('q', 'q', cx, cy - 58, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compilePsych(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  return compileSchematicPlot(spec, ctx);
}

export function compileNewick(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('newick', ctx, spec);
  const { width: w, height: h } = b;
  b.line('root', 30, h / 2, 80, h / 2, { width: 1.6 });
  b.line('u', 80, h / 2, 80, 40, { width: 1.6 });
  b.line('d', 80, h / 2, 80, h - 40, { width: 1.6 });
  b.line('ul', 80, 40, 160, 40, { width: 1.6 });
  b.line('dl', 80, h - 40, 160, h - 40, { width: 1.6 });
  b.label('a', 'A', 172, 40, { protected: true });
  b.label('b', 'B', 172, h - 40, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileNeuron(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('neuron', ctx, spec);
  const { width: w, height: h } = b;
  b.circle('soma', 80, h / 2, 16, { fill: 'none' });
  b.line('ax', 96, h / 2, w - 30, h / 2, { width: 1.6, markerEnd: true });
  b.line('d1', 70, h / 2 - 10, 40, 30, { width: 1.2 });
  b.line('d2', 70, h / 2 + 10, 40, h - 30, { width: 1.2 });
  return layoutAndCompile(b.scene());
}

export function compilePcr(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('pcr', ctx, spec);
  const { width: w, height: h } = b;
  ['denature', 'anneal', 'extend'].forEach((s, i) => {
    b.rect(s, 20 + i * 90, 40, 80, h - 70, { fill: 'none' });
    b.label(`${s}l`, s, 60 + i * 90, 28, { protected: true });
  });
  return layoutAndCompile(b.scene());
}

export function compileAnatomy(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('anatomy', ctx, spec);
  const { width: w, height: h } = b;
  b.ellipse('org', w / 2, h / 2, 50, 40, { fill: 'none' });
  b.label('organ', specGet(spec, 'organ') ?? 'organ', w / 2, 16, { protected: true });
  b.line('call', w / 2 + 50, h / 2, w - 40, 40, { color: 'muted' });
  b.label('a1', 'label', w - 36, 30, { slot: 'E' });
  return layoutAndCompile(b.scene());
}

export function compileDivision(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('division', ctx, spec);
  const phases = ['P', 'M', 'A', 'T'];
  const { width: w, height: h } = b;
  phases.forEach((p, i) => {
    const x = 30 + i * 70;
    b.circle(p, x + 20, h / 2, 18, { fill: 'none' });
    b.label(`${p}l`, p, x + 20, h / 2 + 32, { protected: true });
  });
  return layoutAndCompile(b.scene());
}

export function compileWall(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('wall', ctx, spec);
  const { width: w, height: h } = b;
  b.rect('wall', 80, 20, 24, h - 40, { fill: 'none' });
  b.polygon('soil', [104, h - 20, w - 30, h - 20, w - 30, 40], { fill: 'none', color: 'muted' });
  b.line('pa', 104, h / 2, 160, h / 2 + 20, { markerEnd: true, color: 'accent' });
  return layoutAndCompile(b.scene());
}

export function compileSoil(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('soil', ctx, spec);
  const layers = parseCsv(specGet(spec, 'layers') ?? 'sand,clay,rock');
  const { width: w, height: h } = b;
  layers.forEach((l, i) => {
    const y = 20 + i * ((h - 30) / layers.length);
    b.rect(l, 40, y, w - 80, (h - 30) / layers.length - 4, { fill: 'none' });
    b.label(`${l}l`, l, w / 2, y + 12, { protected: true });
  });
  return layoutAndCompile(b.scene());
}

export function compileColumn(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('column', ctx, spec);
  const { width: w, height: h } = b;
  b.rect('col', w / 2 - 10, 20, 20, h - 40, { fill: 'none' });
  b.path('buckle', `M ${w / 2} 24 Q ${w / 2 + 24} ${h / 2} ${w / 2} ${h - 24}`, { dash: true, color: 'accent' });
  return layoutAndCompile(b.scene());
}

export function compileRc(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('rc', ctx, spec);
  const { width: w, height: h } = b;
  b.rect('sec', 60, 20, 80, h - 40, { fill: 'none' });
  b.circle('b1', 74, h - 36, 4, { fill: 'solid' });
  b.circle('b2', 126, h - 36, 4, { fill: 'solid' });
  b.rect('whit', 62, 24, 76, 20, { fill: 'none', color: 'accent' });
  return layoutAndCompile(b.scene());
}

export function compileFrame(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('frame', ctx, spec);
  const { width: w, height: h } = b;
  b.line('l', 50, h - 16, 50, 30, { width: 2.4 });
  b.line('r', w - 50, h - 16, w - 50, 30, { width: 2.4 });
  b.line('beam', 50, 30, w - 50, 30, { width: 2.4 });
  return layoutAndCompile(b.scene());
}

export function compilePfd(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('pfd', ctx, spec);
  const units = parseCsv(specGet(spec, 'units') ?? 'mixer,flash');
  const { width: w, height: h } = b;
  units.forEach((u, i) => {
    const x = 30 + i * 110;
    b.rect(u, x, h / 2 - 20, 70, 40, { fill: 'solid' });
    b.label(`${u}l`, u, x + 35, h / 2, { protected: true });
    b.label(`s${i}`, String(i + 1), x - 8, h / 2 - 28, { slot: 'N' });
    if (i) b.line(`st${i}`, x - 40, h / 2, x, h / 2, { markerEnd: true });
  });
  return layoutAndCompile(b.scene());
}

export function compileKnot(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const n = specNumber(spec, 'crossings', 3) ?? 3;
  if (n > 7) return { ok: false, code: 'refused', reason: 'knot projections >7 crossings refuse' };
  const b = frame('knot', ctx, spec);
  const { width: w, height: h } = b;
  b.path('k', `M 40 ${h / 2} C ${w / 2} 10 ${w / 2} ${h - 10} ${w - 40} ${h / 2} C ${w / 2} 10 80 ${h - 20} 40 ${h / 2}`, {
    color: 'accent',
    width: 1.8,
  });
  return layoutAndCompile(b.scene());
}

export function compileLinkage(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('linkage', ctx, spec);
  const { width: w, height: h } = b;
  b.circle('a', 60, h - 40, 4, { fill: 'solid' });
  b.circle('b', 140, 50, 4, { fill: 'solid' });
  b.circle('c', 220, h - 50, 4, { fill: 'solid' });
  b.line('ab', 60, h - 40, 140, 50, { width: 1.8 });
  b.line('bc', 140, 50, 220, h - 50, { width: 1.8 });
  return layoutAndCompile(b.scene());
}

export function compileCam(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('cam', ctx, spec);
  const { width: w, height: h } = b;
  b.circle('cam', 80, h / 2, 36, { fill: 'none' });
  b.circle('fol', 130, h / 2 - 20, 8, { fill: 'none', color: 'accent' });
  b.line('x', 170, h - 24, w - 16, h - 24, { markerEnd: true });
  b.path('s', `M 180 ${h - 40} q 40 -40 80 0 q 40 20 80 -10`, { color: 'accent' });
  return layoutAndCompile(b.scene());
}

export function compileGear(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('gear', ctx, spec);
  const { width: w, height: h } = b;
  b.circle('g1', w * 0.38, h / 2, 28, { fill: 'none' });
  b.circle('g2', w * 0.62, h / 2, 20, { fill: 'none' });
  b.label('z1', `z1=${specGet(spec, 'z1') ?? ''}`, w * 0.38, h - 14, { protected: true });
  b.label('z2', `z2=${specGet(spec, 'z2') ?? ''}`, w * 0.62, h - 14, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileFrost(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('frost', ctx, spec);
  const n = specNumber(spec, 'n', 6) ?? 6;
  const { width: w, height: h } = b;
  const cx = w / 2;
  const cy = h / 2;
  const r = 40;
  const pts: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  b.polygon('poly', pts, { fill: 'none' });
  b.circle('circ', cx, cy, r, { color: 'guide' });
  return layoutAndCompile(b.scene());
}
