import type { CompileCtx, CompileResult } from '../types';
import { parseCsv, specGet, specGetAll, specList, type SpecDoc } from '../spec';
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

function idKey(id: string): string {
  return id.toLowerCase();
}

function safeId(id: string): string {
  return id.replace(/[^A-Za-z0-9_.-]+/g, '-');
}

function nodeDecls(spec: SpecDoc): NodeDecl[] {
  return specGetAll(spec, 'node').map((value) => {
    const [id = '', role = '', ...rest] = words(value);
    return { id, role, detail: rest.join(' ') };
  }).filter((node) => node.id && node.role);
}

function edgeDecls(spec: SpecDoc): EdgeDecl[] {
  return specGetAll(spec, 'edge').map((value) => {
    const [from = '', to = '', relation = '', ...rest] = words(value);
    const attrs = new Map<string, string>();
    for (const token of rest) {
      const split = token.indexOf('=');
      if (split > 0) attrs.set(token.slice(0, split).toLowerCase(), token.slice(split + 1));
    }
    return { from, to, relation, rest, attrs };
  }).filter((edge) => edge.from && edge.to && edge.relation);
}

function labelDecls(spec: SpecDoc): LabelDecl[] | null {
  const labels: LabelDecl[] = [];
  for (const value of specGetAll(spec, 'label')) {
    const match = /^(.*?)\s+attaches=([^\s]+)\s*$/.exec(value.trim());
    if (!match || !match[1]!.trim() || !match[2]!.trim()) return null;
    labels.push({ text: match[1]!.trim(), target: match[2]!.trim() });
  }
  return labels;
}

function orderIds(spec: SpecDoc): string[] {
  return (specGet(spec, 'order') ?? '')
    .split(/\s*->\s*/)
    .map((id) => id.trim())
    .filter(Boolean);
}

function validateClosedOrder(order: string[], known: Set<string>, reason = 'cycle-not-closed'): string | null {
  if (order.length < 3 || idKey(order[0]!) !== idKey(order[order.length - 1]!)) return reason;
  const interior = order.slice(0, -1).map(idKey);
  if (new Set(interior).size !== interior.length) return 'invalid-panel-order';
  if (interior.some((id) => !known.has(id))) return 'invalid-panel-order';
  return null;
}

function addGraphNode(b: SceneBuilder, id: string, x: number, y: number, text = id, role = 'node'): void {
  b.node(id, x - 12, y - 12, 24, 24, `semantic-${safeId(role)}`);
  b.circle(`node-${safeId(id)}`, x, y, 12, { fill: 'none', color: 'accent' });
  b.label(`node-${safeId(id)}-label`, text, x, y, { protected: true, anchorId: id });
}

function graphPositions(ids: string[], width: number, height: number): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  const cx = width / 2;
  const cy = height / 2 + 4;
  const radiusX = Math.min(width * 0.36, 108);
  const radiusY = Math.min(height * 0.32, 50);
  ids.forEach((id, index) => {
    const angle = -Math.PI / 2 + (index * 2 * Math.PI) / Math.max(1, ids.length);
    positions.set(idKey(id), { x: cx + radiusX * Math.cos(angle), y: cy + radiusY * Math.sin(angle) });
  });
  return positions;
}

function insetEndpoint(point: { x: number; y: number }, toward: { x: number; y: number }, distance = 14): { x: number; y: number } {
  const dx = toward.x - point.x;
  const dy = toward.y - point.y;
  const length = Math.hypot(dx, dy);
  if (!length) return point;
  const inset = Math.min(distance, length / 3);
  return { x: point.x + (dx / length) * inset, y: point.y + (dy / length) * inset };
}

