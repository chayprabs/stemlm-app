import { FONT_MIN, type CompileCtx, type CompileResult } from '../types';
import { boxesOverlap, measureText, type Box } from '../geom';
import { parseCsv, specGet, specGetAll, specHasEmptyDeclaration, specHasEmptyDelimitedValue, specList, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

type NodeDecl = { id: string; role: string; detail: string };
type EdgeDecl = { from: string; to: string; relation: string; rest: string[]; attrs: Map<string, string> };
type LabelDecl = { text: string; target: string };

function frame(family: string, ctx: CompileCtx, spec: SpecDoc): SceneBuilder {
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder(family, w, h);
  b.hl(spec.highlight);
  return b;
}

function fail(reason: string, code: 'malformed' | 'refused' = 'malformed'): CompileResult {
  return { ok: false, code, reason };
}

function words(value: string): string[] {
  return value.trim().split(/\s+/).filter(Boolean);
}

function hasEmptyItems(spec: SpecDoc, ...keys: string[]): boolean {
  return keys.some((key) => specHasEmptyDelimitedValue(spec, key));
}

function idKey(id: string): string {
  return id.toLowerCase();
}

function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_.-]+/g, '-');
}

function nodeDecls(spec: SpecDoc): NodeDecl[] | CompileResult {
  if (specHasEmptyDeclaration(spec, 'node')) return fail('malformed-node-declaration');
  const nodes: NodeDecl[] = [];
  const seen = new Set<string>();
  for (const [index, value] of specGetAll(spec, 'node').entries()) {
    const [id = '', role = '', ...rest] = words(value);
    if (!id || !role) return fail(`malformed-node-declaration:${index + 1}`);
    if (seen.has(idKey(id))) return fail(`duplicate-node-declaration:${id}`);
    seen.add(idKey(id));
    nodes.push({ id, role, detail: rest.join(' ') });
  }
  return nodes;
}

function edgeDecls(spec: SpecDoc): EdgeDecl[] | CompileResult {
  if (specHasEmptyDeclaration(spec, 'edge')) return fail('malformed-edge-declaration');
  const edges: EdgeDecl[] = [];
  for (const [index, value] of specGetAll(spec, 'edge').entries()) {
    const [from = '', to = '', relation = '', ...rest] = words(value);
    if (!from || !to || !relation) return fail(`malformed-edge-declaration:${index + 1}`);
    const attrs = new Map<string, string>();
    for (const token of rest) {
      const split = token.indexOf('=');
      if (split === 0 || split === token.length - 1) return fail(`malformed-edge-attribute:${index + 1}`);
      if (split > 0) attrs.set(token.slice(0, split).toLowerCase(), token.slice(split + 1));
    }
    edges.push({ from, to, relation, rest, attrs });
  }
  return edges;
}

function labelDecls(spec: SpecDoc): LabelDecl[] | null {
  if (specHasEmptyDeclaration(spec, 'label')) return null;
  const labels: LabelDecl[] = [];
  const seen = new Set<string>();
  for (const value of specGetAll(spec, 'label')) {
    const match = /^(.*?)\s+attaches=([^\s]+)\s*$/.exec(value.trim());
    if (!match || !match[1]!.trim() || !match[2]!.trim()) return null;
    const text = match[1]!.trim();
    const target = match[2]!.trim();
    const key = `${idKey(target)}\u0000${text.toLowerCase()}`;
    if (seen.has(key)) return null;
    seen.add(key);
    labels.push({ text, target });
  }
  return labels;
}

function orderIds(spec: SpecDoc): { ids: string[]; invalid: boolean } {
  if (specHasEmptyDeclaration(spec, 'order')) return { ids: [], invalid: true };
  const raw = specGet(spec, 'order');
  if (raw === undefined) return { ids: [], invalid: false };
  const segments = raw.split(/\s*->\s*/);
  return { ids: segments.map((id) => id.trim()), invalid: segments.some((id) => !id.trim()) };
}

function validateClosedOrder(order: string[], known: Set<string>, reason = 'cycle-not-closed'): string | null {
  if (order.length < 3 || idKey(order[0]!) !== idKey(order[order.length - 1]!)) return reason;
  const interior = order.slice(0, -1).map(idKey);
  if (new Set(interior).size !== interior.length) return 'invalid-panel-order';
  if (interior.some((id) => !known.has(id))) return 'invalid-panel-order';
  return null;
}

type Pt = { x: number; y: number };
type Radii = { rx: number; ry: number };

/** An ellipse (a circle for short names) that holds its name at the minimum font. */
function nodeRadii(text: string): Radii {
  const { w, h } = measureText(text, FONT_MIN);
  const ry = h / 2 + 5;
  return { rx: Math.max(ry, w / 2 / Math.sqrt(1 - (h / 2 / ry) ** 2) + 2), ry };
}

/** Distance from an ellipse's centre to its boundary along the unit direction u. */
function reach(r: Radii, u: Pt): number {
  return 1 / Math.hypot(u.x / r.rx, u.y / r.ry);
}

function unit(from: Pt, to: Pt): Pt {
  const d = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / d, y: (to.y - from.y) / d };
}

interface Step { from: string; to: string; id: string; text: string | false }
interface Arrow { step: Step; start: Pt; control: Pt; end: Pt; label?: Box }
interface RingDrawing { centres: Map<string, Pt>; arrows: Arrow[]; bounds: Box }

function curveAt(a: Arrow, t: number): Pt {
  const u = 1 - t;
  return { x: u * u * a.start.x + 2 * u * t * a.control.x + t * t * a.end.x, y: u * u * a.start.y + 2 * u * t * a.control.y + t * t * a.end.y };
}

/**
 * States on an ellipse in cycle order (first at the top; two states side by side), extra states just outside the
 * state they branch from. Each step is a quadratic arrow bowed to its left — outward on the clockwise ring, so A→B
 * and B→A separate — with its name just beyond the bow. The ring grows until no state, name or arrow crowds another.
 */
