import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

describe('molecular layout topology', () => {
  it.each(['Cc1ccccc1', 'CC(=O)Oc1ccccc1C(=O)O'])('keeps a substituted aromatic ring regular: %s', async smiles => {
    const result = await compileDiagramSpec({ type: 'chem.smiles', content: `smiles: ${smiles}` });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const atoms = result.scene.strokes.filter(s => /^atom-\d+$/.test(s.id));
    const bonds = result.scene.strokes.filter(s => s.dash && /^bond-/.test(s.id));
    expect(bonds).toHaveLength(6);
    const lengths = bonds.map(bond => {
      const [, ai, bi] = bond.id.split('-');
      const a = atoms.find(atom => atom.id === `atom-${ai}`)!;
      const b = atoms.find(atom => atom.id === `atom-${bi}`)!;
      return Math.hypot(a.points[0]! - b.points[0]!, a.points[1]! - b.points[1]!);
    });
    expect(Math.max(...lengths) / Math.min(...lengths)).toBeLessThan(1.05);
    for (const atom of atoms) {
      for (const other of atoms) {
        if (atom.id === other.id) continue;
        expect(Math.hypot(atom.points[0]! - other.points[0]!, atom.points[1]! - other.points[1]!))
          .toBeGreaterThan(atom.points[2]! + other.points[2]!);
      }
    }
  });
});
