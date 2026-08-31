import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';
import { SceneBuilder } from './scene-build';
import { layoutScene } from './slk';
import type { Scene } from './types';

type Case = {
  id: string;
  family: string;
  kind: 'positive' | 'negative' | 'positive-proposed' | 'negative-proposed';
  spec: string;
};

const CASES: Case[] = [
  { id: 'newman-positive-sawhorse', family: 'newman', kind: 'positive', spec: 'view: sawhorse\nfront: H,CH3,H\nback: H,H,CH3\ndeg: 60\naxis: C-C' },
  { id: 'newman-negative-view', family: 'newman', kind: 'negative', spec: 'view: perspective\nfront: H,H,H\nback: H,H,H' },
  { id: 'fischer-positive-chain', family: 'fischer', kind: 'positive', spec: 'backbone: CHO,OH,H,CH2OH' },
  { id: 'fischer-negative-short-chain', family: 'fischer', kind: 'negative', spec: 'backbone: CHO' },
  { id: 'chair-positive-substituents', family: 'chair', kind: 'positive', spec: 'subst: CH3,OH,Cl' },
  { id: 'chair-negative-overloaded', family: 'chair', kind: 'negative', spec: 'subst: A,B,C,D,E,F,G,H,I' },
  { id: 'haworth-positive-beta', family: 'haworth', kind: 'positive', spec: 'sugar: Gal\nanomer: β' },
  { id: 'haworth-negative-anomer', family: 'haworth', kind: 'negative', spec: 'sugar: Glc\nanomer: gamma' },
  { id: 'lewis-positive-atoms', family: 'lewis', kind: 'positive', spec: 'atoms: N,O,O' },
  { id: 'lewis-negative-empty', family: 'lewis', kind: 'negative', spec: 'atoms:' },
  { id: 'vsepr-positive', family: 'vsepr', kind: 'positive', spec: 'geom: AX3\ncenter: B\nligands: F,F,F' },
  { id: 'vsepr-negative-unsupported', family: 'vsepr', kind: 'negative', spec: 'geom: AX7\ncenter: A\nligands: X,X,X,X,X,X,X' },
  { id: 'complex-positive', family: 'complex', kind: 'positive', spec: 'metal: Co\ngeom: octahedral\nligands: NH3,NH3,Cl,Cl,NH3,NH3' },
  { id: 'complex-negative-missing-ligands', family: 'complex', kind: 'negative', spec: 'metal: Pt\ngeom: square-planar' },
  { id: 'chem-smiles-positive', family: 'chem.smiles', kind: 'positive', spec: 'smiles: CCO\nannotate: alcohol' },
  { id: 'chem-smiles-negative-missing', family: 'chem.smiles', kind: 'negative', spec: 'annotate: missing molecule' },
  { id: 'mo-positive-occupancy', family: 'mo', kind: 'positive', spec: 'left: σ2s -40 2; σ*2s -30 2; π2p -15 2\nright: σ2s -40 2; σ*2s -30 2; π2p -15 4\ncenter: σ2p -8 0\nmolecule: X2\nmix: true' },
  { id: 'mo-negative-level-tuple', family: 'mo', kind: 'negative', spec: 'left: σ2s not-a-number 2' },
  { id: 'cft-positive', family: 'cft', kind: 'positive', spec: 'd: 4\ngeom: octahedral\nlevels: t2g -1 4; eg 1 0' },
  { id: 'cft-negative-electron-count', family: 'cft', kind: 'negative', spec: 'd: 9\nlevels: t2g -1 9; eg 1 0' },
  { id: 'jablonski-positive', family: 'jablonski', kind: 'positive', spec: 'levels: S0 0 2; S1 20 0; T1 12 0\nmolecule: fluorophore' },
  { id: 'jablonski-negative-occupancy', family: 'jablonski', kind: 'negative', spec: 'levels: S0 0 9' },
  { id: 'panel-positive-cross-family', family: 'mo', kind: 'positive-proposed', spec: 'panel: mixed orbital-order\npanel: unmixed orbital-order\nleft: σ2s -40 2' },
  { id: 'panel-negative-coordinate', family: 'mo', kind: 'negative-proposed', spec: 'panel: x=20 y=40' },
];

