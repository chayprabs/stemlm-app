import { graphlib, layout as dagreLayout } from '@dagrejs/dagre';
import type { CompileCtx, CompileFailure, CompileResult, SemanticColor } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';
import { boxHitsAny, boxesOverlap, measureText, polylineSegments, samplePathD, type Box, type Segment } from '../geom';
import { FONT_MIN, FRAME_PAD, LABEL_GAP } from '../types';

type Shape = 'box' | 'ellipse' | 'circle' | 'diamond' | 'stadium';

interface GNode {
  id: string;
  label: string;
  kind: string;
}

interface GEdge {
  a: string;
  b: string;
  kind: string;
}

interface GraphData {
  nodes: GNode[];
  edges: GEdge[];
  rankdir: 'LR' | 'TB' | 'TD';
  numberLine: boolean;
  starts: Set<string>;
  accepts: Set<string>;
}

interface ParseFailure {
  ok: false;
  code: 'malformed' | 'refused';
  reason: string;
}

interface Point {
  x: number;
  y: number;
}

/** A node as drawn: shape, size, and its wrapped label. */
interface NodeGeom {
  shape: Shape;
  w: number;
  h: number;
  lines: string[];
}

interface LaidEdge {
  points: Point[];
  label?: Point;
}

interface GraphLayout {
  rankdir: 'LR' | 'TB';
  width: number;
  height: number;
  pos: Map<string, Point>;
  edges: LaidEdge[];
  starts: Map<string, Point[]>;
}

const GRAPH_KEYS = new Set(['node', 'edge', 'rankdir', 'highlight', 'start', 'accept', 'decision', 'terminal']);
const SPATIAL_CUE = /\b(map|raster|coastline|projection|latitude|longitude|color[- ]band)\b/i;
const SUPPORTING_SPATIAL_CUE = /\b(world|legend|region|site|density|shading|species)\b/i;
const NODE_FRAME_PAD = 2;
/** Wrapped label lines, in px at FONT_MIN. A single unbreakable word may run to the word limit. */
const NODE_LINE_WIDTH = 120;
const EDGE_LINE_WIDTH = 96;
const WORD_WIDTH_LIMIT = 150;
const MAX_LABEL_LINES = 3;
const LINE_HEIGHT = FONT_MIN * 1.15;
/** Text keeps >= 8px at the profile's base size when the scene shrinks by at most this factor. */
const MIN_READABLE_SCALE = 2 / 3;
/** A top-to-bottom sequence may run this many frame heights; a rank must always fit across. */
const TALL_FACTOR = 3;
/** Depth of a self-loop beyond the gap dagre keeps between a node and its loop slot. */
const LOOP_SLOT = 12;
const START_KEY = '\u0000start:';

function graphEdgeId(index: number, a: string, b: string): string {
  return `edge-${index}-${encodeURIComponent(a)}-${encodeURIComponent(b)}`;
}