function ringDrawing(ring: string[], extras: Map<string, string>, radii: Map<string, Radii>, steps: Step[]): RingDrawing | null {
  const r = (id: string) => radii.get(idKey(id))!;
  for (let scale = 1; scale < 8; scale *= 1.08) {
    const ry = 40 * scale;
    const rx = ry * 1.7;
    const first = ring.length === 2 ? Math.PI : -Math.PI / 2;
    const centres = new Map<string, Pt>(ring.map((id, i) => {
      const angle = first + (i * 2 * Math.PI) / ring.length;
      return [idKey(id), { x: rx * Math.cos(angle), y: ry * Math.sin(angle) }];
    }));
    for (const [extra, partner] of extras) {
      const at = centres.get(idKey(partner))!;
      const u = unit({ x: 0, y: 0 }, at);
      const distance = reach(r(partner), u) + 36 + reach(r(extra), u);
      centres.set(idKey(extra), { x: at.x + u.x * distance, y: at.y + u.y * distance });
    }
    const arrows: Arrow[] = steps.map((step) => {
      const a = centres.get(idKey(step.from))!;
      const b = centres.get(idKey(step.to))!;
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      const left = { x: (b.y - a.y) / d, y: -(b.x - a.x) / d };
      const control = { x: (a.x + b.x) / 2 + left.x * d * 0.25, y: (a.y + b.y) / 2 + left.y * d * 0.25 };
      const out = unit(a, control);
      const into = unit(b, control);
      const arrow: Arrow = {
        step,
        control,
        start: { x: a.x + out.x * (reach(r(step.from), out) + 3), y: a.y + out.y * (reach(r(step.from), out) + 3) },
        end: { x: b.x + into.x * (reach(r(step.to), into) + 3), y: b.y + into.y * (reach(r(step.to), into) + 3) },
      };
      if (step.text !== false) {
        const { w, h } = measureText(step.text, FONT_MIN);
        const mid = curveAt(arrow, 0.5);
        const offset = 4 + Math.abs(left.x) * w / 2 + Math.abs(left.y) * h / 2;
        const cx = mid.x + left.x * offset;
        const cy = mid.y + left.y * offset;
        arrow.label = { x1: cx - w / 2, y1: cy - h / 2, x2: cx + w / 2, y2: cy + h / 2 };
      }
      return arrow;
    });
    const ids = [...centres.keys()];
    const nodeBox = (id: string): Box => {
      const c = centres.get(id)!;
      const { rx: nx, ry: ny } = radii.get(id)!;
      return { x1: c.x - nx, y1: c.y - ny, x2: c.x + nx, y2: c.y + ny };
    };
    const inside = (p: Pt, id: string, margin: number) => {
      const c = centres.get(id)!;
      const { rx: nx, ry: ny } = radii.get(id)!;
      return ((p.x - c.x) / (nx + margin)) ** 2 + ((p.y - c.y) / (ny + margin)) ** 2 < 1;
    };
    const labels = arrows.flatMap((arrow) => (arrow.label ? [arrow.label] : []));
    const crowded =
      ids.some((a, i) => ids.slice(i + 1).some((b) => {
        const u = unit(centres.get(a)!, centres.get(b)!);
        const gap = Math.hypot(centres.get(b)!.x - centres.get(a)!.x, centres.get(b)!.y - centres.get(a)!.y) - reach(radii.get(a)!, u) - reach(radii.get(b)!, u);
        return gap < 16;
      })) ||
      arrows.some((arrow) => Math.hypot(arrow.end.x - arrow.start.x, arrow.end.y - arrow.start.y) < 24) ||
      arrows.some((arrow) => ids.some((id) => id !== idKey(arrow.step.from) && id !== idKey(arrow.step.to) &&
        Array.from({ length: 19 }, (_, k) => curveAt(arrow, (k + 1) / 20)).some((p) => inside(p, id, 3)))) ||
      labels.some((label, i) => ids.some((id) => boxesOverlap(label, nodeBox(id), 2)) || labels.slice(i + 1).some((other) => boxesOverlap(label, other, 2))) ||
      arrows.some((arrow) => arrow.label && arrows.some((other) => other !== arrow &&
        Array.from({ length: 21 }, (_, k) => curveAt(other, k / 20)).some((p) => p.x > arrow.label!.x1 - 2 && p.x < arrow.label!.x2 + 2 && p.y > arrow.label!.y1 - 2 && p.y < arrow.label!.y2 + 2)));
    if (crowded) continue;
    const boxes = [...ids.map(nodeBox), ...labels];
    const curves = arrows.flatMap((arrow) => [curveAt(arrow, 0.5), arrow.start, arrow.end]);
    const bounds = {
      x1: Math.min(...boxes.map((b) => b.x1), ...curves.map((p) => p.x)),
      y1: Math.min(...boxes.map((b) => b.y1), ...curves.map((p) => p.y)),
      x2: Math.max(...boxes.map((b) => b.x2), ...curves.map((p) => p.x)),
      y2: Math.max(...boxes.map((b) => b.y2), ...curves.map((p) => p.y)),
    };
    return { centres, arrows, bounds };
  }
  return null;
}

function parseGroups(spec: SpecDoc): Map<string, string[]> | null {
  if (specHasEmptyDelimitedValue(spec, 'group')) return null;
  const groups = new Map<string, string[]>();
  for (const value of specGetAll(spec, 'group')) {
    const parts = words(value);
    const group = parts[0];
    const contains = parts.find((part) => part.toLowerCase().startsWith('contains='));
    if (!group || !contains) return null;
    const members = contains.slice('contains='.length).split(',').map((member) => member.trim()).filter(Boolean);
    if (!members.length) return null;
    if (new Set(members.map(idKey)).size !== members.length || groups.has(idKey(group))) return null;
    groups.set(idKey(group), members);
  }
  return groups;
}

function parseCellBranches(edges: EdgeDecl[], nodes: Map<string, NodeDecl>): Array<{ from: string; to: string; relation: string; epsilon: string; resistance: string; polarity?: string }> | CompileResult {
  const branches: Array<{ from: string; to: string; relation: string; epsilon: string; resistance: string; polarity?: string }> = [];
  for (const edge of edges) {
    if (idKey(edge.relation) !== 'source-branch' && idKey(edge.relation) !== 'equivalent-source') return fail(`unsupported-cell-relation:${edge.relation}`);
    if (!nodes.has(idKey(edge.from)) || !nodes.has(idKey(edge.to))) return fail(`missing-endpoint:${edge.from}->${edge.to}`);
    const positional = edge.rest.filter((part) => !part.includes('='));
    const epsilon = positional[0];
    const resistance = positional[1];
    const polarity = edge.attrs.get('polarity');
    if (!epsilon || !resistance) return fail(`missing-source-parameters:${edge.from}->${edge.to}`);
    if (polarity?.toLowerCase() === 'opposed' || polarity?.toLowerCase() === 'ambiguous') return fail('ambiguous-polarity:opposed');
    branches.push({ from: edge.from, to: edge.to, relation: edge.relation, epsilon, resistance, polarity });
  }
  return branches;
}