describe('L7 P3 semantic probes', () => {
  for (const probe of CASES) {
    it(`${probe.id} ${probe.kind === 'negative' || probe.kind === 'negative-proposed' ? 'fails closed' : 'renders asserted semantics'}`, async () => {
      const result = await compileDiagramSpec({ type: probe.family, content: probe.spec }, 'step');
      if (probe.kind === 'negative' || probe.kind === 'negative-proposed') {
        expect(result.ok, result.ok ? `${probe.id} silently succeeded` : result.reason).toBe(false);
        return;
      }
      expect(result.ok, result.ok ? probe.id : `${probe.id}: ${result.reason}`).toBe(true);
      if (!result.ok) return;
      const text = result.scene.labels.map((label) => label.text ?? label.katex ?? '').join('|');
      if (probe.family === 'newman') expect(text).toContain('CH3');
      if (probe.family === 'fischer') expect(text).toContain('CH2OH');
      if (probe.family === 'chair') expect(text).toContain('Cl');
      if (probe.family === 'haworth') expect(text).toContain('β');
      if (probe.family === 'lewis') expect(text).toContain('N');
      if (probe.family === 'vsepr') expect(text).toContain('B');
      if (probe.family === 'complex') expect(text).toContain('Co');
      if (probe.family === 'chem.smiles') expect(text).toContain('alcohol');
      if (probe.family === 'mo') expect(text).toContain('σ2s');
      if (probe.family === 'cft') expect(text).toContain('t2g');
      if (probe.family === 'jablonski') expect(text).toContain('S0');
    });
  }
});

type MoleculeCertificate = { atoms: string[]; bonds: number };

function extractMoleculeCertificate(scene: Scene): MoleculeCertificate {
  const atoms = scene.labels
    .filter((label) => /^atom-label-\d+$/.test(label.id))
    .sort((a, b) => Number(a.id.slice(11)) - Number(b.id.slice(11)))
    .map((label) => label.text ?? label.katex ?? '');
  const bonds = scene.strokes.filter((stroke) => /^bond-\d+-\d+-/.test(stroke.id)).length;
  return { atoms, bonds };
}

function moleculeCertificateMatches(scene: Scene, expected: MoleculeCertificate): boolean {
  const actual = extractMoleculeCertificate(scene);
  return actual.atoms.length === expected.atoms.length
    && actual.atoms.every((atom, i) => atom === expected.atoms[i])
    && actual.bonds === expected.bonds;
}

describe('L7 molecular round-trip certificate', () => {
  it('re-extracts atom order and bond count from a compiled SMILES scene', async () => {
    const result = await compileDiagramSpec({ type: 'chem.smiles', content: 'smiles: CCO' }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(moleculeCertificateMatches(result.scene, { atoms: ['C', 'C', 'O'], bonds: 2 })).toBe(true);
  });

  it('rejects a deliberately wrong scene/spec certificate', () => {
    const b = new SceneBuilder('chem.smiles', 300, 165);
    b.label('atom-label-0', 'C', 60, 80, { protected: true });
    b.label('atom-label-1', 'C', 140, 80, { protected: true });
    b.label('atom-label-2', 'N', 220, 80, { protected: true });
    b.line('bond-0-1-single', 70, 80, 130, 80);
    b.line('bond-1-2-single', 150, 80, 210, 80);
    expect(moleculeCertificateMatches(b.scene(), { atoms: ['C', 'C', 'O'], bonds: 2 })).toBe(false);
  });

  it('keeps label placement stable when only highlight changes', async () => {
    const plain = await compileDiagramSpec({ type: 'chem.smiles', content: 'smiles: CC(=O)O' }, 'step');
    const highlighted = await compileDiagramSpec({ type: 'chem.smiles', content: 'smiles: CC(=O)O\nhighlight: atom-1' }, 'step');
    expect(plain.ok).toBe(true);
    expect(highlighted.ok).toBe(true);
    if (!plain.ok || !highlighted.ok) return;
    const a = layoutScene(plain.scene);
    const b = layoutScene(highlighted.scene);
    expect(a.ok).toBe(true);
    expect(b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.placed.map((label) => [label.label.id, label.x, label.y])).toEqual(b.placed.map((label) => [label.label.id, label.x, label.y]));
  });
});

describe('L7 center-label and stereochemistry boundaries', () => {
  for (const probe of [
    { family: 'vsepr', content: 'geom: AX3\ncenter: B\nligands: F,F,F', centerId: 'center' },
    { family: 'complex', content: 'metal: Co\ngeom: octahedral\nligands: NH3,NH3,Cl,Cl,NH3,NH3', centerId: 'metal' },
  ]) {
    it(`${probe.family} keeps the center label clear of a fake node and connector starts`, async () => {
      const result = await compileDiagramSpec({ type: probe.family, content: probe.content }, 'step');
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const centerX = result.scene.width / 2;
      const centerY = result.scene.height / 2 + 8;
      expect(result.scene.strokes.some((stroke) => stroke.id === probe.centerId)).toBe(false);
      expect(result.scene.strokes
        .filter((stroke) => stroke.id.startsWith('ligand-bond-'))
        .every((stroke) => stroke.points[0] !== centerX || stroke.points[1] !== centerY))
        .toBe(true);
    });
  }

  it('fails closed for stereochemical SMILES instead of dropping slash tokens', async () => {
    const result = await compileDiagramSpec({ type: 'chem.smiles', content: 'smiles: C/C=C/C' }, 'step');
    expect(result.ok).toBe(false);
  });
});