function stripQuotes(text: string): string {
  const trimmed = text.trim();
  return /^(["'])(.*)\1$/.exec(trimmed)?.[2]?.trim() || trimmed;
}

function inferNodeKind(id: string, label: string): string {
  const text = `${id} ${label}`;
  if (/\b(resource|lock|mutex|semaphore)\b/i.test(text)) return 'resource';
  if (/\b(process|thread|worker|task|actor)\b/i.test(text)) return 'process';
  if (/\b(relation|relationship)\b/i.test(text)) return 'relation';
  if (/\b(entity)\b/i.test(text)) return 'entity';
  return 'node';
}

function isSpatialArtwork(nodes: GNode[], edges: GEdge[]): boolean {
  const text = [...nodes.flatMap((n) => [n.id, n.label]), ...edges.map((e) => e.kind)].join(' ');
  return SPATIAL_CUE.test(text) && SUPPORTING_SPATIAL_CUE.test(text);
}

function numericNodeValue(label: string): { value: number; display: string } | null {
  const display = label.trim().replace(/^value\s*[:=]\s*/i, '').replace(/^−/, '-');
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(display)) return null;
  const value = Number(display);
  return Number.isFinite(value) ? { value, display } : null;
}

function isOrderingCue(kind: string): boolean {
  return /\b(order(?:ed|ing)?|next|successor|predecessor|increasing|decreasing|less|greater|number[- ]?line|axis)\b|^(?:<|>|<=|>=)$/i.test(kind);
}

function inferNumberLine(nodes: GNode[], edges: GEdge[]): boolean | ParseFailure {
  const values = nodes.map((node) => numericNodeValue(node.label));
  if (values.some((value) => !value) || !edges.length || !edges.some((edge) => isOrderingCue(edge.kind))) return false;
  if (!edges.every((edge) => isOrderingCue(edge.kind))) return false;
  const distinct = new Set(values.map((value) => value!.value));
  if (distinct.size !== values.length) {
    return { ok: false, code: 'malformed', reason: 'number-line node values must be unique' };
  }
  return true;
}

/** Ids named by a marker key (`start: q0, q1`), resolved to declared node ids. */
function markerIds(spec: SpecDoc, key: string, byId: Map<string, GNode>): Set<string> | ParseFailure {
  const ids = new Set<string>();
  const folded = new Map([...byId.keys()].map((id) => [id.toLowerCase(), id]));
  for (const raw of specGetAll(spec, key).flatMap((value) => value.split(/[\s,]+/)).filter(Boolean)) {
    const id = byId.has(raw) ? raw : folded.get(raw.toLowerCase());
    if (!id) return { ok: false, code: 'malformed', reason: `${key} names unknown node ${raw}` };
    ids.add(id);
  }
  return ids;
}

function parseGraph(spec: SpecDoc): GraphData | ParseFailure {
  if (spec.emptyDeclarations.size || spec.lists.size) {
    return { ok: false, code: 'malformed', reason: 'graph declarations need inline values; repeat node or edge keys' };
  }
  const keys = new Set([...spec.values.keys(), ...spec.lists.keys()]);
  for (const key of keys) {
    if (!GRAPH_KEYS.has(key)) return { ok: false, code: 'malformed', reason: `unsupported graph key ${key}` };
  }

  const rankdir = (specGet(spec, 'rankdir') ?? 'LR').trim().toUpperCase();
  if (rankdir !== 'LR' && rankdir !== 'TB' && rankdir !== 'TD') {
    return { ok: false, code: 'malformed', reason: `invalid rankdir ${rankdir || '(empty)'}` };
  }

  const nodes: GNode[] = [];
  const byId = new Map<string, GNode>();
  const explicit = new Set<string>();
  const addNode = (id: string, label = id, fromNodeRecord = false): ParseFailure | undefined => {
    const existing = byId.get(id);
    if (existing) {
      if (fromNodeRecord && explicit.has(id) && (existing.label !== label || existing.kind !== inferNodeKind(id, label))) {
        return { ok: false, code: 'malformed', reason: `conflicting node definition ${id}` };
      }
      if (fromNodeRecord && !explicit.has(id)) {
        existing.label = label;
        existing.kind = inferNodeKind(id, label);
        explicit.add(id);
      }
      return undefined;
    }
    byId.set(id, { id, label, kind: inferNodeKind(id, label) });
    nodes.push(byId.get(id)!);
    if (fromNodeRecord) explicit.add(id);
    return undefined;
  };

  for (const line of specGetAll(spec, 'node')) {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return { ok: false, code: 'malformed', reason: 'node needs an id' };
    const id = parts[0]!;
    const failure = addNode(id, stripQuotes(parts.slice(1).join(' ')) || id, true);
    if (failure) return failure;
  }

  const edges: GEdge[] = [];
  for (const line of specGetAll(spec, 'edge')) {
    const parts = line.trim().split(/\s+/).filter(Boolean);
    if (parts.length < 2) return { ok: false, code: 'malformed', reason: 'edge needs two endpoints' };
    const a = parts[0]!;
    const b = parts[1]!;
    addNode(a);
    addNode(b);
    edges.push({ a, b, kind: stripQuotes(parts.slice(2).join(' ')) || 'flow' });
  }
  if (!nodes.length) return { ok: false, code: 'malformed', reason: 'graph needs node or edge' };

  if (isSpatialArtwork(nodes, edges)) {
    return { ok: false, code: 'refused', reason: 'graph refuses spatial map artwork' };
  }

  const known = new Set(nodes.map((node) => node.id.toLowerCase()));
  const unknownHighlight = spec.highlight.find((id) => !known.has(id.toLowerCase()));
  if (unknownHighlight) {
    return { ok: false, code: 'malformed', reason: `highlight names unknown node ${unknownHighlight}` };
  }

  const markers: Record<string, Set<string>> = {};
  for (const key of ['start', 'accept', 'decision', 'terminal']) {
    const ids = markerIds(spec, key, byId);
    if (!(ids instanceof Set)) return ids;
    markers[key] = ids;
  }
  const { start: starts, accept: accepts, decision: decisions, terminal: terminals } = markers;
  const both = [...decisions!].find((id) => terminals!.has(id));
  if (both) return { ok: false, code: 'malformed', reason: `node ${both} cannot be both a decision and a terminal` };
  // Start or accepting states make the graph an automaton: every plain node is a state.
  const automaton = (starts!.size > 0 || accepts!.size > 0) && !decisions!.size && !terminals!.size;
  for (const node of nodes) {
    if (decisions!.has(node.id)) node.kind = 'decision';
    else if (terminals!.has(node.id)) node.kind = 'terminal';
    else if (automaton) node.kind = 'state';
  }

  const numberLine = inferNumberLine(nodes, edges);
  if (typeof numberLine !== 'boolean') return numberLine;
  return { nodes, edges, rankdir: rankdir as GraphData['rankdir'], numberLine, starts: starts!, accepts: accepts! };
}

/**
 * Greedy word wrap at spaces and after `-`, `/`, `(`, `,`, `;`. A word wider than
 * the line is split at camelCase humps; null when the text cannot fit the limits.
 */
function wrapLabel(text: string, lineWidth: number): string[] | null {
  const width = (value: string) => measureText(value, FONT_MIN).w;
  if (width(text) <= lineWidth) return [text];
  const pieces: { text: string; space: boolean }[] = [];
  text.trim().split(/\s+/).forEach((word, wordIndex) => {
    word
      .split(/(?<=[-/(,;])(?=.)/)
      .flatMap((part) => (width(part) <= lineWidth ? [part] : part.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/)))
      .forEach((part, partIndex) => pieces.push({ text: part, space: wordIndex > 0 && partIndex === 0 }));
  });
  const lines: string[] = [];
  let current = '';
  for (const piece of pieces) {
    const candidate = current + (current && piece.space ? ' ' : '') + piece.text;
    if (current && width(candidate) > lineWidth) {
      lines.push(current);
      current = piece.text;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  if (lines.length > MAX_LABEL_LINES || lines.some((line) => width(line) > WORD_WIDTH_LIMIT)) return null;
  return lines;
}

function nodeShape(kind: string, stateCircles: boolean): Shape {
  if (kind === 'decision' || kind === 'relation') return 'diamond';
  if (kind === 'terminal') return 'stadium';
  if (kind === 'process') return 'ellipse';
  if (kind === 'state') return stateCircles ? 'circle' : 'ellipse';
  return 'box';
}

/** Smallest shape of each kind that contains the label block with a little air. */
function shapeSize(shape: Shape, lines: string[]): { w: number; h: number } {
  const text = measureText(lines.join('\n'), FONT_MIN);
  const p = text.w / 2 + 4;
  const q = text.h / 2 + 3;
  if (shape === 'circle') {
    const d = Math.max(30, 2 * Math.hypot(p, q));
    return { w: d, h: d };
  }
  if (shape === 'ellipse') return { w: Math.max(44, 2 * Math.SQRT2 * p), h: Math.max(28, 2 * Math.SQRT2 * q) };
  if (shape === 'diamond') return { w: Math.max(44, 4 * p), h: Math.max(32, 4 * q) };
  const h = Math.max(28, 2 * q + 6);
  if (shape === 'stadium') return { w: Math.max(48, text.w + 8 + h), h };
  return { w: Math.max(40, 2 * p + 8), h };
}

function nodeGeometry(nodes: GNode[]): Map<string, NodeGeom> | CompileFailure {
  const wrapped = new Map<string, string[]>();
  for (const node of nodes) {
    const lines = wrapLabel(node.label, NODE_LINE_WIDTH);
    if (!lines) return { ok: false, code: 'unsatisfiable', reason: `node label ${node.id} does not fit node geometry` };
    wrapped.set(node.id, lines);
  }
  // Conventional state circles when every state label is short; otherwise one ellipse style for all states.
  const stateCircles = nodes
    .filter((node) => node.kind === 'state')
    .every((node) => wrapped.get(node.id)!.length === 1 && shapeSize('circle', wrapped.get(node.id)!).w <= 56);
  return new Map(nodes.map((node) => {
    const shape = nodeShape(node.kind, stateCircles);
    const lines = wrapped.get(node.id)!;
    return [node.id, { shape, lines, ...shapeSize(shape, lines) }];
  }));
}

function nodeBox(center: Point, dim: { w: number; h: number }): Box {
  return { x1: center.x - dim.w / 2, y1: center.y - dim.h / 2, x2: center.x + dim.w / 2, y2: center.y + dim.h / 2 };
}

/** Where the ray from the node centre toward `toward` leaves the drawn shape. */
function boundaryPoint(center: Point, geom: NodeGeom, toward: Point): Point {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  if (!dx && !dy) return center;
  const a = geom.w / 2;
  const b = geom.h / 2;
  let t: number;
  if (geom.shape === 'circle' || geom.shape === 'ellipse') t = 1 / Math.hypot(dx / a, dy / b);
  else if (geom.shape === 'diamond') t = 1 / (Math.abs(dx) / a + Math.abs(dy) / b);
  else t = 1 / Math.max(Math.abs(dx) / a, Math.abs(dy) / b);
  return { x: center.x + dx * t, y: center.y + dy * t };
}

function validateNodeLayout(
  nodes: GNode[],
  pos: Map<string, Point>,
  dims: Map<string, { w: number; h: number }>,
  w: number,
  h: number,
): CompileFailure | undefined {
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]!;
    const center = pos.get(node.id);
    const dim = dims.get(node.id);
    if (!center || !dim) return { ok: false, code: 'unsatisfiable', reason: `missing layout for node ${node.id}` };
    const box = nodeBox(center, dim);
    if (box.x1 < NODE_FRAME_PAD || box.y1 < NODE_FRAME_PAD || box.x2 > w - NODE_FRAME_PAD || box.y2 > h - NODE_FRAME_PAD) {
      return { ok: false, code: 'unsatisfiable', reason: `node ${node.id} leaves the graph frame` };
    }
    for (const other of nodes.slice(0, index)) {
      const otherCenter = pos.get(other.id);
      const otherDim = dims.get(other.id);
      if (otherCenter && otherDim && boxesOverlap(box, nodeBox(otherCenter, otherDim), 0.5)) {
        return { ok: false, code: 'unsatisfiable', reason: `node boxes overlap: ${other.id} and ${node.id}` };
      }
    }
  }
  return undefined;
}

function validateRelationRoutes(
  scene: ReturnType<SceneBuilder['scene']>,
  edges: GEdge[],
  rankdir: GraphLayout['rankdir'],
  frame: { w: number; h: number },
): CompileFailure | undefined {
  const routes = new Map<number, Segment[]>();
  for (let index = 0; index < edges.length; index++) {
    const stroke = scene.strokes.find((candidate) => candidate.id === graphEdgeId(index, edges[index]!.a, edges[index]!.b));
    if (!stroke) return { ok: false, code: 'unsatisfiable', reason: `missing route for relation ${index}` };
    const segments = stroke.d ? samplePathD(stroke.d) : [];
    if (!segments.length || segments.some((segment) =>
      ![segment.x1, segment.y1, segment.x2, segment.y2].every(Number.isFinite) ||
      segment.x1 < 2 || segment.x2 < 2 || segment.y1 < 2 || segment.y2 < 2 ||
      segment.x1 > scene.width - 2 || segment.x2 > scene.width - 2 ||
      segment.y1 > scene.height - 2 || segment.y2 > scene.height - 2,
    )) {
      return { ok: false, code: 'unsatisfiable', reason: `relation ${index} leaves the graph frame` };
    }
    routes.set(index, segments);
  }

  const parallelGroups = new Map<string, number[]>();
  for (let index = 0; index < edges.length; index++) {
    const edge = edges[index]!;
    const key = [edge.a, edge.b].sort().join('\u0000');
    const group = parallelGroups.get(key) ?? [];
    group.push(index);
    parallelGroups.set(key, group);
  }
  const channel = measureText('pointer', FONT_MIN).h + LABEL_GAP(FONT_MIN);
  // Relations between one pair must fit across the profile's frame, not the grown layout.
  const perpendicularSpan = rankdir === 'TB' ? frame.w : frame.h;
  const maxReadableRelations = Math.max(2, Math.floor((perpendicularSpan - 2 * FRAME_PAD) / channel));
  for (const [key, group] of parallelGroups) {
    const signatures = new Set(group.map((index) => routes.get(index)!.map((segment) =>
      `${segment.x1.toFixed(2)},${segment.y1.toFixed(2)},${segment.x2.toFixed(2)},${segment.y2.toFixed(2)}`,
    ).join(';')));
    if (signatures.size !== group.length) {
      return { ok: false, code: 'unsatisfiable', reason: `overlapping reciprocal or pointer relations: ${key}` };
    }
    if (group.length > maxReadableRelations) {
      return { ok: false, code: 'unsatisfiable', reason: `too many reciprocal or pointer relations for readable routing: ${key}` };
    }
  }
  return undefined;
}

function compileNumberLine(nodes: GNode[], spec: SpecDoc, ctx: CompileCtx): CompileResult {
  const { w, h } = frameSize(ctx.profile);
  const ordered = nodes
    .map((node) => ({ node, numeric: numericNodeValue(node.label)! }))
    .sort((a, b) => a.numeric.value - b.numeric.value);
  const maxLabelWidth = Math.max(...ordered.map(({ numeric }) => measureText(numeric.display, FONT_MIN).w));
  const left = FRAME_PAD + maxLabelWidth / 2 + 2;
  const right = w - FRAME_PAD - maxLabelWidth / 2 - 2;
  if (right <= left) return { ok: false, code: 'unsatisfiable', reason: 'number-line labels do not fit the graph frame' };
  const axisY = h / 2;
  const labelY = axisY + 24;
  const b = new SceneBuilder('graph', w, h);
  b.hl(spec.highlight);
  b.line('number-line-axis', left, axisY, right, axisY, { color: 'neutral', role: 'axis', width: 1.5 });
  ordered.forEach(({ node, numeric }, index) => {
    const x = ordered.length === 1 ? (left + right) / 2 : left + (index / (ordered.length - 1)) * (right - left);
    const labelDim = measureText(numeric.display, FONT_MIN);
    const nodeW = labelDim.w + 12;
    const nodeH = labelDim.h + 8;
    const tickColor = spec.highlight.some((id) => id.toLowerCase() === node.id.toLowerCase()) ? 'accent' : 'neutral';
    b.node(node.id, x - nodeW / 2, labelY - nodeH / 2, nodeW, nodeH, 'number-line-tick');
    b.line(`number-line-tick-${index}`, x, axisY - 7, x, axisY + 7, { color: tickColor, role: 'axis', width: 1.4 });
    b.label(`${node.id}-label`, numeric.display, x, labelY, { protected: true, priority: 'required', anchorId: node.id });
  });
  const scene = b.scene();
  const positions = new Map(scene.nodes.map((node) => [node.id, { x: node.bbox.x + node.bbox.w / 2, y: node.bbox.y + node.bbox.h / 2 }]));
  const dims = new Map(scene.nodes.map((node) => [node.id, { w: node.bbox.w, h: node.bbox.h }]));
  const nodeFailure = validateNodeLayout(nodes, positions, dims, w, h);
  if (nodeFailure) return nodeFailure;
  return layoutAndCompile(scene);
}

/** Every node has at most one parent and no cycle: a tree drawn in declaration order has no crossings. */
function isForest(nodes: GNode[], edges: GEdge[]): boolean {
  const parent = new Map<string, string>();
  for (const edge of edges) {
    if (edge.a === edge.b || parent.has(edge.b)) return false;
    parent.set(edge.b, edge.a);
  }
  return nodes.every((node) => {
    const seen = new Set<string>();
    for (let id: string | undefined = node.id; id !== undefined; id = parent.get(id)) {
      if (seen.has(id)) return false;
      seen.add(id);
    }
    return true;
  });
}

/**
 * Lay the graph out at its natural size: dagre spaces ranks around edge labels and
 * reserves a slot beside each self-loop, and the scene frame is the layout's own bounds.
 */
function layoutGraph(
  data: GraphData,
  geoms: Map<string, NodeGeom>,
  edgeLabels: string[][],
  rankdir: GraphLayout['rankdir'],
): GraphLayout {
  const g = new graphlib.Graph({ multigraph: true });
  g.setGraph({ rankdir, marginx: FRAME_PAD, marginy: FRAME_PAD, nodesep: 22, ranksep: 36, edgesep: 12 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const node of data.nodes) {
    const geom = geoms.get(node.id)!;
    g.setNode(node.id, { width: geom.w, height: geom.h });
  }
  for (const id of data.starts) {
    g.setNode(`${START_KEY}${id}`, { width: 2, height: 2 });
    g.setEdge(`${START_KEY}${id}`, id, {}, 'start');
  }
  data.edges.forEach((edge, index) => {
    const lines = edgeLabels[index]!;
    const text = lines.length ? measureText(lines.join('\n'), FONT_MIN) : { w: 0, h: 0 };
    let label: { width?: number; height?: number; labelpos?: 'l' | 'c'; labeloffset?: number } = lines.length ? { width: text.w + 4, height: text.h, labelpos: 'l', labeloffset: 3 } : {};
    if (edge.a === edge.b) {
      // The loop slot sits next to the node in its rank: across the rank axis in LR, beside it in TB.
      label = rankdir === 'LR'
        ? { width: Math.max(text.w + 4, 28), height: text.h + LOOP_SLOT, labelpos: 'c' }
        : { width: text.w + 4 + LOOP_SLOT, height: Math.max(text.h, 28), labelpos: 'c' };
    }
    g.setEdge(edge.a, edge.b, label, `e${index}`);
  });
  // Trees keep the author's child order (left subtree first); other graphs minimise crossings.
  dagreLayout(g, { disableOptimalOrderHeuristic: isForest(data.nodes, data.edges) });

  const pos = new Map(data.nodes.map((node) => {
    const placed = g.node(node.id)!;
    return [node.id, { x: placed.x, y: placed.y }];
  }));
  const edges = data.edges.map((edge, index) => {
    const placed = g.edge(edge.a, edge.b, `e${index}`)!;
    const label = placed.x !== undefined && placed.y !== undefined ? { x: placed.x, y: placed.y } : undefined;
    return { points: placed.points ?? [], label };
  });
  const starts = new Map([...data.starts].map((id) => [id, g.edge(`${START_KEY}${id}`, id, 'start')?.points ?? []]));
  const size = g.graph();
  return { rankdir, width: Math.ceil(size.width ?? 0), height: Math.ceil(size.height ?? 0), pos, edges, starts };
}

/**
 * A rank of parallel nodes must fit across the profile frame at a readable scale; only a
 * top-to-bottom sequence of ranks may run tall (the reading column scrolls).
 */
function readable(layout: GraphLayout, frame: { w: number; h: number }): boolean {
  const maxW = frame.w / MIN_READABLE_SCALE;
  const maxH = frame.h / MIN_READABLE_SCALE;
  if (layout.width > maxW) return false;
  return layout.height <= (layout.rankdir === 'LR' ? maxH : maxH * TALL_FACTOR);
}

/** Smooth path through dagre's route: straight to each midpoint, quadratic through each bend. */
function routePath(points: Point[]): string {
  const f = (value: number) => Number(value.toFixed(2));
  const parts = [`M ${f(points[0]!.x)} ${f(points[0]!.y)}`];
  if (points.length === 2) {
    parts.push(`L ${f(points[1]!.x)} ${f(points[1]!.y)}`);
    return parts.join(' ');
  }
  const mid = (a: Point, b: Point) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  const first = mid(points[0]!, points[1]!);
  parts.push(`L ${f(first.x)} ${f(first.y)}`);
  for (let i = 1; i < points.length - 1; i++) {
    const next = mid(points[i]!, points[i + 1]!);
    parts.push(`Q ${f(points[i]!.x)} ${f(points[i]!.y)} ${f(next.x)} ${f(next.y)}`);
  }
  const last = points.at(-1)!;
  parts.push(`L ${f(last.x)} ${f(last.y)}`);
  return parts.join(' ');
}

/** Replace dagre's bounding-box end points with points on the drawn shapes. */
function clipRoute(points: Point[], from: { center: Point; geom: NodeGeom } | null, to: { center: Point; geom: NodeGeom }): Point[] {
  const route = points.map((point) => ({ ...point }));
  if (route.length < 2) return route;
  if (from) route[0] = boundaryPoint(from.center, from.geom, route[1]!);
  route[route.length - 1] = boundaryPoint(to.center, to.geom, route[route.length - 2]!);
  return route;
}

function drawLabelLines(b: SceneBuilder, id: string, lines: string[], at: Point, anchorId: string): void {
  const firstY = at.y - ((lines.length - 1) * LINE_HEIGHT) / 2;
  lines.forEach((line, index) => {
    b.label(`${id}-label${index ? `-${index}` : ''}`, line, at.x, firstY + index * LINE_HEIGHT, { protected: true, priority: 'required', anchorId });
  });
}

/** The lettering of an edge label centred at `at`: 0.8 em per line, the panel font set ~5 % wider than the estimate. */
function labelInk(lines: string[], at: Point): Box {
  const w = Math.max(...lines.map((line) => measureText(line, FONT_MIN).w)) * 1.05;
  const h = (lines.length - 1) * LINE_HEIGHT + FONT_MIN * 0.8;
  return { x1: at.x - w / 2, y1: at.y - h / 2, x2: at.x + w / 2, y2: at.y + h / 2 };
}

/** Unit vector from the nearest point of `route` toward `at` (the route's normal when `at` lies on it). */
function awayFromRoute(route: Segment[], at: Point): Point {
  let best = { d: Infinity, x: 0, y: -1 };
  for (const s of route) {
    const dx = s.x2 - s.x1;
    const dy = s.y2 - s.y1;
    const len = Math.hypot(dx, dy) || 1;
    const t = Math.max(0, Math.min(1, ((at.x - s.x1) * dx + (at.y - s.y1) * dy) / (len * len)));
    const qx = s.x1 + t * dx;
    const qy = s.y1 + t * dy;
    const d = Math.hypot(at.x - qx, at.y - qy);
    if (d < best.d) best = d > 1e-6 ? { d, x: (at.x - qx) / d, y: (at.y - qy) / d } : { d, x: -dy / len, y: dx / len };
  }
  return { x: best.x, y: best.y };
}

/**
 * FIG-GRAPH-LABEL-02: dagre sets an edge label 3 units beside its edge, so on a curved route the lettering can
 * sit on a line. Slide each label straight away from its own route (the layout is never redone) until no edge
 * crosses its lettering, clear of nodes, the other labels and the frame; dagre's spot stays if nothing fits.
 */
function placeEdgeLabels(
  b: SceneBuilder,
  labels: Array<{ id: string; lines: string[]; at: Point }>,
  nodes: Box[],
  frame: { w: number; h: number },
): void {
  const strokeSegs = (id?: string) => b.strokes
    .filter((s) => !id || s.id === id)
    .flatMap((s) => (s.d ? samplePathD(s.d) : polylineSegments(s.points)));
  const edges = strokeSegs();
  const boxes = labels.map((label) => labelInk(label.lines, label.at));
  labels.forEach((label, index) => {
    const others = [...nodes, ...boxes.filter((_, other) => other !== index)];
    const fits = (at: Point) => {
      const box = labelInk(label.lines, at);
      return box.x1 >= 0 && box.y1 >= 0 && box.x2 <= frame.w && box.y2 <= frame.h &&
        !boxHitsAny(box, edges, 1) && !others.some((other) => boxesOverlap(box, other, 1));
    };
    const away = awayFromRoute(strokeSegs(label.id), label.at);
    const moves = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24].flatMap((step) => [step, -step])
      .map((d) => ({ x: label.at.x + away.x * d, y: label.at.y + away.y * d }));
    const at = fits(label.at) ? label.at : moves.find(fits) ?? label.at;
    boxes[index] = labelInk(label.lines, at);
    drawLabelLines(b, label.id, label.lines, at, label.id);
  });
}

function drawSelfLoop(b: SceneBuilder, id: string, center: Point, geom: NodeGeom, slot: Point | undefined, lines: string[], style: { color: SemanticColor; markerEnd: boolean }): void {
  const toward = slot ?? { x: center.x, y: center.y - 1 };
  const length = Math.hypot(toward.x - center.x, toward.y - center.y) || 1;
  const u = { x: (toward.x - center.x) / length, y: (toward.y - center.y) / length };
  const perp = { x: -u.y, y: u.x };
  const text = lines.length ? measureText(lines.join('\n'), FONT_MIN) : { w: 0, h: 0 };
  const textExtent = Math.abs(u.x) * text.w + Math.abs(u.y) * text.h;
  const reach = geom.shape === 'circle' ? geom.w / 2 : Math.abs(u.x) * geom.w / 2 + Math.abs(u.y) * geom.h / 2;
  const edge = { x: center.x + u.x * reach, y: center.y + u.y * reach };
  const gap = Math.hypot(toward.x - edge.x, toward.y - edge.y);
  // Apex at the slot's inner part, label beyond it; depth never less than a readable loop.
  const depth = Math.max(18, gap - textExtent / 2 - 3);
  const spread = Math.min(9, (Math.abs(u.x) * geom.h + Math.abs(u.y) * geom.w) / 4);
  const foot = (side: number) => boundaryPoint(center, geom, { x: edge.x + perp.x * spread * side, y: edge.y + perp.y * spread * side });
  const start = foot(-1);
  const end = foot(1);
  const pull = depth * 1.33;
  const c1 = { x: start.x + u.x * pull - perp.x * 6, y: start.y + u.y * pull - perp.y * 6 };
  const c2 = { x: end.x + u.x * pull + perp.x * 6, y: end.y + u.y * pull + perp.y * 6 };
  const f = (value: number) => Number(value.toFixed(2));
  b.path(id, `M ${f(start.x)} ${f(start.y)} C ${f(c1.x)} ${f(c1.y)} ${f(c2.x)} ${f(c2.y)} ${f(end.x)} ${f(end.y)}`, { color: style.color, role: 'connector', width: 1.5, markerEnd: style.markerEnd });
  if (lines.length) {
    const at = { x: edge.x + u.x * (depth + 3 + textExtent / 2), y: edge.y + u.y * (depth + 3 + textExtent / 2) };
    drawLabelLines(b, id, lines, at, id);
  }
}

function drawShape(b: SceneBuilder, id: string, shape: Shape, p: Point, w: number, h: number, color: SemanticColor): void {
  const style = { color, role: 'boundary' as const };
  if (shape === 'circle') b.circle(id, p.x, p.y, w / 2, style);
  else if (shape === 'ellipse') b.ellipse(id, p.x, p.y, w / 2, h / 2, style);
  else if (shape === 'diamond') b.polygon(id, [p.x, p.y - h / 2, p.x + w / 2, p.y, p.x, p.y + h / 2, p.x - w / 2, p.y], style);
  else if (shape === 'stadium') {
    const r = h / 2;
    const x1 = p.x - w / 2 + r;
    const x2 = p.x + w / 2 - r;
    b.path(id, `M ${x1} ${p.y - r} H ${x2} A ${r} ${r} 0 0 1 ${x2} ${p.y + r} H ${x1} A ${r} ${r} 0 0 1 ${x1} ${p.y - r} Z`, style);
  } else {
    b.rect(id, p.x - w / 2, p.y - h / 2, w, h, style);
  }
}

function drawNode(b: SceneBuilder, node: GNode, p: Point, geom: NodeGeom, color: SemanticColor, accepting: boolean): void {
  const { shape, w, h } = geom;
  drawShape(b, node.id, shape, p, w, h, color);
  // Accepting: the conventional double outline, inset inside the same shape.
  if (accepting) drawShape(b, `${node.id}-accepting`, shape, p, w - (shape === 'diamond' ? 12 : 7), h - 7, color);
  b.node(node.id, p.x - w / 2, p.y - h / 2, w, h, node.kind);
}

function isInhibitory(kind: string): boolean {
  return /\b(inhibit|inhibits|repress|represses|blocks?|t-?bar|negative)\b/i.test(kind);
}

export async function compileGraph(spec: SpecDoc, ctx: CompileCtx): Promise<CompileResult> {
  const parsed = parseGraph(spec);
  if ('ok' in parsed && !parsed.ok) return parsed;
  const data = parsed as GraphData;
  if (data.numberLine) return compileNumberLine(data.nodes, spec, ctx);

  const geoms = nodeGeometry(data.nodes);
  if ('ok' in geoms) return geoms as CompileFailure;
  const edgeLabels: string[][] = [];
  for (const edge of data.edges) {
    const lines = edge.kind === 'flow' ? [] : wrapLabel(edge.kind, EDGE_LINE_WIDTH);
    if (!lines) return { ok: false, code: 'unsatisfiable', reason: `relation label ${edge.a} ${edge.b} is too long for a readable graph` };
    edgeLabels.push(lines);
  }
  // rankdir is a preference: rotate a layout that cannot be read at the profile's size.
  const frame = frameSize(ctx.profile);
  const preferred: GraphLayout['rankdir'] = data.rankdir === 'LR' ? 'LR' : 'TB';
  const other: GraphLayout['rankdir'] = preferred === 'LR' ? 'TB' : 'LR';
  const first = layoutGraph(data, geoms, edgeLabels, preferred);
  const layout = readable(first, frame) ? first : layoutGraph(data, geoms, edgeLabels, other);
  if (!readable(layout, frame)) {
    return { ok: false, code: 'unsatisfiable', reason: `graph layout exceeds the readable frame (${first.width}x${first.height})` };
  }

  const b = new SceneBuilder('graph', layout.width, layout.height);
  b.hl(spec.highlight);
  const endpoint = (id: string) => ({ center: layout.pos.get(id)!, geom: geoms.get(id)! });
  const edgeLabelsToPlace: Array<{ id: string; lines: string[]; at: Point }> = [];

  data.edges.forEach((edge, index) => {
    const id = graphEdgeId(index, edge.a, edge.b);
    const inhibitory = isInhibitory(edge.kind);
    const color: SemanticColor = inhibitory ? 'danger' : 'muted';
    const lines = edgeLabels[index]!;
    const laid = layout.edges[index]!;
    if (edge.a === edge.b) {
      const { center, geom } = endpoint(edge.a);
      drawSelfLoop(b, id, center, geom, laid.label, lines, { color, markerEnd: !inhibitory });
      return;
    }
    const route = clipRoute(laid.points, endpoint(edge.a), endpoint(edge.b));
    b.stroke({
      id,
      kind: 'path',
      points: [],
      d: routePath(route),
      semanticColor: color,
      role: 'connector',
      width: 1.5,
      markerEnd: !inhibitory,
      markerStart: /\b(bidirectional|reversible|equilibrium)\b/i.test(edge.kind),
    });
    if (inhibitory) {
      const end = route.at(-1)!;
      const before = route.at(-2)!;
      const length = Math.hypot(end.x - before.x, end.y - before.y) || 1;
      const tx = (-(end.y - before.y) / length) * 6;
      const ty = ((end.x - before.x) / length) * 6;
      b.line(`${id}-bar`, end.x - tx, end.y - ty, end.x + tx, end.y + ty, { color, role: 'annotation', width: 2 });
    }
    if (lines.length && laid.label) edgeLabelsToPlace.push({ id, lines, at: laid.label });
  });

  for (const [id, points] of layout.starts) {
    const route = clipRoute(points, null, endpoint(id));
    if (route.length >= 2) b.path(`${id}-start`, routePath(route), { color: 'neutral', role: 'annotation', width: 1.5, markerEnd: true });
  }
  const nodeBoxes = data.nodes.map((node) => {
    const { x, y } = layout.pos.get(node.id)!;
    const { w, h } = geoms.get(node.id)!;
    return { x1: x - w / 2, y1: y - h / 2, x2: x + w / 2, y2: y + h / 2 };
  });
  placeEdgeLabels(b, edgeLabelsToPlace, nodeBoxes, { w: layout.width, h: layout.height });

  for (const node of data.nodes) {
    const p = layout.pos.get(node.id)!;
    const geom = geoms.get(node.id)!;
    const color: SemanticColor = spec.highlight.some((id) => id.toLowerCase() === node.id.toLowerCase()) ? 'accent' : 'neutral';
    drawNode(b, node, p, geom, color, data.accepts.has(node.id));
    drawLabelLines(b, node.id, geom.lines, p, node.id);
  }

  const scene = b.scene();
  const nodeFailure = validateNodeLayout(data.nodes, layout.pos, geoms, layout.width, layout.height);
  if (nodeFailure) return nodeFailure;
  const routeFailure = validateRelationRoutes(scene, data.edges, layout.rankdir, frame);
  if (routeFailure) return routeFailure;
  return layoutAndCompile(scene);
}
