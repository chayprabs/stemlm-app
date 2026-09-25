import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { frameSize } from './scene-build';
import { boxesOverlap, measureText, samplePathD, boxHitsSegment, type Box } from './geom';
import { FONT_MIN, type CompileSuccess, type Scene } from './types';
import { presentSvg } from '../svg-present';

function graph(content: string, profile: 'step' | 'solution' | 'print' = 'step') {
  return compileDiagramSpec({ type: 'graph', content }, profile);
}

async function ok(content: string, profile: 'step' | 'solution' | 'print' = 'step'): Promise<CompileSuccess> {
  const result = await graph(content, profile);
  if (!result.ok) throw new Error(`${result.code}: ${result.reason}`);
  return result;
}

function nodeBox(scene: Scene, id: string): Box {
  const node = scene.nodes.find((candidate) => candidate.id === id)!;
  return { x1: node.bbox.x, y1: node.bbox.y, x2: node.bbox.x + node.bbox.w, y2: node.bbox.y + node.bbox.h };
}

function realNodes(scene: Scene) {
  return scene.nodes.filter((node) => !node.kind.startsWith('graph-'));
}

function expectNoNodeOverlap(scene: Scene): void {
  const nodes = realNodes(scene);
  for (let i = 0; i < nodes.length; i++) {
    const a = nodeBox(scene, nodes[i]!.id);
    expect(a.x1).toBeGreaterThanOrEqual(0);
    expect(a.y1).toBeGreaterThanOrEqual(0);
    expect(a.x2).toBeLessThanOrEqual(scene.width);
    expect(a.y2).toBeLessThanOrEqual(scene.height);
    for (let j = i + 1; j < nodes.length; j++) {
      expect(boxesOverlap(a, nodeBox(scene, nodes[j]!.id), 0), `${nodes[i]!.id} overlaps ${nodes[j]!.id}`).toBe(false);
    }
  }
}

function labelLines(scene: Scene, id: string): string[] {
  return scene.labels
    .filter((label) => label.anchorId === id)
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((label) => label.text ?? '');
}

function chain(count: number, rankdir: 'LR' | 'TB', label: (i: number) => string): string {
  return [
    ...Array.from({ length: count }, (_, i) => `node: n${i} ${label(i)}`),
    ...Array.from({ length: count - 1 }, (_, i) => `edge: n${i} n${i + 1}`),
    `rankdir: ${rankdir}`,
  ].join('\n');
}

/** 12px scene text never renders below 8px when the profile fits the scene to its width. */
function expectReadableAtProfile(scene: Scene, profile: 'step' | 'solution' | 'print' = 'step'): void {
  const frame = frameSize(profile);
  expect(scene.width * (8 / FONT_MIN)).toBeLessThanOrEqual(frame.w + 0.5);
}

