import type { CompileCtx, CompileResult } from '../types';
import { parseCsv, specGet, specHas, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

function malformed(reason: string): CompileResult {
  return { ok: false, code: 'malformed', reason };
}

function explicitKey(spec: SpecDoc, key: string): boolean {
  return new RegExp(`^\\s*${key.replace('.', '\\.') }\\s*:`, 'im').test(spec.raw);
}

function csvValue(spec: SpecDoc, key: string, fallback?: string): string[] | CompileResult {
  const raw = specGet(spec, key);
  if (raw === undefined) return specHas(spec, key) || explicitKey(spec, key) ? malformed(`${key}: needs at least one value`) : parseCsv(fallback ?? '');
  const values = parseCsv(raw);
  return values.length ? values : malformed(`${key}: needs at least one value`);
}

function numericValue(spec: SpecDoc, key: string, fallback: number): number | CompileResult {
  const raw = specGet(spec, key);
  if (raw === undefined) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : malformed(`${key}: expected a number`);
}

function normalizeGeometry(raw: string): { name: string; count: number; angles: number[]; dashed: Set<number> } | null {
  const key = raw.toLowerCase().replace(/[\s_-]+/g, '');
  if (key === 'ax2' || key === 'linear' || key === 'lin') return { name: 'linear', count: 2, angles: [0, 180], dashed: new Set() };
  if (key === 'ax3' || key === 'trigonalplanar' || key === 'trigplanar') return { name: 'trigonal planar', count: 3, angles: [-90, 30, 150], dashed: new Set() };
  if (key === 'ax4' || key === 'tetrahedral' || key === 'tetra') return { name: 'tetrahedral', count: 4, angles: [-90, 0, 90, 180], dashed: new Set([1, 3]) };
  if (key === 'ax5' || key === 'trigonalbipyramidal' || key === 'tbp') return { name: 'trigonal bipyramidal', count: 5, angles: [-90, 90, 30, 150, 210], dashed: new Set() };
  if (key === 'ax6' || key === 'octahedral' || key === 'oct' || key === 'oh') return { name: 'octahedral', count: 6, angles: [-90, 90, 0, 180, 35, 145], dashed: new Set([4, 5]) };
  if (key === 'squareplanar' || key === 'sq') return { name: 'square planar', count: 4, angles: [0, 90, 180, 270], dashed: new Set() };
  return null;
}

function highlightMatching(b: SceneBuilder, spec: SpecDoc, names: Array<{ value: string; ids: string[] }>): void {
  const wanted = new Set(spec.highlight.map((value) => value.toLowerCase()));
  const ids = names.filter((entry) => wanted.has(entry.value.toLowerCase())).flatMap((entry) => entry.ids);
  b.hl([...spec.highlight, ...ids]);
}

function centerClearance(label: string): number {
  return Math.max(12, label.length * 6);
}

export function compileNewman(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('newman', w, h);
  const viewRaw = specGet(spec, 'view');
  const view = (viewRaw ?? 'circular').toLowerCase();
  if (!['circular', 'sawhorse'].includes(view)) return malformed(`newman view unsupported: ${viewRaw}`);
  const front = csvValue(spec, 'front', 'H,H,H');
  const back = csvValue(spec, 'back', 'H,H,H');
  if (!Array.isArray(front)) return front;
  if (!Array.isArray(back)) return back;
  if (front.length !== 3 || back.length !== 3) return malformed('newman needs exactly three front and three back substituents');
  const deg = numericValue(spec, 'deg', 0);
  if (typeof deg !== 'number') return deg;
  if (deg < -360 || deg > 360) return malformed('newman deg must be between -360 and 360');
  const labels: Array<{ value: string; ids: string[] }> = [];
  const addSubstituent = (value: string, id: string, x: number, y: number, slot: 'N' | 'E' | 'S' | 'W' | 'NE' | 'NW' | 'SE' | 'SW'): void => {
    b.label(id, value, x, y, { slot, protected: true, priority: 'required', anchorId: id.replace(/-label$/, '') });
    labels.push({ value, ids: [id.replace(/-label$/, ''), id] });
  };
  if (view === 'sawhorse') {
    const left = { x: w * 0.28, y: h * 0.36 };
    const right = { x: w * 0.72, y: h * 0.64 };
    b.line('newman-axis', left.x, left.y, right.x, right.y, { width: 2, role: 'geometry' });
    front.forEach((value, i) => {
      const angle = (-90 + i * 120) * Math.PI / 180;
      const x = left.x + Math.cos(angle) * 32;
      const y = left.y + Math.sin(angle) * 32;
      const id = `front-${i}`;
      b.line(id, left.x, left.y, x, y, { width: 1.6, role: 'geometry' });
      addSubstituent(value, `${id}-label`, left.x + Math.cos(angle) * 48, left.y + Math.sin(angle) * 48, i === 0 ? 'N' : i === 1 ? 'SE' : 'SW');
    });
    back.forEach((value, i) => {
      const angle = (-90 + deg + i * 120) * Math.PI / 180;
      const x = right.x + Math.cos(angle) * 32;
      const y = right.y + Math.sin(angle) * 32;
      const id = `back-${i}`;
      b.line(id, right.x, right.y, x, y, { width: 1.6, dash: true, color: 'muted', role: 'geometry' });
      addSubstituent(value, `${id}-label`, right.x + Math.cos(angle) * 48, right.y + Math.sin(angle) * 48, i === 0 ? 'N' : i === 1 ? 'SE' : 'SW');
    });
  } else {
    const cx = w / 2;
    const cy = h / 2 + 4;
    const r = Math.min(w, h) * 0.25;
    b.circle('front-center', cx, cy, r, { width: 1.8, role: 'geometry' });
    front.forEach((value, i) => {
      const angle = (-90 + i * 120) * Math.PI / 180;
      const id = `front-${i}`;
      b.line(id, cx, cy, cx + Math.cos(angle) * (r + 14), cy + Math.sin(angle) * (r + 14), { width: 1.8, role: 'geometry' });
      addSubstituent(value, `${id}-label`, cx + Math.cos(angle) * (r + 30), cy + Math.sin(angle) * (r + 30), i === 0 ? 'N' : i === 1 ? 'SE' : 'SW');
    });
    back.forEach((value, i) => {
      const angle = (-90 + deg + i * 120) * Math.PI / 180;
      const id = `back-${i}`;
      b.line(id, cx, cy, cx + Math.cos(angle) * (r + 8), cy + Math.sin(angle) * (r + 8), { width: 1.4, dash: true, color: 'muted', role: 'geometry' });
      addSubstituent(value, `${id}-label`, cx + Math.cos(angle) * (r + 42), cy + Math.sin(angle) * (r + 42), i === 0 ? 'N' : i === 1 ? 'SE' : 'SW');
    });
  }
  const axis = specGet(spec, 'axis');
  if (axis !== undefined) {
    if (!axis.trim()) return malformed('newman axis cannot be empty');
    b.label('axis-label', axis, w / 2, 12, { protected: true, priority: 'required' });
  }
  highlightMatching(b, spec, labels);
  return layoutAndCompile(b.scene());
}

export function compileFischer(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('fischer', w, h);
  const raw = specGet(spec, 'backbone') ?? specGet(spec, 'chain');
  const chain = raw === undefined ? ['CHO', 'H', 'OH', 'CH2OH'] : parseCsv(raw);
  if (chain.length < 2) return malformed('fischer backbone needs at least two ordered centers');
  if (chain.length > 6) return malformed('fischer backbone is too dense for the fixed frame');
  if (raw !== undefined && !chain.length) return malformed('fischer backbone cannot be empty');
  const x = w / 2;
  const y0 = 25;
  const dy = (h - 50) / (chain.length - 1);
  const labels: Array<{ value: string; ids: string[] }> = [];
  for (let i = 0; i < chain.length; i++) {
    const y = y0 + i * dy;
    const centerId = `center-${i}`;
    b.circle(centerId, x, y, 3, { fill: 'solid', role: 'geometry' });
    if (i < chain.length - 1) b.line(`backbone-${i}`, x, y, x, y + dy, { width: 1.8, role: 'geometry' });
    if (i > 0 && i < chain.length - 1) {
      b.line(`cross-left-${i}`, x, y, x - 38, y, { width: 1.8, role: 'geometry' });
      b.line(`cross-right-${i}`, x, y, x + 38, y, { width: 1.8, role: 'geometry' });
    }
    const labelId = `center-label-${i}`;
    b.label(labelId, chain[i]!, x + (i === 0 || i === chain.length - 1 ? 0 : i % 2 ? -54 : 54), y, {
      slot: i === 0 ? 'N' : i === chain.length - 1 ? 'S' : i % 2 ? 'W' : 'E',
      priority: 'required',
      anchorId: centerId,
    });
    labels.push({ value: chain[i]!, ids: [centerId, labelId] });
  }
  highlightMatching(b, spec, labels);
  return layoutAndCompile(b.scene());
}

export function compileChair(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('chair', w, h);
  const values = csvValue(spec, 'subst', specGet(spec, 'substituents') ?? '');
  if (!Array.isArray(values)) return values;
  if (specHas(spec, 'subst') && !values.length) return malformed('chair subst cannot be empty');
  if (values.length > 6) return malformed('chair supports at most six ring positions');
  const cx = w / 2;
  const cy = h / 2 + 6;
  const vertices = [
    [cx - 78, cy - 24], [cx - 26, cy - 45], [cx + 48, cy - 24],
    [cx + 78, cy + 24], [cx + 26, cy + 45], [cx - 48, cy + 24],
  ];
  for (let i = 0; i < vertices.length; i++) {
    const next = vertices[(i + 1) % vertices.length]!;
    const point = vertices[i]!;
    b.line(`ring-bond-${i}`, point[0]!, point[1]!, next[0]!, next[1]!, { width: 1.8, role: 'geometry' });
  }
  const labels: Array<{ value: string; ids: string[] }> = [];
  values.forEach((value, i) => {
    const point = vertices[i]!;
    const x = point[0]!;
    const y = point[1]!;
    const axial = i % 2 === 0;
    const endY = y + (axial ? (y < cy ? -34 : 34) : (y < cy ? -20 : 20));
    const endX = x + (axial ? 0 : (x < cx ? -34 : 34));
    const bondId = `subst-bond-${i}`;
    const labelId = `subst-label-${i}`;
    b.line(bondId, x, y, endX, endY, { width: 1.5, role: 'connector' });
    b.label(labelId, value, endX, endY, { slot: axial ? (y < cy ? 'N' : 'S') : x < cx ? 'W' : 'E', protected: true, priority: 'required', anchorId: bondId });
    labels.push({ value, ids: [bondId, labelId] });
  });
  highlightMatching(b, spec, labels);
  return layoutAndCompile(b.scene());
}

export function compileHaworth(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('haworth', w, h);
  const sugar = specGet(spec, 'sugar') ?? 'Glc';
  if (!sugar.trim()) return malformed('haworth sugar cannot be empty');
  const rawAnomer = specGet(spec, 'anomer') ?? 'α';
  const key = rawAnomer.toLowerCase();
  const anomer = key === 'alpha' || key === 'a' || rawAnomer === 'α' ? 'α' : key === 'beta' || key === 'b' || rawAnomer === 'β' ? 'β' : null;
  if (!anomer) return malformed(`haworth anomer unsupported: ${rawAnomer}`);
  const cx = w / 2;
  const cy = h / 2 + 8;
  const ring = [cx - 78, cy, cx - 38, cy - 40, cx + 38, cy - 40, cx + 78, cy, cx + 38, cy + 40, cx - 38, cy + 40];
  b.polygon('ring', ring, { fill: 'none', width: 1.8, role: 'geometry' });
  b.label('ring-oxygen', 'O', cx + 38, cy - 40, { protected: true, priority: 'required', anchorId: 'ring' });
  const direction = anomer === 'α' ? 1 : -1;
  b.line('anomeric-bond', cx + 78, cy, cx + 78, cy + direction * 30, { width: 1.5, role: 'connector' });
  b.label('anomer-label', anomer, cx + 78, cy + direction * 42, { slot: direction > 0 ? 'SE' : 'NE', protected: true, priority: 'required', anchorId: 'anomeric-bond' });
  b.label('sugar-label', sugar, w / 2, 14, { protected: true, priority: 'required' });
  b.hl(spec.highlight);
  return layoutAndCompile(b.scene());
}

export function compileLewis(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('lewis', w, h);
  const values = csvValue(spec, 'atoms', specGet(spec, 'formula'));
  if (!Array.isArray(values)) return values;
  if (values.length > 6) return malformed('lewis atom sequence is too dense for the fixed frame');
  const step = values.length === 1 ? 0 : (w - 80) / (values.length - 1);
  const labels: Array<{ value: string; ids: string[] }> = [];
  values.forEach((value, i) => {
    const x = values.length === 1 ? w / 2 : 40 + i * step;
    const y = h / 2;
    const atomId = `atom-${i}`;
    b.circle(atomId, x, y, 15, { fill: 'none', role: 'geometry' });
    const labelId = `atom-label-${i}`;
    b.label(labelId, value, x, y, { protected: true, priority: 'required', anchorId: atomId });
    labels.push({ value, ids: [atomId, labelId] });
    if (i < values.length - 1) b.line(`bond-${i}`, x + 15, y, x + step - 15, y, { width: 2, role: 'connector' });
  });
  highlightMatching(b, spec, labels);
  return layoutAndCompile(b.scene());
}

export function compileVsepr(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('vsepr', w, h);
  const geomRaw = specGet(spec, 'geom') ?? specGet(spec, 'ax') ?? 'AX4';
  const geometry = normalizeGeometry(geomRaw);
  if (!geometry) return malformed(`vsepr geometry unsupported: ${geomRaw}`);
  if (specGet(spec, 'geom') && specGet(spec, 'ax')) {
    const axGeometry = normalizeGeometry(specGet(spec, 'ax')!);
    if (!axGeometry || axGeometry.count !== geometry.count) return malformed('vsepr geom and ax disagree');
  }
  const ligandRaw = specGet(spec, 'ligands');
  if (ligandRaw === undefined && explicitKey(spec, 'ligands')) return malformed('vsepr ligands cannot be empty');
  const ligands = ligandRaw === undefined ? Array.from({ length: geometry.count }, () => 'X') : parseCsv(ligandRaw);
  if (!ligands.length) return malformed('vsepr ligands cannot be empty');
  if (ligands.length !== geometry.count) return malformed(`vsepr ${geomRaw} needs ${geometry.count} ligands`);
  const cx = w / 2;
  const cy = h / 2 + 8;
  const center = specGet(spec, 'center') ?? 'A';
  if (!center.trim()) return malformed('vsepr center cannot be empty');
  b.label('center-label', center, cx, cy, { protected: true, priority: 'required', anchorId: 'center' });
  const clearance = centerClearance(center);
  const labels: Array<{ value: string; ids: string[] }> = [];
  ligands.forEach((value, i) => {
    const angle = geometry.angles[i]! * Math.PI / 180;
    const x = cx + Math.cos(angle) * 52;
    const y = cy + Math.sin(angle) * 42;
    const startX = cx + Math.cos(angle) * clearance;
    const startY = cy + Math.sin(angle) * clearance;
    const labelX = cx + Math.cos(angle) * 70;
    const labelY = cy + Math.sin(angle) * 58;
    const bondId = `ligand-bond-${i}`;
    const labelId = `ligand-label-${i}`;
    b.line(bondId, startX, startY, x, y, { width: 1.6, dash: geometry.dashed.has(i), role: 'connector' });
    b.label(labelId, value, labelX, labelY, { slot: x < cx ? 'W' : 'E', protected: true, priority: 'required', anchorId: bondId });
    labels.push({ value, ids: [bondId, labelId] });
  });
  b.label('geometry-label', geometry.name, w / 2, 14, { protected: true, priority: 'preferred' });
  highlightMatching(b, spec, [{ value: center, ids: ['center', 'center-label'] }, ...labels]);
  return layoutAndCompile(b.scene());
}

export function compileComplex(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('complex', w, h);
  const geomRaw = specGet(spec, 'geom');
  if (!geomRaw) return malformed('complex needs geom');
  const geometry = normalizeGeometry(geomRaw);
  if (!geometry) return malformed(`complex geometry unsupported: ${geomRaw}`);
  const ligandRaw = specGet(spec, 'ligands');
  if (ligandRaw === undefined) return malformed('complex needs ligands');
  const ligands = parseCsv(ligandRaw);
  if (ligands.length !== geometry.count) return malformed(`complex ${geomRaw} needs ${geometry.count} ligands`);
  const metal = specGet(spec, 'metal') ?? 'M';
  if (!metal.trim()) return malformed('complex metal cannot be empty');
  const cx = w / 2;
  const cy = h / 2 + 8;
  b.label('metal-label', metal, cx, cy, { protected: true, priority: 'required', anchorId: 'metal' });
  const clearance = centerClearance(metal);
  const labels: Array<{ value: string; ids: string[] }> = [];
  ligands.forEach((value, i) => {
    const angle = geometry.angles[i]! * Math.PI / 180;
    const x = cx + Math.cos(angle) * 55;
    const y = cy + Math.sin(angle) * 43;
    const startX = cx + Math.cos(angle) * clearance;
    const startY = cy + Math.sin(angle) * clearance;
    const labelX = cx + Math.cos(angle) * 76;
    const labelY = cy + Math.sin(angle) * 60;
    const bondId = `ligand-bond-${i}`;
    const labelId = `ligand-label-${i}`;
    b.line(bondId, startX, startY, x, y, { width: 1.6, dash: geometry.dashed.has(i), role: 'connector' });
    b.label(labelId, value, labelX, labelY, { slot: x < cx ? 'W' : 'E', protected: true, priority: 'required', anchorId: bondId });
    labels.push({ value, ids: [bondId, labelId] });
  });
  b.label('geometry-label', geometry.name, w / 2, 14, { protected: true, priority: 'preferred' });
  highlightMatching(b, spec, [{ value: metal, ids: ['metal', 'metal-label'] }, ...labels]);
  return layoutAndCompile(b.scene());
}
