import type { CompileCtx, CompileResult } from '../types';
import { specGet, specHasEmptyDelimitedValue, specList, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

type Point = { x: number; y: number };
type Edge = { a: string; b: string };
type ParsedEdges = { edges: Edge[]; malformed: string[]; duplicates: string[] };

function fail(reason: string): CompileResult { return { ok: false, code: 'malformed', reason }; }

function unsupportedKey(spec: SpecDoc, allowed: readonly string[]): string | undefined {
  const permitted = new Set(allowed);
  const declared = new Set([
    ...spec.values.keys(),
    ...spec.lists.keys(),
    ...spec.emptyDeclarations.keys(),
  ]);
  const key = [...declared].find((candidate) => !permitted.has(candidate));
  return key ? (spec.originals.get(key) ?? key) : undefined;
}

function rejectUnsupportedKey(spec: SpecDoc, family: string, allowed: readonly string[]): CompileResult | null {
  const key = unsupportedKey(spec, allowed);
  return key ? fail(`${family} does not support declared key ${key}`) : null;
}

const TRUSS_KEYS = ['caption', 'highlight', 'joints', 'l', 'loads', 'members', 'supports'] as const;
const COLUMN_KEYS = ['caption', 'ends', 'highlight', 'joints', 'l', 'loads', 'members', 'supports'] as const;

function hasEmptyItems(spec: SpecDoc, ...keys: string[]): boolean {
  return keys.some((key) => specHasEmptyDelimitedValue(spec, key));
}

const NUMERIC_FIELD = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?)\s*(?:[A-Za-zµμΩ%][A-Za-z0-9µμΩ%/^._-]*)?\s*$/;

