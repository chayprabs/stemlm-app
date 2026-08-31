import type { CompileCtx, CompileFailure, CompileResult } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';
import { boxesOverlap, measureText, samplePathD, type Box, type Segment } from '../geom';
import { FONT_MIN, FRAME_PAD, LABEL_GAP } from '../types';

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
}

interface ParseFailure {
  ok: false;
  code: 'malformed' | 'refused';
  reason: string;
}

interface DagreGraph {
  setGraph: (o: object) => void;
  setDefaultEdgeLabel: (fn: () => object) => void;
  setNode: (id: string, o: object) => void;
  setEdge: (a: string, b: string) => void;
  node: (id: string) => { x: number; y: number; width: number; height: number };
}

const GRAPH_KEYS = new Set(['node', 'edge', 'rankdir', 'highlight']);
const SPATIAL_CUE = /\b(map|raster|coastline|projection|latitude|longitude|color[- ]band)\b/i;
const SUPPORTING_SPATIAL_CUE = /\b(world|legend|region|site|density|shading|species)\b/i;
const NODE_FRAME_PAD = 2;
const STRUCTURED_LABEL = /[()[\]{},;:=]/;
const STRUCTURED_LABEL_LINE_WIDTH = 80;

function graphEdgeId(index: number, a: string, b: string): string {
  return `edge-${index}-${encodeURIComponent(a)}-${encodeURIComponent(b)}`;
}

function inferNodeKind(id: string, label: string): string {
  const text = `${id} ${label}`;
  if (/\b(resource|lock|mutex|semaphore)\b/i.test(text)) return 'resource';
  if (/\b(process|thread|worker|task|actor)\b/i.test(text)) return 'process';
  if (/\b(accept|accepting|final)\b/i.test(text)) return 'accepting';
  if (/\b(start|initial)\b/i.test(text)) return 'start';
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

function parseGraph(spec: SpecDoc): GraphData | ParseFailure {
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
    const failure = addNode(id, parts.slice(1).join(' ') || id, true);
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
    edges.push({ a, b, kind: parts.slice(2).join(' ') || 'flow' });
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
  const numberLine = inferNumberLine(nodes, edges);
  if (typeof numberLine !== 'boolean') return numberLine;
  return { nodes, edges, rankdir: rankdir as GraphData['rankdir'], numberLine };
}

function layeredLayout(nodes: GNode[], edges: GEdge[], w: number, h: number, rankdir: string): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  for (const n of nodes) {
    incoming.set(n.id, 0);
    outgoing.set(n.id, []);
  }
  for (const e of edges) {
    if (e.a === e.b) continue;
    incoming.set(e.b, (incoming.get(e.b) ?? 0) + 1);
    outgoing.get(e.a)?.push(e.b);
  }

  const ranks = new Map<string, number>();
  const queue = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0).map((n) => n.id);
  if (!queue.length && nodes.length) queue.push(nodes[0]!.id);
  for (const id of queue) ranks.set(id, 0);
  for (let iter = 0; iter < nodes.length; iter++) {
    for (const [id, next] of outgoing) {
      const rank = ranks.get(id);
      if (rank === undefined) continue;
      for (const target of next) {
        const candidate = Math.min(nodes.length - 1, rank + 1);
        if ((ranks.get(target) ?? -1) < candidate) ranks.set(target, candidate);
      }
    }
  }
  for (const n of nodes) if (!ranks.has(n.id)) ranks.set(n.id, 0);

  const byRank = new Map<number, string[]>();
  for (const n of nodes) {
    const rank = ranks.get(n.id) ?? 0;
    const list = byRank.get(rank) ?? [];
    list.push(n.id);
    byRank.set(rank, list);
  }
  const maxRank = Math.max(0, ...byRank.keys());
  const maxNodeWidth = Math.max(...nodes.map((node) => nodeDimensions(node).w), 42);
  const maxNodeHeight = Math.max(...nodes.map((node) => nodeDimensions(node).h), 28);
  const left = maxNodeWidth / 2 + NODE_FRAME_PAD;
  const right = w - left;
  const top = maxNodeHeight / 2 + NODE_FRAME_PAD;
  const bottom = h - top;
  for (const [rank, ids] of byRank) {
    ids.forEach((id, index) => {
      const cross = ids.length <= 1 ? 0.5 : index / (ids.length - 1);
      if (rankdir === 'TB' || rankdir === 'TD') {
        pos.set(id, { x: left + cross * (right - left), y: top + (rank / Math.max(1, maxRank)) * (bottom - top) });
      } else {
        pos.set(id, { x: left + (rank / Math.max(1, maxRank)) * (right - left), y: top + cross * (bottom - top) });
      }
    });
  }
  return pos;
}