export function compileCellBio(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const kind = specGet(spec, 'kind')?.toLowerCase();
  if (kind === 'page') return fail('no-standalone-figure:page', 'refused');
  if (kind === 'periodic-grid') return fail('dense-grid-out-of-scope:periodic-grid', 'refused');
  if (kind !== 'parallel-source' && kind !== 'equivalent-source') return fail(`unsupported-cell-kind:${kind ?? 'missing'}`);

  const nodeDeclarations = nodeDecls(spec);
  if (!Array.isArray(nodeDeclarations)) return nodeDeclarations;
  const edgeDeclarations = edgeDecls(spec);
  if (!Array.isArray(edgeDeclarations)) return edgeDeclarations;
  const parsedOrder = orderIds(spec);
  if (parsedOrder.invalid) return fail('malformed-cell-order');
  let orderedNodes = nodeDeclarations;
  if (parsedOrder.ids.length) {
    const declared = new Map(nodeDeclarations.map((node) => [idKey(node.id), node]));
    const orderedIds = parsedOrder.ids.map(idKey);
    if (orderedIds.length !== nodeDeclarations.length || new Set(orderedIds).size !== orderedIds.length || orderedIds.some((id) => !declared.has(id))) {
      return fail('cell-order-must-list-each-terminal-once');
    }
    orderedNodes = orderedIds.map((id) => declared.get(id)!);
  }
  const nodes = new Map(orderedNodes.map((node) => [idKey(node.id), node]));
  const branches = parseCellBranches(edgeDeclarations, nodes);
  if (!Array.isArray(branches)) return branches;
  if (!branches.length) return fail('missing-source-branch');
  if (kind === 'equivalent-source' && branches.length !== 1) return fail('equivalent-source-requires-one-branch');
  if (kind === 'parallel-source' && branches.some((branch) => idKey(branch.relation) !== 'source-branch')) return fail('parallel-source-requires-source-branches');
  const second = [...nodes.values()][1];
  if (!second) return fail('cell-requires-labelled-terminal-pair');

  const labels = labelDecls(spec);
  if (!labels) return fail('malformed-label-attachment');
  const endpointIds = new Set(nodes.keys());
  const branchKeys = new Set(branches.map((_, index) => `cell-${index + 1}`));
  const anchors = new Set([...endpointIds, ...branchKeys, 'external-current', 'equivalent-source']);
  for (const label of labels) if (!anchors.has(idKey(label.target))) return fail(`unknown-label-attachment:${label.target}`);

  const b = frame('cell', ctx, spec);
  const ax = 38;
  const cx = b.width - 38;
  const terminalY = b.height / 2 + 12;
  const first = [...nodes.values()][0]!;
  b.node(first.id, ax - 5, terminalY - 5, 10, 10, `terminal-${safeId(first.role)}`);
  b.node(second.id, cx - 5, terminalY - 5, 10, 10, `terminal-${safeId(second.role)}`);
  b.circle('terminal-left', ax, terminalY, 5, { fill: 'none', color: 'accent' });
  b.circle('terminal-right', cx, terminalY, 5, { fill: 'none', color: 'accent' });
  b.label('terminal-left-label', first.id, ax, terminalY, { protected: true, anchorId: first.id });
  b.label('terminal-right-label', second.id, cx, terminalY, { protected: true, anchorId: second.id });

  const spacing = branches.length === 1 ? 0 : Math.min(20, 48 / branches.length);
  branches.forEach((branch, index) => {
    const id = branch.relation === 'equivalent-source' ? 'equivalent-source' : `cell-${index + 1}`;
    const y = terminalY + (index - (branches.length - 1) / 2) * spacing;
    const mid = (ax + cx) / 2;
    b.polyline(id, [ax, terminalY, ax + 28, terminalY, ax + 48, y, mid - 18, y, mid - 6, y - 10, mid + 6, y + 10, mid + 18, y, cx - 48, y, cx - 28, terminalY, cx, terminalY], {
      color: branch.relation === 'equivalent-source' ? 'accent' : 'neutral',
      role: 'connector',
      width: 2,
    });
    b.label(`${id}-epsilon`, branch.epsilon, mid - 22, y - 22, { anchorId: id, slot: 'N', priority: 'required' });
    b.label(`${id}-resistance`, branch.resistance, mid + 22, y + 22, { anchorId: id, slot: 'S', priority: 'required' });
    if (branch.polarity) b.label(`${id}-polarity`, branch.polarity, mid, y, { anchorId: id, priority: 'preferred' });
  });
  if (labels.some((label) => idKey(label.target) === 'external-current')) b.line('external-current', ax + 20, 24, cx - 20, 24, { markerEnd: true, color: 'accent', role: 'connector' });
  for (const label of labels) {
    const target = idKey(label.target);
    if (target === 'external-current') b.label(`label-${safeId(label.text)}`, label.text, b.width / 2, 24, { anchorId: 'external-current', slot: 'N', priority: 'preferred' });
    else if (target === 'equivalent-source' && !b.labels.some((existing) => existing.anchorId === 'equivalent-source' && existing.text === label.text)) {
      b.label(`label-${safeId(label.text)}`, label.text, b.width / 2, terminalY - 36, { anchorId: 'equivalent-source', slot: 'N', priority: 'preferred' });
    }
  }
  return layoutAndCompile(b.scene());
}

