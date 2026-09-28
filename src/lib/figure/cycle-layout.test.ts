import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { layoutScene } from './slk';
import { FONT_MIN, type Scene } from './types';

// A cycle diagram is closed by definition: every state sits on the ring inside a shape that fits its name, one arrow
// per step in order (including the step back to the first state), each step's name beside its own arrow.
interface Case {
  spec: string;
  order: string[];
  relations: string[];
}

const CASES: Record<string, Case> = {
  'Krebs (4 states)': {
    spec: 'kind: directed-cycle\nnode: oaa oxaloacetate\nnode: cit citrate\nnode: akg alpha-ketoglutarate\nnode: suc succinate\nedge: oaa cit condensation\nedge: cit akg oxidation\nedge: akg suc decarboxylation\nedge: suc oaa regeneration\norder: oaa -> cit -> akg -> suc -> oaa',
    order: ['oaa', 'cit', 'akg', 'suc', 'oaa'], relations: ['condensation', 'oxidation', 'decarboxylation', 'regeneration'],
  },
  'cell cycle from a node list': {
    spec: 'nodes: G1, S, G2, M\nname: cell cycle',
    order: ['G1', 'S', 'G2', 'M', 'G1'], relations: [],
  },
  'Calvin cycle (longer ids)': {
    spec: 'kind: directed-cycle\nnode: RuBP acceptor\nnode: 3-PGA product\nnode: G3P sugar\nedge: RuBP 3-PGA carboxylation\nedge: 3-PGA G3P reduction\nedge: G3P RuBP regeneration\norder: RuBP -> 3-PGA -> G3P -> RuBP',
    order: ['RuBP', '3-PGA', 'G3P', 'RuBP'], relations: ['carboxylation', 'reduction', 'regeneration'],
  },
  'citric acid cycle (8 states, ids up to 8 chars)': {
    spec: [
      'kind: directed-cycle',
      ...['citrate', 'isocit', 'aKG', 'succCoA', 'succ', 'fumarate', 'malate', 'OAA'].map((id) => `node: ${id} intermediate`),
      'edge: citrate isocit isomerize', 'edge: isocit aKG oxidize', 'edge: aKG succCoA decarboxylate', 'edge: succCoA succ SLP',
      'edge: succ fumarate oxidize', 'edge: fumarate malate hydrate', 'edge: malate OAA oxidize', 'edge: OAA citrate condense',
      'order: citrate -> isocit -> aKG -> succCoA -> succ -> fumarate -> malate -> OAA -> citrate',
    ].join('\n'),
    order: ['citrate', 'isocit', 'aKG', 'succCoA', 'succ', 'fumarate', 'malate', 'OAA', 'citrate'],
    relations: ['isomerize', 'oxidize', 'decarboxylate', 'SLP', 'oxidize', 'hydrate', 'oxidize', 'condense'],
  },
  'ATP/ADP (two states, two directions)': {
    spec: 'kind: directed-cycle\nnode: ATP energy\nnode: ADP spent\nedge: ATP ADP hydrolysis\nedge: ADP ATP phosphorylation\norder: ATP -> ADP -> ATP',
    order: ['ATP', 'ADP', 'ATP'], relations: ['hydrolysis', 'phosphorylation'],
  },
};

type Pt = { x: number; y: number };

function quadratic(d: string): (t: number) => Pt {
  const n = d.match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/g)!.map(Number);
  const [x0, y0, cx, cy, x1, y1] = n as [number, number, number, number, number, number];
  return (t) => ({ x: (1 - t) ** 2 * x0 + 2 * (1 - t) * t * cx + t * t * x1, y: (1 - t) ** 2 * y0 + 2 * (1 - t) * t * cy + t * t * y1 });
}

type Shape = { cx: number; cy: number; rx: number; ry: number };
/** < 1 inside the node's circle/ellipse, 1 on it. */
const radial = (p: Pt, s: Shape) => ((p.x - s.cx) / s.rx) ** 2 + ((p.y - s.cy) / s.ry) ** 2;
type Box = { x1: number; y1: number; x2: number; y2: number };
const overlap = (p: Box, q: Box) => p.x1 < q.x2 - 0.5 && q.x1 < p.x2 - 0.5 && p.y1 < q.y2 - 0.5 && q.y1 < p.y2 - 0.5;