function nodeLabelLines(label: string): string[] {
  if (!STRUCTURED_LABEL.test(label) || measureText(label, FONT_MIN).w <= STRUCTURED_LABEL_LINE_WIDTH) return [label];
  const words = label
    .trim()
    .split(/(?<=\()|(?<=[,;])\s*|\s+/)
    .filter(Boolean)
    .flatMap((word) => {
      if (measureText(word, FONT_MIN).w <= STRUCTURED_LABEL_LINE_WIDTH) return [word];
      return word.split(/(?<=[a-z])(?=[A-Z])|(?<=[A-Z])(?=[A-Z][a-z])/).filter(Boolean);
    });
  if (words.length < 2) return [label];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measureText(candidate, FONT_MIN).w > STRUCTURED_LABEL_LINE_WIDTH) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  return lines.length > 1 ? lines : [label];
}

function nodeLabelText(node: GNode): string {
  return nodeLabelLines(node.label).join('\n');
}

function nodeDimensions(node: GNode): { w: number; h: number } {
  const lines = nodeLabelLines(node.label);
  if (lines.length === 1) return { w: Math.max(42, Math.min(150, node.label.length * 6.1 + 24)), h: 28 };
  const label = lines.join('\n');
  const measured = measureText(label, FONT_MIN);
  return { w: Math.max(42, Math.min(150, measured.w + 12)), h: Math.max(28, measured.h + 8) };
}

function nodeBox(center: { x: number; y: number }, dim: { w: number; h: number }): Box {
  return { x1: center.x - dim.w / 2, y1: center.y - dim.h / 2, x2: center.x + dim.w / 2, y2: center.y + dim.h / 2 };
}