export function compileCycle(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const kind = specGet(spec, 'kind')?.toLowerCase();
  if (kind === 'page') return fail('no-standalone-figure:page', 'refused');
  if (kind === 'periodic-grid') return fail('dense-grid-out-of-scope:periodic-grid', 'refused');
  if (kind && !['directed-cycle', 'directed-weighted', 'phase-cycle'].includes(kind)) return fail(`unsupported-cycle-kind:${kind}`);
  const declarations = nodeDecls(spec);
  if (!Array.isArray(declarations)) return declarations;
  const declared = new Map(declarations.map((node) => [idKey(node.id), node]));
  const edges = edgeDecls(spec);
  if (!Array.isArray(edges)) return edges;
  if (kind === 'directed-weighted') {
    for (const edge of edges) {
      if (!declared.has(idKey(edge.from)) || !declared.has(idKey(edge.to))) {
        return fail(`missing-edge-endpoint:${edge.from}->${edge.to}`);
      }
    }
  }
  if (kind === 'directed-weighted' && edges.some((edge) => {
    const weight = edge.attrs.get('weight') ?? /^weight=(.+)$/i.exec(edge.relation)?.[1];
    return weight === undefined || !Number.isFinite(Number(weight));
  })) return fail('directed-weighted edges require numeric weights');
  const groups = parseGroups(spec);
  if (!groups) return fail('malformed-group');
  const groupedMembers = new Set([...groups.values()].flatMap((members) => members.map(idKey)));
  const seenEdges = new Set<string>();
  for (const edge of edges) {
    const key = `${idKey(edge.from)}->${idKey(edge.to)}`;
    if (seenEdges.has(key)) return fail(`duplicate-cycle-edge:${edge.from}->${edge.to}`);
    seenEdges.add(key);
  }
  let ids: string[];
  let order: string[];
  if (kind === 'directed-weighted') {
    ids = declarations.map((node) => node.id);
    if (!ids.length || !edges.length) return fail('weighted-cycle-requires-nodes-and-edges');
    order = ids;
  } else {
    ids = declarations.length ? declarations.map((node) => node.id) : parseCsv(specGet(spec, 'nodes') ?? specGet(spec, 'name') ?? '');
    const listed = orderIds(spec);
    if (listed.invalid) return fail('malformed-cycle-order');
    order = listed.ids.length ? listed.ids : (kind ? [] : parseCsv(specGet(spec, 'nodes') ?? ''));
    if (!order.length && ids.length) order = ids;
    if (!kind) {
      // A list of states is a cycle: close it. An explicit order must already be closed.
      if (!listed.ids.length && order.length > 1 && idKey(order[0]!) !== idKey(order.at(-1)!)) order = [...order, order[0]!];
      const error = validateClosedOrder(order, new Set(ids.map(idKey)));
      if (error) return fail(error);
      const steps = new Set(order.slice(0, -1).map((from, index) => idKey(from) + '->' + idKey(order[index + 1]!)));
      if (edges.some((edge) => !steps.has(idKey(edge.from) + '->' + idKey(edge.to)))) return fail('unrepresented-cycle-edge');
    }
    if (kind === 'directed-cycle' || kind === 'phase-cycle') {
      const error = validateClosedOrder(order, new Set(ids.map(idKey)));
      if (error) return fail(error);
      if (kind === 'directed-cycle' && new Set(order.slice(0, -1).map(idKey)).size !== ids.length) return fail('invalid-panel-order');
      if (kind === 'phase-cycle') {
        for (const [groupId, members] of groups) {
          if (!declared.has(groupId)) return fail(`unknown-group:${groupId}`);
          const unknownMember = members.find((member) => !declared.has(idKey(member)));
          if (unknownMember) return fail(`unknown-group-member:${unknownMember}`);
        }
        const ordered = new Set(order.slice(0, -1).map(idKey));
        const omitted = ids.find((id) => !ordered.has(idKey(id)) && !groupedMembers.has(idKey(id)) && !declared.get(idKey(id))?.role.toLowerCase().includes('branch'));
        if (omitted) return fail(`invalid-panel-order:omits-declared-phase:${omitted}`);
      }
      if (kind === 'directed-cycle') {
        const expectedEdges = new Set(order.slice(0, -1).map((from, index) => idKey(from) + '->' + idKey(order[index + 1]!)));
        if (edges.length !== expectedEdges.size || edges.some((edge) => !expectedEdges.has(idKey(edge.from) + '->' + idKey(edge.to)))) {
          return fail('unrepresented-cycle-edge');
        }
      }
    }
    if (!ids.length || order.length < 2) return fail('cycle-requires-explicit-states');
  }
  const labels = labelDecls(spec);
  if (!labels) return fail('malformed-label-attachment');
  const allIds = new Set([...ids.map(idKey), ...edges.flatMap((edge) => [idKey(edge.from), idKey(edge.to)])]);
  const graphIds = kind === 'phase-cycle' ? ids.filter((id) => !groupedMembers.has(idKey(id))) : ids;
  const ring = kind === 'directed-weighted' ? graphIds : order.slice(0, -1);
  const ringKeys = new Set(ring.map(idKey));
  const extras = new Map<string, string>();
  for (const id of graphIds.filter((candidate) => !ringKeys.has(idKey(candidate)))) {
    const edge = edges.find((e) => (idKey(e.to) === idKey(id) && ringKeys.has(idKey(e.from))) || (idKey(e.from) === idKey(id) && ringKeys.has(idKey(e.to))));
    if (!edge) return fail(`unplaced-cycle-node:${id}`);
    extras.set(id, idKey(edge.from) === idKey(id) ? edge.to : edge.from);
  }
  const steps: Step[] = [];
  if (kind === 'directed-weighted') {
    edges.forEach((edge, index) => steps.push({
      from: edge.from,
      to: edge.to,
      id: `edge-${safeId(edge.from)}-${safeId(edge.to)}-${index + 1}`,
      text: edge.attrs.get('weight') ? `weight=${edge.attrs.get('weight')}` : edge.relation,
    }));
  } else {
    for (let index = 0; index < order.length - 1; index++) {
      const from = order[index]!;
      const to = order[index + 1]!;
      const match = edges.find((edge) => idKey(edge.from) === idKey(from) && idKey(edge.to) === idKey(to));
      if (kind === 'directed-cycle' && !match && edges.length) return fail(`missing-cycle-edge:${from}->${to}`);
      steps.push({ from, to, id: `edge-${safeId(from)}-${safeId(to)}-${index + 1}`, text: match ? (match.attrs.get('label') ?? match.attrs.get('weight') ?? match.relation) : false });
    }
  }

  // Names are measured at the minimum font; the frame grows to the ring (presentation scales it), and a cycle too
  // large to read at that scale is refused rather than shrunk.
  const radii = new Map(graphIds.map((id) => [idKey(id), nodeRadii(id)]));
  const drawing = ringDrawing(ring, extras, radii, steps);
  if (!drawing) return fail('cycle is too crowded to draw legibly', 'refused');
  const textH = measureText('0', FONT_MIN).h;
  const name = specGet(spec, 'name');
  const margin = 8;
  const titleH = name ? textH + 8 : 0;
  const panelW = kind === 'phase-cycle' && groups.size ? 132 : 0;
  const panelsH = kind === 'phase-cycle' ? [...groups.values()].reduce((sum, members) => sum + 36 + members.length * 16, 0) : 0;
  const ringW = drawing.bounds.x2 - drawing.bounds.x1;
  const ringH = drawing.bounds.y2 - drawing.bounds.y1;
  const contentW = ringW + 2 * margin + panelW;
  const contentH = Math.max(ringH, panelsH) + 2 * margin + titleH;
  const nominal = frameSize(ctx.profile);
  if (contentW > 2 * nominal.w || contentH > 2.5 * nominal.h) return fail('cycle is too large to draw legibly', 'refused');
  const b = new SceneBuilder('cycle', Math.max(nominal.w, contentW), Math.max(nominal.h, contentH));
  b.hl(spec.highlight);
  const ox = (b.width - contentW) / 2 + margin - drawing.bounds.x1;
  const oy = (b.height - contentH) / 2 + margin + titleH - drawing.bounds.y1;
  const at = (p: Pt): Pt => ({ x: p.x + ox, y: p.y + oy });
  if (name) b.label('cycle-title', name, ox + (drawing.bounds.x1 + drawing.bounds.x2) / 2, oy + drawing.bounds.y1 - 4 - textH / 2, { protected: true });
  const positions = new Map<string, Pt>();
  for (const id of graphIds) {
    const c = at(drawing.centres.get(idKey(id))!);
    const { rx, ry } = radii.get(idKey(id))!;
    positions.set(idKey(id), c);
    b.node(id, c.x - rx, c.y - ry, 2 * rx, 2 * ry, `semantic-${safeId(declared.get(idKey(id))?.role ?? 'node')}`);
    if (rx === ry) b.circle(`node-${safeId(id)}`, c.x, c.y, rx, { fill: 'none', color: 'accent' });
    else b.ellipse(`node-${safeId(id)}`, c.x, c.y, rx, ry, { fill: 'none', color: 'accent' });
    b.label(`node-${safeId(id)}-label`, id, c.x, c.y, { protected: true, anchorId: id });
  }
  for (const arrow of drawing.arrows) {
    const [s, c, e] = [at(arrow.start), at(arrow.control), at(arrow.end)];
    b.path(arrow.step.id, `M ${s.x} ${s.y} Q ${c.x} ${c.y} ${e.x} ${e.y}`, { markerEnd: true, color: 'accent', role: 'connector' });
    if (arrow.label && arrow.step.text !== false) {
      b.label(`${arrow.step.id}-label`, arrow.step.text, ox + (arrow.label.x1 + arrow.label.x2) / 2, oy + (arrow.label.y1 + arrow.label.y2) / 2, { protected: true, anchorId: arrow.step.id });
    }
  }
  const anchors = new Set<string>([...allIds, ...groups.keys()]);
  if (kind === 'phase-cycle') {
    let panelY = (b.height - contentH) / 2 + margin + titleH;
    for (const [groupId, members] of groups) {
      if (!declared.has(groupId)) return fail(`unknown-group:${groupId}`);
      if (!positions.get(groupId)) return fail(`missing-group-position:${groupId}`);
      const panelId = `${safeId(declared.get(groupId)?.id ?? groupId)}-panel`;
      const panelH = 28 + members.length * 16;
      const panelX = ox + drawing.bounds.x2 + 12;
      b.panel(panelId, declared.get(groupId)?.role ?? 'grouped-states', panelX, panelY, 120, panelH);
      b.rect(`${panelId}-boundary`, panelX + 4, panelY + 4, 112, panelH - 8, { fill: 'none', color: 'muted', role: 'boundary' });
      for (const [index, member] of members.entries()) {
        const x = panelX + 60;
        const y = panelY + 18 + index * 16;
        b.label(`${safeId(groupId)}-member-${index + 1}`, member, x, y, { panelId, priority: 'required', protected: true });
        positions.set(idKey(member), { x, y });
      }
      for (const member of members) anchors.add(idKey(member));
      panelY += panelH + 8;
    }
    for (const edge of edges) {
      if (idKey(edge.relation) !== 'branch') return fail(`unsupported-phase-relation:${edge.relation}`);
      const from = positions.get(idKey(edge.from));
      const to = positions.get(idKey(edge.to));
      const fromR = radii.get(idKey(edge.from));
      const toR = radii.get(idKey(edge.to));
      if (!from || !to || !fromR || !toR) return fail(`missing-branch-endpoint:${edge.from}->${edge.to}`);
      const u = unit(from, to);
      const start = reach(fromR, u) + 3;
      const end = reach(toR, u) + 3;
      b.line(`branch-${safeId(edge.from)}-${safeId(edge.to)}`, from.x + u.x * start, from.y + u.y * start, to.x - u.x * end, to.y - u.y * end, { markerEnd: true, color: 'muted', role: 'connector', dash: true });
    }
  }
  if (kind === 'directed-weighted' && labels.some((label) => idKey(label.target) === 'negative-cycle')) {
    const centre = at({ x: 0, y: 0 });
    b.ellipse('negative-cycle', centre.x, centre.y, 38, 28, { color: 'danger', role: 'annotation' });
    anchors.add('negative-cycle');
  }
  for (const [index, label] of labels.entries()) {
    const target = idKey(label.target);
    if (!anchors.has(target)) return fail(`unknown-label-attachment:${label.target}`);
    const point = positions.get(target) ?? at({ x: 0, y: 0 });
    b.label(`attached-${index + 1}`, label.text, point.x, point.y, { anchorId: label.target, priority: 'preferred', slot: 'N' });
  }
  return layoutAndCompile(b.scene());
}

