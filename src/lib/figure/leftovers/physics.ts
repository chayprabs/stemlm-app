import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

type ParsedPhasor = { mag: number; deg: number; id: string };

function failure(reason: string): CompileResult {
  return { ok: false, code: 'malformed', reason };
}

function attrs(raw: string): Map<string, string> {
  const result = new Map<string, string>();
  for (const match of raw.matchAll(/([A-Za-z][A-Za-z0-9_-]*)\s*=\s*([^\s,;]+)/g)) {
    result.set(match[1]!.toLowerCase(), match[2]!);
  }
  return result;
}

function words(raw: string): string[] {
  return raw.split(/[,;]+/).map((item) => item.trim()).filter(Boolean);
}

function safeLabel(raw: string, fallback: string): string {
  const label = raw.trim().replace(/\s+/g, ' ');
  return label || fallback;
}

function parsePhasor(raw: string): ParsedPhasor | null {
  const full = /^\s*(?:(\w[\w.-]*)\s+)?([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(?:∠|<|@)\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(?:deg)?\s*$/i.exec(raw);
  if (!full) return null;
  return { id: full[1] ?? 'vector', mag: Number(full[2]), deg: Number(full[3]) };
}

export function compilePhasor(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('phasor', w, h);
  b.hl(spec.highlight);
  const rawVectors = [...specGetAll(spec, 'vec'), ...specGetAll(spec, 'i1'), ...specGetAll(spec, 'v')];
  if (!rawVectors.length) return failure('phasor needs at least one vec record');
  const parsed = rawVectors.map(parsePhasor);
  if (parsed.some((item) => !item || !Number.isFinite(item.mag) || !Number.isFinite(item.deg))) {
    return failure('every phasor vec must be LABEL magnitude∠degrees');
  }
  const vectors = parsed as ParsedPhasor[];
  const cx = w * 0.32;
  const cy = h * 0.62;
  b.line('real-axis', cx - 20, cy, w - 24, cy, { markerEnd: true, color: 'muted', role: 'axis' });
  b.line('imag-axis', cx, h - 16, cx, 16, { markerEnd: true, color: 'muted', role: 'axis' });
  b.label('real-label', 'Re', w - 18, cy + 12, { protected: true, anchorId: 'real-axis' });
  b.label('imag-label', 'Im', cx + 14, 18, { protected: true, anchorId: 'imag-axis' });
  const maxM = Math.max(1, ...vectors.map((vector) => Math.abs(vector.mag)));
  const scale = Math.min(w, h) * 0.35 / maxM;
  vectors.forEach((vector, i) => {
    const angle = (vector.deg * Math.PI) / 180;
    const x2 = cx + Math.cos(angle) * vector.mag * scale;
    const y2 = cy - Math.sin(angle) * vector.mag * scale;
    const vectorId = `vector-${i}`;
    b.line(vectorId, cx, cy, x2, y2, {
      markerEnd: true,
      color: i === 0 ? 'accent' : 'danger',
      width: 1.8,
      role: 'connector',
    });
    b.label(`${vectorId}-head`, vector.id, x2, y2, { slot: 'NE', anchorId: vectorId, priority: 'required' });
    b.line(`projection-${i}-x`, x2, y2, x2, cy, { dash: true, color: 'guide', role: 'guide' });
    b.line(`projection-${i}-y`, x2, y2, cx, y2, { dash: true, color: 'guide', role: 'guide' });
    b.label(`${vectorId}-value`, `${vector.id}=${vector.mag}∠${vector.deg}`, x2, y2 + 14, {
      slot: 'S', anchorId: vectorId, priority: 'preferred',
    });
  });
  return layoutAndCompile(b.scene());
}

function parseImpedance(raw: string): { real: number; imag: number } | null {
  const clean = raw.replace(/\s+/g, '').replace(/j/gi, 'i');
  const complex = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))?([+-](?:\d+(?:\.\d*)?|\.\d+))i$/i.exec(clean);
  if (complex) return { real: Number(complex[1] ?? 0), imag: Number(complex[2]) };
  const indexed = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))([+-])i?(\d+(?:\.\d*)?|\.\d+)i?$/i.exec(clean);
  if (indexed) return { real: Number(indexed[1]), imag: Number(`${indexed[2]}${indexed[3]}`) };
  const real = /^([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/.exec(clean);
  return real ? { real: Number(real[1]), imag: 0 } : null;
}

function addSmithReactanceGuides(b: SceneBuilder, cx: number, cy: number, r: number): void {
  const magnitudes = [0.25, 0.5, 1, 2, 4];
  magnitudes.forEach((magnitude, index) => {
    [-1, 1].forEach((sign) => {
      const reactance = sign * magnitude;
      const arcCx = cx + r;
      const arcCy = cy - r / reactance;
      const arcR = r / magnitude;
      let run: number[] = [];
      let part = 0;
      for (let sample = 0; sample <= 720; sample++) {
        const angle = (sample * 2 * Math.PI) / 720;
        const x = arcCx + arcR * Math.cos(angle);
        const y = arcCy + arcR * Math.sin(angle);
        const inside = Math.hypot(x - cx, y - cy) <= r + 0.1;
        if (inside) {
          run.push(x, y);
        } else if (run.length >= 8) {
          b.polyline(`reactance-${sign > 0 ? 'positive' : 'negative'}-${index}-${part++}`, run, { color: 'guide', width: 1, dash: true, role: 'guide' });
          run = [];
        } else {
          run = [];
        }
      }
      if (run.length >= 8) {
        b.polyline(`reactance-${sign > 0 ? 'positive' : 'negative'}-${index}-${part}`, run, { color: 'guide', width: 1, dash: true, role: 'guide' });
      }
    });
  });
}

export function compileSmith(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const z0Raw = specGet(spec, 'z0') ?? '50';
  const zLRaw = specGet(spec, 'zl') ?? z0Raw;
  const z0 = Number(z0Raw.replace(/[^0-9.+-].*$/, ''));
  const zL = parseImpedance(zLRaw);
  if (!Number.isFinite(z0) || z0 <= 0 || !zL || !Number.isFinite(zL.real) || !Number.isFinite(zL.imag)) {
    return failure('smith requires a positive numeric z0 and a real or complex zl');
  }
  const reflectionDenominator = (zL.real + z0) ** 2 + zL.imag ** 2;
  if (!Number.isFinite(reflectionDenominator) || reflectionDenominator <= 0) {
    return failure('smith load cannot be mapped to a finite reflection coefficient');
  }
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('smith', w, h);
  b.hl(spec.highlight);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.38;
  b.circle('smith-disk', cx, cy, r, { width: 1.4, role: 'boundary' });
  [0.25, 0.5, 1, 2, 4].forEach((normalizedResistance, i) => {
    b.circle(`resistance-${i + 1}`, cx + r * normalizedResistance / (normalizedResistance + 1), cy, r / (normalizedResistance + 1), { color: 'muted', width: 1, role: 'guide' });
  });
  addSmithReactanceGuides(b, cx, cy, r);
  b.label('z0-label', `Z0=${z0Raw}`, cx, 12, { protected: true, anchorId: 'smith-disk' });
  b.label('zl-label', `ZL=${zLRaw}`, cx, h - 10, { protected: true, anchorId: 'load' });
  const reflectionReal = (zL.real ** 2 + zL.imag ** 2 - z0 ** 2) / reflectionDenominator;
  const reflectionImag = (2 * z0 * zL.imag) / reflectionDenominator;
  const loadX = cx + Math.max(-0.85, Math.min(0.85, reflectionReal)) * r;
  const loadY = cy - Math.max(-0.85, Math.min(0.85, reflectionImag)) * r;
  b.circle('load', loadX, loadY, 3, { color: 'accent', fill: 'solid', role: 'annotation' });
  return layoutAndCompile(b.scene());
}

export function compileFeynman(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const kind = (specGet(spec, 'kind') ?? '').trim().toLowerCase();
  if (kind !== 's' && kind !== 't') return failure('feynman kind must be s or t');
  const incoming = words(specGetAll(spec, 'incoming').join(','));
  const vertices = words(specGetAll(spec, 'vertices').join(','));
  if (specGetAll(spec, 'incoming').length > 0 && !incoming.length) return failure('feynman incoming cannot be empty');
  if (specGetAll(spec, 'vertices').length > 0 && !vertices.length) return failure('feynman vertices cannot be empty');
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('feynman', w, h);
  b.hl(spec.highlight);
  const y = h / 2;
  const vx = w / 2;
  const carrierEnd = vx + 40;
  b.line('incoming-0', 20, y - 30, vx, y, { markerEnd: true, width: 1.6, role: 'connector' });
  b.line('incoming-1', 20, y + 30, vx, y, { markerEnd: true, width: 1.6, role: 'connector' });
  if (kind === 't') {
    b.path('carrier', `M ${vx} ${y} q 20 -18 40 0 q 20 18 40 0`, { color: 'accent', width: 1.6, role: 'connector' });
  } else {
    b.line('carrier', vx, y, carrierEnd, y, { dash: true, color: 'muted', width: 1.6, role: 'connector' });
  }
  b.line('outgoing-0', carrierEnd, y, w - 20, y - 30, { markerEnd: true, width: 1.6, role: 'connector' });
  b.line('outgoing-1', carrierEnd, y, w - 20, y + 30, { markerEnd: true, width: 1.6, role: 'connector' });
  b.label('time', 't →', w - 28, 14, { protected: true, anchorId: 'outgoing-0' });
  if (incoming.length) b.label('incoming-label', incoming.join(', '), 20, y - 44, { slot: 'N', anchorId: 'incoming-0', priority: 'preferred' });
  if (vertices.length) b.label('vertex-label', vertices.join(', '), vx, y + 20, { slot: 'S', anchorId: 'carrier', priority: 'preferred' });
  return layoutAndCompile(b.scene());
}

export function compileMinkowski(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const rawVelocity = specGet(spec, 'v');
  const parsedVelocity = rawVelocity === undefined ? 0 : /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*$/.exec(rawVelocity);
  const velocity = parsedVelocity ? Number(parsedVelocity[1]) : NaN;
  if (!Number.isFinite(velocity) || Math.abs(velocity) >= 1) return failure('minkowski velocity must satisfy |v|<1');
  const eventNames = words(specGetAll(spec, 'events').join(','));
  const worldlines = specGetAll(spec, 'worldlines');
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('minkowski', w, h);
  b.hl(spec.highlight);
  const pad = 18;
  const cx = w * 0.28;
  const cy = h * 0.52;
  const s = Math.max(24, Math.min(w - cx - pad, cy - pad, h - cy - pad));
  b.line('x-axis', cx, cy, Math.min(w - pad, cx + s + 36), cy, { markerEnd: true, role: 'axis' });
  b.line('ct-axis', cx, cy, cx, Math.max(pad, cy - s - 16), { markerEnd: true, role: 'axis' });
  b.label('x-label', 'x', Math.min(w - 14, cx + s + 40), cy + 12, { protected: true, anchorId: 'x-axis' });
  b.label('ct-label', 'ct', cx + 14, Math.max(14, cy - s - 14), { protected: true, anchorId: 'ct-axis' });
  b.line('n1', cx, cy, cx + s, cy - s, { color: 'guide', dash: true, role: 'boundary' });
  b.line('n2', cx, cy, cx + s, cy + s, { color: 'guide', dash: true, role: 'boundary' });
  b.line('boost', cx, cy, cx + velocity * s, cy - s, { color: 'accent', markerEnd: true, role: 'connector' });
  eventNames.forEach((event, i) => {
    const x = cx + ((i + 1) * s) / (eventNames.length + 1);
    const y = cy - ((i + 1) * s) / (eventNames.length + 1);
    b.circle(`event-${i}`, x, y, 3, { color: 'danger', fill: 'solid', role: 'annotation' });
    b.label(`event-label-${i}`, event, x, y - 12, { slot: 'N', anchorId: `event-${i}`, priority: 'required' });
  });
  worldlines.forEach((raw, i) => {
    const label = safeLabel(raw, `worldline ${i + 1}`);
    const x1 = cx + 14 + i * 18;
    b.line(`worldline-${i}`, x1, cy + s * 0.65, x1 + s * 0.35, cy - s * 0.55, { color: 'muted', dash: true, role: 'connector' });
    b.label(`worldline-label-${i}`, label, x1 + s * 0.35, cy - s * 0.55, { slot: 'NE', anchorId: `worldline-${i}`, priority: 'preferred' });
  });
  return layoutAndCompile(b.scene());
}

function rayRelation(raw: string): string {
  return attrs(raw).get('relation') ?? raw.trim().split(/\s+/)[0] ?? 'incident';
}

export function compileRay(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const source = specGet(spec, 'source');
  const target = specGet(spec, 'target');
  const relations = specGetAll(spec, 'ray');
  if (!source || !target) {
    if (specGet(spec, 'f') !== undefined && specGet(spec, 'do') !== undefined && specGet(spec, 'element')) {
      return compileLegacyRay(spec, ctx);
    }
    return failure('ray requires source and target anchors');
  }
  if (!relations.length) return failure('ray requires at least one ray relation');
  const supportedRelations = new Set(['incident', 'reflected', 'refracted', 'transmitted', 'normal', 'construction']);
  for (const raw of relations) {
    if (!supportedRelations.has(rayRelation(raw).toLowerCase())) return failure(`unsupported ray relation: ${rayRelation(raw)}`);
  }
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('ray', w, h);
  b.hl(spec.highlight);
  const sx = w * 0.18;
  const tx = w * 0.82;
  const midY = h * 0.54;
  b.circle('source-anchor', sx, midY, 4, { color: 'accent', fill: 'solid', role: 'annotation' });
  b.circle('target-anchor', tx, midY, 4, { color: 'accent', fill: 'solid', role: 'annotation' });
  b.label('source-label', safeLabel(source, 'source'), sx, midY - 12, { slot: 'N', anchorId: 'source-anchor', priority: 'required' });
  b.label('target-label', safeLabel(target, 'target'), tx, midY - 12, { slot: 'N', anchorId: 'target-anchor', priority: 'required' });
  const spread = Math.min(24, h / Math.max(4, relations.length + 2));
  relations.forEach((raw, i) => {
    const relation = rayRelation(raw).toLowerCase();
    const y = midY + (i - (relations.length - 1) / 2) * spread;
    const isConstruction = relation === 'construction' || relation === 'normal';
    b.line(`ray-${i}`, sx, y, tx, y, {
      markerEnd: !isConstruction,
      color: isConstruction ? 'guide' : relation === 'reflected' ? 'accent' : 'neutral',
      dash: isConstruction,
      role: isConstruction ? 'guide' : 'connector', width: 1.6,
    });
  });
  specGetAll(spec, 'construction').forEach((raw, i) => {
    const construction = attrs(raw).get('kind') ?? raw.trim();
    b.line(`construction-${i}`, sx, midY - h * 0.22, tx, midY + h * 0.22, { color: 'guide', dash: true, role: 'guide', width: 1.2 });
    b.label(`construction-label-${i}`, construction, (sx + tx) / 2, midY - h * 0.24, { slot: 'N', anchorId: `construction-${i}`, priority: 'preferred' });
  });
  return layoutAndCompile(b.scene());
}

function compileLegacyRay(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const f = Number(specGet(spec, 'f'));
  const objectDistance = Number(specGet(spec, 'do'));
  const element = specGet(spec, 'element');
  if (!Number.isFinite(f) || !Number.isFinite(objectDistance) || !element || f <= 0 || objectDistance <= 0) {
    return failure('legacy ray requires positive f, do, and element');
  }
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('ray', w, h);
  b.hl(spec.highlight);
  const axisY = h / 2;
  const lensX = w / 2;
  const scale = Math.min(1, (w * 0.35) / Math.max(f, objectDistance));
  const objectX = Math.max(18, lensX - objectDistance * scale);
  const focal = Math.min(w * 0.27, Math.max(16, f * scale));
  b.line('axis', 16, axisY, w - 16, axisY, { color: 'guide', dash: true, role: 'axis' });
  b.line('lens', lensX, 24, lensX, h - 24, { color: 'neutral', width: 2, role: 'boundary' });
  b.line('object', objectX, axisY, objectX, axisY - 30, { markerEnd: true, color: 'accent', role: 'connector' });
  b.line('ray-principal', objectX, axisY - 30, lensX, axisY - 30, { markerEnd: true, color: 'accent', role: 'connector' });
  b.line('ray-focal', objectX, axisY - 30, lensX, axisY, { markerEnd: true, color: 'muted', role: 'connector' });
  b.label('element-label', element, lensX, 14, { protected: true, anchorId: 'lens' });
  b.label('f-left', 'F', lensX - focal, axisY + 14, { protected: true, anchorId: 'axis' });
  b.label('f-right', 'F', lensX + focal, axisY + 14, { protected: true, anchorId: 'axis' });
  return layoutAndCompile(b.scene());
}

function fieldDirection(raw: string | undefined): 'away' | 'toward' | 'normal' | null {
  const direction = (attrs(raw ?? '').get('direction') ?? raw ?? '').toLowerCase();
  if (direction === 'toward' || direction === 'inward') return 'toward';
  if (direction === 'normal' || direction === 'perpendicular') return 'normal';
  if (direction === 'away' || direction === 'outward') return 'away';
  return null;
}

function reverseDirection(direction: 'away' | 'toward' | 'normal', variant: string): 'away' | 'toward' | 'normal' {
  if (!/negative|minus|inward/i.test(variant)) return direction;
  return direction === 'away' ? 'toward' : direction === 'toward' ? 'away' : 'normal';
}

function drawFieldPanel(b: SceneBuilder, spec: SpecDoc, panelIndex: number, panel: { x: number; y: number; w: number; h: number }, variant: string): void {
  const sourceRecords = specGetAll(spec, 'source');
  const centerX = panel.x + panel.w / 2;
  const centerY = panel.y + panel.h / 2;
  const sourcePoints = sourceRecords.map((raw, i) => {
    const x = centerX + (i - (sourceRecords.length - 1) / 2) * Math.min(32, panel.w / 5);
    const id = `source-${panelIndex}-${i}`;
    const isDrawableSource = !/^uniform$/i.test(raw.trim());
    if (isDrawableSource) {
      b.circle(id, x, centerY, 6, { color: 'danger', fill: 'none', role: 'annotation' });
      b.label(`${id}-label`, safeLabel(raw, `source ${i + 1}`), x, centerY - 24, { slot: 'N', protected: true, anchorId: id, panelId: `field-panel-${panelIndex}` });
    }
    return { x, y: centerY, id };
  });
  const surfaces = specGetAll(spec, 'surface').flatMap((raw) => {
    const count = Number(attrs(raw).get('count') ?? 1);
    return Array.from({ length: Number.isInteger(count) && count >= 1 && count <= 16 ? count : 0 }, () => raw);
  });
  surfaces.forEach((raw, i) => {
    const details = attrs(raw);
    const kind = (details.get('kind') ?? 'closed').toLowerCase();
    const id = `surface-${panelIndex}-${i}`;
    if (/equipotential|parallel|plane/.test(kind)) {
      const y = panel.y + 20 + ((i + 1) * (panel.h - 40)) / (surfaces.length + 1);
      b.line(id, panel.x + 18, y, panel.x + panel.w - 18, y, { color: 'muted', role: 'boundary', width: 1.2 });
    } else {
      const rx = Math.max(18, panel.w * (0.17 + (i * 0.1)));
      const ry = Math.max(15, panel.h * (0.2 + (i * 0.08)));
      b.ellipse(id, centerX, centerY, Math.min(rx, panel.w / 2 - 10), Math.min(ry, panel.h / 2 - 10), { color: 'muted', role: 'boundary' });
    }
    b.label(`${id}-label`, details.get('label') ?? kind, centerX, panel.y + 12 + i * 12, { slot: 'N', anchorId: id, panelId: `field-panel-${panelIndex}`, priority: 'preferred' });
  });
  const rawLines = specGetAll(spec, 'field_lines');
  const lineCount = rawLines.reduce((total, raw) => {
    const count = Number(attrs(raw).get('count') ?? 1);
    return total + (Number.isInteger(count) && count >= 1 && count <= 32 ? count : 0);
  }, 0);
  if (!lineCount) return;
  const baseDirection = fieldDirection(rawLines[0]);
  if (!baseDirection) return;
  const direction = reverseDirection(baseDirection, variant);
  const markerEnd = direction !== 'toward';
  const markerStart = direction === 'toward';
  const source = sourcePoints[0]!;
  const radial = /charge|point|dipole/i.test(sourceRecords.join(' ')) || direction !== 'normal';
  for (let i = 0; i < lineCount; i++) {
    const id = `field-line-${panelIndex}-${i}`;
    if (radial) {
      const angle = (2 * Math.PI * i) / lineCount;
      const endX = source.x + Math.cos(angle) * (panel.w * 0.42);
      const endY = source.y + Math.sin(angle) * (panel.h * 0.42);
      b.line(id, source.x, source.y, endX, endY, { color: 'accent', role: 'connector', width: 1.1, markerEnd, markerStart });
    } else {
      const x = panel.x + 22 + ((i + 1) * (panel.w - 44)) / (lineCount + 1);
      b.line(id, x, panel.y + 18, x, panel.y + panel.h - 18, { color: 'accent', role: 'connector', width: 1.1, markerEnd, markerStart });
    }
  }
}

function compileFieldCatalog(spec: SpecDoc, ctx: CompileCtx, rawCatalog: string): CompileResult {
  const catalog = rawCatalog.trim().split(/[\s,;]/)[0]!.toLowerCase().replace(/_/g, '-');
  if (!['dipole', 'parallel-plate', 'parallelplate', 'plates', 'wire', 'long-wire', 'infinite-wire', 'solenoid', 'coil', 'te10', 'te-10', 'waveguide'].includes(catalog)) {
    return failure('field catalog is unsupported');
  }
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('field', w, h);
  b.hl(spec.highlight);
  if (catalog === 'dipole') {
    const plusX = w * 0.32;
    const minusX = w * 0.68;
    b.circle('plus', plusX, h / 2, 8, { color: 'danger', role: 'annotation' });
    b.circle('minus', minusX, h / 2, 8, { color: 'accent', role: 'annotation' });
    b.label('plusl', '+', plusX, h / 2, { protected: true, anchorId: 'plus' });
    b.label('minusl', '−', minusX, h / 2, { protected: true, anchorId: 'minus' });
    for (let i = 0; i < 5; i++) {
      const y = 28 + i * ((h - 48) / 4);
      b.path(`fl${i}`, `M ${w * 0.36} ${h / 2} Q ${w * 0.5} ${y} ${w * 0.64} ${h / 2}`, { color: 'muted', markerEnd: true, role: 'connector' });
    }
    return layoutAndCompile(b.scene());
  }
  if (catalog === 'parallel-plate' || catalog === 'parallelplate' || catalog === 'plates') {
    b.rect('plate1', 70, 28, 10, h - 52, { fill: 'muted', width: 1.4, role: 'boundary' });
    b.rect('plate2', w - 80, 28, 10, h - 52, { fill: 'muted', width: 1.4, role: 'boundary' });
    for (let i = 0; i < 5; i++) {
      const y = 40 + i * ((h - 70) / 4);
      b.line(`E${i}`, 88, y, w - 88, y, { markerEnd: true, color: 'accent', width: 1.4, role: 'connector' });
    }
    b.label('plusl', '+', 75, 18, { protected: true, anchorId: 'plate1' });
    b.label('minusl', '−', w - 75, 18, { protected: true, anchorId: 'plate2' });
    return layoutAndCompile(b.scene());
  }
  if (catalog === 'wire' || catalog === 'long-wire' || catalog === 'infinite-wire') {
    const cx = w / 2;
    const cy = h / 2;
    b.circle('wire', cx, cy, 8, { fill: 'muted', width: 1.6, role: 'annotation' });
    b.line('current', cx - 4, cy - 4, cx + 4, cy + 4, { width: 1.4, role: 'connector' });
    for (let i = 0; i < 4; i++) b.circle(`B${i}`, cx, cy, 18 + i * 12, { color: 'guide', width: 1, role: 'boundary' });
    b.path('Btan', `M ${cx + 30} ${cy - 6} A 30 30 0 0 1 ${cx + 6} ${cy + 30}`, { color: 'accent', markerEnd: true, width: 1.4, role: 'connector' });
    b.label('I', 'I', cx, cy - 16, { protected: true, anchorId: 'wire' });
    return layoutAndCompile(b.scene());
  }
  if (catalog === 'te10' || catalog === 'te-10' || catalog === 'waveguide') {
    const x0 = 36;
    const y0 = 28;
    const bw = w - 72;
    const bh = h - 52;
    b.rect('guide', x0, y0, bw, bh, { width: 1.6, role: 'boundary' });
    for (let i = 1; i <= 7; i++) {
      const x = x0 + (i * bw) / 8;
      const half = Math.max(8, Math.sin((Math.PI * i) / 8) * (bh * 0.38));
      b.line(`E${i}`, x, y0 + bh / 2 + half, x, y0 + bh / 2 - half, { markerEnd: true, color: 'accent', width: 1.4, role: 'connector' });
    }
    b.label('TE10', 'TE10', w / 2, 16, { protected: true, anchorId: 'guide' });
    return layoutAndCompile(b.scene());
  }
  const coreX = 48;
  const coreY = 46;
  const coreW = w - 88;
  const coreH = h - 78;
  b.rect('core', coreX, coreY, coreW, coreH, { fill: 'muted', color: 'neutral', width: 1.4, role: 'boundary' });
  for (let i = 0; i < 8; i++) {
    const x = coreX + 6 + (i * (coreW - 20)) / 7;
    b.line(`core-hatch${i}`, x, coreY + 4, x + 16, coreY + coreH - 4, { color: 'neutral', width: 0.7, role: 'hatch' });
  }
  for (let i = 0; i < 6; i++) {
    const x = coreX + 18 + (i * (coreW - 36)) / 5;
    b.ellipse(`wrap${i}`, x, coreY + coreH / 2, 8, coreH / 2 + 12, { color: 'neutral', role: 'connector' });
  }
  const bYs = [coreY + coreH * 0.28, coreY + coreH * 0.45, coreY + coreH * 0.62];
  bYs.forEach((y, i) => b.line(i === 1 ? 'B' : `B${i}`, coreX + 14, y, coreX + coreW - 14, y, { markerEnd: true, color: 'accent', width: 1.6, role: 'connector' }));
  const hy = coreY + coreH * 0.82;
  b.line('H', coreX + 14, hy, coreX + coreW - 28, hy, { markerEnd: true, color: 'danger', width: 1.8, role: 'connector' });
  const coreRaw = specGet(spec, 'core') ?? specGet(spec, 'mu_r') ?? 'mu_r=400';
  const mur = /mu_r\s*=\s*(\S+)/i.exec(coreRaw)?.[1] ?? coreRaw.replace(/^mu_r\s*=\s*/i, '');
  const bRaw = specGet(spec, 'b') ?? '1.0 T';
  const hRaw = specGet(spec, 'h') ?? '?';
  b.label('mu_r', `μ_r=${mur}`, coreX + coreW / 2, coreY - 10, { protected: true, anchorId: 'core' });
  b.label('B-val', `B=${bRaw}`, coreX + coreW - 8, bYs[1]! - 10, { anchorId: 'B', priority: 'preferred' });
  b.label('H-val', `H=${hRaw}`, coreX + coreW - 8, hy + 12, { anchorId: 'H', priority: 'preferred' });
  return layoutAndCompile(b.scene());
}

export function compileField(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const hasSemanticRecords = specGetAll(spec, 'source').length > 0 || specGetAll(spec, 'surface').length > 0 || specGetAll(spec, 'field_lines').length > 0 || specGetAll(spec, 'variant').length > 0;
  if (!hasSemanticRecords) {
    const catalog = specGet(spec, 'catalog') ?? specGet(spec, 'kind');
    if (catalog) {
      return compileFieldCatalog(spec, ctx, catalog);
    }
    return failure('field requires a declared source');
  }
  const sourceRecords = specGetAll(spec, 'source');
  if (!sourceRecords.length) return failure('field requires a declared source');
  const drawableSourceCount = sourceRecords.filter((raw) => !/^uniform$/i.test(raw.trim())).length;
  if (drawableSourceCount > 1 && specGetAll(spec, 'field_lines').length) {
    return failure('field with multiple sources requires explicit line attribution');
  }
  for (const raw of specGetAll(spec, 'surface')) {
    const kind = (attrs(raw).get('kind') ?? 'closed').toLowerCase();
    if (!['closed', 'gaussian', 'equipotential', 'parallel', 'plane'].includes(kind)) return failure(`unsupported field surface: ${kind}`);
    const count = Number(attrs(raw).get('count') ?? 1);
    if (!Number.isInteger(count) || count < 1 || count > 16) return failure('field surface count must be an integer from 1 to 16');
  }
  for (const raw of specGetAll(spec, 'field_lines')) {
    const direction = fieldDirection(raw);
    const count = Number(attrs(raw).get('count') ?? 1);
    if (!direction) return failure('field line direction must be away, toward, or normal');
    if (!Number.isInteger(count) || count < 1 || count > 32) return failure('field line count must be an integer from 1 to 32');
  }
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('field', w, h);
  b.hl(spec.highlight);
  const variants = specGetAll(spec, 'variant').length ? specGetAll(spec, 'variant') : ['main'];
  const gap = variants.length > 1 ? 10 : 0;
  const columns = Math.min(2, variants.length);
  const rows = Math.ceil(variants.length / columns);
  const panelW = (w - 20 - gap * (columns - 1)) / columns;
  const panelH = (h - 20 - gap * (rows - 1)) / rows;
  variants.forEach((variant, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const panelId = `field-panel-${i}`;
    const panel = { x: 10 + col * (panelW + gap), y: 10 + row * (panelH + gap), w: panelW, h: panelH };
    b.panel(panelId, variant, panel.x, panel.y, panel.w, panel.h);
    drawFieldPanel(b, spec, i, panel, variant);
    const sourceAnchor = specGetAll(spec, 'source').some((raw) => !/^uniform$/i.test(raw.trim()))
      ? `source-${i}-0`
      : specGetAll(spec, 'surface').length
        ? `surface-${i}-0`
        : `field-line-${i}-0`;
    b.label(`${panelId}-label`, variant, panel.x + panel.w / 2, panel.y + panel.h - 8, { slot: 'S', anchorId: sourceAnchor, panelId, priority: 'preferred' });
  });
  return layoutAndCompile(b.scene());
}

export function compileBz(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const lattice = (specGet(spec, 'lattice') ?? 'hexagonal').trim().toLowerCase();
  if (!['hexagonal', 'hex', 'triangular', 'square'].includes(lattice)) return failure('bz lattice must be hexagonal or square');
  const pathRaw = specGet(spec, 'path');
  const names = pathRaw ? pathRaw.split(/\s*(?:-|→|,|;)\s*/).map((item) => item.trim()).filter(Boolean) : ['Gamma', 'K', 'M'];
  if (names.length < 2) return failure('bz path needs at least two named points');
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('bz', w, h);
  b.hl(spec.highlight);
  const cx = w / 2;
  const cy = h / 2;
  const r = Math.min(w, h) * 0.3;
  const boundary = lattice === 'square'
    ? [cx - r, cy - r, cx + r, cy - r, cx + r, cy + r, cx - r, cy + r]
    : Array.from({ length: 6 }, (_, i) => {
      const angle = ((-90 + i * 60) * Math.PI) / 180;
      return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
    }).flat();
  b.polygon('zone-boundary', boundary, { fill: 'none', role: 'boundary' });
  const boundaryNames = names.filter((name) => !/^(gamma|Γ)$/i.test(name.trim()));
  const pointCoords = names.map((name, i) => {
    if (/^(gamma|Γ)$/i.test(name.trim())) return { name, x: cx, y: cy };
    const boundaryIndex = names.slice(0, i).filter((item) => !/^(gamma|Γ)$/i.test(item.trim())).length;
    const standardName = name.trim().toUpperCase();
    if (lattice === 'square' && /^X(?:\d+)?$/.test(standardName)) {
      const edge = boundaryIndex % 4;
      const points: Array<[number, number]> = [[cx + r, cy], [cx, cy + r], [cx - r, cy], [cx, cy - r]];
      return { name, x: points[edge]![0], y: points[edge]![1] };
    }
    if (lattice === 'square' && /^M(?:\d+)?$/.test(standardName)) {
      const corner = boundaryIndex % 4;
      const points: Array<[number, number]> = [[cx + r, cy + r], [cx - r, cy + r], [cx - r, cy - r], [cx + r, cy - r]];
      return { name, x: points[corner]![0], y: points[corner]![1] };
    }
    if (lattice !== 'square' && /^K(?:\d+)?$/.test(standardName)) {
      const angle = (-Math.PI / 2) + (boundaryIndex % 6) * Math.PI / 3;
      return { name, x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
    }
    if (lattice !== 'square' && /^M(?:\d+)?$/.test(standardName)) {
      const angle = -Math.PI / 3 + (boundaryIndex % 6) * Math.PI / 3;
      const midpointRadius = r * Math.cos(Math.PI / 6);
      return { name, x: cx + Math.cos(angle) * midpointRadius, y: cy + Math.sin(angle) * midpointRadius };
    }
    const angle = lattice === 'square'
      ? (boundaryIndex % 4) * Math.PI / 2
      : (-Math.PI / 2) + (boundaryIndex * 2 * Math.PI) / Math.max(1, boundaryNames.length);
    return { name, x: cx + Math.cos(angle) * r * 0.82, y: cy + Math.sin(angle) * r * 0.82 };
  });
  pointCoords.forEach((point, i) => {
    const id = point.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || `point-${i}`;
    b.circle(id, point.x, point.y, 3, { fill: 'solid', color: 'accent', role: 'annotation' });
    b.label(`${id}-label`, point.name, point.x, point.y - 12, { slot: 'N', anchorId: id, priority: 'required' });
    if (i > 0) {
      const previous = pointCoords[i - 1]!;
      b.line(`path-${i - 1}`, previous.x, previous.y, point.x, point.y, { color: 'muted', role: 'connector', width: 1.4 });
    }
  });
  return layoutAndCompile(b.scene());
}
