import { describe, expect, it } from 'vitest';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import type { CompileResult, Scene } from './types';
import { SceneBuilder } from './scene-build';
import { parseSpec } from './spec';
import {
  compileAnatomy,
  compileCellBio,
  compileCycle,
  compileMembrane,
} from './leftovers/rest-bio';

const ctx = (family: string) => ({ family, profile: 'step' as const });

function compile(
  family: string,
  source: string,
  fn: (spec: ReturnType<typeof parseSpec>, context: ReturnType<typeof ctx>) => CompileResult,
): CompileResult {
  return fn(parseSpec(family, source), ctx(family));
}

type CellBranch = { id: string; from: string; to: string; epsilon: string; resistance: string };

function extractCellBranches(scene: Scene): CellBranch[] {
  const nodeIds = new Set(scene.nodes.map((node) => node.id));
  return scene.strokes
    .filter((stroke) => /^cell-\d+$/.test(stroke.id) && stroke.points.length >= 4)
    .map((stroke) => {
      const fromPoint = `${stroke.points[0]},${stroke.points[1]}`;
      const toPoint = `${stroke.points[stroke.points.length - 2]},${stroke.points[stroke.points.length - 1]}`;
      const endpoint = (point: string) => {
        const node = scene.nodes.find((candidate) => {
          const [rawX = 'NaN', rawY = 'NaN'] = point.split(',');
          const x = Number(rawX);
          const y = Number(rawY);
          return candidate.bbox.x <= x && x <= candidate.bbox.x + candidate.bbox.w
            && candidate.bbox.y <= y && y <= candidate.bbox.y + candidate.bbox.h;
        });
        return node?.id ?? '';
      };
      const labels = scene.labels.filter((label) => label.anchorId === stroke.id);
      return {
        id: stroke.id,
        from: endpoint(fromPoint),
        to: endpoint(toPoint),
        epsilon: labels.find((label) => label.id.endsWith('-epsilon'))?.text ?? '',
        resistance: labels.find((label) => label.id.endsWith('-resistance'))?.text ?? '',
      };
    });
}

function cellCertificate(scene: Scene, expected: CellBranch[]): boolean {
  const actual = extractCellBranches(scene);
  if (actual.length !== expected.length) return false;
  return expected.every((branch) => actual.some((candidate) =>
    candidate.id === branch.id
      && candidate.from === branch.from
      && candidate.to === branch.to
      && candidate.epsilon === branch.epsilon
      && candidate.resistance === branch.resistance,
  ));
}

function expectSuccess(result: CompileResult): asserts result is Extract<CompileResult, { ok: true }> {
  expect(result.ok, result.ok ? '' : result.reason).toBe(true);
}

function centreOf(node: { bbox: { x: number; y: number; w: number; h: number } }): { x: number; y: number } {
  return { x: node.bbox.x + node.bbox.w / 2, y: node.bbox.y + node.bbox.h / 2 };
}

function quadraticEndpoints(d: string): [{ x: number; y: number }, { x: number; y: number }] {
  const match = /^M\s+([-\d.]+)\s+([-\d.]+)\s+Q\s+[-\d.]+\s+[-\d.]+\s+([-\d.]+)\s+([-\d.]+)$/.exec(d);
  if (!match) throw new Error(`expected one quadratic path, got ${d}`);
  return [
    { x: Number(match[1]), y: Number(match[2]) },
    { x: Number(match[3]), y: Number(match[4]) },
  ];
}