function drawDirectedEdge(
  b: SceneBuilder,
  edge: EdgeDecl,
  index: number,
  positions: Map<string, { x: number; y: number }>,
  labelText?: string | false,
): string | null {
  const from = positions.get(idKey(edge.from));
  const to = positions.get(idKey(edge.to));
  if (!from || !to) return null;
  const edgeId = `edge-${safeId(edge.from)}-${safeId(edge.to)}-${index + 1}`;
  const mx = (from.x + to.x) / 2;
  const my = (from.y + to.y) / 2;
  const bend = (index % 2) ? 10 : -10;
  const control = { x: mx + bend, y: my - bend };
  const start = insetEndpoint(from, control);
  const end = insetEndpoint(to, control);
  b.path(edgeId, `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`, {
    markerEnd: true,
    color: 'accent',
    role: 'connector',
  });
  if (labelText !== false) {
    b.label(`${edgeId}-label`, labelText ?? edge.relation, mx + bend, my - bend, {
      anchorId: edgeId,
      priority: labelText?.startsWith('weight=') ? 'required' : 'preferred',
    });
  }
  return edgeId;
}

function parseGroups(spec: SpecDoc): Map<string, string[]> | null {
  const groups = new Map<string, string[]>();
  for (const value of specGetAll(spec, 'group')) {
    const parts = words(value);
    const group = parts[0];
    const contains = parts.find((part) => part.toLowerCase().startsWith('contains='));
    if (!group || !contains) return null;
    const members = contains.slice('contains='.length).split(',').map((member) => member.trim()).filter(Boolean);
    if (!members.length) return null;
    groups.set(idKey(group), members);
  }
  return groups;
}

