import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

describe('molecular layout topology', () => {
  // D22: a skeletal formula draws atoms as scene nodes (no circles) and aromatic rings Kekulé.
  it.each([['Cc1ccccc1', [1, 2, 3, 4, 5, 6]], ['CC(=O)Oc1ccccc1C(=O)O', [4, 5, 6, 7, 8, 9]]] as const)('keeps a substituted aromatic ring regular: %s', async (smiles, ring) => {
    const result = await compileDiagramSpec({ type: 'chem.smiles', content: `smiles: ${smiles}` });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const atoms = result.scene.nodes.filter(node => /^atom-\d+$/.test(node.id))
      .map(node => ({ id: Number(node.id.slice(5)), x: node.bbox.x + node.bbox.w / 2, y: node.bbox.y + node.bbox.h / 2 }));
    const at = (i: number) => atoms.find(atom => atom.id === i)!;
    const ringBonds = ring.map((a, i) => [Math.min(a, ring[(i + 1) % ring.length]!), Math.max(a, ring[(i + 1) % ring.length]!)] as const);
    const orders = ringBonds.map(([a, b]) => result.scene.strokes.filter(stroke => stroke.id.startsWith(`bond-${a}-${b}-`)).length);
    expect(orders.every(order => order >= 1)).toBe(true);
    const lengths = ringBonds.map(([a, b]) => Math.hypot(at(a).x - at(b).x, at(a).y - at(b).y));
    expect(Math.max(...lengths) / Math.min(...lengths)).toBeLessThan(1.05);
    // Kekulé: three ring double bonds, never two in a row.
    expect(orders.filter(order => order === 2)).toHaveLength(3);
    orders.forEach((order, i) => expect(order + orders[(i + 1) % orders.length]!).toBe(3));
    // No two atoms crowd each other (was: no two atom circles overlap).
    for (const atom of atoms) {
      for (const other of atoms) {
        if (atom.id === other.id) continue;
        expect(Math.hypot(atom.x - other.x, atom.y - other.y)).toBeGreaterThan(Math.min(...lengths) * 0.7);
      }
    }
  });
});