describe('FIG-GRAPH-01 graph layout owns its frame', () => {
  it('lays out the Guide-conformant three-node pathway without overlapping boxes', async () => {
    const result = await ok([
      'node: glucose Glucose',
      'node: g6p Glucose-6-phosphate',
      'node: f6p Fructose-6-phosphate',
      'edge: glucose g6p hexokinase',
      'edge: g6p f6p isomerase',
      'rankdir: LR',
    ].join('\n'));
    const { scene } = result;
    expectNoNodeOverlap(scene);
    expectReadableAtProfile(scene);
    const [glucose, g6p, f6p] = ['glucose', 'g6p', 'f6p'].map((id) => nodeBox(scene, id));
    expect(glucose!.x2).toBeLessThan(g6p!.x1);
    expect(g6p!.x2).toBeLessThan(f6p!.x1);
    expect(labelLines(scene, 'g6p').join('')).toBe('Glucose-6-phosphate');
    expect(labelLines(scene, 'f6p').join('')).toBe('Fructose-6-phosphate');
    expect(result.svg).toContain('hexokinase');
    expect(result.svg).toContain('isomerase');
    expect(result.svg).toMatch(new RegExp(`viewBox="0 0 ${scene.width} ${scene.height}"`));
  });

  for (const rankdir of ['LR', 'TB'] as const) {
    for (const count of [3, 5, 8]) {
      it(`compiles a ${count}-node ${rankdir} chain with 20-character labels`, async () => {
        const { scene } = await ok(chain(count, rankdir, (i) => `Intermediate stage ${String.fromCharCode(65 + i)}`));
        expect(realNodes(scene)).toHaveLength(count);
        expectNoNodeOverlap(scene);
        expectReadableAtProfile(scene);
        for (let i = 0; i < count; i++) {
          expect(labelLines(scene, `n${i}`).join(' ')).toBe(`Intermediate stage ${String.fromCharCode(65 + i)}`);
        }
      });
    }
  }

  it('wraps long node labels into at most three lines that each fit the node', async () => {
    const { scene } = await ok([
      'node: a Phosphoenolpyruvate carboxykinase reaction',
      'node: b Oxaloacetate',
      'edge: a b',
    ].join('\n'));
    const lines = labelLines(scene, 'a');
    expect(lines.length).toBeGreaterThan(1);
    expect(lines.length).toBeLessThanOrEqual(3);
    expect(lines.join(' ')).toBe('Phosphoenolpyruvate carboxykinase reaction');
    const box = nodeBox(scene, 'a');
    for (const line of lines) expect(measureText(line, FONT_MIN).w).toBeLessThan(box.x2 - box.x1);
  });

  it('strips one pair of quotes around node and edge labels', async () => {
    const { scene } = await ok(['node: q "Is n > 1?"', "edge: q r 'yes'"].join('\n'));
    expect(labelLines(scene, 'q')).toEqual(['Is n > 1?']);
    expect(scene.labels.some((label) => label.text === 'yes')).toBe(true);
    expect(scene.labels.some((label) => /["']/.test(label.text ?? ''))).toBe(false);
  });

  it('keeps edge labels clear of every node box', async () => {
    const { scene } = await ok([
      'node: s0 S0', 'node: s1 S1', 'node: s2 S2',
      'edge: s0 s1 read a', 'edge: s1 s2 read b', 'edge: s2 s0 reset', 'edge: s1 s0 back',
      'rankdir: LR',
    ].join('\n'));
    const nodes = realNodes(scene).map((node) => nodeBox(scene, node.id));
    for (const label of scene.labels.filter((candidate) => candidate.anchorId?.startsWith('edge-'))) {
      const size = measureText(label.text ?? '', FONT_MIN);
      const box = { x1: label.x - size.w / 2, y1: label.y - size.h / 2, x2: label.x + size.w / 2, y2: label.y + size.h / 2 };
      for (const node of nodes) expect(boxesOverlap(box, node, 0), `${label.id} over a node`).toBe(false);
    }
  });

  it('draws node interiors transparent so labels stay legible in both themes', async () => {
    const result = await ok('node: a Alpha\nnode: b Beta\nedge: a b');
    for (const id of ['a', 'b']) {
      const stroke = result.scene.strokes.find((candidate) => candidate.id === id)!;
      expect(stroke.fill ?? 'none').toBe('none');
    }
    for (const theme of ['light', 'dark'] as const) {
      const doc = new DOMParser().parseFromString(presentSvg(result.svg, theme, 'step'), 'image/svg+xml');
      for (const shape of doc.querySelectorAll('rect, ellipse, circle, polygon')) {
        if (shape.closest('marker, pattern')) continue;
        expect(shape.getAttribute('fill')).toBe('none');
      }
    }
  });

  it('rotates a chain that cannot fit its requested direction instead of shrinking the text', async () => {
    const { scene } = await ok(chain(9, 'LR', (i) => `Stage ${i + 1}`));
    expectReadableAtProfile(scene);
    expect(scene.height).toBeGreaterThan(scene.width);
  });
});

describe('graph automaton and flowchart markers', () => {
  const dfa = [
    'node: q0 q0', 'node: q1 q1', 'node: q2 q2',
    'start: q0', 'accept: q2',
    'edge: q0 q1 a', 'edge: q1 q2 b', 'edge: q2 q2 a, b', 'edge: q1 q1 a', 'edge: q0 q0 b',
    'rankdir: LR',
  ].join('\n');

  it('draws states as circles, accepting states with a double outline, and a start arrow', async () => {
    const { scene } = await ok(dfa);
    for (const id of ['q0', 'q1', 'q2']) expect(scene.strokes.find((stroke) => stroke.id === id)?.kind).toBe('circle');
    const accept = scene.strokes.find((stroke) => stroke.id === 'q2-accepting');
    expect(accept?.kind).toBe('circle');
    expect(accept!.points[2]).toBeLessThan(scene.strokes.find((stroke) => stroke.id === 'q2')!.points[2]!);
    expect(scene.strokes.some((stroke) => stroke.id === 'q0-accepting')).toBe(false);
    const start = scene.strokes.find((stroke) => stroke.id === 'q0-start')!;
    expect(start.markerEnd).toBe(true);
    const q0 = scene.strokes.find((stroke) => stroke.id === 'q0')!;
    const segments = start.d ? samplePathD(start.d) : [{ x1: start.points[0]!, y1: start.points[1]!, x2: start.points[2]!, y2: start.points[3]! }];
    const end = segments.at(-1)!;
    expect(Math.hypot(end.x2 - q0.points[0]!, end.y2 - q0.points[1]!)).toBeCloseTo(q0.points[2]!, 0);
    expect(scene.strokes.filter((stroke) => stroke.role === 'connector')).toHaveLength(5);
  });

  it('routes self-loops outside their state without touching another node', async () => {
    const { scene } = await ok(dfa);
    const others = (id: string) => realNodes(scene).filter((node) => node.id !== id).map((node) => nodeBox(scene, node.id));
    for (const [index, id] of [[2, 'q2'], [3, 'q1'], [4, 'q0']] as const) {
      const loop = scene.strokes.find((stroke) => stroke.id === `edge-${index}-${id}-${id}`)!;
      expect(loop.kind).toBe('path');
      const segments = samplePathD(loop.d!);
      for (const box of others(id)) expect(segments.some((segment) => boxHitsSegment(box, segment, 0))).toBe(false);
      for (const segment of segments) {
        expect(Math.min(segment.x1, segment.x2)).toBeGreaterThanOrEqual(0);
        expect(Math.max(segment.y1, segment.y2)).toBeLessThanOrEqual(scene.height);
      }
    }
    expectNoNodeOverlap(scene);
  });

  it('draws flowchart decisions as diamonds and terminals as rounded capsules', async () => {
    const { scene } = await ok([
      'node: begin Start', 'node: test n > 1?', 'node: halve n = n / 2', 'node: end Stop',
      'terminal: begin, end', 'decision: test',
      'edge: begin test', 'edge: test halve yes', 'edge: test end no', 'edge: halve test',
      'rankdir: TB',
    ].join('\n'));
    const diamond = scene.strokes.find((stroke) => stroke.id === 'test')!;
    expect(diamond.kind).toBe('polygon');
    expect(diamond.points).toHaveLength(8);
    for (const id of ['begin', 'end']) {
      const capsule = scene.strokes.find((stroke) => stroke.id === id)!;
      expect(capsule.kind).toBe('path');
      expect(capsule.d).toMatch(/A/);
    }
    expect(scene.strokes.find((stroke) => stroke.id === 'halve')?.kind).toBe('rect');
    expect(scene.strokes.some((stroke) => stroke.id.endsWith('-start'))).toBe(false);
    expectNoNodeOverlap(scene);
  });

  it('rejects a marker that names an undeclared node', async () => {
    for (const key of ['start', 'accept', 'decision', 'terminal']) {
      const result = await graph(`node: a A\nnode: b B\nedge: a b\n${key}: c`);
      expect(result).toMatchObject({ ok: false, code: 'malformed' });
      if (!result.ok) expect(result.reason).toContain(`${key} names unknown node c`);
    }
  });

  it('rejects a node that is both a decision and a terminal', async () => {
    const result = await graph('node: a A\nnode: b B\nedge: a b\ndecision: a\nterminal: a');
    expect(result).toMatchObject({ ok: false, code: 'malformed' });
  });
});

describe('graph trees', () => {
  it('keeps a tree in its declared child order', async () => {
    const { scene } = await ok([
      'node: n8 8', 'node: n3 3', 'node: n10 10', 'node: n1 1', 'node: n6 6', 'node: n14 14', 'node: n4 4', 'node: n7 7',
      'edge: n8 n3', 'edge: n8 n10', 'edge: n3 n1', 'edge: n3 n6', 'edge: n10 n14', 'edge: n6 n4', 'edge: n6 n7',
      'rankdir: TB',
    ].join('\n'));
    const x = (id: string) => { const box = nodeBox(scene, id); return (box.x1 + box.x2) / 2; };
    expect(x('n3')).toBeLessThan(x('n10'));
    expect(x('n1')).toBeLessThan(x('n6'));
    expect(x('n4')).toBeLessThan(x('n7'));
    expectNoNodeOverlap(scene);
  });
});
