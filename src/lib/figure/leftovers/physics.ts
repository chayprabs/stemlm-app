import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, specNumber, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';
import { compileScene } from '../engines/scene';

function parsePhasor(raw: string): { mag: number; deg: number; id: string } | null {
  const m = /([A-Za-z0-9]+)?\s*([0-9.]+)\s*(?:∠|<|@)\s*([+-]?[0-9.]+)/.exec(raw);
  if (!m) {
    const n = /([0-9.]+)/.exec(raw);
    if (!n) return null;
    return { mag: Number(n[1]), deg: 0, id: raw };
  }
  return { mag: Number(m[2]), deg: Number(m[3]), id: m[1] ?? raw };
}

export function compilePhasor(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('phasor', w, h);
  b.hl(spec.highlight);
  const cx = w * 0.32;
  const cy = h * 0.62;
  b.line('re', cx - 20, cy, w - 24, cy, { markerEnd: true, color: 'muted' });
  b.line('im', cx, h - 16, cx, 16, { markerEnd: true, color: 'muted' });
  b.label('Re', 'Re', w - 18, cy + 12, { protected: true });
  b.label('Im', 'Im', cx + 14, 18, { protected: true });
  const vecs = [...specGetAll(spec, 'vec'), ...specGetAll(spec, 'i1'), ...specGetAll(spec, 'v')];
  const parsed = vecs.map(parsePhasor).filter((x): x is NonNullable<typeof x> => Boolean(x));
  const maxM = Math.max(1, ...parsed.map((p) => p.mag));
  const scale = Math.min(w, h) * 0.35 / maxM;
  parsed.forEach((p, i) => {
    const a = (p.deg * Math.PI) / 180;
    const x2 = cx + Math.cos(a) * p.mag * scale;
    const y2 = cy - Math.sin(a) * p.mag * scale;
    b.line(p.id, cx, cy, x2, y2, { markerEnd: true, color: i === 0 ? 'accent' : 'danger', width: 1.8 });
    b.label(`${p.id}-head`, p.id, x2, y2, { slot: 'NE' });
    b.line(`${p.id}-px`, x2, y2, x2, cy, { dash: true, color: 'guide' });
    b.line(`${p.id}-py`, x2, y2, cx, y2, { dash: true, color: 'guide' });
    b.label(`${p.id}-foot`, `${p.mag}∠${p.deg}`, x2, cy + 12, { slot: 'S' });
  });
  return layoutAndCompile(b.scene());
}

export function compileSmith(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('smith', w, h);
  b.hl(spec.highlight);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.38;
  b.circle('disk', cx, cy, r, { width: 1.4 });
  b.circle('r1', cx + r / 2, cy, r / 2, { color: 'muted', width: 1 });
  b.circle('r2', cx + r * 0.25, cy, r * 0.75, { color: 'muted', width: 1 });
  b.path('x1', `M ${cx - r} ${cy} Q ${cx} ${cy - r} ${cx + r} ${cy}`, { color: 'guide' });
  b.path('x2', `M ${cx - r} ${cy} Q ${cx} ${cy + r} ${cx + r} ${cy}`, { color: 'guide' });
  const z0 = specGet(spec, 'z0') ?? '50';
  const zL = specGet(spec, 'zl') ?? '50';
  b.label('z0', `Z0=${z0}`, cx, 12, { protected: true });
  b.label('zL', `ZL=${zL}`, cx, h - 10, { protected: true });
  b.circle('load', cx + r * 0.3, cy - r * 0.2, 3, { color: 'accent', fill: 'solid' });
  return layoutAndCompile(b.scene());
}

export function compileFeynman(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('feynman', w, h);
  b.hl(spec.highlight);
  const kind = (specGet(spec, 'kind') ?? 's').toLowerCase();
  const y = h / 2;
  b.line('in1', 20, y - 30, w / 2, y, { markerEnd: true, width: 1.6 });
  b.line('in2', 20, y + 30, w / 2, y, { markerEnd: true, width: 1.6 });
  if (kind === 't') {
    b.path('photon', `M ${w / 2} ${y} q 20 -18 40 0 q 20 18 40 0`, { color: 'accent', width: 1.6 });
  } else {
    b.line('v', w / 2, y, w / 2 + 40, y, { dash: true, color: 'muted', width: 1.6 });
  }
  b.line('out1', w / 2 + 40, y, w - 20, y - 30, { markerEnd: true, width: 1.6 });
  b.line('out2', w / 2 + 40, y, w - 20, y + 30, { markerEnd: true, width: 1.6 });
  b.label('time', 't →', w - 28, 14, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileMinkowski(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('minkowski', w, h);
  b.hl(spec.highlight);
  const pad = 18;
  const cx = w * 0.28;
  const cy = h * 0.52;
  // Cone length so both (s,−s) and (s,+s) stay inside the frame — forced 45°.
  const s = Math.max(24, Math.min(w - cx - pad, cy - pad, h - cy - pad));
  b.line('x', cx, cy, Math.min(w - pad, cx + s + 36), cy, { markerEnd: true });
  b.line('ct', cx, cy, cx, Math.max(pad, cy - s - 16), { markerEnd: true });
  b.label('xl', 'x', Math.min(w - 14, cx + s + 40), cy + 12, { protected: true });
  b.label('ctl', 'ct', cx + 14, Math.max(14, cy - s - 14), { protected: true });
  b.line('n1', cx, cy, cx + s, cy - s, { color: 'guide', dash: true });
  b.line('n2', cx, cy, cx + s, cy + s, { color: 'guide', dash: true });
  const v = specNumber(spec, 'v', 0.6) ?? 0.6;
  const ang = Math.atan(v);
  b.line('boost', cx, cy, cx + Math.sin(ang) * s, cy - Math.cos(ang) * s, { color: 'accent', markerEnd: true });
  specGetAll(spec, 'events').forEach((e, i) => {
    b.circle(`ev${i}`, cx + 40 + i * 30, cy - 40 - i * 10, 3, { color: 'danger', fill: 'solid' });
    b.label(`evl${i}`, e, cx + 40 + i * 30, cy - 52 - i * 10, { slot: 'N' });
  });
  return layoutAndCompile(b.scene());
}

export function compileRay(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  spec.values.set('kind', ['ray']);
  return compileScene(spec, ctx);
}

export function compileField(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const catalog = specGet(spec, 'catalog') ?? specGet(spec, 'kind');
  spec.values.set('kind', ['field']);
  if (catalog && catalog.toLowerCase() !== 'field' && !specGet(spec, 'catalog')) {
    spec.values.set('catalog', [catalog]);
  }
  return compileScene(spec, ctx);
}

export function compileBz(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('bz', w, h);
  b.hl(spec.highlight);
  const cx = w / 2;
  const cy = h / 2;
  const r = 50;
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = ((-90 + i * 60) * Math.PI) / 180;
    pts.push(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  b.polygon('hex', pts, { fill: 'none' });
  b.circle('G', cx, cy, 3, { fill: 'solid', color: 'accent' });
  b.label('G', 'Γ', cx, cy - 12, { protected: true });
  b.label('K', 'K', cx + r, cy, { slot: 'E' });
  b.label('M', 'M', cx, cy - r, { slot: 'N' });
  return layoutAndCompile(b.scene());
}