function validateNodeLayout(
  nodes: GNode[],
  pos: Map<string, { x: number; y: number }>,
  dims: Map<string, { w: number; h: number }>,
  w: number,
  h: number,
): CompileFailure | undefined {
  for (let index = 0; index < nodes.length; index++) {
    const node = nodes[index]!;
    const center = pos.get(node.id);
    const dim = dims.get(node.id);
    if (!center || !dim) return { ok: false, code: 'unsatisfiable', reason: `missing layout for node ${node.id}` };
    const label = measureText(nodeLabelText(node), FONT_MIN);
    if (label.w + 6 > dim.w || label.h + 6 > dim.h) {
      return { ok: false, code: 'unsatisfiable', reason: `node label ${node.id} does not fit node geometry` };
    }
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

function routeSegments(stroke: { kind: string; points: number[]; d?: string }): Segment[] {
  if (stroke.kind === 'line' && stroke.points.length >= 4) {
    return [{ x1: stroke.points[0]!, y1: stroke.points[1]!, x2: stroke.points[2]!, y2: stroke.points[3]! }];
  }
  if ((stroke.kind === 'path' || stroke.kind === 'arc') && stroke.d) return samplePathD(stroke.d);
  return [];
}

function validateRelationRoutes(
  scene: ReturnType<SceneBuilder['scene']>,
  edges: GEdge[],
  rankdir: GraphData['rankdir'],
): CompileFailure | undefined {
  const routes = new Map<number, Segment[]>();
  for (let index = 0; index < edges.length; index++) {
    const stroke = scene.strokes.find((candidate) => candidate.id === graphEdgeId(index, edges[index]!.a, edges[index]!.b));
    if (!stroke) return { ok: false, code: 'unsatisfiable', reason: `missing route for relation ${index}` };
    const segments = routeSegments(stroke);
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
    const key = undirectedKey(edge.a, edge.b);
    const group = parallelGroups.get(key) ?? [];
    group.push(index);
    parallelGroups.set(key, group);
  }
  const channel = measureText('pointer', FONT_MIN).h + LABEL_GAP(FONT_MIN);
  const perpendicularSpan = rankdir === 'TB' || rankdir === 'TD' ? scene.width : scene.height;
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

async function layoutWithDagre(
  nodes: GNode[],
  edges: GEdge[],
  w: number,
  h: number,
  rankdir: string,
): Promise<Map<string, { x: number; y: number }> | null> {
  try {
    const mod = (await import('@dagrejs/dagre')) as unknown as {
      default?: { graphlib: { Graph: new () => DagreGraph }; layout: (g: DagreGraph) => void };
      graphlib?: { Graph: new () => DagreGraph };
      layout?: (g: DagreGraph) => void;
    };
    const dagre = mod.default ?? mod;
    const GraphCtor = dagre.graphlib?.Graph;
    const layoutFn = dagre.layout;
    if (!GraphCtor || !layoutFn) return null;
    const g = new GraphCtor();
    g.setGraph({ rankdir, marginx: 16, marginy: 16, nodesep: 24, ranksep: 40 });
    g.setDefaultEdgeLabel(() => ({}));
    for (const n of nodes) {
      const dim = nodeDimensions(n);
      g.setNode(n.id, { width: dim.w, height: dim.h, label: n.label });
    }
    for (const e of edges) g.setEdge(e.a, e.b);
    layoutFn(g);
    const pos = new Map<string, { x: number; y: number }>();
    for (const n of nodes) {
      const p = g.node(n.id);
      if (p) pos.set(n.id, { x: p.x, y: p.y });
    }
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const p of pos.values()) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const maxNodeWidth = Math.max(...nodes.map((node) => nodeDimensions(node).w), 42);
    const maxNodeHeight = Math.max(...nodes.map((node) => nodeDimensions(node).h), 28);
    const left = maxNodeWidth / 2 + NODE_FRAME_PAD;
    const right = w - left;
    const top = maxNodeHeight / 2 + NODE_FRAME_PAD;
    const bottom = h - top;
    for (const [id, p] of pos) {
      const xRatio = maxX === minX ? 0.5 : (p.x - minX) / Math.max(1, maxX - minX);
      const yRatio = maxY === minY ? 0.5 : (p.y - minY) / Math.max(1, maxY - minY);
      pos.set(id, { x: left + xRatio * (right - left), y: top + yRatio * (bottom - top) });
    }
    return pos;
  } catch {
    return null;
  }
}

function boundaryPoint(center: { x: number; y: number }, dim: { w: number; h: number }, toward: { x: number; y: number }): { x: number; y: number } {
  const dx = toward.x - center.x;
  const dy = toward.y - center.y;
  const scale = 1 / Math.max(Math.abs(dx) / (dim.w / 2), Math.abs(dy) / (dim.h / 2), 1);
  return { x: center.x + dx * scale, y: center.y + dy * scale };
}

function undirectedKey(a: string, b: string): string {
  return [a, b].sort().join('\u0000');
}

function isInhibitory(kind: string): boolean {
  return /\b(inhibit|inhibits|repress|represses|blocks?|t-?bar|negative)\b/i.test(kind);
}

function curveOffset(edges: GEdge[], index: number): number {
  const e = edges[index]!;
  const group = edges
    .map((candidate, i) => ({ candidate, i }))
    .filter(({ candidate }) => candidate.a !== candidate.b && undirectedKey(candidate.a, candidate.b) === undirectedKey(e.a, e.b));
  if (group.length < 2) return 0;
  const ordinal = group.findIndex(({ i }) => i === index);
  return (ordinal - (group.length - 1) / 2) * 22;
}

function isFeedbackEdge(from: { x: number; y: number }, to: { x: number; y: number }, rankdir: GraphData['rankdir']): boolean {
  return rankdir === 'TB' || rankdir === 'TD' ? to.y < from.y : to.x < from.x;
}

function addRelationLabel(b: SceneBuilder, id: string, edge: GEdge, x: number, y: number): void {
  if (edge.kind === 'flow') return;
  const words = measureText(edge.kind, FONT_MIN).w <= STRUCTURED_LABEL_LINE_WIDTH
    ? [edge.kind]
    : edge.kind.trim().split(/(?<=[-/:])|\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measureText(candidate, FONT_MIN).w > STRUCTURED_LABEL_LINE_WIDTH) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  if (current) lines.push(current);
  const labelLines = lines.length > 1 ? lines : [edge.kind];
  const lineHeight = FONT_MIN * 1.15;
  const firstY = y - ((labelLines.length - 1) * lineHeight) / 2;
  labelLines.forEach((line, lineIndex) => {
    b.label(`${id}-label${lineIndex ? `-${lineIndex}` : ''}`, line, x, firstY + lineIndex * lineHeight, { slot: 'N', priority: 'required', anchorId: id });
  });
}

export async function compileGraph(spec: SpecDoc, ctx: CompileCtx): Promise<CompileResult> {
  const parsed = parseGraph(spec);
  if ('ok' in parsed && !parsed.ok) return parsed;
  const { nodes, edges, rankdir, numberLine } = parsed as GraphData;
  if (numberLine) return compileNumberLine(nodes, spec, ctx);
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('graph', w, h);
  b.hl(spec.highlight);
  const dims = new Map(nodes.map((node) => [node.id, nodeDimensions(node)]));
  const dagrePos = await layoutWithDagre(nodes, edges, w, h, rankdir);
  const pos = dagrePos ?? layeredLayout(nodes, edges, w, h, rankdir);

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i]!;
    const from = pos.get(edge.a);
    const to = pos.get(edge.b);
    if (!from || !to) return { ok: false, code: 'malformed', reason: `edge endpoint missing ${edge.a} ${edge.b}` };
    const id = graphEdgeId(i, edge.a, edge.b);
    const color = isInhibitory(edge.kind) ? 'danger' : 'muted';
    const markerEnd = !isInhibitory(edge.kind);
    const fromDim = dims.get(edge.a)!;
    const toDim = dims.get(edge.b)!;

    if (edge.a === edge.b) {
      const side = from.x < w / 2 ? 1 : -1;
      const start = { x: from.x + side * fromDim.w / 2, y: from.y - 6 };
      const end = { x: from.x + side * fromDim.w / 2, y: from.y + 8 };
      const controlX = from.x + side * (fromDim.w + 34);
      const d = `M ${start.x} ${start.y} C ${controlX} ${from.y - 34}, ${controlX} ${from.y + 36}, ${end.x} ${end.y}`;
      b.path(id, d, { color, role: 'connector', width: 1.5, markerEnd });
      if (!markerEnd) b.line(`${id}-bar`, end.x - side * 5, end.y - 6, end.x + side * 5, end.y - 6, { color, role: 'annotation', width: 2 });
      addRelationLabel(b, id, edge, controlX, from.y);
      continue;
    }

    const offset = curveOffset(edges, i) || (isFeedbackEdge(from, to, rankdir) ? (i % 2 ? -34 : 34) : 0);
    const start = boundaryPoint(from, fromDim, to);
    const end = boundaryPoint(to, toDim, from);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const normal = { x: -dy / length, y: dx / length };
    const middle = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
    const control = { x: middle.x + normal.x * offset, y: middle.y + normal.y * offset };
    if (offset !== 0) {
      b.path(id, `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}`, { color, role: 'connector', width: 1.5, markerEnd });
      addRelationLabel(b, id, edge, control.x, control.y);
    } else {
      b.line(id, start.x, start.y, end.x, end.y, { color, role: 'connector', width: 1.5, markerEnd, markerStart: /\b(bidirectional|reversible|equilibrium)\b/i.test(edge.kind) });
      addRelationLabel(b, id, edge, middle.x, middle.y);
    }
    if (!markerEnd) {
      const tx = -dy / length * 6;
      const ty = dx / length * 6;
      b.line(`${id}-bar`, end.x - tx, end.y - ty, end.x + tx, end.y + ty, { color, role: 'annotation', width: 2 });
    }
  }

  for (const node of nodes) {
    const p = pos.get(node.id);
    if (!p) return { ok: false, code: 'malformed', reason: `node position missing ${node.id}` };
    const dim = dims.get(node.id)!;
    b.node(node.id, p.x - dim.w / 2, p.y - dim.h / 2, dim.w, dim.h, node.kind);
    const color = spec.highlight.some((id) => id.toLowerCase() === node.id.toLowerCase()) ? 'accent' : 'neutral';
    if (node.kind === 'process') {
      b.ellipse(node.id, p.x, p.y, dim.w / 2, dim.h / 2, { color, fill: 'solid', role: 'boundary' });
    } else if (node.kind === 'resource') {
      b.rect(node.id, p.x - dim.w / 2, p.y - dim.h / 2, dim.w, dim.h, { color, fill: 'solid', role: 'boundary' });
    } else if (node.kind === 'relation') {
      b.polygon(node.id, [p.x, p.y - dim.h / 2, p.x + dim.w / 2, p.y, p.x, p.y + dim.h / 2, p.x - dim.w / 2, p.y], { color, fill: 'solid', role: 'boundary' });
    } else {
      b.rect(node.id, p.x - dim.w / 2, p.y - dim.h / 2, dim.w, dim.h, { color, fill: 'solid', role: 'boundary' });
      if (node.kind === 'accepting') {
        b.rect(`${node.id}-accepting`, p.x - dim.w / 2 + 3, p.y - dim.h / 2 + 3, dim.w - 6, dim.h - 6, { color, role: 'boundary' });
      }
      if (node.kind === 'start') {
        b.line(`${node.id}-start`, p.x - dim.w / 2 - 22, p.y, p.x - dim.w / 2 - 3, p.y, { color: 'accent', role: 'annotation', markerEnd: true });
      }
    }
    const lines = nodeLabelLines(node.label);
    const lineHeight = FONT_MIN * 1.15;
    const firstY = p.y - ((lines.length - 1) * lineHeight) / 2;
    lines.forEach((line, lineIndex) => {
      b.label(`${node.id}-label${lineIndex ? `-${lineIndex}` : ''}`, line, p.x, firstY + lineIndex * lineHeight, { protected: true, priority: 'required', anchorId: node.id });
    });
  }
  const scene = b.scene();
  const nodeFailure = validateNodeLayout(nodes, pos, dims, w, h);
  if (nodeFailure) return nodeFailure;
  const routeFailure = validateRelationRoutes(scene, edges, rankdir);
  if (routeFailure) return routeFailure;
  return layoutAndCompile(scene);
}
