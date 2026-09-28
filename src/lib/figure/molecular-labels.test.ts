import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { distPointSeg, measureText } from './geom';
import { strokeSegments } from './slk';
import type { Scene } from './types';

/** Molecular-biology scenes as models write them: replication fork, transcription bubble, translation. */
const SCENES: Record<string, string[]> = {
  'replication fork': ['kind: molecular', 'strand: lead dna 5to3', 'strand: lag dna 3to5', 'fork: f1 lead lag', 'actor: helicase helicase', 'primer: pr1 on lag 5to3', 'fragment: ok1 on lag 5to3', 'relation: helicase opens f1'],
  transcription: ['kind: molecular', 'strand: template dna 3to5', 'strand: coding dna 5to3', 'bubble: b1 template coding rnap', 'actor: rnap polymerase', 'product: mrna1 mrna from template 5to3', 'relation: rnap synthesizes mrna1'],
  'transcription, reversed template': ['kind: molecular', 'strand: coding dna 3to5', 'strand: template dna 5to3', 'bubble: b1 template coding rnap', 'actor: rnap polymerase', 'product: rna1 mrna from template 5to3', 'relation: rnap synthesizes rna1'],
  translation: ['kind: molecular', 'strand: m1 mrna 5to3', 'actor: ribo ribosome', 'product: pep peptide from m1 5to3', 'relation: ribo reads m1', 'relation: ribo synthesizes pep'],
  'fork with polymerase': ['kind: molecular', 'strand: leading dna 5to3', 'strand: lagging dna 3to5', 'fork: fork1 leading lagging', 'actor: helicase helicase', 'actor: pol polymerase', 'product: newdna dna from leading 5to3', 'fragment: okazaki on lagging 5to3', 'relation: pol synthesizes newdna'],
};

async function scene(lines: string[]): Promise<Scene> {
  const result = await compileDiagramSpec({ type: 'scene', content: lines.join('\n') }, 'step');
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
  if (!result.ok) throw new Error(result.reason);
  return result.scene;
}

const objectLabel = /^(strand|primer|fragment|product|actor)-.+-label$/;

function reach(drawn: Scene, anchor: string, x: number, y: number): number {
  const segments = strokeSegments({ ...drawn, strokes: drawn.strokes.filter((s) => s.id === anchor || s.id === `${anchor}-glyph`) });
  return Math.min(...segments.map((seg) => distPointSeg(x, y, seg)));
}

describe('molecular scene labels', () => {
  it.each(Object.entries(SCENES))('%s: every name placed beside a glyph is nearer that glyph than any other object, and a word apart', async (_name, lines) => {
    const drawn = await scene(lines);
    const objects = drawn.labels.filter((label) => objectLabel.test(label.id) && label.anchorId);
    const placed = objects.filter((label) => label.protected);
    expect(placed.length, 'the engine places names beside their glyphs').toBeGreaterThan(0);
    const anchors = [...new Set(objects.map((label) => label.anchorId!))];
    for (const label of placed) {
      const own = reach(drawn, label.anchorId!, label.x, label.y);
      expect(own, `${label.text} within reach of its glyph`).toBeLessThan(22);
      for (const other of anchors.filter((anchor) => anchor !== label.anchorId)) {
        expect(own, `${label.text} nearer its own glyph than ${other}`).toBeLessThanOrEqual(reach(drawn, other, label.x, label.y));
      }
    }
    const box = (label: (typeof placed)[number]) => {
      const size = measureText(label.text ?? '', 12);
      return { x1: label.x - size.w / 2, y1: label.y - size.h / 2, x2: label.x + size.w / 2, y2: label.y + size.h / 2 };
    };
    for (const [i, a] of placed.entries()) {
      for (const b of placed.slice(i + 1)) {
        const [p, q] = [box(a), box(b)];
        expect(Math.max(q.x1 - p.x2, p.x1 - q.x2, q.y1 - p.y2, p.y1 - q.y2), `${a.text} / ${b.text}`).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it.each(['transcription', 'transcription, reversed template'])('%s: the transcript leaves the bubble behind the polymerase and ends at it', async (name) => {
    const drawn = await scene(SCENES[name]!);
    const bubble = drawn.strokes.find((s) => s.id === 'bubble-b1')!;
    const [cx, cy, rx, ry] = bubble.points as [number, number, number, number];
    const transcript = drawn.strokes.find((s) => s.id.startsWith('product-'))!;
    const [x1, y1, x2, y2] = transcript.points as [number, number, number, number];
    const inside = (x: number, y: number) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 < 1;
    expect(inside(x1, y1), 'tail outside the bubble').toBe(false);
    expect(inside(x2, y2), 'head inside the bubble').toBe(true);
    const polymerase = drawn.nodes.find((node) => node.id === 'actor-rnap')!;
    expect(Math.hypot(x2 - (polymerase.bbox.x + polymerase.bbox.w / 2), y2 - (polymerase.bbox.y + polymerase.bbox.h / 2)), 'head at the polymerase').toBeLessThan(20);
    // The polymerase moves toward the template's 5' end, so the transcript trails on the other side.
    const movesRight = /^strand: template dna 3to5$/m.test(SCENES[name]!.join('\n'));
    expect(Math.sign(x1 - x2), 'trails behind the polymerase').toBe(movesRight ? -1 : 1);
  });

  it.each([['translation', 'ribo', 'pep'], ['fork with polymerase', 'pol', 'newdna']])('%s: an enzyme that synthesizes a product sits on its growing end', async (name, actor, product) => {
    const drawn = await scene(SCENES[name]!);
    const line = drawn.strokes.find((s) => s.id === `product-${product}`)!;
    const node = drawn.nodes.find((n) => n.id === `actor-${actor}`)!;
    const head = { x: line.points[2]!, y: line.points[3]! };
    expect(Math.hypot(head.x - (node.bbox.x + node.bbox.w / 2), head.y - (node.bbox.y + node.bbox.h / 2)), `${actor} at the 3′ end of ${product}`).toBeLessThan(20);
  });
});
