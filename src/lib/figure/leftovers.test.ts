import { describe, it, expect } from 'vitest';
import { CATALOG_LEFTOVER_TOKENS, FAMILY_CATALOG, canonicalizeDiagramType, isRefuseType } from './catalog';
import { leftoverRegistered, compileLeftover } from './leftovers';
import { compileDiagramSpec } from './compile';
import { parseSpec } from './spec';
import { svgMarkupHasGraphicShapes } from '@/src/lib/mount-svg';
import type { Diagram } from '@/src/protocol/types';

function d(type: string, content: string): Diagram {
  return { type, content };
}

const WORKED: Record<string, string> = {
  hybridpi: 'rpi: 1.2k\ngm: 50m\nRE: 270\nRC: 2.2k\nro: 50k\nhighlight: RC',
  opamp: 'Rf: 10k\nRg: 1k',
  newman: 'axis: C2-C3\ndeg: 60\nfront: H, CH3, H\nback: H, H, Br\nhighlight: Br',
  fischer: 'backbone: CHO,H,OH,CH2OH',
  chair: 'subst: OH,CH3,H',
  haworth: 'sugar: Glc\nanomer: α',
  lewis: 'atoms: C,O',
  vsepr: 'ax: AX4\ncenter: C\ngeom: tetrahedral',
  mo: 'molecule: O2\nmix: true\nleft: 2s -32 2; 2p -15.8 4\nright: 2s -32 2; 2p -15.8 4\ncenter: s2s -36 2; p2p -16 4',
  cft: 'geom: Oh\nd: 6\nlevels: t2g -1 6; eg 1 0',
  jablonski: 'levels: S0 0 2; S1 20 0; T1 12 0',
  mccabe: 'alpha: 2.5\nzF: 0.4\nxD: 0.95\nxB: 0.05\nR: 1.5\nq: 1',
  sfd: 'L: 8\nsign: sagging+\nV: 0 8.5; 2 8.5; 2 -1.5; 8 -9.5\nM: 0 0; 2 17; 8 0',
  phasor: 'vec: I1 18∠-20\nvec: V 12∠0',
  smith: 'z0: 50\nzL: 100+j25',
  feynman: 'kind: s\nincoming: e,e',
  minkowski: 'v: 0.6\nevents: A,B',
  'chem.smiles': 'smiles: CC(=O)Oc1ccccc1C(=O)O',
  timing: 'signal: clk p.....\nsignal: data 0.1.0.',
};

const SECTION_EXTRAS: Record<string, string> = {
  ray: 'f: 20\ndo: 40\nelement: lens',
  beam: 'L: 8\nsupports: pin@0, roller@8',
  array: 'cells: 1,2,3,4',
  cd: 'cells: A,B;C,D',
  schematic: 'kind: pourbaix\nvertices: 0,0; 2,1; 4,3',
  cycle: 'name: Krebs\nnodes: A,B,C,D',
  gel: 'lanes: 1,2,3',
  field: 'catalog: dipole',
  xfmr: 'kind: isolation',
  mechanism: 'from: lp:O@2\nto: atom:C@1',
  kmap: 'vars: AB,CD\nminterms: 0,1,3',
};

describe('leftover catalog completeness', () => {
  it('registers every §12.8 / §23 leftover token', () => {
    for (const token of CATALOG_LEFTOVER_TOKENS) {
      expect(FAMILY_CATALOG[token], token).toBeTruthy();
      expect(leftoverRegistered(token), `${token} dispatch`).toBe(true);
      expect(canonicalizeDiagramType(token)).not.toBe('svg');
    }
  });
});

