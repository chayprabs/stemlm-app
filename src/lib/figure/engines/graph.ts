import type { CompileCtx, CompileResult } from '../types';
import { specGet, specGetAll, type SpecDoc } from '../spec';
import { SceneBuilder, frameSize } from '../scene-build';
import { layoutAndCompile } from '../pipeline';

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

interface DagreGraph {
  setGraph: (o: object) => void;
  setDefaultEdgeLabel: (fn: () => object) => void;
  setNode: (id: string, o: object) => void;
  setEdge: (a: string, b: string) => void;
  node: (id: string) => { x: number; y: number; width: number; height: number };
}

function parseGraph(spec: SpecDoc): { nodes: GNode[]; edges: GEdge[]; rankdir: string } {
  const nodes: GNode[] = [];
  const seen = new Set<string>();
  const add = (id: string, label?: string, kind?: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    nodes.push({ id, label: label ?? id, kind: kind ?? 'node' });
  };
  for (const line of specGetAll(spec, 'node')) {
    const parts = line.trim().split(/\s+/);
    const id = parts[0]!;
    add(id, parts.slice(1).join(' ') || id, parts[1]);
  }
  const edges: GEdge[] = [];
  for (const line of specGetAll(spec, 'edge')) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 2) continue;
    const a = parts[0]!;
    const b = parts[1]!;
    add(a);
    add(b);
    edges.push({ a, b, kind: parts[2] ?? 'flow' });
  }
  return { nodes, edges, rankdir: (specGet(spec, 'rankdir') ?? 'LR').toUpperCase() };
}

function layeredLayout(nodes: GNode[], edges: GEdge[], w: number, h: number, rankdir: string): Map<string, { x: number; y: number }> {
  const pos = new Map<string, { x: number; y: number }>();
  const incoming = new Map<string, number>();
  for (const n of nodes) incoming.set(n.id, 0);
  for (const e of edges) incoming.set(e.b, (incoming.get(e.b) ?? 0) + 1);
  const ranks = new Map<string, number>();
  const q = nodes.filter((n) => (incoming.get(n.id) ?? 0) === 0).map((n) => n.id);
  q.forEach((id) => ranks.set(id, 0));
  const rest = [...nodes.map((n) => n.id)];
  for (let iter = 0; iter < nodes.length + 2; iter++) {
    for (const e of edges) {
      const ra = ranks.get(e.a) ?? 0;
      ranks.set(e.b, Math.max(ranks.get(e.b) ?? 0, ra + 1));
    }
  }
  rest.forEach((id) => {
    if (!ranks.has(id)) ranks.set(id, 0);
  });
  const byRank = new Map<number, string[]>();
  for (const n of nodes) {
    const r = ranks.get(n.id) ?? 0;
    const list = byRank.get(r) ?? [];
    list.push(n.id);
    byRank.set(r, list);
  }
  const maxR = Math.max(0, ...byRank.keys());
  for (const [r, ids] of byRank) {
    ids.forEach((id, i) => {
      const t = ids.length <= 1 ? 0.5 : i / (ids.length - 1);
      if (rankdir === 'TB' || rankdir === 'TD') {
        pos.set(id, { x: 40 + t * (w - 80), y: 28 + (r / Math.max(1, maxR)) * (h - 56) });
      } else {
        pos.set(id, { x: 36 + (r / Math.max(1, maxR)) * (w - 72), y: 28 + t * (h - 56) });
      }
    });
  }
  return pos;
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
    for (const n of nodes) g.setNode(n.id, { width: 72, height: 28, label: n.label });
    for (const e of edges) g.setEdge(e.a, e.b);
    layoutFn(g);
    const pos = new Map<string, { x: number; y: number }>();
    for (const n of nodes) {
      const p = g.node(n.id);
      if (p) pos.set(n.id, { x: p.x, y: p.y });
    }
    // Fit into frame.
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
    const sx = (w - 80) / Math.max(1, maxX - minX);
    const sy = (h - 60) / Math.max(1, maxY - minY);
    const s = Math.min(sx, sy, 1);
    for (const [id, p] of pos) {
      pos.set(id, { x: 40 + (p.x - minX) * s, y: 24 + (p.y - minY) * s });
    }
    return pos;
  } catch {
    return null;
  }
}

export async function compileGraph(spec: SpecDoc, ctx: CompileCtx): Promise<CompileResult> {
  const { nodes, edges, rankdir } = parseGraph(spec);
  if (!nodes.length) return { ok: false, code: 'malformed', reason: 'graph needs node or edge' };
  const { w, h } = frameSize(ctx.profile);
  const b = new SceneBuilder('graph', w, h);
  b.hl(spec.highlight);
  const dagrePos = await layoutWithDagre(nodes, edges, w, h, rankdir);
  const pos = dagrePos ?? layeredLayout(nodes, edges, w, h, rankdir);
  for (const n of nodes) {
    const p = pos.get(n.id) ?? { x: w / 2, y: h / 2 };
    const bw = Math.max(36, Math.min(90, n.label.length * 7 + 16));
    b.rect(n.id, p.x - bw / 2, p.y - 12, bw, 24, {
      color: spec.highlight.includes(n.id) ? 'accent' : 'neutral',
      fill: 'solid',
    });
    b.label(`${n.id}-lab`, n.label, p.x, p.y, { protected: true });
  }
  for (let i = 0; i < edges.length; i++) {
    const e = edges[i]!;
    const pa = pos.get(e.a);
    const pb = pos.get(e.b);
    if (!pa || !pb) continue;
    const inhibit = /inhibit|repress|t-?bar/i.test(e.kind);
    b.line(`e${i}`, pa.x, pa.y, pb.x, pb.y, {
      markerEnd: !inhibit,
      color: inhibit ? 'danger' : 'muted',
      width: 1.4,
    });
    if (e.kind && e.kind !== 'flow') b.label(`el${i}`, e.kind, (pa.x + pb.x) / 2, (pa.y + pb.y) / 2, { slot: 'N' });
  }
  return layoutAndCompile(b.scene());
}