describe('L10 cell compiler and round-trip certificate', () => {
  it('preserves labelled terminals and every parallel source branch', () => {
    const result = compileCellBio(parseSpec('cell', [
      'kind: parallel-source',
      'node: A terminal',
      'node: C terminal',
      'edge: A C source-branch epsilon1 r1',
      'edge: A C source-branch epsilon2 r2',
      'label: I attaches=external-current',
      'order: A -> C',
    ].join('\n')), ctx('cell'));
    expectSuccess(result);
    expect(result.scene.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(['A', 'C']));
    expect(cellCertificate(result.scene, [
      { id: 'cell-1', from: 'A', to: 'C', epsilon: 'epsilon1', resistance: 'r1' },
      { id: 'cell-2', from: 'A', to: 'C', epsilon: 'epsilon2', resistance: 'r2' },
    ])).toBe(true);
  });

  it('rejects a deliberately wrong scene that swaps a branch endpoint', () => {
    const b = new SceneBuilder('cell', 300, 165);
    b.node('A', 20, 70, 10, 10);
    b.node('C', 270, 70, 10, 10);
    b.node('B', 140, 70, 10, 10);
    b.polyline('cell-1', [25, 75, 145, 75]);
    b.label('cell-1-epsilon', 'epsilon1', 150, 50, { anchorId: 'cell-1' });
    b.label('cell-1-resistance', 'r1', 150, 100, { anchorId: 'cell-1' });
    expect(cellCertificate(b.scene(), [
      { id: 'cell-1', from: 'A', to: 'C', epsilon: 'epsilon1', resistance: 'r1' },
    ])).toBe(false);
  });

  it('fails closed for an unknown branch endpoint and opposed polarity', () => {
    const missing = compileCellBio(parseSpec('cell', 'kind: parallel-source\nnode: A terminal\nedge: A missing source-branch e r'), ctx('cell'));
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.reason).toContain('missing-endpoint');

    const opposed = compileCellBio(parseSpec('cell', 'kind: parallel-source\nnode: A terminal\nnode: C terminal\nedge: A C source-branch e r polarity=opposed'), ctx('cell'));
    expect(opposed.ok).toBe(false);
    if (!opposed.ok) expect(opposed.reason).toContain('ambiguous-polarity');
  });

  it('preserves terminals for an equivalent source reduction', () => {
    const result = compileCellBio(parseSpec('cell', 'kind: equivalent-source\nnode: A terminal\nnode: C terminal\nedge: A C equivalent-source epsiloneq req\nlabel: epsiloneq attaches=equivalent-source'), ctx('cell'));
    expectSuccess(result);
    expect(result.scene.nodes.map((node) => node.id)).toEqual(expect.arrayContaining(['A', 'C']));
    expect(result.scene.strokes.some((stroke) => stroke.id === 'equivalent-source')).toBe(true);
    expect(result.scene.labels.filter((label) => label.text === 'epsiloneq')).toHaveLength(1);
  });
});

describe('L10 directed and phase cycles', () => {
  it('draws a closed directed cycle from the explicit order and edge labels', () => {
    const result = compileCycle(parseSpec('cycle', [
      'kind: directed-cycle',
      'node: Pi process',
      'node: Pj process',
      'node: Pk process',
      'edge: Pi Pj waits label=x',
      'edge: Pj Pk waits label=y',
      'edge: Pk Pi waits label=z',
      'order: Pi -> Pj -> Pk -> Pi',
    ].join('\n')), ctx('cycle'));
    expectSuccess(result);
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('edge-'))).toHaveLength(3);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toMatch(/x/);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toMatch(/y/);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toMatch(/z/);
  });

  it('rejects an open order instead of inferring closure', () => {
    const result = compileCycle(parseSpec('cycle', 'kind: directed-cycle\nnode: Pi process\nnode: Pj process\nnode: Pk process\nedge: Pi Pj waits\nedge: Pj Pk waits\norder: Pi -> Pj -> Pk'), ctx('cycle'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('cycle-not-closed');
  });

  it('represents a weighted cycle subgraph without inventing a shortest path', () => {
    const result = compileCycle(parseSpec('cycle', [
      'kind: directed-weighted',
      'node: s source',
      'node: t target',
      'edge: s n1 weight=5',
      'edge: n1 n2 weight=2',
      'edge: n2 n3 weight=-8',
      'edge: n3 n2 weight=1',
      'edge: n3 t weight=3',
      'label: undefined attaches=negative-cycle',
    ].join('\n')), ctx('cycle'));
    expectSuccess(result);
    expect(result.scene.strokes.filter((stroke) => stroke.id.startsWith('edge-'))).toHaveLength(5);
    expect(result.scene.labels.some((label) => label.text === 'undefined')).toBe(true);
    expect(result.svg).toEqual(expect.stringContaining('weight=5'));
    expect(result.svg).toEqual(expect.stringContaining('weight=2'));
    expect(result.svg).toEqual(expect.stringContaining('weight=-8'));
    expect(result.svg).toEqual(expect.stringContaining('weight=1'));
    expect(result.svg).toEqual(expect.stringContaining('weight=3'));
  });

  it('keeps a grouped mitosis branch distinct from the phase cycle', () => {
    const result = compileCycle(parseSpec('cycle', [
      'kind: phase-cycle',
      'node: G1 phase',
      'node: S phase',
      'node: G2 phase',
      'node: M group',
      'node: G0 branch',
      'group: M contains=prophase,metaphase,anaphase,telophase,cytokinesis',
      'order: G1 -> S -> G2 -> M -> G1',
      'edge: G1 G0 branch',
    ].join('\n')), ctx('cycle'));
    expectSuccess(result);
    expect(result.scene.panels?.some((panel) => panel.id === 'M-panel')).toBe(true);
    expect(result.scene.strokes.some((stroke) => stroke.id === 'branch-G1-G0')).toBe(true);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toContain('prophase');
  });

  it('keeps directed edge arrowheads outside node labels', () => {
    const result = compileCycle(parseSpec('cycle', [
      'kind: directed-cycle',
      'node: Pi process',
      'node: Pj process',
      'node: Pk process',
      'edge: Pi Pj waits label=x',
      'edge: Pj Pk waits label=y',
      'edge: Pk Pi waits label=z',
      'order: Pi -> Pj -> Pk -> Pi',
    ].join('\n')), ctx('cycle'));
    expectSuccess(result);
    const edge = result.scene.strokes.find((stroke) => stroke.id === 'edge-Pi-Pj-1');
    const from = centreOf(result.scene.nodes.find((node) => node.id === 'Pi')!);
    const to = centreOf(result.scene.nodes.find((node) => node.id === 'Pj')!);
    const [start, end] = quadraticEndpoints(edge?.d ?? '');
    expect(Math.hypot(start.x - from.x, start.y - from.y)).toBeGreaterThan(0);
    expect(Math.hypot(end.x - to.x, end.y - to.y)).toBeGreaterThan(0);
  });

  it('reserves a non-overlapping panel for every grouped phase member', () => {
    const result = compileCycle(parseSpec('cycle', [
      'kind: phase-cycle',
      'node: G1 phase',
      'node: S phase',
      'node: G2 phase',
      'node: M group',
      'node: G0 branch',
      'group: M contains=prophase,metaphase,anaphase,telophase,cytokinesis',
      'order: G1 -> S -> G2 -> M -> G1',
      'edge: G1 G0 branch',
    ].join('\n')), ctx('cycle'));
    expectSuccess(result);
    const panel = result.scene.panels?.find((candidate) => candidate.id === 'M-panel');
    expect(panel).toBeDefined();
    const overlaps = (a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) =>
      a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    expect(result.scene.nodes.filter((node) => ['G1', 'S', 'G2', 'M', 'G0'].includes(node.id)).some((node) => overlaps(panel!.bbox, node.bbox))).toBe(false);
  });
});