export function compileMembrane(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (specGet(spec, 'kind')?.toLowerCase() !== 'membrane-cycle') return fail('unsupported-membrane-kind');
  if (specHasEmptyDeclaration(spec, 'state')) return fail('malformed-membrane-state');
  const states: Array<{ id: string; role: string }> = [];
  for (const value of specGetAll(spec, 'state')) {
    const [id = '', ...role] = words(value);
    if (!id || !role.length) return fail('malformed-membrane-state');
    states.push({ id, role: role.join(' ') });
  }
  const byId = new Map(states.map((state) => [idKey(state.id), state]));
  const parsedOrder = orderIds(spec);
  if (parsedOrder.invalid) return fail('malformed-membrane-order');
  const order = parsedOrder.ids;
  if (states.length < 2 || order.length !== states.length + 1 || idKey(order[0]!) !== idKey(order[order.length - 1]!)) return fail('invalid-panel-order');
  const seen = new Set<string>();
  for (const id of order.slice(0, -1)) {
    if (!byId.has(idKey(id)) || seen.has(idKey(id))) return fail('invalid-panel-order');
    seen.add(idKey(id));
  }
  if (seen.size !== states.length) return fail('invalid-panel-order');
  const labels = labelDecls(spec);
  if (!labels) return fail('malformed-label-attachment');
  for (const label of labels) if (!byId.has(idKey(label.target))) return fail(`unknown-label-attachment:${label.target}`);
  const b = frame('membrane', ctx, spec);
  const rowCount = Math.ceil(states.length / 2);
  const panelW = Math.min(78, (b.width - 48) / rowCount);
  const top = 22;
  const bottom = b.height / 2 + 12;
  b.line('membrane-top', 18, b.height / 2 - 30, b.width - 18, b.height / 2 - 30, { color: 'muted', role: 'boundary', width: 2 });
  b.line('membrane-bottom', 18, b.height / 2 + 30, b.width - 18, b.height / 2 + 30, { color: 'muted', role: 'boundary', width: 2 });
  const positions = new Map<string, { x: number; y: number }>();
  order.slice(0, -1).forEach((id, index) => {
    const row = index < rowCount ? 0 : 1;
    const inRow = row === 0 ? index : states.length - 1 - index;
    const count = row === 0 ? rowCount : states.length - rowCount;
    const x = 24 + panelW / 2 + inRow * ((b.width - 48 - panelW) / Math.max(1, count - 1));
    const y = row === 0 ? top : bottom;
    const panelId = `state-${safeId(id)}`;
    positions.set(idKey(id), { x, y: y + 26 });
    b.panel(panelId, byId.get(idKey(id))!.role, x - panelW / 2, y, panelW, 52);
    b.rect(`${panelId}-body`, x - panelW / 2 + 4, y + 7, panelW - 8, 38, { fill: 'none', color: 'accent', role: 'boundary' });
    b.label(`${panelId}-label`, id, x, y + 26, { protected: true, panelId });
  });
  for (const label of labels) {
    const point = positions.get(idKey(label.target))!;
    b.label(`state-attachment-${safeId(label.target)}-${safeId(label.text)}`, label.text, point.x, point.y, { anchorId: `state-${safeId(label.target)}`, slot: 'S', priority: 'preferred' });
  }
  if (specHasEmptyDeclaration(spec, 'direction')) return fail('empty-membrane-direction');
  const directions = specGetAll(spec, 'direction').map((direction) => direction.trim());
  const seenDirections = new Set<string>();
  for (const direction of directions) {
    const key = direction.toLowerCase();
    if (seenDirections.has(key)) return fail('duplicate-membrane-direction');
    seenDirections.add(key);
  }
  directions.forEach((direction, index) => {
    const x = b.width * ((index + 1) / (directions.length + 1));
    b.label(`direction-${index + 1}`, direction.trim(), x, 12, { priority: 'required', slot: 'N' });
  });
  return layoutAndCompile(b.scene());
}

