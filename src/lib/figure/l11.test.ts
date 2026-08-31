import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import type { Scene } from './types';

function labelText(scene: Scene): string[] {
  return scene.labels.map((label) => label.text ?? label.katex ?? '');
}

function extractListSemantics(scene: Scene): { nodes: string[]; relations: string[] } {
  const nodes = scene.labels
    .filter((label) => label.id.startsWith('node-label-'))
    .map((label) => label.text ?? label.katex ?? '');
  const relations = scene.strokes
    .filter((stroke) => stroke.id.startsWith('relation-'))
    .map((stroke) => stroke.id);
  return { nodes, relations };
}

function listCertificate(scene: Scene, expectedNodes: string[], expectedRelations: number): boolean {
  const actual = extractListSemantics(scene);
  return (
    JSON.stringify(actual.nodes) === JSON.stringify(expectedNodes) &&
    actual.relations.length === expectedRelations
  );
}

describe('L11 semantic collection and relation probes', () => {
  it('preserves ragged array item order and consumes every cell', async () => {
    const result = await compileDiagramSpec(
      { type: 'array', content: 'cells: 1,2;3,4,5\norder: row-major\nlayout: centered' },
      'step',
    );
    expect(result.ok, result.ok ? 'array' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(labelText(result.scene)).toEqual(expect.arrayContaining(['1', '2', '3', '4', '5']));
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('cell-')).length).toBe(5);
    expect(result.scene.strokes.some((stroke) => stroke.id.includes('row-1'))).toBe(true);
  }, 15000);

  it('round-trips an explicitly directed list relation graph', async () => {
    const result = await compileDiagramSpec(
      { type: 'list', content: 'nodes: A,B,C\nrelations: A->B feeds; B->C feeds' },
      'step',
    );
    expect(result.ok, result.ok ? 'list' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(listCertificate(result.scene, ['A', 'B', 'C'], 2)).toBe(true);
    expect(result.scene.strokes.filter((stroke) => stroke.markerEnd).length).toBe(2);
  });

  it('certificate rejects a deliberately wrong scene', async () => {
    const result = await compileDiagramSpec(
      { type: 'list', content: 'nodes: A,B,C\nrelations: A->B feeds; B->C feeds' },
      'step',
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const wrong: Scene = structuredClone(result.scene);
    const nodeLabel = wrong.labels.find((label) => label.id === 'node-label-1');
    if (nodeLabel) nodeLabel.text = 'invented';
    expect(listCertificate(wrong, ['A', 'B', 'C'], 2)).toBe(false);
  });

  it('fails closed when a relation endpoint is missing', async () => {
    const result = await compileDiagramSpec(
      { type: 'list', content: 'nodes: A,B\nrelations: A feeds' },
      'step',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/endpoint|relation/i);
  });

  it('fails closed when a list relation is not adjacent in the declared order', async () => {
    const result = await compileDiagramSpec(
      { type: 'list', content: 'nodes: A,B,C\nrelations: A->C feeds; B->C feeds' },
      'step',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/adjacent|linear|list/i);
  });

  it('fails closed when a schematic declares multiple panels without panel-scoped content', async () => {
    const result = await compileDiagramSpec(
      { type: 'schematic', content: 'kind: composite\npanel: schematic,table\nnodes: gate1,gate2\nrelations: gate1->gate2 cross-coupled' },
      'step',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/panel|composite|scope/i);
  });

  it('fails closed when a sphere declares multiple panels the engine cannot separate', async () => {
    const result = await compileDiagramSpec(
      { type: 'sphere', content: 'kind: radial-comparison\npanel: surfaces,field\nnodes: source\nrelations: field->source radiates-from\ndirection: outward' },
      'step',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/panel|comparison|separate/i);
  });

  it('binds pipeline stage order and directed connectors to the input', async () => {
    const result = await compileDiagramSpec(
      { type: 'pipeline', content: 'stages: fetch,decode,execute\norder: forward' },
      'step',
    );
    expect(result.ok, result.ok ? 'pipeline' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(labelText(result.scene)).toEqual(expect.arrayContaining(['fetch', 'decode', 'execute']));
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('stage-link-')).length).toBe(2);
  });
});
