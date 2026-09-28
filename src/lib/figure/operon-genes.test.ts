import { describe, expect, it } from 'vitest';
import { compileDiagramSpec } from './compile';

// An operon draws promoter, operator and one box per structural gene, whether genes are listed on one line or repeated.
describe('operon genes', () => {
  it.each([
    ['one comma list', 'promoter: lacP\noperator: lacO\ngene: lacZ, lacY, lacA'],
    ['repeated records', 'promoter: lacP\noperator: lacO\ngene: lacZ\ngene: lacY\ngene: lacA'],
  ])('%s: one box per gene, in order along the DNA', async (_name, content) => {
    const result = await compileDiagramSpec({ type: 'operon', content }, 'step');
    expect(result.ok, result.ok ? '' : result.reason).toBe(true);
    if (!result.ok) return;
    const genes = result.scene.strokes.filter((s) => /^gene-\d+$/.test(s.id));
    expect(genes).toHaveLength(3);
    expect(genes.map((g) => g.points[0]!)).toEqual([...genes.map((g) => g.points[0]!)].sort((a, b) => a - b));
    expect(result.scene.labels.filter((l) => /^gene-\d+-label$/.test(l.id)).map((l) => l.text)).toEqual(['lacZ', 'lacY', 'lacA']);
  });
});