export function compileAnatomy(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const kind = specGet(spec, 'kind')?.toLowerCase();
  const organ = specGet(spec, 'organ');
  const nodes = nodeDecls(spec);
  if (!Array.isArray(nodes)) return nodes;
  const byId = new Map(nodes.map((node) => [idKey(node.id), node]));
  const edges = edgeDecls(spec);
  if (!Array.isArray(edges)) return edges;
  const labels = labelDecls(spec);
  if (!labels) return fail('malformed-label-attachment');
  if (kind === 'conic') {
    const conicEdges = edges;
    if (conicEdges.some((edge) => idKey(edge.relation) === 'lies-on' && idKey(edge.from).includes('focus') && idKey(edge.to).includes('directrix'))) return fail('invalid-conic-relation:focus-on-directrix');
    const findRole = (term: string) => nodes.find((node) => node.role.toLowerCase().includes(term) || node.id.toLowerCase().includes(term));
    const locus = findRole('locus');
    const axis = findRole('axis');
    const directrix = findRole('directrix');
    const vertex = findRole('vertex');
    const focus = findRole('focus');
    if (!locus || !axis || !directrix || !vertex || !focus) return fail('conic-requires-locus-axis-directrix-vertex-focus');
    const requiredNodes = new Set([locus, axis, directrix, vertex, focus].map((node) => idKey(node.id)));
    if (requiredNodes.size !== 5) return fail('conic-requires-distinct-locus-axis-directrix-vertex-focus');
    if (nodes.length !== requiredNodes.size || nodes.some((node) => !requiredNodes.has(idKey(node.id)))) return fail('unrepresented-conic-node');
    const representedEdges = new Set([
      `${idKey(locus.id)}->${idKey(axis.id)}:symmetric-about`,
      `${idKey(vertex.id)}->${idKey(axis.id)}:lies-on`,
      `${idKey(focus.id)}->${idKey(axis.id)}:lies-on`,
    ]);
    const seenConicEdges = new Set<string>();
    for (const edge of conicEdges) {
      const edgeKey = `${idKey(edge.from)}->${idKey(edge.to)}:${idKey(edge.relation)}`;
      if (!representedEdges.has(edgeKey)) return fail('unrepresented-conic-edge');
      if (seenConicEdges.has(edgeKey)) return fail('duplicate-conic-edge');
      seenConicEdges.add(edgeKey);
      if (!byId.has(idKey(edge.from)) || !byId.has(idKey(edge.to))) return fail(`missing-conic-endpoint:${edge.from}->${edge.to}`);
    }
    for (const label of labels) if (!byId.has(idKey(label.target))) return fail(`unknown-label-attachment:${label.target}`);
    const b = frame('anatomy', ctx, spec);
    const axisX = b.width * 0.29;
    const axisY = b.height / 2;
    const vertexPoint = { x: axisX, y: axisY };
    const focusPoint = { x: b.width * 0.53, y: axisY };
    const arm = Math.min(b.width * 0.36, 110);
    b.path(locus.id, `M ${axisX + arm} 28 Q ${axisX} ${axisY - 46} ${axisX} ${axisY} Q ${axisX} ${axisY + 46} ${axisX + arm} ${b.height - 28}`, { color: 'accent', role: 'geometry', width: 2 });
    b.line(axis.id, 20, axisY, b.width - 18, axisY, { color: 'muted', role: 'axis', markerEnd: true });
    b.line(directrix.id, axisX - 28, 18, axisX - 28, b.height - 18, { color: 'neutral', role: 'geometry' });
    b.circle(vertex.id, vertexPoint.x, vertexPoint.y, 4, { fill: 'ink', color: 'accent' });
    b.circle(focus.id, focusPoint.x, focusPoint.y, 4, { fill: 'ink', color: 'accent' });
    b.node(vertex.id, vertexPoint.x - 4, vertexPoint.y - 4, 8, 8, 'point');
    b.node(focus.id, focusPoint.x - 4, focusPoint.y - 4, 8, 8, 'point');
    const points = new Map<string, { x: number; y: number }>([
      [idKey(vertex.id), vertexPoint],
      [idKey(focus.id), focusPoint],
      [idKey(directrix.id), { x: axisX - 28, y: 28 }],
      [idKey(axis.id), { x: b.width * 0.72, y: axisY }],
      [idKey(locus.id), { x: axisX + 28, y: 40 }],
    ]);
    if (organ) b.label('organ-label', organ, b.width / 2, 12, { protected: true, priority: 'required', slot: 'N' });
    for (const label of labels) {
      const point = points.get(idKey(label.target));
      if (!point) return fail(`unknown-label-attachment:${label.target}`);
      b.label(`anatomy-label-${safeId(label.target)}`, label.text, point.x, point.y, { anchorId: label.target, slot: label.target.toLowerCase() === directrix.id.toLowerCase() ? 'W' : 'E', priority: 'required' });
    }
    return layoutAndCompile(b.scene());
  }
  if (kind === 'paired-apparatus') {
    const groups = parseGroups(spec);
    if (!groups || groups.size < 2) return fail('paired-apparatus-requires-compared-groups');
    if (!edges.some((edge) => idKey(edge.relation) === 'compares')) return fail('paired-apparatus-requires-compares-relation');
    if (edges.some((edge) => idKey(edge.relation) !== 'compares')) return fail('unsupported-paired-apparatus-edge');
    const b = frame('anatomy', ctx, spec);
    const groupEntries = [...groups.entries()];
    const panelGap = 8;
    const panelPadding = 12;
    const minimumPanelWidth = 72;
    const maximumGroups = Math.floor((b.width - panelPadding * 2 + panelGap) / (minimumPanelWidth + panelGap));
    if (groupEntries.length > maximumGroups) return fail(`paired-apparatus-too-many-groups:${groupEntries.length}`, 'refused');
    const panelW = (b.width - panelPadding * 2 - panelGap * (groupEntries.length - 1)) / groupEntries.length;
    if (panelW < minimumPanelWidth) return fail('paired-apparatus-groups-do-not-fit', 'refused');
    const anchors = new Set<string>();
    const groupedNodes = new Set<string>();
    for (const [index, [groupId, members]] of groupEntries.entries()) {
      const x = panelPadding + panelW / 2 + index * (panelW + panelGap);
      const panelId = `${safeId(groupId)}-panel`;
      const panelY = 30;
      const panelH = b.height - 60;
      b.panel(panelId, 'compared-view', x - panelW / 2, panelY, panelW, panelH);
      b.rect(`${panelId}-boundary`, x - panelW / 2 + 4, panelY + 4, panelW - 8, panelH - 8, { fill: 'none', color: 'muted', role: 'boundary' });
      for (const [memberIndex, member] of members.entries()) {
        const node = byId.get(idKey(member));
        if (!node) return fail(`unknown-group-member:${member}`);
        if (groupedNodes.has(idKey(member))) return fail(`duplicate-paired-node:${member}`);
        groupedNodes.add(idKey(member));
        anchors.add(idKey(member));
        const y = panelY + 28 + memberIndex * ((panelH - 44) / Math.max(1, members.length - 1));
        b.node(member, x - 24, y - 12, 48, 24, 'paired-part');
        if (node.role.toLowerCase().includes('pore')) b.circle(member, x, y, 7, { fill: 'none', color: 'accent' });
        else b.ellipse(member, x, y, 30, 12, { fill: 'none', color: 'accent' });
        const displayRole = node.role.replace(/^paired-/, '');
        b.label(`${safeId(member)}-label`, displayRole, x, y - 20, { protected: true, anchorId: member, panelId });
      }
    }
    if ([...byId.keys()].some((nodeId) => !groupedNodes.has(nodeId))) return fail('unlisted-paired-node');
    for (const edge of edges) if (idKey(edge.relation) === 'compares' && (!groups.has(idKey(edge.from)) || !groups.has(idKey(edge.to)))) return fail(`missing-compared-group:${edge.from}->${edge.to}`);
    for (const label of labels) {
      if (!anchors.has(idKey(label.target))) return fail(`unknown-label-attachment:${label.target}`);
      const groupIndex = groupEntries.findIndex(([, members]) => members.some((member) => idKey(member) === idKey(label.target)));
      const x = panelPadding + panelW / 2 + groupIndex * (panelW + panelGap);
      b.label(`paired-attachment-${safeId(label.target)}`, label.text, x, b.height - 18, { anchorId: label.target, slot: 'S', priority: 'preferred' });
    }
    return layoutAndCompile(b.scene());
  }
  if (organ && !nodes.length && !edges.length && !labels.length) {
    const b = frame('anatomy', ctx, spec);
    b.ellipse('organ', b.width / 2, b.height / 2, b.width * 0.28, b.height * 0.27, { fill: 'none', color: 'accent' });
    b.label('organ-label', organ, b.width / 2, b.height / 2, { protected: true, anchorId: 'organ' });
    return layoutAndCompile(b.scene());
  }
  return fail(`unsupported-anatomy-kind:${kind ?? 'missing'}`);
}

