import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

describe('L7 chemistry fidelity boundaries', () => {
  it('rejects impossible valence and malformed bracket atoms', async () => {
    const impossible = await compileDiagramSpec({ type: 'chem.smiles', content: 'smiles: C#C#C' }, 'step');
    const malformedBracket = await compileDiagramSpec({ type: 'chem.smiles', content: 'smiles: [NH4foo+]' }, 'step');
    expect(impossible.ok).toBe(false);
    expect(malformedBracket.ok).toBe(false);
  });

  it('preserves aromatic bond semantics in the scene', async () => {
    const result = await compileDiagramSpec({ type: 'chem.smiles', content: 'smiles: c1ccccc1' }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scene.strokes.filter((stroke) => /^bond-/.test(stroke.id))).toHaveLength(12);
  });

  it('keeps Fischer horizontal substituents instead of dropping them', async () => {
    const result = await compileDiagramSpec({
      type: 'fischer',
      content: 'backbone: CHO,C1,C2,CH2OH\nleft: OH,H\nright: H,OH',
    }, 'step');
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const labels = result.scene.labels.map((label) => label.text ?? label.katex ?? '');
    expect(labels).toEqual(expect.arrayContaining(['OH', 'H']));
    expect(result.scene.strokes.filter((stroke) => /^cross-(?:left|right)-/.test(stroke.id))).toHaveLength(4);
  });

  it('rejects impossible VSEPR coordination and invalid ladder controls', async () => {
    const vsepr = await compileDiagramSpec({ type: 'vsepr', content: 'geom: AX6\ncenter: C\nligands: F,F,F,F,F,F' }, 'step');
    const ladder = await compileDiagramSpec({ type: 'mo', content: 'left: 2s -40 2\nelectrons: many' }, 'step');
    expect(vsepr.ok).toBe(false);
    expect(ladder.ok).toBe(false);
  });
});