function nodeShape(scene: Scene, id: string): Shape {
  const stroke = scene.strokes.find((s) => s.id === `node-${id}` && (s.kind === 'circle' || s.kind === 'ellipse'));
  expect(stroke, `shape of ${id}`).toBeDefined();
  const [cx, cy, rx, ry = rx] = stroke!.points as [number, number, number, number?];
  return { cx, cy, rx, ry };
}

describe('cycle diagram', () => {
  it.each(Object.entries(CASES))('%s: closed, names fit their shapes, one clear arrow per step', async (_name, c) => {
    const result = await compileDiagramSpec({ type: 'cycle', content: c.spec }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const layout = layoutScene(result.scene);
    expect(layout.ok).toBe(true);
    if (!layout.ok) return;
    expect(layout.fontSize, 'labels keep the minimum font size').toBe(FONT_MIN);
    const { scene } = result;
    const states = [...new Set(c.order)];
    const node = (id: string) => scene.nodes.find((n) => n.id === id)!.bbox;
    const shape = (id: string) => nodeShape(scene, id);
    for (const id of states) {
      const label = layout.placed.find((p) => p.label.text === id && p.label.anchorId === id);
      expect(label, `${id} is written`).toBeDefined();
      const { x1, y1, x2, y2 } = label!.box;
      const corners = [{ x: x1, y: y1 }, { x: x2, y: y1 }, { x: x1, y: y2 }, { x: x2, y: y2 }];
      expect(Math.max(...corners.map((p) => radial(p, shape(id)))), `${id} fits its shape`).toBeLessThanOrEqual(1.001);
    }

    const edges = scene.strokes.filter((s) => s.id.startsWith('edge-'));
    expect(edges, 'one arrow per step, the closing step included').toHaveLength(c.order.length - 1);
    const midpoints: Pt[] = [];
    for (let i = 0; i < c.order.length - 1; i++) {
      const from = c.order[i]!;
      const to = c.order[i + 1]!;
      const edge = edges.find((s) => s.id.startsWith(`edge-${from}-${to}-`));
      expect(edge, `${from} → ${to}`).toBeDefined();
      expect(edge!.markerEnd).toBe(true);
      const at = quadratic(edge!.d!);
      expect(radial(at(0), shape(from)), `${from} → ${to} starts outside ${from}`).toBeGreaterThanOrEqual(1);
      expect(radial(at(1), shape(to)), `${from} → ${to} ends outside ${to}`).toBeGreaterThanOrEqual(1);
      for (const other of states.filter((id) => id !== from && id !== to)) {
        for (let t = 0.05; t < 1; t += 0.05) expect(radial(at(t), shape(other)), `${from} → ${to} crosses ${other}`).toBeGreaterThan(1);
      }
      midpoints.push(at(0.5));
    }
    for (let i = 0; i < midpoints.length; i++) {
      for (let j = i + 1; j < midpoints.length; j++) {
        expect(Math.hypot(midpoints[i]!.x - midpoints[j]!.x, midpoints[i]!.y - midpoints[j]!.y), 'arrows stay apart').toBeGreaterThan(8);
      }
    }

    const relationLabels = layout.placed.filter((p) => p.label.anchorId?.startsWith('edge-'));
    expect(relationLabels.map((p) => p.label.text).sort()).toEqual([...c.relations].sort());
    for (const label of relationLabels) {
      for (const id of states) {
        const b = node(id);
        expect(overlap(label.box, { x1: b.x, y1: b.y, x2: b.x + b.w, y2: b.y + b.h }), `${label.label.text} clear of ${id}`).toBe(false);
      }
    }
    for (let a = 0; a < layout.placed.length; a++) {
      for (let b = a + 1; b < layout.placed.length; b++) {
        expect(overlap(layout.placed[a]!.box, layout.placed[b]!.box), `${layout.placed[a]!.label.text} × ${layout.placed[b]!.label.text}`).toBe(false);
      }
    }
  });

  it('refuses an explicitly open order without a kind instead of drawing a chain as a cycle', async () => {
    const result = await compileDiagramSpec({ type: 'cycle', content: 'nodes: A, B, C\norder: A -> B -> C' }, 'step');
    expect(result.ok).toBe(false);
  });
});