export function compileGel(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const laneValues = specList(spec, 'lanes');
  const bandValues = specGetAll(spec, 'band');
  const plural = specList(spec, 'bands');
  if (hasEmptyItems(spec, 'lanes') || specHasEmptyDeclaration(spec, 'band') || hasEmptyItems(spec, 'bands')) return fail('gel contains an empty lane or band declaration');
  if (!laneValues.length && !bandValues.length && !plural.length) return fail('gel-requires-explicit-lanes-or-bands');
  const lanes = laneValues.flatMap((value) => parseCsv(value));
  if (!lanes.length || new Set(lanes.map(idKey)).size !== lanes.length) return fail('gel requires unique explicit lanes');
  const declarations = [...bandValues, ...plural.flatMap(value => value.split(',').map(item => item.replace(':', ' ')))];
  const bands: { lane: number; size: number; label: string; unit: string }[] = [];
  for (const declaration of declarations) {
    const match = /^(\S+)\s+(\d+(?:\.\d+)?)(?:\s*(bp|kb|kDa))?$/.exec(declaration.trim());
    if (!match || Number(match[2]) <= 0 || !Number.isFinite(Number(match[2]))) return fail('gel band requires lane and positive fragment size');
    const lane = lanes.findIndex(candidate => idKey(candidate) === idKey(match[1]!));
    if (lane < 0) return fail(`unknown-gel-lane:${match[1]}`);
    const unit = match[3] ?? '';
    bands.push({ lane, size: Number(match[2]) * (unit === 'kb' ? 1000 : 1), label: `${match[2]}${unit ? ' ' + unit : ''}`, unit });
  }
  if (bands.some(band => band.unit === 'kDa') && bands.some(band => band.unit !== 'kDa')) return fail('gel cannot mix protein and DNA fragment units');
  const sizes = [...new Set(bands.map(band => band.size))].sort((a, b) => b - a);
  const b = frame('gel', ctx, spec);
  const lanePitch = (b.width - 40) / lanes.length;
  const laneW = Math.min(32, lanePitch);
  const laneX = (index: number) => 20 + lanePitch * (index + 0.35);
  lanes.forEach((lane, index) => {
    const x = laneX(index);
    const id = `lane-${safeId(lane)}`;
    b.rect(id, x - laneW / 2 + 2, 24, laneW - 4, b.height - 52, { fill: 'none', role: 'boundary' });
    b.label(`${id}-label`, lane, x, b.height - 16, { protected: true, anchorId: id });
  });
  for (const [index, band] of bands.entries()) {
    // Equal sizes share a row; smaller fragments migrate farther. Without a
    // calibration this is explicitly an ordered schematic, not a distance fit.
    const y = 42 + (sizes.indexOf(band.size) + 1) * ((b.height - 78) / (sizes.length + 1));
    const id = `band-${index + 1}`;
    b.line(id, laneX(band.lane) - 8, y, laneX(band.lane) + 8, y, { color: 'accent', width: 3, role: 'annotation' });
    b.label(`${id}-label`, band.label, laneX(band.lane) + 11, y, { anchorId: id, priority: 'required', slot: 'E' });
  }
  return layoutAndCompile(b.scene());
}