function parseCellBranches(spec: SpecDoc, nodes: Map<string, NodeDecl>): Array<{ from: string; to: string; relation: string; epsilon: string; resistance: string; polarity?: string }> | CompileResult {
  const branches: Array<{ from: string; to: string; relation: string; epsilon: string; resistance: string; polarity?: string }> = [];
  for (const edge of edgeDecls(spec)) {
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

  const nodes = new Map(nodeDecls(spec).map((node) => [idKey(node.id), node]));
  const branches = parseCellBranches(spec, nodes);
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
  const declarations = nodeDecls(spec);
  const declared = new Map(declarations.map((node) => [idKey(node.id), node]));
  const edges = edgeDecls(spec);
  let ids: string[];
  let order: string[];
  if (kind === 'directed-weighted') {
    ids = [...new Set([...declarations.map((node) => node.id), ...edges.flatMap((edge) => [edge.from, edge.to])])];
    if (!ids.length || !edges.length) return fail('weighted-cycle-requires-nodes-and-edges');
    order = ids;
  } else {
    ids = declarations.length ? declarations.map((node) => node.id) : parseCsv(specGet(spec, 'nodes') ?? specGet(spec, 'name') ?? '');
    const listed = orderIds(spec);
    order = listed.length ? listed : (kind ? [] : parseCsv(specGet(spec, 'nodes') ?? ''));
    if (!order.length && ids.length) order = ids;
    if (kind === 'directed-cycle' || kind === 'phase-cycle') {
      const error = validateClosedOrder(order, new Set(ids.map(idKey)));
      if (error) return fail(error);
      if (kind === 'directed-cycle' && new Set(order.slice(0, -1).map(idKey)).size !== ids.length) return fail('invalid-panel-order');
    }
    if (!ids.length || order.length < 2) return fail('cycle-requires-explicit-states');
  }
  const labels = labelDecls(spec);
  if (!labels) return fail('malformed-label-attachment');
  const groups = parseGroups(spec);
  if (!groups) return fail('malformed-group');
  const b = frame('cycle', ctx, spec);
  const allIds = new Set([...ids.map(idKey), ...edges.flatMap((edge) => [idKey(edge.from), idKey(edge.to)])]);
  const graphWidth = kind === 'phase-cycle' ? Math.min(b.width * 0.56, b.width - 132) : b.width;
  const positions = graphPositions(ids, graphWidth, b.height);
  for (const id of ids) {
    const point = positions.get(idKey(id));
    if (!point) return fail(`missing-node-position:${id}`);
    addGraphNode(b, id, point.x, point.y, id, declared.get(idKey(id))?.role ?? 'node');
  }
  const anchors = new Set<string>([...allIds, ...groups.keys()]);
  if (kind === 'phase-cycle') {
    for (const [groupId, members] of groups) {
      if (!declared.has(groupId)) return fail(`unknown-group:${groupId}`);
      const point = positions.get(groupId);
      if (!point) return fail(`missing-group-position:${groupId}`);
      const panelId = `${safeId(declared.get(groupId)?.id ?? groupId)}-panel`;
      const panelW = 120;
      const panelH = Math.min(b.height - 24, 28 + members.length * 16);
      const panelX = b.width - panelW - 8;
      const panelY = Math.max(12, (b.height - panelH) / 2);
      b.panel(panelId, declared.get(groupId)?.role ?? 'grouped-states', panelX, panelY, panelW, panelH);
      b.rect(`${panelId}-boundary`, panelX + 4, panelY + 4, panelW - 8, panelH - 8, { fill: 'none', color: 'muted', role: 'boundary' });
      for (const [index, member] of members.entries()) {
        const x = panelX + panelW / 2;
        const y = panelY + 18 + index * 16;
        b.label(`${safeId(groupId)}-member-${index + 1}`, member, x, y, { panelId, priority: 'required', protected: true });
        positions.set(idKey(member), { x, y });
      }
      for (const member of members) anchors.add(idKey(member));
    }
  }
  if (kind !== 'directed-weighted' && order.length > 1) {
    for (let index = 0; index < order.length - 1; index++) {
      const from = order[index]!;
      const to = order[index + 1]!;
      const match = edges.find((edge) => idKey(edge.from) === idKey(from) && idKey(edge.to) === idKey(to));
      if (kind === 'directed-cycle' && !match && edges.length) return fail(`missing-cycle-edge:${from}->${to}`);
      const edge = match ?? { from, to, relation: 'cycle-transition', rest: [], attrs: new Map<string, string>() };
      const edgeLabel = match ? (match.attrs.get('label') ?? match.attrs.get('weight') ?? match.relation) : false;
      if (!drawDirectedEdge(b, edge, index, positions, edgeLabel)) return fail(`missing-edge-endpoint:${from}->${to}`);
    }
  }
  if (kind === 'directed-weighted') {
    for (const [index, edge] of edges.entries()) if (!drawDirectedEdge(b, edge, index, positions, edge.attrs.get('weight') ? `weight=${edge.attrs.get('weight')}` : edge.relation)) return fail(`missing-edge-endpoint:${edge.from}->${edge.to}`);
    if (labels.some((label) => idKey(label.target) === 'negative-cycle')) {
      b.ellipse('negative-cycle', b.width / 2, b.height / 2 + 4, 38, 28, { color: 'danger', role: 'annotation' });
      anchors.add('negative-cycle');
    }
  }
  if (kind === 'phase-cycle') {
    for (const edge of edges) {
      if (idKey(edge.relation) !== 'branch') return fail(`unsupported-phase-relation:${edge.relation}`);
      const from = positions.get(idKey(edge.from));
      const to = positions.get(idKey(edge.to));
      if (!from || !to) return fail(`missing-branch-endpoint:${edge.from}->${edge.to}`);
      const start = insetEndpoint(from, to);
      const end = insetEndpoint(to, from);
      b.line(`branch-${safeId(edge.from)}-${safeId(edge.to)}`, start.x, start.y, end.x, end.y, { markerEnd: true, color: 'muted', role: 'connector', dash: true });
    }
  }
  for (const [index, label] of labels.entries()) {
    const target = idKey(label.target);
    if (!anchors.has(target)) return fail(`unknown-label-attachment:${label.target}`);
    const point = positions.get(target) ?? { x: b.width / 2, y: b.height / 2 };
    b.label(`attached-${index + 1}`, label.text, point.x, point.y, { anchorId: label.target, priority: 'preferred', slot: 'N' });
  }
  return layoutAndCompile(b.scene());
}

export function compileMembrane(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  if (specGet(spec, 'kind')?.toLowerCase() !== 'membrane-cycle') return fail('unsupported-membrane-kind');
  const states = specGetAll(spec, 'state').map((value) => {
    const [id = '', ...role] = words(value);
    return { id, role: role.join(' ') };
  }).filter((state) => state.id && state.role);
  const byId = new Map(states.map((state) => [idKey(state.id), state]));
  const order = orderIds(spec);
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
  const directions = specGetAll(spec, 'direction').filter((direction) => direction.trim());
  directions.forEach((direction, index) => {
    const x = b.width * ((index + 1) / (directions.length + 1));
    b.label(`direction-${index + 1}`, direction.trim(), x, 12, { priority: 'required', slot: 'N' });
  });
  return layoutAndCompile(b.scene());
}

export function compileAnatomy(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const kind = specGet(spec, 'kind')?.toLowerCase();
  const nodes = nodeDecls(spec);
  const byId = new Map(nodes.map((node) => [idKey(node.id), node]));
  const labels = labelDecls(spec);
  if (!labels) return fail('malformed-label-attachment');
  if (kind === 'conic') {
    const conicEdges = edgeDecls(spec);
    if (conicEdges.some((edge) => idKey(edge.relation) === 'lies-on' && idKey(edge.from).includes('focus') && idKey(edge.to).includes('directrix'))) return fail('invalid-conic-relation:focus-on-directrix');
    const findRole = (term: string) => nodes.find((node) => node.role.toLowerCase().includes(term) || node.id.toLowerCase().includes(term));
    const locus = findRole('locus');
    const axis = findRole('axis');
    const directrix = findRole('directrix');
    const vertex = findRole('vertex');
    const focus = findRole('focus');
    if (!locus || !axis || !directrix || !vertex || !focus) return fail('conic-requires-locus-axis-directrix-vertex-focus');
    for (const edge of conicEdges) {
      if (idKey(edge.relation) === 'lies-on' && idKey(edge.from) === idKey(focus.id) && idKey(edge.to) === idKey(directrix.id)) return fail('invalid-conic-relation:focus-on-directrix');
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
    b.circle(vertex.id, vertexPoint.x, vertexPoint.y, 4, { fill: 'solid', color: 'accent' });
    b.circle(focus.id, focusPoint.x, focusPoint.y, 4, { fill: 'solid', color: 'accent' });
    b.node(vertex.id, vertexPoint.x - 4, vertexPoint.y - 4, 8, 8, 'point');
    b.node(focus.id, focusPoint.x - 4, focusPoint.y - 4, 8, 8, 'point');
    const points = new Map<string, { x: number; y: number }>([
      [idKey(vertex.id), vertexPoint],
      [idKey(focus.id), focusPoint],
      [idKey(directrix.id), { x: axisX - 28, y: 28 }],
      [idKey(axis.id), { x: b.width * 0.72, y: axisY }],
      [idKey(locus.id), { x: axisX + 28, y: 40 }],
    ]);
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
    const edges = edgeDecls(spec);
    if (!edges.some((edge) => idKey(edge.relation) === 'compares')) return fail('paired-apparatus-requires-compares-relation');
    const b = frame('anatomy', ctx, spec);
    const groupEntries = [...groups.entries()].slice(0, 2);
    const anchors = new Set<string>();
    for (const [index, [groupId, members]] of groupEntries.entries()) {
      const x = index === 0 ? b.width * 0.29 : b.width * 0.71;
      const panelId = `${safeId(groupId)}-panel`;
      b.panel(panelId, 'compared-view', x - 58, 30, 116, b.height - 60);
      b.rect(`${panelId}-boundary`, x - 54, 34, 108, b.height - 68, { fill: 'none', color: 'muted', role: 'boundary' });
      for (const [memberIndex, member] of members.entries()) {
        const node = byId.get(idKey(member));
        if (!node) return fail(`unknown-group-member:${member}`);
        anchors.add(idKey(member));
        const y = 62 + memberIndex * 38;
        b.node(member, x - 24, y - 12, 48, 24, 'paired-part');
        if (node.role.toLowerCase().includes('pore')) b.circle(member, x, y, 7, { fill: 'none', color: 'accent' });
        else b.ellipse(member, x, y, 30, 12, { fill: 'none', color: 'accent' });
        const displayRole = node.role.replace(/^paired-/, '');
        b.label(`${safeId(member)}-label`, displayRole, x, y - 20, { protected: true, anchorId: member, panelId });
      }
    }
    for (const edge of edges) if (idKey(edge.relation) === 'compares' && (!groups.has(idKey(edge.from)) || !groups.has(idKey(edge.to)))) return fail(`missing-compared-group:${edge.from}->${edge.to}`);
    for (const label of labels) {
      if (!anchors.has(idKey(label.target))) return fail(`unknown-label-attachment:${label.target}`);
      const groupIndex = groupEntries.findIndex(([, members]) => members.some((member) => idKey(member) === idKey(label.target)));
      const x = groupIndex === 0 ? b.width * 0.29 : b.width * 0.71;
      b.label(`paired-attachment-${safeId(label.target)}`, label.text, x, b.height - 18, { anchorId: label.target, slot: 'S', priority: 'preferred' });
    }
    return layoutAndCompile(b.scene());
  }
  const organ = specGet(spec, 'organ');
  if (organ && !nodes.length && !edgeDecls(spec).length && !labels.length) {
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
  if (!laneValues.length && !bandValues.length) return fail('gel-requires-explicit-lanes-or-bands');
  const lanes = laneValues.flatMap((value) => parseCsv(value));
  if (!lanes.length) return fail('gel-requires-explicit-lanes');
  const b = frame('gel', ctx, spec);
  const laneW = Math.min(32, (b.width - 42) / lanes.length);
  const laneX = (index: number) => 20 + laneW * index + laneW / 2;
  lanes.forEach((lane, index) => {
    const x = laneX(index);
    const id = `lane-${safeId(lane)}`;
    b.rect(id, x - laneW / 2 + 2, 24, laneW - 4, b.height - 52, { fill: 'none', role: 'boundary' });
    b.label(`${id}-label`, lane, x, b.height - 16, { protected: true, anchorId: id });
  });
  for (const [index, value] of bandValues.entries()) {
    const [lane, ...rest] = words(value);
    const laneIndex = lanes.findIndex((candidate) => idKey(candidate) === idKey(lane ?? ''));
    if (laneIndex < 0 || !rest.length) return fail(`unknown-gel-lane:${lane}`);
    const y = 42 + (index + 1) * ((b.height - 78) / (bandValues.length + 1));
    const id = `band-${index + 1}`;
    b.line(id, laneX(laneIndex) - 8, y, laneX(laneIndex) + 8, y, { color: 'accent', width: 3, role: 'annotation' });
    b.label(`${id}-label`, rest.join(' '), laneX(laneIndex), y, { anchorId: id, priority: 'preferred' });
  }
  return layoutAndCompile(b.scene());
}

export function compileOperon(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const promoter = specGet(spec, 'promoter');
  const operator = specGet(spec, 'operator');
  const genes = specList(spec, 'gene');
  if (!promoter || !operator) return fail('operon-requires-promoter-and-operator');
  const items = [{ id: 'promoter', text: promoter }, { id: 'operator', text: operator }, ...genes.map((text, index) => ({ id: `gene-${index + 1}`, text }))];
  const b = frame('operon', ctx, spec);
  const left = 20;
  const unit = (b.width - 40) / items.length;
  b.line('dna', left, b.height / 2, b.width - left, b.height / 2, { width: 2.4, role: 'geometry' });
  items.forEach((item, index) => {
    const x = left + unit * (index + 0.5);
    b.rect(item.id, x - unit * 0.35, b.height / 2 - 13, unit * 0.7, 26, { fill: item.id === 'operator' ? 'solid' : 'none', color: item.id === 'operator' ? 'danger' : 'accent', role: 'boundary' });
    b.label(`${item.id}-label`, item.text, x, b.height / 2 - 25, { protected: true, anchorId: item.id, slot: 'N' });
  });
  return layoutAndCompile(b.scene());
}

export function compileRestriction(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const sites = specList(spec, 'sites').flatMap(parseCsv);
  if (!sites.length) return fail('restriction-requires-explicit-sites');
  const b = frame('restriction', ctx, spec);
  const y = b.height / 2;
  b.line('dna', 18, y, b.width - 18, y, { width: 3, role: 'geometry' });
  sites.forEach((site, index) => {
    const x = 32 + index * ((b.width - 64) / Math.max(1, sites.length - 1));
    const id = `site-${index + 1}`;
    b.line(id, x, y - 16, x, y + 16, { color: 'accent', role: 'annotation' });
    b.label(`${id}-label`, site, x, y - 25, { anchorId: id, slot: 'N', priority: 'required' });
  });
  return layoutAndCompile(b.scene());
}

export function compileNewick(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const source = specGet(spec, 'newick') ?? specGet(spec, 'tree');
  if (!source) return fail('newick-requires-explicit-tree');
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

export function compileEcg(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const waves = specList(spec, 'waves').flatMap(parseCsv);
  if (!waves.length) return fail('ecg-requires-explicit-waves');
  const b = frame('ecg', ctx, spec);
  const y = b.height / 2;
  b.line('baseline', 16, y, b.width - 16, y, { color: 'guide', role: 'guide' });
  const step = (b.width - 36) / waves.length;
  const points: number[] = [18, y];
  waves.forEach((wave, index) => {
    const x = 18 + index * step;
    points.push(x + step * 0.25, y, x + step * 0.45, y - 18, x + step * 0.62, y, x + step, y);
    b.label(`wave-${index + 1}`, wave, x + step / 2, y - 24, { anchorId: `wave-${index + 1}`, slot: 'N', priority: 'required' });
  });
  b.polyline('waveform', points, { color: 'accent', role: 'geometry', width: 1.8 });
  return layoutAndCompile(b.scene());
}

export function compileRama(spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const points = specList(spec, 'point');
  if (!points.length) return fail('rama-requires-explicit-points');
  const b = frame('rama', ctx, spec);
  b.line('phi-axis', 38, b.height - 24, b.width - 18, b.height - 24, { markerEnd: true, role: 'axis' });
  b.line('psi-axis', 38, b.height - 24, 38, 20, { markerEnd: true, role: 'axis' });
  points.forEach((value, index) => {
    const [rawPhi = 'NaN', rawPsi = 'NaN'] = value.split(/[,;\s]+/);
    const phi = Number(rawPhi);
    const psi = Number(rawPsi);
    if (!Number.isFinite(phi) || !Number.isFinite(psi)) return;
    const x = 50 + ((phi + 180) / 360) * (b.width - 76);
    const y = b.height - 30 - ((psi + 180) / 360) * (b.height - 52);
    b.circle(`point-${index + 1}`, x, y, 4, { fill: 'solid', color: 'accent' });
  });
  if (!b.strokes.some((stroke) => stroke.id.startsWith('point-'))) return fail('rama-points-malformed');
  b.label('phi-label', 'φ', b.width / 2, b.height - 10, { protected: true });
  b.label('psi-label', 'ψ', 20, b.height / 2, { protected: true });
  return layoutAndCompile(b.scene());
}

export function compileDivision(spec: SpecDoc, ctx: CompileCtx): CompileResult {
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
