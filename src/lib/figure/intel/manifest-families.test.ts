import { describe, expect, it, vi } from 'vitest';

// Extension families are declared by manifests other packs add. The repair layer must pick them up
// from FAMILY_MANIFESTS at run time, so this file swaps in a manifest it has never seen.
vi.mock('../families/manifest', () => {
  const FAMILY_MANIFESTS = [
    {
      token: 'numberline', aliases: ['number-line', 'numline'], requiredAny: ['point', 'interval'],
      keys: ['min', 'max', 'point', 'interval', 'tick'], subjects: ['Math'], grammar: '', specimen: 'min: 0\nmax: 5\npoint: 2',
    },
    {
      token: 'truth', aliases: ['truth-table'], required: ['vars', 'expr'],
      keys: ['vars', 'expr'], subjects: ['CS'], grammar: '', specimen: 'vars: A,B\nexpr: A and B',
    },
  ];
  return { FAMILY_MANIFESTS, familyManifest: (token: string) => FAMILY_MANIFESTS.find((manifest) => manifest.token === token) };
});

describe('extension families declared by manifest', async () => {
  const { repairDiagram } = await import('./repair');
  const { compilableFamilies, typeCandidates, vocabularyOf } = await import('./vocabulary');
  const repair = (type: string, content: string) => repairDiagram({ type, content });

  it('reads tokens, aliases and keys from the manifests', () => {
    expect(compilableFamilies()).toEqual(expect.arrayContaining(['numberline', 'truth']));
    expect([...vocabularyOf('numberline')!.keys.keys()]).toEqual(expect.arrayContaining(['min', 'max', 'point', 'interval', 'tick', 'caption', 'highlight']));
    expect(typeCandidates('Number Line')).toEqual([{ family: 'numberline', kind: undefined, via: 'alias' }]);
    expect(typeCandidates('truth table')).toEqual([{ family: 'truth', kind: undefined, via: 'alias' }]);
    expect(typeCandidates('numberlin')).toEqual([{ family: 'numberline', kind: undefined, via: 'fuzzy' }]);
  });

  it('repairs type tokens and keys toward a manifest family', () => {
    expect(repair('number_line', '- min: 0\n- max: 5\n- points: [1, 2.5]').diagram).toEqual({ type: 'numberline', content: 'min: 0\nmax: 5\npoint: 1\npoint: 2.5' });
    expect(repair('truth table', 'variables = A,B\nexpr: A and B').diagram).toEqual({ type: 'truth table', content: 'variables = A,B\nexpr: A and B' });
    expect(repair('truth-table', 'vars = A,B\nexrp: A and B').diagram).toEqual({ type: 'truth', content: 'vars: A,B\nexpr: A and B' });
    expect(repair('numberline', 'mni: 0\nmax: 5\ntik: 1\npoint: 2').diagram.content).toBe('min: 0\nmax: 5\ntick: 1\npoint: 2');
  });

  it('infers a manifest family only when it alone explains every key', () => {
    expect(repair('svg', 'vars: A,B\nexpr: A and B').diagram.type).toBe('truth');
    // Admission keys still gate the inference: a tick with no point or interval is not a number line.
    expect(repair('svg', 'tick: 1').repairs).toEqual([]);
    expect(repair('truth', 'vars: A,B\nfn: x').diagram.type).toBe('truth');
  });
});