export function compileOperon(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const promoter = specGet(spec, 'promoter');
  const operator = specGet(spec, 'operator');
  const genes = specList(spec, 'gene').flatMap((value) => parseCsv(value));
  if (specHasEmptyDeclaration(spec, 'gene') || specHasEmptyDelimitedValue(spec, 'gene')) return fail('operon contains an empty gene declaration');
  if (!promoter || !operator) return fail('operon-requires-promoter-and-operator');
  const items = [{ id: 'promoter', text: promoter }, { id: 'operator', text: operator }, ...genes.map((text, index) => ({ id: `gene-${index + 1}`, text }))];
  const b = frame('operon', ctx, spec);
  const left = 20;
  const unit = (b.width - 40) / items.length;
  b.line('dna', left, b.height / 2, b.width - left, b.height / 2, { width: 2.4, role: 'geometry' });
  items.forEach((item, index) => {
    const x = left + unit * (index + 0.5);
    b.rect(item.id, x - unit * 0.35, b.height / 2 - 13, unit * 0.7, 26, { fill: item.id === 'operator' ? 'ink' : 'none', color: item.id === 'operator' ? 'danger' : 'accent', role: 'boundary' });
    b.label(`${item.id}-label`, item.text, x, b.height / 2 - 25, { protected: true, anchorId: item.id, slot: 'N' });
  });
  return layoutAndCompile(b.scene());
}

export function compileNewick(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const source = specGet(spec, 'newick') ?? specGet(spec, 'tree');
  if (!source) return fail('newick-requires-explicit-tree');
  if (/[()]/.test(source)) return fail('unsupported-nested-newick', 'refused');
  if (source.split(/[,\s]+/).some((token) => !token.trim())) return fail('newick contains an empty leaf declaration');
  const tokens = source.replace(/[();]/g, '').split(/[,\s]+/).map((token) => token.trim()).filter(Boolean);
  if (tokens.length < 2) return fail('newick-tree-too-small');
  const b = frame('newick', ctx, spec);
  const rootX = 28;
  const leafX = b.width - 48;
  const spacing = (b.height - 36) / Math.max(1, tokens.length - 1);
  const rootY = b.height / 2;
  b.line('tree-root', rootX, rootY, rootX + 36, rootY, { role: 'connector' });
  tokens.forEach((token, index) => {
    const y = tokens.length === 1 ? rootY : 18 + index * spacing;
    b.line(`tree-${index + 1}-horizontal`, rootX + 36, rootY, leafX, y, { role: 'connector' });
    b.label(`tree-${index + 1}-label`, token, leafX, y, { protected: true, anchorId: `tree-${index + 1}`, slot: 'E' });
  });
  return layoutAndCompile(b.scene());
}

export function compileNeuron(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const kind = specGet(spec, 'kind');
  const dendrites = specList(spec, 'dendrite');
  const axon = specGet(spec, 'axon');
  if (hasEmptyItems(spec, 'dendrite') || specHasEmptyDeclaration(spec, 'axon')) return fail('neuron contains an empty process declaration');
  if (!kind || (!dendrites.length && !axon)) return fail('neuron-requires-explicit-dendrites-or-axon');
  const b = frame('neuron', ctx, spec);
  const somaX = b.width * 0.29;
  const somaY = b.height / 2;
  b.circle('soma', somaX, somaY, 18, { fill: 'none', color: 'accent' });
  if (axon) {
    b.line('axon', somaX + 18, somaY, b.width - 26, somaY, { markerEnd: true, role: 'connector' });
    b.label('axon-label', axon, b.width * 0.68, somaY, { anchorId: 'axon', slot: 'S', priority: 'preferred' });
  }
  dendrites.forEach((text, index) => {
    const y = 34 + index * ((b.height - 68) / Math.max(1, dendrites.length - 1));
    const id = `dendrite-${index + 1}`;
    b.line(id, somaX - 8, somaY, 28, y, { role: 'connector' });
    b.label(`${id}-label`, text, 28, y, { anchorId: id, slot: 'W', priority: 'preferred' });
  });
  return layoutAndCompile(b.scene());
}

export function compilePcr(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (hasEmptyItems(spec, 'cycle')) return fail('pcr contains an empty cycle stage');
  const stages = specList(spec, 'cycle').flatMap(parseCsv);
  if (!stages.length) return fail('pcr-requires-explicit-cycle-stages');
  const b = frame('pcr', ctx, spec);
  const gap = (b.width - 32) / stages.length;
  stages.forEach((stage, index) => {
    const x = 16 + index * gap;
    const id = `stage-${index + 1}`;
    b.rect(id, x + 4, 42, gap - 8, b.height - 70, { fill: 'none', role: 'boundary' });
    b.label(`${id}-label`, stage, x + gap / 2, 28, { protected: true, anchorId: id, slot: 'N' });
  });
  return layoutAndCompile(b.scene());
}

export function compileRama(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const kind = specGet(spec, 'kind')?.toLowerCase();
  if (kind && kind !== 'ramachandran') return fail(`unsupported-rama-kind:${kind}`);
  const points = specList(spec, 'point');
  if (hasEmptyItems(spec, 'point') || !points.length) return fail('rama-requires-explicit-points');
  const parsedPoints: Array<{ phi: number; psi: number }> = [];
  for (const [index, value] of points.entries()) {
    const fields = value.trim().split(/[,;\s]+/).filter(Boolean);
    const phi = Number(fields[0]);
    const psi = Number(fields[1]);
    if (fields.length !== 2 || !Number.isFinite(phi) || !Number.isFinite(psi)) return fail(`malformed-rama-point:${index + 1}`);
    parsedPoints.push({ phi, psi });
  }
  const b = frame('rama', ctx, spec);
  b.line('phi-axis', 38, b.height - 24, b.width - 18, b.height - 24, { markerEnd: true, role: 'axis' });
  b.line('psi-axis', 38, b.height - 24, 38, 20, { markerEnd: true, role: 'axis' });
  parsedPoints.forEach(({ phi, psi }, index) => {
    const x = 50 + ((phi + 180) / 360) * (b.width - 76);
    const y = b.height - 30 - ((psi + 180) / 360) * (b.height - 52);
    b.circle(`point-${index + 1}`, x, y, 4, { fill: 'ink', color: 'accent' });
  });
  if (!b.strokes.some((stroke) => stroke.id.startsWith('point-'))) return fail('rama-points-malformed');
  b.label('phi-label', 'φ', b.width / 2, b.height - 10, { protected: true });
  b.label('psi-label', 'ψ', 20, b.height / 2, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileDivision(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (hasEmptyItems(spec, 'phase')) return fail('division contains an empty phase declaration');
  const phases = specList(spec, 'phase').flatMap(parseCsv);
  if (!phases.length) return fail('division-requires-explicit-phases');
  const b = frame('division', ctx, spec);
  const gap = (b.width - 44) / phases.length;
  phases.forEach((phase, index) => {
    const x = 22 + gap * (index + 0.5);
    const id = `phase-${index + 1}`;
    b.circle(id, x, b.height / 2, 18, { fill: 'none', color: 'accent' });
    b.label(`${id}-label`, phase, x, b.height / 2, { protected: true, anchorId: id });
    if (index) b.line(`transition-${index}`, x - gap, b.height / 2, x - 18, b.height / 2, { markerEnd: true, role: 'connector' });
  });
  return layoutAndCompile(b.scene());
}