describe('L10 membrane and anatomy semantics', () => {
  it('renders every membrane state in the declared cycle order', () => {
    const result = compileMembrane(parseSpec('membrane', [
      'kind: membrane-cycle',
      'state: A inward-open',
      'state: B inward-open',
      'state: C outward-open',
      'state: D outward-open',
      'state: E occluded',
      'state: F inward-open',
      'order: A -> B -> C -> D -> E -> F -> A',
      'direction: sodium outward',
      'direction: potassium inward',
      'label: ATP attaches=B',
      'label: ADP attaches=C',
      'label: Pi attaches=E',
    ].join('\n')), ctx('membrane'));
    expectSuccess(result);
    expect(result.scene.panels?.filter((panel) => panel.id.startsWith('state-'))).toHaveLength(6);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toMatch(/ATP/);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toMatch(/ADP/);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toMatch(/Pi/);
    expect(result.svg).toContain('potassium inward');
  });

  it('rejects a membrane order that is not the declared cycle', () => {
    const result = compileMembrane(parseSpec('membrane', 'kind: membrane-cycle\norder: A -> B -> C -> F -> E -> D -> A\nstate: D outward-open\nstate: E occluded\nstate: F inward-open'), ctx('membrane'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toContain('invalid-panel-order');
  });

  it('draws a conic with distinct locus roles and attached labels', () => {
    const result = compileAnatomy(parseSpec('anatomy', [
      'kind: conic',
      'node: parabola locus',
      'node: axis symmetry-line',
      'node: directrix line',
      'node: vertex point',
      'node: focus point',
      'edge: parabola axis symmetric-about',
      'edge: vertex axis lies-on',
      'edge: focus axis lies-on',
      'label: Directrix attaches=directrix',
      'label: Vertex attaches=vertex',
      'label: Focus attaches=focus',
    ].join('\n')), ctx('anatomy'));
    expectSuccess(result);
    expect(result.scene.strokes.some((stroke) => stroke.id === 'directrix')).toBe(true);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toMatch(/Directrix/);
    expect(result.scene.labels.map((label) => label.text).join(' ')).toMatch(/Focus/);
  });

  it('keeps a conic axis collinear with vertex/focus and perpendicular to directrix', () => {
    const result = compileAnatomy(parseSpec('anatomy', [
      'kind: conic',
      'node: parabola locus',
      'node: axis symmetry-line',
      'node: directrix line',
      'node: vertex point',
      'node: focus point',
      'edge: parabola axis symmetric-about',
      'edge: vertex axis lies-on',
      'edge: focus axis lies-on',
    ].join('\n')), ctx('anatomy'));
    expectSuccess(result);
    const axis = result.scene.strokes.find((stroke) => stroke.id === 'axis');
    const directrix = result.scene.strokes.find((stroke) => stroke.id === 'directrix');
    expect(axis?.points[1]).toBeCloseTo(axis?.points[3] ?? Number.NaN);
    expect(directrix?.points[0]).toBeCloseTo(directrix?.points[2] ?? Number.NaN);
    const axisY = axis?.points[1] ?? Number.NaN;
    for (const id of ['vertex', 'focus']) {
      const node = result.scene.nodes.find((candidate) => candidate.id === id);
      expect(centreOf(node!).y).toBeCloseTo(axisY);
    }
  });

  it('fails closed on invalid conic relations and page-like inputs', () => {
    const invalid = compileAnatomy(parseSpec('anatomy', 'kind: conic\nnode: parabola locus\nnode: directrix line\nnode: focus point\nedge: focus directrix lies-on\nlabel: Focus attaches=focus'), ctx('anatomy'));
    expect(invalid.ok).toBe(false);
    if (!invalid.ok) expect(invalid.reason).toContain('invalid-conic-relation');

    const page = compileCycle(parseSpec('cycle', 'kind: page\nlabel: question text attaches=page'), ctx('cycle'));
    expect(page.ok).toBe(false);
    if (!page.ok) expect(page.reason).toContain('no-standalone-figure');
  });
});

describe('L10 DEV render hook', () => {
  it('writes the declared positive render set for raster inspection', async () => {
    const renderDir = resolve('artifacts/figlab/renders/L10');
    await mkdir(renderDir, { recursive: true });
    const cases = [
      ['cell-parallel-two-branches', compileCellBio, 'kind: parallel-source\nnode: A terminal\nnode: C terminal\nedge: A C source-branch epsilon1 r1\nedge: A C source-branch epsilon2 r2\nlabel: I attaches=external-current\norder: A -> C'],
      ['cell-equivalent-preserves-terminals', compileCellBio, 'kind: equivalent-source\nnode: A terminal\nnode: C terminal\nedge: A C equivalent-source epsiloneq req\nlabel: epsiloneq attaches=equivalent-source'],
      ['cycle-wait-three-node', compileCycle, 'kind: directed-cycle\nnode: Pi process\nnode: Pj process\nnode: Pk process\nedge: Pi Pj waits label=x\nedge: Pj Pk waits label=y\nedge: Pk Pi waits label=z\norder: Pi -> Pj -> Pk -> Pi'],
      ['cycle-negative-weight-witness', compileCycle, 'kind: directed-weighted\nnode: s source\nnode: t target\nedge: s n1 weight=5\nedge: n1 n2 weight=2\nedge: n2 n3 weight=-8\nedge: n3 n2 weight=1\nedge: n3 t weight=3\nlabel: undefined attaches=negative-cycle'],
      ['cycle-phase-group-branch', compileCycle, 'kind: phase-cycle\nnode: G1 phase\nnode: S phase\nnode: G2 phase\nnode: M group\nnode: G0 branch\ngroup: M contains=prophase,metaphase,anaphase,telophase,cytokinesis\norder: G1 -> S -> G2 -> M -> G1\nedge: G1 G0 branch'],
      ['membrane-boustrophedon-order', compileMembrane, 'kind: membrane-cycle\nstate: A inward-open\nstate: B inward-open\nstate: C outward-open\nstate: D outward-open\nstate: E occluded\nstate: F inward-open\norder: A -> B -> C -> D -> E -> F -> A\ndirection: sodium outward\ndirection: potassium inward\nlabel: ATP attaches=B\nlabel: ADP attaches=C\nlabel: Pi attaches=E'],
      ['anatomy-parabola-relations', compileAnatomy, 'kind: conic\nnode: parabola locus\nnode: axis symmetry-line\nnode: directrix line\nnode: vertex point\nnode: focus point\nedge: parabola axis symmetric-about\nedge: vertex axis lies-on\nedge: focus axis lies-on\nlabel: Directrix attaches=directrix\nlabel: Vertex attaches=vertex\nlabel: Focus attaches=focus'],
      ['anatomy-stomata-paired-views', compileAnatomy, 'kind: paired-apparatus\nnode: bean-guard-cells paired-guard-cells\nnode: dumbbell-guard-cells paired-guard-cells\nnode: bean-pore pore\nnode: dumbbell-pore pore\ngroup: bean-view contains=bean-guard-cells,bean-pore\ngroup: dumbbell-view contains=dumbbell-guard-cells,dumbbell-pore\nedge: bean-view dumbbell-view compares\nlabel: stomatal pore attaches=bean-pore'],
    ] as const;
    for (const [id, compiler, content] of cases) {
      const result = compiler(parseSpec(id.startsWith('cell-') ? 'cell' : id.startsWith('cycle-') ? 'cycle' : id.startsWith('membrane-') ? 'membrane' : 'anatomy', content), ctx(id.startsWith('cell-') ? 'cell' : id.startsWith('cycle-') ? 'cycle' : id.startsWith('membrane-') ? 'membrane' : 'anatomy'));
      expectSuccess(result);
      await writeFile(join(renderDir, `${id}.svg`), result.svg, 'utf8');
    }
    expect(cases).toHaveLength(8);
  });
});