function numericValue(spec: SpecDoc, key: string, fallback?: number): number | null | undefined {
  const raw = specGet(spec, key);
  if (raw === undefined) return fallback;
  const match = NUMERIC_FIELD.exec(raw);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function frame(family: string, ctx: CompileCtx, spec: SpecDoc): SceneBuilder {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder(family, w, h);
  b.hl(spec.highlight);
  return b;
}

function items(spec: SpecDoc, key: string): string[] {
  return specList(spec, key).flatMap((raw) => {
    const value = raw.trim();
    if (!value) return [];
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        const parsed = JSON.parse(value) as unknown;
        if (Array.isArray(parsed)) return parsed.map((entry) => {
          if (typeof entry === 'string') return entry;
          if (entry && typeof entry === 'object') {
            const record = entry as Record<string, unknown>;
            const id = String(record.id ?? record.name ?? record.type ?? '');
            const role = String(record.role ?? record.type ?? '');
            const at = String(record.at ?? '');
            return `${id}|${role}${at ? `@${at}` : ''}`.replace(/\|$/, '');
          }
          return String(entry);
        });
      } catch { /* line-oriented syntax remains valid */ }
    }
    return value.split(/[,;]+/).map((entry) => entry.trim()).filter(Boolean);
  });
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  return values.filter((value) => {
    const k = value.toLowerCase();
    if (!value || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseEdges(spec: SpecDoc, key: string): ParsedEdges {
  const edges: Edge[] = [];
  const malformed: string[] = [];
  const duplicates: string[] = [];
  const seen = new Set<string>();
  items(spec, key).forEach((item) => {
    const match = /^\s*([^\s,;→>]+?)\s*(?:->|→|[-–]|\bto\b)\s*([^\s,;→>]+)(?:\s*@\s*\S+)?\s*$/.exec(item);
    if (!match) {
      const compact = /^([A-Za-z0-9])([A-Za-z0-9])$/.exec(item.trim());
      if (compact) edges.push({ a: compact[1]!, b: compact[2]! });
      else malformed.push(item);
      return;
    }
    const a = match[1]!.trim();
    const b = match[2]!.trim();
    if (a && b) edges.push({ a, b });
    else malformed.push(item);
  });
  edges.forEach((edge) => {
    const identity = `${edge.a.toLowerCase()}\u0000${edge.b.toLowerCase()}`;
    if (seen.has(identity)) duplicates.push(`${edge.a}->${edge.b}`);
    else seen.add(identity);
  });
  return { edges, malformed, duplicates };
}

function labelValue(raw: string): string { return raw.replace(/\s*@\s*[^\s]+\s*$/, '').trim(); }

function positions(names: string[], width: number, height: number): Map<string, Point> {
  const result = new Map<string, Point>();
  const columns = Math.ceil(Math.sqrt(Math.max(names.length, 1)));
  const rows = Math.ceil(Math.max(names.length, 1) / columns);
  names.forEach((name, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    result.set(name, {
      x: columns === 1 ? width / 2 : 30 + (column * (width - 60)) / (columns - 1),
      y: rows === 1 ? height / 2 : 28 + (row * (height - 56)) / (rows - 1),
    });
  });
  return result;
}

function graphData(spec: SpecDoc): { names: string[]; edges: Edge[]; malformed: string[]; duplicates: string[] } {
  const parsed = parseEdges(spec, 'members');
  const names = unique([
    ...items(spec, 'joints').map((item) => item.split(/[|\s]/)[0] ?? item),
    ...parsed.edges.flatMap((edge) => [edge.a, edge.b]),
  ]);
  return { names, edges: parsed.edges, malformed: parsed.malformed, duplicates: parsed.duplicates };
}

function drawGraph(b: SceneBuilder, data: { names: string[]; edges: Edge[] }, width: number, height: number): Map<string, Point> {
  const { names, edges } = data;
  if (!names.length || !edges.length) return new Map();
  const at = positions(names, width, height);
  edges.forEach((edge) => {
    const a = at.get(edge.a);
    const z = at.get(edge.b);
    if (a && z) b.line(`member-${edge.a}-${edge.b}`, a.x, a.y, z.x, z.y, { role: 'geometry', width: 1.8 });
  });
  names.forEach((name) => {
    const point = at.get(name)!;
    b.circle(`joint-${name}`, point.x, point.y, 3.5, { role: 'geometry', color: 'accent', fill: 'solid' });
    b.label(`joint-${name}-label`, name, point.x, point.y, { priority: 'optional' });
  });
  return at;
}

function drawSupportAt(b: SceneBuilder, id: string, kind: string, point: Point): void {
  if (kind.toLowerCase().includes('roller')) {
    b.circle(`${id}-roller`, point.x, point.y + 8, 4, { role: 'geometry' });
    b.line(`${id}-ground`, point.x - 9, point.y + 14, point.x + 9, point.y + 14, { role: 'boundary', color: 'muted' });
  } else {
    b.polygon(`${id}-pin`, [point.x - 8, point.y + 12, point.x + 8, point.y + 12, point.x, point.y], { role: 'geometry', fill: 'none' });
    b.line(`${id}-ground`, point.x - 10, point.y + 14, point.x + 10, point.y + 14, { role: 'boundary', color: 'muted' });
  }
}

function pointForTarget(at: Map<string, Point>, target: string | undefined): Point | undefined {
  if (!target) return undefined;
  const key = [...at.keys()].find((name) => name.toLowerCase() === target.toLowerCase());
  return key ? at.get(key) : undefined;
}

function drawGraphAnnotations(b: SceneBuilder, spec: SpecDoc, at: Map<string, Point>): string | null {
  items(spec, 'supports').forEach((item, index) => {
    const match = /^(.*?)@\s*([^\s]+)$/.exec(item);
    const kind = match?.[1]?.trim() ?? item;
    const target = match?.[2]?.trim();
    if (!/^(?:pin|roller)$/i.test(kind)) return;
    if (target && !pointForTarget(at, target)) return;
    const point = pointForTarget(at, target) ?? [...at.values()][index];
    if (point) drawSupportAt(b, `support-${index}`, kind, point);
  });
  items(spec, 'loads').forEach((item, index) => {
    const point = at.get(/@\s*([^\s]+)$/.exec(item)?.[1] ?? '') ?? [...at.values()][index % Math.max(at.size, 1)];
    if (!point) return;
    b.line(`load-${index}`, point.x, point.y - 24, point.x, point.y - 4, { color: 'danger', role: 'annotation', markerEnd: true });
    b.label(`load-${index}-label`, labelValue(item), point.x, point.y - 29, { priority: 'optional' });
  });
  const unknownSupport = items(spec, 'supports').map((item) => /^(.*?)@\s*([^\s]+)$/.exec(item)?.[2]?.trim()).find((target) => target && !pointForTarget(at, target));
  if (unknownSupport) return `support references unknown joint ${unknownSupport}`;
  const unsupportedSupport = items(spec, 'supports').map((item) => {
    const kind = /^(.*?)@\s*([^\s]+)$/.exec(item)?.[1]?.trim() ?? item.trim();
    return /^(?:pin|roller)$/i.test(kind) ? undefined : kind;
  }).find(Boolean);
  if (unsupportedSupport) return `unsupported support kind ${unsupportedSupport}`;
  const unknownLoad = items(spec, 'loads').map((item) => /@\s*([^\s]+)$/.exec(item)?.[1]?.trim()).find((target) => target && !pointForTarget(at, target));
  if (unknownLoad) return `load references unknown joint ${unknownLoad}`;
  return null;
}

export function compileTruss(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('truss', ctx, spec);
  const unsupported = rejectUnsupportedKey(spec, 'truss', TRUSS_KEYS);
  if (unsupported) return unsupported;
  if (hasEmptyItems(spec, 'joints', 'members')) return fail('truss contains an empty joint or member declaration');
  const graph = graphData(spec);
  if (graph.malformed.length) return fail('truss contains a malformed member declaration');
  if (graph.duplicates.length) return fail('truss contains a duplicate member declaration');
  const at = drawGraph(b, graph, b.width, b.height - 8);
  if (!at.size || !graph.edges.length) return fail('truss requires named joints and members');
  const length = numericValue(spec, 'l');
  if (length === null || (typeof length === 'number' && length <= 0)) return fail('truss length must be numeric and positive');
  if (typeof length === 'number') b.label('length-label', `L=${length}`, b.width / 2, 15, { priority: 'preferred' });
  const annotationError = drawGraphAnnotations(b, spec, at);
  if (annotationError) return fail(annotationError);
  return layoutAndCompile(b.scene());
}

export function compileColumn(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('column', ctx, spec);
  const unsupported = rejectUnsupportedKey(spec, 'column', COLUMN_KEYS);
  if (unsupported) return unsupported;
  if (hasEmptyItems(spec, 'joints', 'members')) return fail('column contains an empty joint or member declaration');
  const graph = graphData(spec);
  if (graph.malformed.length) return fail('column contains a malformed member declaration');
  if (graph.duplicates.length) return fail('column contains a duplicate member declaration');
  const length = numericValue(spec, 'l');
  if (length === null || (typeof length === 'number' && length <= 0)) return fail('column length must be numeric and positive');
  const at = drawGraph(b, graph, b.width, b.height - 8);
  if (!at.size || !graph.edges.length) {
    if (specGet(spec, 'ends')) {
      b.line('member-column', b.width / 2, 20, b.width / 2, b.height - 25, { role: 'geometry', width: 2 });
      b.label('ends-label', specGet(spec, 'ends')!, b.width / 2, b.height / 2, { priority: 'preferred' });
      if (typeof length === 'number') b.label('length-label', `L=${length}`, b.width / 2, 15, { priority: 'preferred' });
      return layoutAndCompile(b.scene());
    }
    return fail('column requires named joints and members');
  }
  if (typeof length === 'number') b.label('length-label', `L=${length}`, b.width / 2, 15, { priority: 'preferred' });
  const first = [...at.values()][0]!;
  const last = [...at.values()].at(-1)!;
  b.path('buckled-axis', `M ${first.x} ${first.y} Q ${Math.max(first.x, last.x) + 20} ${b.height / 2} ${last.x} ${last.y}`, { color: 'accent', role: 'guide', dash: true });
  const annotationError = drawGraphAnnotations(b, spec, at);
  if (annotationError) return fail(annotationError);
  return layoutAndCompile(b.scene());
}

export function compileMohr(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('mohr', ctx, spec);
  if (hasEmptyItems(spec, 'sigma', 'sx', 'sy', 'tau', 'txy')) return fail('mohr contains an empty stress value');
  const sx = specGet(spec, 'sigma') === undefined ? numericValue(spec, 'sx', 40) : numericValue(spec, 'sigma');
  const sy = numericValue(spec, 'sy', 0);
  const tau = specGet(spec, 'tau') === undefined ? numericValue(spec, 'txy', 0) : numericValue(spec, 'tau');
  if (sx == null || sy == null || tau == null) return fail('mohr stress values must be numeric');
  const center = (sx + sy) / 2;
  const radius = Math.max(Math.hypot((sx - sy) / 2, tau), 1);
  const scale = Math.min((b.width - 70) / 2, (b.height - 50) / 2) / Math.max(Math.abs(center) + radius, 1);
  const cx = b.width / 2 + center * scale;
  const cy = b.height / 2;
  b.line('sigma-axis', 25, cy, b.width - 18, cy, { role: 'axis', markerEnd: true });
  b.line('tau-axis', b.width / 2, b.height - 18, b.width / 2, 18, { role: 'axis', markerEnd: true });
  b.circle('mohr-circle', cx, cy, radius * scale, { color: 'accent', role: 'geometry' });
  b.circle('state-a', cx + ((sx - center) * scale), cy - tau * scale, 3, { color: 'danger', role: 'annotation', fill: 'solid' });
  b.circle('state-b', cx - ((sx - center) * scale), cy + tau * scale, 3, { color: 'danger', role: 'annotation', fill: 'solid' });
  b.label('sigma-label', 'σ', b.width - 18, cy + 10, { protected: true });
  b.label('tau-label', 'τ', b.width / 2 + 10, 20, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileLinkage(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('linkage', ctx, spec);
  const links = unique(items(spec, 'links').length ? items(spec, 'links') : items(spec, 'joints').map((item) => item.split(/[|\s]/)[0] ?? item));
  if (links.length < 2 || items(spec, 'joints').length < 2) return fail('linkage requires at least two links and joints');
  const at = positions(links, b.width, b.height - 30);
  links.forEach((link, index) => {
    const a = at.get(link)!;
    const next = links[(index + 1) % links.length];
    if (!next) return;
    const z = at.get(next)!;
    b.line(`link-${link}`, a.x, a.y, z.x, z.y, { role: 'geometry', width: 2 });
    b.label(`link-${link}-label`, link, (a.x + z.x) / 2, (a.y + z.y) / 2, { priority: 'optional' });
  });
  links.forEach((_, index) => {
    const link = links[index];
    if (!link) return;
    const point = at.get(link)!;
    b.circle(`joint-${index}`, point.x, point.y, 4, { color: 'accent', role: 'geometry', fill: 'solid' });
  });
  if (specGet(spec, 'input')) b.label('input', specGet(spec, 'input')!, 18, b.height - 15, { priority: 'preferred', slot: 'W' });
  if (specGet(spec, 'output')) b.label('output', specGet(spec, 'output')!, b.width - 18, 15, { priority: 'preferred', slot: 'E' });
  if (hasEmptyItems(spec, 'motion')) return fail('linkage motion cannot be empty');
  if (specGet(spec, 'motion')) b.label('motion-label', specGet(spec, 'motion')!, b.width / 2, b.height - 15, { priority: 'preferred' });
  return layoutAndCompile(b.scene());
}

export function compileCam(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('cam', ctx, spec);
  const profile = specGet(spec, 'profile');
  if (!profile || hasEmptyItems(spec, 'profile')) return fail('cam requires a non-empty profile');
  const parsedPhases = profile.split(/[,;]+/).map((value) => {
    const match = /^\s*(?:[A-Za-z][A-Za-z0-9 _-]*\s+)?([-+]?\d+(?:\.\d+)?(?:[eE][-+]?\d+)?)\s*$/.exec(value);
    return match ? Number(match[1]) : undefined;
  });
  if (parsedPhases.some((phase) => phase === undefined || !Number.isFinite(phase))) return fail('cam profile contains a malformed phase token');
  const weights = parsedPhases as number[];
  const total = weights.reduce((sum, value) => sum + Math.abs(value), 0) || 1;
  const curve: number[] = [];
  let x = 24;
  weights.forEach((weight, index) => {
    const end = x + (b.width - 48) * Math.abs(weight) / total;
    curve.push(x, b.height / 2 - Math.sin((index / Math.max(weights.length - 1, 1)) * Math.PI) * 24, end, b.height / 2 - Math.sin(((index + 1) / Math.max(weights.length, 1)) * Math.PI) * 24);
    x = end;
  });
  b.circle('cam-body', 55, b.height / 2, 26, { role: 'geometry', fill: 'none' });
  b.circle('follower', 105, b.height / 2 - 25, 7, { color: 'accent', role: 'geometry', fill: 'none' });
  b.polyline('profile-curve', curve, { color: 'accent', role: 'geometry', fill: 'none', width: 1.8 });
  if (specGet(spec, 'follower')) b.label('follower-label', specGet(spec, 'follower')!, 105, b.height / 2 - 38, { priority: 'preferred' });
  if (specGet(spec, 'motion')) b.label('motion-label', specGet(spec, 'motion')!, b.width - 30, b.height - 12, { priority: 'optional' });
  return layoutAndCompile(b.scene());
}

export function compileGear(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('gear', ctx, spec);
  if (hasEmptyItems(spec, 'gears')) return fail('gear contains an empty gear declaration');
  const names = unique(items(spec, 'gears').map((value) => value.split(/[|\s]/)[0] ?? value));
  const readToothCount = (key: string, fallback: number): number | null => {
    const value = numericValue(spec, key, fallback);
    if (value == null || !Number.isSafeInteger(value) || value <= 0) return null;
    return value;
  };
  const z1 = readToothCount('z1', 12);
  const z2 = readToothCount('z2', 24);
  if (z1 === null || z2 === null) return fail('gear tooth counts must be numeric');
  if (hasEmptyItems(spec, 'mesh')) return fail('gear mesh mode cannot be empty');
  const mesh = specGet(spec, 'mesh')?.trim().toLowerCase() ?? 'external';
  if (mesh !== 'external') return fail('gear currently renders external mesh only');
  const teeth = [z1, z2];
  const gearNames = names.length >= 2 ? names.slice(0, 2) : ['gear-1', 'gear-2'];
  const centers = [b.width * 0.36, b.width * 0.66];
  const radii = teeth.map((value) => 15 + Math.min(28, Math.max(8, value)) * 0.55);
  gearNames.forEach((name, index) => {
    const cx = centers[index]!;
    const cy = b.height / 2;
    b.circle(`gear-${name}`, cx, cy, radii[index]!, { role: 'geometry' });
    const toothCount = Math.min(12, Math.max(4, Math.round(teeth[index]! / 2)));
    for (let t = 0; t < toothCount; t++) {
      const angle = (t / toothCount) * Math.PI * 2;
      b.line(`tooth-${index}-${t}`, cx + Math.cos(angle) * radii[index]!, cy + Math.sin(angle) * radii[index]!, cx + Math.cos(angle) * (radii[index]! + 4), cy + Math.sin(angle) * (radii[index]! + 4), { role: 'geometry' });
    }
    b.label(`gear-${name}-label`, `${name} z=${teeth[index]}`, cx, cy + radii[index]! + 14, { priority: 'preferred', slot: 'S' });
  });
  b.line('mesh', centers[0]! + radii[0]!, b.height / 2, centers[1]! - radii[1]!, b.height / 2, { color: 'accent', role: 'connector', dash: true });
  b.label('mesh-label', `mesh: ${mesh}`, b.width / 2, 15, { priority: 'preferred' });
  return layoutAndCompile(b.scene());
}

export function compileWall(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('wall', ctx, spec);
  if (hasEmptyItems(spec, 'h', 'soil')) return fail('wall contains an empty height or soil value');
  const heightValue = numericValue(spec, 'h', 4);
  if (heightValue == null || heightValue <= 0) return fail('wall height must be numeric and positive');
  const wallHeight = Math.min(b.height - 32, Math.max(50, heightValue * 18));
  const wallX = 70;
  b.rect('wall-body', wallX, b.height - 18 - wallHeight, 18, wallHeight, { role: 'boundary', fill: 'none', width: 2 });
  b.polygon('soil-wedge', [wallX + 18, b.height - 18, b.width - 25, b.height - 18, b.width - 25, b.height - 18 - wallHeight * 0.78], { role: 'hatch', color: 'muted', fill: 'none', pattern: 'hatch' });
  items(spec, 'loads').forEach((load, index) => {
    const y = 40 + index * 25;
    b.line(`load-${index}`, wallX + 22, y, wallX + 4, y, { color: 'danger', role: 'annotation', markerEnd: true });
    b.label(`load-${index}-label`, labelValue(load), wallX + 25, y, { priority: 'optional', slot: 'E' });
  });
  b.label('wall-label', specGet(spec, 'wall') ?? 'wall', wallX, 15, { priority: 'preferred', slot: 'N' });
  if (specGet(spec, 'soil')) b.label('soil-label', `soil: ${specGet(spec, 'soil')}`, b.width - 35, 15, { priority: 'preferred', slot: 'N' });
  return layoutAndCompile(b.scene());
}

export function compileSoil(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('soil', ctx, spec);
  if (hasEmptyItems(spec, 'phases', 'layers')) return fail('soil contains an empty phase or layer declaration');
  const phaseItems = items(spec, 'phases');
  const malformedPhase = phaseItems.find((item) => !/^(.+?)\s+(-?\d+(?:\.\d+)?)\s*%?$/.test(item));
  if (malformedPhase) return fail('soil contains a malformed phase declaration');
  const phases = phaseItems.flatMap((item) => {
    const match = /^(.+?)\s+(-?\d+(?:\.\d+)?)\s*%?$/.exec(item);
    return match ? [{ name: match[1]!.trim(), fraction: Number(match[2])! > 1 ? Number(match[2])! / 100 : Number(match[2])! }] : [];
  });
  if (new Set(phases.map((phase) => phase.name.toLowerCase())).size !== phases.length) return fail('soil phase names must be unique');
  if (phases.length < 2) {
    const layers = unique(items(spec, 'layers'));
    if (layers.length < 2) return fail('soil requires named phases and fractions');
    const band = (b.height - 38) / layers.length;
    layers.forEach((layer, index) => {
      const y = 20 + index * band;
      b.rect(`layer-${layer}`, 35, y, b.width - 70, band - 3, { role: 'geometry', fill: index % 2 ? 'accent' : 'none' });
      b.label(`layer-${layer}-label`, layer, b.width / 2, y + band / 2, { priority: 'preferred' });
    });
    return layoutAndCompile(b.scene());
  }
  const total = phases.reduce((sum, phase) => sum + phase.fraction, 0);
  if (!Number.isFinite(total) || Math.abs(total - 1) > 0.02 || phases.some((phase) => phase.fraction < 0)) return fail('soil phase fractions must sum to total volume');
  if (hasEmptyItems(spec, 'basis')) return fail('soil basis cannot be empty');
  const basis = specGet(spec, 'basis')?.trim().toLowerCase() ?? 'total';
  if (basis !== 'total') return fail('soil currently uses total volume basis only');
  let x = 20;
  phases.forEach((phase, index) => {
    const width = (b.width - 40) * phase.fraction;
    b.rect(`phase-${phase.name}`, x, 42, width, b.height - 72, { role: 'geometry', fill: index % 2 ? 'accent' : 'none', pattern: index % 2 ? 'dots' : undefined });
    b.label(`phase-${phase.name}-label`, `${phase.name} ${Math.round(phase.fraction * 100)}%`, x + width / 2, b.height / 2, { priority: 'preferred' });
    x += width;
  });
  const voids = items(spec, 'voids');
  if (voids.length) b.label('voids-label', `voids: ${voids.join(' + ')}`, b.width / 2, b.height - 14, { priority: 'optional' });
  b.label('basis-label', `basis: ${basis}`, b.width / 2, 15, { priority: 'preferred' });
  return layoutAndCompile(b.scene());
}

export function compileRc(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('rc', ctx, spec);
  if (hasEmptyItems(spec, 'b', 'h', 'reinforcement')) return fail('rc contains an empty dimension or reinforcement value');
  const widthValue = numericValue(spec, 'b', 3);
  const heightValue = numericValue(spec, 'h', 5);
  const reinforcement = numericValue(spec, 'reinforcement', 4);
  if (widthValue == null || heightValue == null || reinforcement == null || widthValue <= 0 || heightValue <= 0 || reinforcement <= 0) return fail('rc dimensions and reinforcement must be numeric and positive');
  const width = Math.min(b.width - 100, Math.max(45, widthValue * 20));
  const height = Math.min(b.height - 35, Math.max(60, heightValue * 18));
  const x = (b.width - width) / 2;
  const y = (b.height - height) / 2;
  b.rect('rc-section', x, y, width, height, { role: 'geometry', fill: 'none', width: 1.8 });
  const count = Math.max(2, Math.min(12, Math.round(reinforcement)));
  for (let i = 0; i < count; i++) {
    const px = x + 9 + (i % 4) * Math.max(10, (width - 18) / 3);
    const py = i < 4 ? y + height - 9 : y + 9;
    b.circle(`rebar-${i}`, Math.min(x + width - 6, px), py, 3, { color: 'accent', role: 'geometry', fill: 'solid' });
  }
  b.label('section-label', specGet(spec, 'section') ?? 'RC section', b.width / 2, 15, { priority: 'preferred' });
  return layoutAndCompile(b.scene());
}

export function compileFrame(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('frame', ctx, spec);
  const rawPanels = items(spec, 'panels');
  const panels = rawPanels.length ? rawPanels.map((item) => {
    const [id, role = 'panel'] = item.split('|');
    return { id: id!.trim(), role: role.trim() };
  }) : [{ id: 'main', role: 'frame' }];
  if (panels.some((panel) => !panel.id) || new Set(panels.map((panel) => panel.id.toLowerCase())).size !== panels.length) return fail('frame panel IDs must be unique');
  if (panels.length > 9) return fail('frame supports at most nine panels');
  const scaffold = specGet(spec, 'scaffold');
  const grid = scaffold === undefined ? null : /^\s*(?:grid[_-]?)?(\d+)x(\d+)\s*$/i.exec(scaffold);
  if (scaffold !== undefined && !grid) return fail('frame scaffold must be a positive CxR grid');
  const columns = Number(grid?.[1] ?? (panels.length > 1 ? Math.ceil(Math.sqrt(panels.length)) : 1));
  const rows = Number(grid?.[2] ?? Math.ceil(panels.length / columns));
  const maxGridDimension = 9;
  if (!Number.isSafeInteger(columns) || !Number.isSafeInteger(rows) || columns < 1 || rows < 1 || columns > maxGridDimension || rows > maxGridDimension) {
    return fail('frame scaffold dimensions are outside the supported bound');
  }
  if (columns * rows < panels.length) return fail('frame scaffold cannot contain all declared panels');
  const gutter = 8;
  const cellW = (b.width - 20 - gutter * (columns - 1)) / columns;
  const cellH = (b.height - 20 - gutter * (rows - 1)) / rows;
  if (!Number.isFinite(cellW) || !Number.isFinite(cellH) || cellW < 24 || cellH < 20) return fail('frame scaffold cells are too small to remain readable');
  panels.forEach((panel, index) => {
    const col = index % columns;
    const row = Math.floor(index / columns);
    const x = 10 + col * (cellW + gutter);
    const y = 10 + row * (cellH + gutter);
    b.panel(panel.id, panel.role, x, y, cellW, cellH);
    b.rect(`panel-${panel.id}`, x, y, cellW, cellH, { role: 'boundary', color: 'muted', fill: 'none' });
    b.label(`panel-${panel.id}-label`, panel.role, x + cellW / 2, y + 12, { panelId: panel.id, priority: 'optional' });
  });
  const memberItems = items(spec, 'members');
  if (memberItems.length && !memberItems.every((item) => /^none$/i.test(item))) {
    const panelPoints = new Map(panels.map((panel, index) => {
      const col = index % columns;
      const row = Math.floor(index / columns);
      return [panel.id.toLowerCase(), { x: 10 + col * (cellW + gutter) + cellW / 2, y: 10 + row * (cellH + gutter) + cellH / 2 }];
    }));
    const parsed = parseEdges(spec, 'members');
    if (parsed.malformed.length || parsed.duplicates.length) return fail('frame contains a malformed or duplicate member declaration');
    for (const edge of parsed.edges) {
      const from = panelPoints.get(edge.a.toLowerCase());
      const to = panelPoints.get(edge.b.toLowerCase());
      if (!from || !to) return fail(`frame member references unknown panel ${edge.a}->${edge.b}`);
      b.line(`member-${edge.a}-${edge.b}`, from.x, from.y, to.x, to.y, { role: 'connector', color: 'guide', dash: true });
    }
  }
  if ((specGet(spec, 'divider') ?? '').toLowerCase().includes('shared') && panels.length > 1) b.line('shared-divider', b.width / 2, 10, b.width / 2, b.height - 10, { role: 'connector', color: 'guide', dash: true });
  items(spec, 'annotations').forEach((annotation, index) => b.label(`annotation-${index}`, annotation, b.width / 2, b.height - 12, { priority: 'optional' }));
  return layoutAndCompile(b.scene());
}

function processUnits(spec: SpecDoc): { names: string[]; edges: Edge[]; malformed: string[]; duplicates: string[] } {
  const empty = hasEmptyItems(spec, 'connections', 'streams', 'units', 'components');
  const connections = parseEdges(spec, 'connections');
  const streams = parseEdges(spec, 'streams');
  const edges = connections.edges.concat(streams.edges);
  const declared = unique([...items(spec, 'units'), ...items(spec, 'components')]);
  const names = declared.length ? declared : unique(edges.flatMap((edge) => [edge.a, edge.b]));
  const deduped = edges.filter((edge, index, all) => all.findIndex((other) => other.a === edge.a && other.b === edge.b) === index);
  return {
    names,
    edges: deduped,
    malformed: [...connections.malformed, ...streams.malformed, ...(empty ? ['empty process declaration'] : [])],
    duplicates: [...connections.duplicates, ...streams.duplicates],
  };
}

function drawProcess(b: SceneBuilder, names: string[], edges: Edge[], spec: SpecDoc): CompileResult | Map<string, Point> {
  if (names.length < 2) return fail('process figure requires at least two named units');
  const at = new Map<string, Point>();
  names.forEach((name, index) => at.set(name, { x: 30 + (index * (b.width - 60)) / Math.max(names.length - 1, 1), y: b.height / 2 }));
  names.forEach((name, index) => {
    const point = at.get(name)!;
    b.rect(`unit-${name}`, point.x - 25, point.y - 18, 50, 36, { role: 'geometry', fill: 'none' });
    b.label(`unit-${name}-label`, name, point.x, point.y, { protected: true });
    if (index === 0) b.label(`unit-${name}-index`, '1', point.x, point.y - 28, { priority: 'optional' });
  });
  edges.forEach((edge, index) => {
    const a = at.get(edge.a);
    const z = at.get(edge.b);
    if (!a || !z) return;
    const y = b.height / 2 + (index % 2 ? 16 : -16);
    b.line(`stream-${index}`, a.x + 25, y, z.x - 25, y, { role: 'connector', color: index % 2 ? 'accent' : 'neutral', markerEnd: true });
    b.label(`stream-${index}-label`, `${edge.a}→${edge.b}`, (a.x + z.x) / 2, y, { priority: 'optional' });
  });
  return at;
}

export function compileReactor(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('reactor', ctx, spec);
  const reactorType = specGet(spec, 'type')?.trim().toLowerCase();
  if (reactorType && reactorType !== 'cstr' && reactorType !== 'pfr') return fail(`unsupported reactor type ${reactorType}`);
  const process = processUnits(spec);
  if (process.malformed.length) return fail('reactor contains a malformed stream or connection declaration');
  if (process.duplicates.length) return fail('reactor contains a duplicate stream or connection declaration');
  const { names, edges } = process;
  const unknown = edges.find((edge) => !names.includes(edge.a) || !names.includes(edge.b));
  if (unknown) return fail(`stream references unknown unit ${unknown.a}->${unknown.b}`);
  const recycle = specGet(spec, 'recycle');
  if (recycle && edges.some((edge) => !names.includes(edge.a) || !names.includes(edge.b))) return fail('recycle must connect known units');
  if (!names.length && !recycle) {
    b.circle('reactor-symbol', b.width / 2, b.height / 2, 28, { color: 'accent', role: 'geometry' });
    b.line('reactor-in', 25, b.height / 2, b.width / 2 - 28, b.height / 2, { role: 'connector', markerEnd: true });
    b.line('reactor-out', b.width / 2 + 28, b.height / 2, b.width - 25, b.height / 2, { role: 'connector', markerEnd: true });
    if (specGet(spec, 'x')) b.label('conversion', `X=${specGet(spec, 'x')}`, b.width / 2, b.height - 12, { priority: 'preferred' });
    return layoutAndCompile(b.scene());
  }
  const drawn = drawProcess(b, names, edges, spec);
  if (!('get' in drawn)) return drawn;
  if (reactorType === 'pfr') b.line('pfr-axis', 25, b.height / 2, b.width - 25, b.height / 2, { role: 'guide', dash: true });
  else b.circle('cstr-symbol', b.width / 2, b.height / 2, 18, { color: 'accent', role: 'geometry' });
  if (specGet(spec, 'x')) b.label('conversion', `X=${specGet(spec, 'x')}`, b.width / 2, b.height - 12, { priority: 'preferred' });
  return layoutAndCompile(b.scene());
}

export function compileHx(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('hx', ctx, spec);
  const streams = unique(items(spec, 'streams').length ? items(spec, 'streams') : ['hot', 'cold']);
  if (streams.length < 2) return fail('heat exchanger requires hot and cold streams');
  const direction = specGet(spec, 'direction');
  if (direction && !/counter\s*current/i.test(direction)) return fail('heat exchanger currently renders countercurrent flow only');
  b.rect('exchanger-shell', 55, 38, b.width - 110, b.height - 76, { role: 'boundary', fill: 'none' });
  b.line('hot-stream', 30, 48, b.width - 30, b.height - 48, { color: 'danger', role: 'connector', markerEnd: true });
  b.line('cold-stream', b.width - 30, 48, 30, b.height - 48, { color: 'accent', role: 'connector', markerEnd: true });
  b.label('hot-label', specGet(spec, 'th') ?? streams[0]!, 35, 28, { priority: 'required', slot: 'N' });
  b.label('cold-label', specGet(spec, 'tc') ?? streams[1]!, 35, b.height - 14, { priority: 'required', slot: 'S' });
  b.label('direction-label', specGet(spec, 'direction') ?? 'countercurrent', b.width / 2, 15, { priority: 'optional' });
  return layoutAndCompile(b.scene());
}

export function compileTernary(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('ternary', ctx, spec);
  const components = unique(items(spec, 'components').length ? items(spec, 'components') : items(spec, 'points').slice(0, 3));
  const composition = specGet(spec, 'composition');
  if (components.length !== 3) return fail('ternary requires three components');
  if (!composition) {
    const top = { x: b.width / 2, y: 20 };
    const left = { x: 30, y: b.height - 22 };
    const right = { x: b.width - 30, y: b.height - 22 };
    b.polygon('ternary-boundary', [top.x, top.y, left.x, left.y, right.x, right.y], { role: 'boundary', fill: 'none' });
    b.line('tie-line', left.x + 35, left.y - 24, right.x - 35, right.y - 24, { role: 'guide', color: 'accent', dash: true });
    b.label('component-a', components[0]!, top.x, top.y - 7, { priority: 'required', slot: 'N' });
    b.label('component-b', components[1]!, left.x + 7, left.y + 2, { priority: 'required', slot: 'SW' });
    b.label('component-c', components[2]!, right.x - 7, right.y + 2, { priority: 'required', slot: 'SE' });
    return layoutAndCompile(b.scene());
  }
  const values = new Map<string, number>();
  composition.split(/[,;]+/).forEach((part) => {
    const match = /^\s*([^=\s]+)\s*=\s*(-?\d+(?:\.\d+)?)\s*$/.exec(part);
    if (match) values.set(match[1]!, Number(match[2]));
  });
  const total = components.reduce((sum, component) => sum + (values.get(component) ?? NaN), 0);
  if (!Number.isFinite(total) || Math.abs(total - 1) > 0.02 || components.some((component) => (values.get(component) ?? -1) < 0)) return fail('ternary composition must sum to one');
  const top = { x: b.width / 2, y: 20 };
  const left = { x: 30, y: b.height - 22 };
  const right = { x: b.width - 30, y: b.height - 22 };
  b.polygon('ternary-boundary', [top.x, top.y, left.x, left.y, right.x, right.y], { role: 'boundary', fill: 'none' });
  const a = values.get(components[0]!)!;
  const c = values.get(components[2]!)!;
  const point = { x: a * top.x + c * right.x + (1 - a - c) * left.x, y: a * top.y + c * right.y + (1 - a - c) * left.y };
  b.circle('composition-point', point.x, point.y, 4, { color: 'accent', role: 'annotation', fill: 'solid' });
  b.label('component-a', components[0]!, top.x, top.y - 7, { priority: 'required', slot: 'N' });
  b.label('component-b', components[1]!, left.x + 7, left.y + 2, { priority: 'required', slot: 'SW' });
  b.label('component-c', components[2]!, right.x - 7, right.y + 2, { priority: 'required', slot: 'SE' });
  return layoutAndCompile(b.scene());
}

export function compileOpenchan(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('openchan', ctx, spec);
  const channel = specGet(spec, 'channel');
  const section = specGet(spec, 'section');
  const flow = specGet(spec, 'flow');
  if (hasEmptyItems(spec, 'y1')) return fail('open-channel depth cannot be empty');
  const depth = numericValue(spec, 'y1', 1);
  if (depth == null || depth <= 0) return fail('open-channel y1 must be numeric and positive');
  if (channel && !/trapezoid/i.test(channel)) return fail('open-channel currently renders a trapezoidal channel only');
  if (section && !/uniform/i.test(section)) return fail('open-channel currently renders a uniform section only');
  if (flow && !/upstream\s*_?to\s*_?downstream/i.test(flow)) return fail('open-channel currently renders upstream-to-downstream flow only');
  const bottomY = b.height - 25;
  const surfaceY = Math.max(42, bottomY - Math.min(82, Math.max(18, depth * 30)));
  b.path('channel-bed', `M 28 ${bottomY} L 105 ${bottomY} L 135 ${surfaceY} L ${b.width - 28} ${surfaceY}`, { role: 'boundary', width: 1.8 });
  b.line('free-surface', 35, surfaceY, b.width - 28, surfaceY, { color: 'accent', role: 'boundary', dash: true });
  b.line('flow-arrow', 80, surfaceY - 16, b.width - 45, surfaceY - 16, { color: 'accent', role: 'annotation', markerEnd: true });
  b.label('channel-label', specGet(spec, 'channel') ?? 'channel', 35, 15, { priority: 'preferred', slot: 'N' });
  b.label('waterline-label', specGet(spec, 'waterline') ?? 'free surface', b.width - 35, surfaceY - 9, { priority: 'preferred', slot: 'E' });
  b.label('flow-label', specGet(spec, 'flow') ?? 'flow', b.width / 2, surfaceY - 27, { priority: 'optional' });
  b.label('depth-label', `y1=${depth}`, 35, surfaceY + 15, { priority: 'optional', slot: 'W' });
  return layoutAndCompile(b.scene());
}

export function compilePfd(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('pfd', ctx, spec);
  const process = processUnits(spec);
  if (process.malformed.length) return fail('pfd contains a malformed stream or connection declaration');
  if (process.duplicates.length) return fail('pfd contains a duplicate stream or connection declaration');
  const { names, edges } = process;
  const unknown = edges.find((edge) => !names.includes(edge.a) || !names.includes(edge.b));
  if (unknown) return fail(`connection references unknown unit ${unknown.a}->${unknown.b}`);
  if (names.length >= 2 && !edges.length) return fail('pfd requires parseable stream connections between declared units');
  const drawn = drawProcess(b, names, edges, spec);
  if (!('get' in drawn)) return drawn;
  if (specGet(spec, 'recycle')) {
    const recycle = edges.find((edge) => edge.a.toLowerCase().includes('separator') || edge.b.toLowerCase().includes('recycle'));
    if (!recycle) return fail('declared recycle has no bound connection');
    b.path('recycle-loop', `M ${b.width - 45} ${b.height / 2 + 18} Q ${b.width - 10} ${b.height - 15} ${b.width / 2} ${b.height - 15} Q 20 ${b.height - 15} 30 ${b.height / 2}`, { color: 'accent', role: 'connector', markerEnd: true });
  }
  return layoutAndCompile(b.scene());
}

export function compilePsych(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const b = frame('psych', ctx, spec);
  if (hasEmptyItems(spec, 'dbt', 'w')) return fail('psychrometric state values cannot be empty');
  const dbt = numericValue(spec, 'dbt');
  const humidityRatio = numericValue(spec, 'w');
  if (dbt === null || humidityRatio === null || (typeof humidityRatio === 'number' && humidityRatio < 0)) return fail('psychrometric state values must be numeric');
  b.line('dry-bulb-axis', 35, b.height - 25, b.width - 20, b.height - 25, { role: 'axis', markerEnd: true });
  b.line('humidity-axis', 35, b.height - 25, 35, 18, { role: 'axis', markerEnd: true });
  b.label('dry-bulb-label', items(spec, 'axes')[0] ?? 'dry-bulb temperature', b.width - 25, b.height - 12, { protected: true });
  b.label('humidity-label', items(spec, 'axes')[1] ?? 'humidity ratio', 45, 18, { protected: true, slot: 'E' });
  if (typeof dbt === 'number') b.label('dbt-value', `dbt=${dbt}`, 50, b.height - 40, { priority: 'optional' });
  if (typeof humidityRatio === 'number') b.label('humidity-ratio-value', `w=${humidityRatio}`, 50, 30, { priority: 'optional', slot: 'E' });
  const states = unique(items(spec, 'state_points'));
  const at = positions(states, b.width - 70, b.height - 55);
  states.forEach((state, index) => {
    const point = at.get(state)!;
    const x = point.x + 35;
    const y = point.y + 25;
    b.circle(`state-${state}`, x, y, 4, { color: 'accent', role: 'annotation', fill: 'solid' });
    b.label(`state-${state}-label`, state, x, y - 9, { priority: 'preferred' });
    if (index) b.line(`process-${index}`, x - 45, y, x, y, { color: 'accent', role: 'connector', markerEnd: true });
  });
  if (specGet(spec, 'process')) b.label('process-label', specGet(spec, 'process')!, b.width / 2, 15, { priority: 'optional' });
  return layoutAndCompile(b.scene());
}