describe('leftover compilers through compileDiagramSpec', () => {
  for (const [type, content] of Object.entries({ ...WORKED, ...SECTION_EXTRAS })) {
    it(`compiles ${type} to graphic SVG`, async () => {
      const result = await compileDiagramSpec(d(type, content), 'step');
      expect(result.ok, result.ok ? type : `${type}: ${result.reason}`).toBe(true);
      if (result.ok) {
        expect(svgMarkupHasGraphicShapes(result.svg)).toBe(true);
      }
    });
  }

  it('hybrid-π valid spec contains rpi, gm, RE, RC, B, C, E', async () => {
    const result = await compileDiagramSpec(d('hybridpi', WORKED.hybridpi!), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = [...result.scene.nodes.map((n) => n.id), ...result.scene.strokes.map((s) => s.id), ...result.scene.labels.map((l) => l.id)].join(' ');
    for (const need of ['rpi', 'gm', 'RE', 'RC', 'B', 'C', 'E']) {
      expect(ids.toLowerCase()).toContain(need.toLowerCase());
    }
  });

  it('hybrid-π rπ stroke endpoints sit on nodes B and E (Sedra B–E branch)', async () => {
    const result = await compileDiagramSpec(d('hybridpi', WORKED.hybridpi!), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const rpi = result.scene.strokes.find((s) => s.id === 'rpi');
    const nodeB = result.scene.strokes.find((s) => s.id === 'B');
    const nodeE = result.scene.strokes.find((s) => s.id === 'E');
    expect(rpi, 'rpi stroke').toBeTruthy();
    expect(nodeB, 'B node').toBeTruthy();
    expect(nodeE, 'E node').toBeTruthy();
    const pts = rpi!.points;
    expect(pts.length).toBeGreaterThanOrEqual(4);
    const start = { x: pts[0]!, y: pts[1]! };
    const end = { x: pts[pts.length - 2]!, y: pts[pts.length - 1]! };
    expect(nodeB!.kind).toBe('circle');
    expect(nodeE!.kind).toBe('circle');
    expect(start.x).toBeCloseTo(nodeB!.points[0]!, 6);
    expect(start.y).toBeCloseTo(nodeB!.points[1]!, 6);
    expect(end.x).toBeCloseTo(nodeE!.points[0]!, 6);
    expect(end.y).toBeCloseTo(nodeE!.points[1]!, 6);
    expect(result.scene.strokes.some((s) => s.id === 'e-rail' || s.id === 'gnd')).toBe(true);
    const poly = /<polyline[^>]*id="rpi"[^>]*points="([^"]+)"/.exec(result.svg);
    expect(poly?.[1]).toBeTruthy();
    const svgPts = poly![1]!.trim().split(/[\s,]+/).map(Number);
    expect(svgPts[0]).toBeCloseTo(nodeB!.points[0]!, 6);
    expect(svgPts[1]).toBeCloseTo(nodeB!.points[1]!, 6);
    expect(svgPts[svgPts.length - 2]).toBeCloseTo(nodeE!.points[0]!, 6);
    expect(svgPts[svgPts.length - 1]).toBeCloseTo(nodeE!.points[1]!, 6);
  });

  it('Minkowski compiler forces 45° null lines (|Δx|≈|Δy|)', async () => {
    const result = await compileDiagramSpec(d('minkowski', WORKED.minkowski!), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const n1 = result.scene.strokes.find((s) => s.id === 'n1');
    const n2 = result.scene.strokes.find((s) => s.id === 'n2');
    expect(n1, 'n1').toBeTruthy();
    expect(n2, 'n2').toBeTruthy();
    expect(n1!.kind).toBe('line');
    expect(n2!.kind).toBe('line');
    const dx1 = Math.abs(n1!.points[2]! - n1!.points[0]!);
    const dy1 = Math.abs(n1!.points[3]! - n1!.points[1]!);
    const dx2 = Math.abs(n2!.points[2]! - n2!.points[0]!);
    const dy2 = Math.abs(n2!.points[3]! - n2!.points[1]!);
    expect(dx1).toBeGreaterThan(20);
    expect(dx2).toBeGreaterThan(20);
    expect(dx1).toBeCloseTo(dy1, 6);
    expect(dx2).toBeCloseTo(dy2, 6);
    expect(n1!.points[3]! - n1!.points[1]!).toBeLessThan(0);
    expect(n2!.points[3]! - n2!.points[1]!).toBeGreaterThan(0);
    expect(n1!.points[0]).toBeCloseTo(n2!.points[0]!, 6);
    expect(n1!.points[1]).toBeCloseTo(n2!.points[1]!, 6);
  });

  it('hybrid-π missing RC: rejects with no success SVG', async () => {
    const result = await compileDiagramSpec(d('hybridpi', 'rpi: 1k\ngm: 50m\nRE: 270'), 'step');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toMatch(/malformed|refused/);
  });

  it('McCabe output contains a compiler-drawn staircase', async () => {
    const result = await compileDiagramSpec(d('mccabe', WORKED.mccabe!), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.svg).toContain('stairs');
    expect(result.scene.strokes.some((s) => s.id === 'stairs')).toBe(true);
  });

  it('SFD is stacked/aligned with V and M', async () => {
    const result = await compileDiagramSpec(d('sfd', WORKED.sfd!), 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.svg).toMatch(/id="V"/);
    expect(result.svg).toMatch(/id="M"/);
  });

  it('refuse families do not produce graphic success SVG', async () => {
    for (const type of ['jcamp', 'fea', 'gds', 'histology']) {
      expect(isRefuseType(type)).toBe(true);
      const result = await compileDiagramSpec(d(type, 'kind: dump'), 'step');
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.code).toBe('refused');
    }
  });

  it('type=tline compiles to two conductors with Z0 and load, not a hatch grid', async () => {
    const result = await compileDiagramSpec(d('tline', 'z0: 50\nzl: 100\ntd: 5n'), 'step');
    expect(result.ok, result.ok ? 'tline' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(svgMarkupHasGraphicShapes(result.svg)).toBe(true);
    const ids = [
      ...result.scene.strokes.map((s) => s.id),
      ...result.scene.labels.map((l) => l.id),
    ].join(' ');
    expect(ids).toMatch(/cond-top/);
    expect(ids).toMatch(/cond-bot/);
    expect(ids).toMatch(/\bz0\b/i);
    expect(ids).toMatch(/\bzl\b|\bload\b/i);
    expect(ids).not.toMatch(/\bh0\b/);
    expect(ids).not.toMatch(/\bv0\b/);
    const horiz = result.scene.strokes.filter((s) => s.id.startsWith('cond-'));
    expect(horiz.length).toBe(2);
    const labelText = result.scene.labels.map((l) => l.text ?? l.katex ?? '').join(' ');
    expect(labelText).toMatch(/Z0/i);
    expect(labelText).toMatch(/ZL/i);
    const hatchHoriz = result.scene.strokes.filter((s) => /^h\d+$/.test(s.id));
    expect(hatchHoriz.length).toBeLessThan(3);
  });

  it('generic leftover compile is a labeled apparatus, not a dashed completeness slash', async () => {
    const spec = parseSpec('apparatus', 'T: 300K\nP: 1atm\nV: 2L');
    const result = await compileLeftover('apparatus', spec, { profile: 'step', family: 'apparatus' });
    expect(result.ok, result.ok ? 'generic' : result.reason).toBe(true);
    if (!result.ok) return;
    expect(svgMarkupHasGraphicShapes(result.svg)).toBe(true);
    expect(result.scene.strokes.some((s) => s.id === 'apparatus')).toBe(true);
    expect(result.scene.strokes.some((s) => s.dash)).toBe(false);
    const labelText = result.scene.labels.map((l) => l.text ?? l.katex ?? '').join(' ');
    expect(labelText).toMatch(/T=300K/);
    expect(labelText).toMatch(/P=1atm/);
    expect(labelText).toMatch(/V=2L/);
    const slash = result.scene.strokes.find((s) => s.id === 'g1' && s.dash);
    expect(slash).toBeUndefined();
  });

  it('does not smuggle research-only names as FAMILY_CATALOG families', () => {
    const forbidden = [
      'nline',
      'shaft',
      'punnett',
      'pedigree',
      'magcirc',
      'devicemodel',
      'crispr',
      'western',
      'karyo',
      'IL',
      'sfd-bmd',
      'cv',
      'rcm',
      'pid',
      'airfoil',
      'ttt',
      'poincare',
      'penrose',
      'heap',
      'dfa',
    ];
    for (const token of forbidden) {
      expect(FAMILY_CATALOG[token], token).toBeUndefined();
      expect(FAMILY_CATALOG[token.toLowerCase()], token).toBeUndefined();
    }
  });
});
