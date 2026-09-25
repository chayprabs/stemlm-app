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

  it('fails closed when a schematic kind and relation are not represented', async () => {
    const result = await compileDiagramSpec(
      { type: 'schematic', content: 'kind: unsupported\nnodes: A,B\nrelations: A->B teleport' },
      'step',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/unsupported|schematic|relation|represented/i);
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

  it.each([
    ['list', 'nodes: A,B,C\nrelations: A->B teleport; B->C feeds'],
    ['pipeline', 'stages: A,B,C\nrelations: A->B teleport; B->C feeds'],
    ['ring', 'nodes: A,B,C\nrelations: A->B teleport; B->C next'],
    ['datapath', 'kind: cpu\nnodes: A,B,C\nrelations: A->B teleport; B->C feeds'],
    ['topology', 'nodes: A,B,C\nidentifications: A=B\nrelations: A->B teleport; B->C feeds'],
  ] as const)('fails closed for an unsupported declared relation role in %s', async (type, content) => {
    const result = await compileDiagramSpec({ type, content }, 'step');
    expect(result.ok, result.ok ? `${type} unexpectedly compiled` : result.reason).toBe(false);
    if (!result.ok) {
      expect(result.code).toBe('malformed');
      expect(result.reason).toMatch(/unsupported|relation|represented/i);
    }
  });

  it.each([
    ['list', 'nodes: A,B,C\nrelations: A->B next; B->C feeds'],
    ['pipeline', 'stages: A,B,C\nrelations: A->B next; B->C feeds'],
    ['ring', 'nodes: A,B,C\nrelations: A->B next; B->C feeds'],
    ['datapath', 'kind: cpu\nnodes: A,B,C\nrelations: A->B next; B->C feeds'],
    ['topology', 'nodes: A,B,C\nidentifications: A=B\nrelations: A->B next; B->C feeds'],
  ] as const)('preserves supported declared relation roles in %s', async (type, content) => {
    const result = await compileDiagramSpec({ type, content }, 'step');
    expect(result.ok, result.ok ? type : result.reason).toBe(true);
    if (!result.ok) return;
    const relationStrokes = result.scene.strokes.filter((stroke) =>
      /(?:relation|link)-/.test(stroke.id),
    );
    expect(relationStrokes).toHaveLength(2);
    expect(relationStrokes.every((stroke) => stroke.markerEnd || stroke.markerStart)).toBe(true);
  });
});

describe('L11 malformed declaration boundaries', () => {
  const cases: Array<[string, string, string]> = [
    ['hash bucket entries', 'hash', 'm: 2\nbuckets: 0: A; malformed'],
    ['Gantt jobs', 'gantt', 'jobs: task 0 2; malformed\ntnow: 1'],
    ['array rows', 'array', 'cells: A,B;;C,D'],
    ['topology identifications', 'topology', 'nodes: A,B\nidentifications: A=B; malformed'],
    ['mechanism arrows', 'mechanism', 'from: A\nto: B\narrow: A B malformed'],
  ];

  for (const [name, type, content] of cases) {
    it(`fails closed for a malformed ${name} declaration`, async () => {
      const result = await compileDiagramSpec({ type, content }, 'step');
      expect(result.ok, result.ok ? `${type} unexpectedly compiled` : result.reason).toBe(false);
      if (!result.ok) expect(result.code).toBe('malformed');
    });
  }
});

describe('L11 duplicate and empty semantic declarations', () => {
  it('rejects mixed relations with an empty segment', async () => {
    const result = await compileDiagramSpec({ type: 'list', content: 'nodes: A,B,C\nrelations: A->B feeds;;B->C feeds' }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('malformed');
  });

  it('rejects an empty topology identification segment', async () => {
    const result = await compileDiagramSpec({ type: 'topology', content: 'nodes: A,B\nidentifications: A=B;;B=A' }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('malformed');
  });

  it('rejects a non-numeric current-time declaration', async () => {
    const result = await compileDiagramSpec({ type: 'gantt', content: 'jobs: task 0 2\ntnow: nope' }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('malformed');
  });

  it('rejects an empty mechanism arrow declaration', async () => {
    const result = await compileDiagramSpec({ type: 'mechanism', content: 'from: A\nto: B\narrow:' }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('malformed');
  });

  it('rejects a duplicate relation', async () => {
    const result = await compileDiagramSpec({ type: 'list', content: 'nodes: A,B,C\nrelations: A->B feeds; A->B feeds; B->C feeds' }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('malformed');
  });

  it('rejects a duplicate Gantt job', async () => {
    const result = await compileDiagramSpec({ type: 'gantt', content: 'jobs: task 0 2; task 0 2' }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('malformed');
  });

  it('rejects a topology identification that names an undeclared side', async () => {
    const result = await compileDiagramSpec({ type: 'topology', content: 'nodes: A,B\nidentifications: A=Z' }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('malformed');
  });

  it('rejects duplicate pipeline stages', async () => {
    const result = await compileDiagramSpec({ type: 'pipeline', content: 'stages: fetch,decode,decode' }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('malformed');
  });

  it('rejects duplicate K-map minterms', async () => {
    const result = await compileDiagramSpec({ type: 'kmap', content: 'vars: AB,CD\nminterms: 0,1,1' }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe('malformed');
  });

  it.each(['list', 'ring', 'datapath', 'schematic', 'topology'])('rejects duplicate named nodes in %s', async (type) => {
    let content = 'nodes: A,B,A';
    if (type === 'topology') content += '\nidentifications: A=B';
    if (type === 'datapath') content = 'kind: cpu\n' + content;
    if (type === 'schematic') content = 'kind: graph\n' + content + '\nrelations: A->B feeds';
    const result = await compileDiagramSpec({ type, content }, 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toMatch(/duplicate|node|named|topology|ring|list|datapath|schematic/i);
  });
});
