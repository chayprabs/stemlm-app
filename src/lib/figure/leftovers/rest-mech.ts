import { FONT_MIN, type CompileCtx, type CompileResult } from '../types';
import { boxesOverlap, distPointSeg, measureText, type Box as Rect, type Segment as Seg } from '../geom';
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


const LOAD_DIRECTION: Record<string, Point> = { down: { x: 0, y: 1 }, up: { x: 0, y: -1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };

/** `A 0 0; B 4 0` → named joints in drawing units (y up). Names without coordinates → null. */
function trussJoints(spec: SpecDoc): Map<string, Point> | null | 'malformed' {
  const joints = new Map<string, Point>();
  for (const item of items(spec, 'joints')) {
    const parts = item.trim().split(/\s+/);
    if (parts.length === 1) return null;
    const [name, x, y] = parts;
    if (parts.length !== 3 || !/^[A-Za-z][A-Za-z0-9_']*$/.test(name!) || !Number.isFinite(Number(x)) || !Number.isFinite(Number(y))) return 'malformed';
    if ([...joints.keys()].some((known) => known.toLowerCase() === name!.toLowerCase())) return 'malformed';
    joints.set(name!, { x: Number(x), y: Number(y) });
  }
  return joints;
}

function rectAround(cx: number, cy: number, text: string): Rect {
  const { w, h } = measureText(text, FONT_MIN);
  return { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 };
}

/** The box for `text` whose nearest side is `gap` from (x, y) along the unit direction u. */
function rectBeyond(x: number, y: number, u: Point, gap: number, text: string): Rect {
  const { w, h } = measureText(text, FONT_MIN);
  const reach = gap + Math.abs(u.x) * w / 2 + Math.abs(u.y) * h / 2;
  return rectAround(x + u.x * reach, y + u.y * reach, text);
}

const segMeetsRect = (s: Seg, r: Rect, pad = 2) => Array.from({ length: 41 }, (_, k) => k / 40).some((t) => {
  const x = s.x1 + (s.x2 - s.x1) * t;
  const y = s.y1 + (s.y2 - s.y1) * t;
  return x > r.x1 - pad && x < r.x2 + pad && y > r.y1 - pad && y < r.y2 + pad;
});

/**
 * FIG-TRUSS-01: a truss drawn from its joint coordinates (y up, one uniform scale). Supports sit under their joints,
 * each load arrow ends at its joint pointing the stated way (down unless up/left/right) with its value at the tail,
 * and each joint name takes the first direction around the joint that clears every member, glyph and other name.
 */
export function compileTruss(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const unsupported = rejectUnsupportedKey(spec, 'truss', TRUSS_KEYS);
  if (unsupported) return unsupported;
  if (hasEmptyItems(spec, 'joints', 'members', 'supports', 'loads')) return fail('truss contains an empty joint or member declaration');
  const members = parseEdges(spec, 'members');
  if (members.malformed.length) return fail('truss contains a malformed member declaration');
  if (members.duplicates.length) return fail('truss contains a duplicate member declaration');
  if (!members.edges.length) return fail('truss requires named joints and members');
  const supports: Array<{ kind: string; joint: string }> = [];
  for (const item of items(spec, 'supports')) {
    const match = /^(.*?)@\s*([^\s]+)$/.exec(item);
    if (!match) return fail(`truss support needs a joint: ${item}`);
    if (!/^(?:pin|roller)$/i.test(match[1]!.trim())) return fail(`unsupported support kind ${match[1]!.trim()}`);
    supports.push({ kind: match[1]!.trim().toLowerCase(), joint: match[2]! });
  }
  const loads: Array<{ text: string; joint: string; u: Point }> = [];
  for (const item of items(spec, 'loads')) {
    const match = /^(.*?)@\s*([^\s]+)$/.exec(item);
    if (!match || !match[1]!.trim()) return fail(`truss load needs a value and a joint: ${item}`);
    const words = match[1]!.trim().split(/\s+/);
    const direction = LOAD_DIRECTION[words.at(-1)!.toLowerCase()] ? words.pop()!.toLowerCase() : 'down';
    const text = words.join(' ').replace(/^([+-]?\d+(?:\.\d+)?)\s*([A-Za-z]+)$/, '$1 $2');
    if (!text) return fail(`truss load needs a value: ${item}`);
    loads.push({ text, joint: match[2]!, u: LOAD_DIRECTION[direction]! });
  }
  const declared = trussJoints(spec);
  if (declared === 'malformed') return fail('truss joints are written name x y; name x y');
  const names = declared ? [...declared.keys()] : unique(items(spec, 'joints'));
  const find = (name: string) => names.find((known) => known.toLowerCase() === name.toLowerCase());
  const unknown = [...members.edges.flatMap((edge) => [edge.a, edge.b]), ...supports.map((s) => s.joint), ...loads.map((l) => l.joint)].find((name) => !find(name));
  if (unknown) return fail(`truss references undeclared joint ${unknown}`);
  if (!declared) return fail('truss joints need coordinates (name x y); a layout would invent the geometry');
  const pts = [...declared.values()];
  if (pts.some((p, i) => pts.slice(i + 1).some((q) => p.x === q.x && p.y === q.y))) return fail('truss has two joints at one point');
  const minX = Math.min(...pts.map((p) => p.x));
  const maxX = Math.max(...pts.map((p) => p.x));
  const minY = Math.min(...pts.map((p) => p.y));
  const maxY = Math.max(...pts.map((p) => p.y));
  const length = numericValue(spec, 'l');
  if (length === null || (typeof length === 'number' && length <= 0)) return fail('truss length must be numeric and positive');
  if (typeof length === 'number' && Math.abs(length - (maxX - minX)) > 1e-6 * Math.max(1, length)) return fail('truss L contradicts the joint coordinates');

  const nominal = frameSize(ctx.profile);
  const margin = 50;
  const scale = Math.min(
    maxX > minX ? (nominal.w - 2 * margin) / (maxX - minX) : Infinity,
    maxY > minY ? (2.2 * nominal.h - 2 * margin) / (maxY - minY) : Infinity,
  );
  if (!Number.isFinite(scale)) return fail('truss joints need extent');
  const shortest = Math.min(...members.edges.map((edge) => Math.hypot(declared.get(find(edge.a)!)!.x - declared.get(find(edge.b)!)!.x, declared.get(find(edge.a)!)!.y - declared.get(find(edge.b)!)!.y)));
  if (shortest * scale < 24) return { ok: false, code: 'refused', reason: 'truss members are too short to draw legibly at this size' };
  const at = new Map(names.map((name) => [name, { x: (declared.get(name)!.x - minX) * scale, y: -(declared.get(name)!.y - minY) * scale }]));

  // Fixed items first: members, supports, load arrows and their values; then each joint name.
  const segs: Seg[] = members.edges.map((edge) => ({ x1: at.get(find(edge.a)!)!.x, y1: at.get(find(edge.a)!)!.y, x2: at.get(find(edge.b)!)!.x, y2: at.get(find(edge.b)!)!.y }));
  const taken: Rect[] = supports.map((s) => ({ x1: at.get(find(s.joint)!)!.x - 10, y1: at.get(find(s.joint)!)!.y, x2: at.get(find(s.joint)!)!.x + 10, y2: at.get(find(s.joint)!)!.y + 15 }));
  // A load arrow ends at its joint, or — when that side is taken by a member — starts there; its value sits at the far end.
  const loadDrawn: Array<{ arrow: Seg; label: Rect }> = [];
  for (const load of loads) {
    const p = at.get(find(load.joint)!)!;
    const options = [-1, 1].map((side) => {
      const far = { x: p.x + side * load.u.x * 30, y: p.y + side * load.u.y * 30 };
      const near = { x: p.x + side * load.u.x * 4, y: p.y + side * load.u.y * 4 };
      const arrow = side < 0 ? { x1: far.x, y1: far.y, x2: near.x, y2: near.y } : { x1: near.x, y1: near.y, x2: far.x, y2: far.y };
      return { arrow, label: rectBeyond(far.x, far.y, { x: side * load.u.x, y: side * load.u.y }, 3, load.text), far };
    });
    const clean = options.find((option) => {
      const alongMember = Array.from({ length: 9 }, (_, k) => 0.1 + k * 0.1).some((t) => segs.some((s) => distPointSeg(
        option.arrow.x1 + (option.arrow.x2 - option.arrow.x1) * t, option.arrow.y1 + (option.arrow.y2 - option.arrow.y1) * t, s) < 3));
      return !alongMember &&
        ![...segs, ...loadDrawn.map((l) => l.arrow)].some((s) => segMeetsRect(s, option.label)) &&
        !loadDrawn.some((l) => segMeetsRect(option.arrow, l.label) || boxesOverlap(l.label, option.label, 2)) &&
        !taken.some((r) => boxesOverlap(r, option.label, 2));
    });
    if (!clean) return { ok: false, code: 'refused', reason: `truss load ${load.text} cannot be drawn clear of the members` };
    loadDrawn.push({ arrow: clean.arrow, label: clean.label });
  }
  const lines = [...segs, ...loadDrawn.map((load) => load.arrow)];
  taken.push(...loadDrawn.map((load) => load.label));
  const nameBoxes = new Map<string, Rect>();
  for (const name of names) {
    const p = at.get(name)!;
    const busy = [
      ...segs.filter((s) => (s.x1 === p.x && s.y1 === p.y) || (s.x2 === p.x && s.y2 === p.y)).map((s) => Math.atan2((s.x1 === p.x && s.y1 === p.y ? s.y2 : s.y1) - p.y, (s.x1 === p.x && s.y1 === p.y ? s.x2 : s.x1) - p.x)),
      ...loads.filter((l) => find(l.joint) === name).map((l) => Math.atan2(-l.u.y, -l.u.x)),
      ...(supports.some((s) => find(s.joint) === name) ? [Math.PI / 2] : []),
    ].sort((a, b) => a - b);
    const gaps = busy.length
      ? busy.map((angle, i) => {
        const next = i + 1 < busy.length ? busy[i + 1]! : busy[0]! + 2 * Math.PI;
        return { mid: (angle + next) / 2, size: next - angle };
      }).sort((a, b) => b.size - a.size).map((gap) => gap.mid)
      : [-Math.PI / 4];
    const candidates = [...gaps, ...Array.from({ length: 16 }, (_, k) => (k * Math.PI) / 8)];
    const box = candidates.map((angle) => rectBeyond(p.x, p.y, { x: Math.cos(angle), y: Math.sin(angle) }, 5, name))
      .find((r) => !lines.some((s) => segMeetsRect(s, r)) && ![...taken, ...nameBoxes.values()].some((t) => boxesOverlap(t, r, 2)));
    if (!box) return { ok: false, code: 'refused', reason: `truss joint ${name} cannot be named clear of its members` };
    nameBoxes.set(name, box);
  }

  const textH = measureText('0', FONT_MIN).h;
  const boxes = [...taken, ...nameBoxes.values(), ...lines.map((s) => ({ x1: Math.min(s.x1, s.x2), y1: Math.min(s.y1, s.y2), x2: Math.max(s.x1, s.x2), y2: Math.max(s.y1, s.y2) }))];
  const spanY = Math.max(...boxes.map((r) => r.y2)) + 12;
  const bounds = {
    x1: Math.min(...boxes.map((r) => r.x1)),
    y1: Math.min(...boxes.map((r) => r.y1)),
    x2: Math.max(...boxes.map((r) => r.x2)),
    y2: typeof length === 'number' ? spanY + 6 + textH : Math.max(...boxes.map((r) => r.y2)),
  };
  const b = new SceneBuilder('truss', Math.max(nominal.w, bounds.x2 - bounds.x1 + 16), Math.max(nominal.h, bounds.y2 - bounds.y1 + 16));
  b.hl(spec.highlight);
  const ox = (b.width - (bounds.x2 - bounds.x1)) / 2 - bounds.x1;
  const oy = (b.height - (bounds.y2 - bounds.y1)) / 2 - bounds.y1;
  members.edges.forEach((edge, i) => b.line(`member-${edge.a}-${edge.b}`, ox + segs[i]!.x1, oy + segs[i]!.y1, ox + segs[i]!.x2, oy + segs[i]!.y2, { role: 'geometry', width: 1.8 }));
  supports.forEach((support) => {
    const p = at.get(find(support.joint)!)!;
    const [x, y] = [ox + p.x, oy + p.y];
    const id = `support-${find(support.joint)!}`;
    if (support.kind === 'roller') {
      b.circle(`${id}-roller`, x, y + 7, 4, { role: 'geometry' });
      b.line(`${id}-ground`, x - 10, y + 13, x + 10, y + 13, { role: 'boundary', color: 'muted' });
    } else {
      b.polygon(`${id}-pin`, [x - 8, y + 12, x + 8, y + 12, x, y], { role: 'geometry', fill: 'none' });
      b.line(`${id}-ground`, x - 10, y + 14, x + 10, y + 14, { role: 'boundary', color: 'muted' });
    }
  });
  loadDrawn.forEach((load, index) => {
    b.line(`load-${index}`, ox + load.arrow.x1, oy + load.arrow.y1, ox + load.arrow.x2, oy + load.arrow.y2, { color: 'danger', role: 'annotation', markerEnd: true });
    b.label(`load-${index}-label`, loads[index]!.text, ox + (load.label.x1 + load.label.x2) / 2, oy + (load.label.y1 + load.label.y2) / 2, { protected: true, anchorId: `load-${index}` });
  });
  for (const name of names) {
    const p = at.get(name)!;
    const box = nameBoxes.get(name)!;
    b.circle(`joint-${name}`, ox + p.x, oy + p.y, 3, { role: 'geometry', fill: 'ink' });
    b.label(`joint-${name}-label`, name, ox + (box.x1 + box.x2) / 2, oy + (box.y1 + box.y2) / 2, { protected: true, anchorId: `joint-${name}` });
  }
  if (typeof length === 'number') {
    const [x1, x2, y] = [ox, ox + (maxX - minX) * scale, oy + spanY];
    b.line('span-line', x1, y, x2, y, { color: 'muted', role: 'guide', width: 1, markerStart: true, markerEnd: true });
    b.label('length-label', `L = ${length}`, (x1 + x2) / 2, y + 4 + textH / 2, { protected: true, anchorId: 'span-line' });
  }
  return layoutAndCompile(b.scene());
}

/** Three significant figures, no trailing zeros. */
function sig3(value: number): string {
  return Math.abs(value) < 1e-9 ? '0' : String(Number(value.toPrecision(3)));
}

/**
 * Mohr's circle for plane stress with the τ axis positive downward: A = (σx, τxy), B = (σy, −τxy), centre C on the
 * σ axis, principal stresses σ1, σ2 where the circle meets it, τmax at its lowest point. Labels sit outside the circle.
 */
export function compileMohr(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (hasEmptyItems(spec, 'sigma', 'sx', 'sy', 'tau', 'txy')) return fail('mohr contains an empty stress value');
  const sx = specGet(spec, 'sigma') === undefined ? numericValue(spec, 'sx', 40) : numericValue(spec, 'sigma');
  const sy = numericValue(spec, 'sy', 0);
  const tau = specGet(spec, 'tau') === undefined ? numericValue(spec, 'txy', 0) : numericValue(spec, 'tau');
  if (sx == null || sy == null || tau == null) return fail('mohr stress values must be numeric');
  const center = (sx + sy) / 2;
  const radius = Math.hypot((sx - sy) / 2, tau);
  if (radius < 1e-9 * Math.max(1, Math.abs(center))) return { ok: false, code: 'refused', reason: 'a hydrostatic stress state has no Mohr circle (it is a point)' };
  const unit = /[A-Za-zµμ][A-Za-z0-9µμ/^._-]*\s*$/.exec(specGet(spec, 'sigma') ?? specGet(spec, 'sx') ?? '')?.[0].trim();
  const textH = measureText('0', FONT_MIN).h;
  const textW = (text: string) => measureText(text, FONT_MIN).w;
  const nominal = frameSize(ctx.profile);
  const lo = Math.min(0, center - radius);
  const hi = Math.max(0, center + radius);
  // The σ range spans the nominal drawing width; the margins hold the widest label, so the frame grows with them.
  const widest = Math.max(...[`A (${sig3(sx)}, ${sig3(tau)})`, `B (${sig3(sy)}, ${sig3(-tau)})`, `σ1 = ${sig3(center + radius)}`, `σ2 = ${sig3(center - radius)}`].map(textW));
  const side = widest + 20;
  const scale = (nominal.w - 116) / (hi - lo);
  const width = Math.max(nominal.w, (hi - lo) * scale + 2 * side);
  const height = Math.max(nominal.h, 2 * radius * scale + 2 * (2 * textH + 24));
  const b = new SceneBuilder('mohr', width, height);
  b.hl(spec.highlight);
  const x0 = (width - (hi - lo) * scale) / 2 - lo * scale;
  const cy = height / 2;
  const at = (s: number, t: number) => ({ x: x0 + s * scale, y: cy + t * scale });
  const c = at(center, 0);
  const r = radius * scale;
  b.line('sigma-axis', 12, cy, width - 12, cy, { role: 'axis', markerEnd: true });
  b.line('tau-axis', x0, 10, x0, height - 10, { role: 'axis', markerEnd: true });
  const sigmaText = unit ? `σ (${unit})` : 'σ';
  const taken: Array<{ x1: number; y1: number; x2: number; y2: number }> = [];
  const fixed = (id: string, text: string, x: number, y: number) => {
    b.label(id, text, x, y, { protected: true });
    taken.push({ x1: x - textW(text) / 2, y1: y - textH / 2, x2: x + textW(text) / 2, y2: y + textH / 2 });
  };
  fixed('sigma-label', sigmaText, width - 12 - textW(sigmaText) / 2, cy - 5 - textH / 2);
  fixed('tau-label', 'τ', x0 + 6 + textW('τ') / 2, height - 12 - textH / 2);
  b.circle('mohr-circle', c.x, c.y, r, { color: 'accent', role: 'geometry' });
  const pa = at(sx, tau);
  const pb = at(sy, -tau);
  const s1 = at(center + radius, 0);
  const s2 = at(center - radius, 0);
  const low = at(center, radius);
  b.line('mohr-diameter', pa.x, pa.y, pb.x, pb.y, { color: 'muted', role: 'guide', width: 1 });
  b.circle('state-a', pa.x, pa.y, 3, { color: 'danger', role: 'annotation', fill: 'ink' });
  b.circle('state-b', pb.x, pb.y, 3, { color: 'danger', role: 'annotation', fill: 'ink' });
  for (const [id, p] of [['centre', c], ['sigma-1', s1], ['sigma-2', s2], ['tau-max', low]] as const) b.circle(id, p.x, p.y, 2.5, { role: 'annotation', fill: 'ink' });

  // Each label takes the first of its preferred directions whose box clears both axes, the circle's ring and the
  // labels already placed.
  const clear = (box: { x1: number; y1: number; x2: number; y2: number }) => {
    const nearest = Math.hypot(Math.min(Math.max(c.x, box.x1), box.x2) - c.x, Math.min(Math.max(c.y, box.y1), box.y2) - c.y);
    const farthest = Math.max(...[[box.x1, box.y1], [box.x2, box.y1], [box.x1, box.y2], [box.x2, box.y2]].map(([x, y]) => Math.hypot(x! - c.x, y! - c.y)));
    return !segMeetsRect({ x1: pa.x, y1: pa.y, x2: pb.x, y2: pb.y }, box) && !(box.y1 < cy + 2 && box.y2 > cy - 2) && !(box.x1 < x0 + 2 && box.x2 > x0 - 2) && !(nearest < r + 2 && farthest > r - 2) &&
      box.x1 >= 4 && box.x2 <= width - 4 && box.y1 >= 4 && box.y2 <= height - 4 &&
      !taken.some((t) => boxesOverlap(t, box, 2));
  };
  const place = (id: string, text: string, p: { x: number; y: number }, angles: number[], anchorId: string): boolean => {
    for (const [angle, gap] of [6, 18, 30, 42, 54].flatMap((g) => angles.map((a) => [a, g] as const))) {
      const box = rectBeyond(p.x, p.y, { x: Math.cos((angle * Math.PI) / 180), y: Math.sin((angle * Math.PI) / 180) }, gap, text);
      if (!clear(box)) continue;
      taken.push(box);
      b.label(id, text, (box.x1 + box.x2) / 2, (box.y1 + box.y2) / 2, { protected: true, anchorId });
      return true;
    }
    return false;
  };
  const around = (p: { x: number; y: number }, spread: number) => {
    const out = (Math.atan2(p.y - c.y, p.x - c.x) * 180) / Math.PI;
    return [0, 20, -20, 40, -40, 60, -60, 80, -80].filter((d) => Math.abs(d) <= spread).map((d) => out + d);
  };
  const labels: Array<[string, string, { x: number; y: number }, number[], string]> = [
    ['state-a-label', `A (${sig3(sx)}, ${sig3(tau)})`, pa, around(pa, 80), 'state-a'],
    ['state-b-label', `B (${sig3(sy)}, ${sig3(-tau)})`, pb, around(pb, 80), 'state-b'],
    ['sigma-1-label', `σ1 = ${sig3(center + radius)}`, s1, [-45, 45, -60, 60, -135, 135], 'sigma-1'],
    ['sigma-2-label', `σ2 = ${sig3(center - radius)}`, s2, [-135, 135, -120, 120, -45, 45], 'sigma-2'],
    ['tau-max-label', `τmax = ${sig3(radius)}`, low, [90, 60, 120, 30, 150, 0, 180], 'tau-max'],
    ['centre-label', 'C', c, [45, 135, -45, -135, 90, -90], 'centre'],
  ];
  const stuck = labels.find(([id, text, p, angles, anchor]) => !place(id, text, p, angles, anchor));
  if (stuck) return { ok: false, code: 'refused', reason: `mohr label ${stuck[1]} cannot be placed clear of the circle and axes` };
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
