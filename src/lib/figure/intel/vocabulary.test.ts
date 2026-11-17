import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { FAMILY_CATALOG, SCENE_VARIANTS, TABLE_VARIANTS } from '../catalog';
import { specKeysPresent } from '../catalog';
import { GENERATED_VOCABULARY } from './vocabulary.generated';
import { canonicalEnum, compilableFamilies, isDecoration, isKnownWord, resolveVariant, typeCandidates, vocabularyOf } from './vocabulary';

const root = resolve(__dirname, '../../../..');

interface Generator {
  extractVocabulary(): Record<string, Record<string, string>>;
  renderVocabularyModule(vocabulary: Record<string, Record<string, string>>): string;
  VOCABULARY_OUTPUT: string;
}

describe('generated vocabulary', () => {
  it('is up to date with the compiler sources (run `node scripts/figure-vocabulary.mjs`)', async () => {
    // A computed specifier keeps the .mjs script out of the TypeScript program.
    const script = pathToFileURL(resolve(root, 'scripts/figure-vocabulary.mjs')).href;
    const generator = (await import(/* @vite-ignore */ script)) as Generator;
    expect(generator.renderVocabularyModule(generator.extractVocabulary())).toBe(readFileSync(generator.VOCABULARY_OUTPUT, 'utf8'));
    // Parses every engine with the TypeScript compiler: seconds on a busy machine, not the default 5.
  }, 60_000);

  it('holds the keys the engines declare themselves', () => {
    // PLOT_DECLARATION_KEYS, GRAPH_KEYS and CONTROL_KEYS are private to their engines; these are their documented members.
    expect(Object.keys(GENERATED_VOCABULARY.plot!)).toEqual(expect.arrayContaining(['fn', 'fn2', 'domain', 'var', 'data', 'xlabel', 'ylabel', 'eq', 'eq_slot', 'point', 'point_label', 'marker', 'asymptote', 'region', 'shade', 'scale', 'logx', 'logy']));
    expect(Object.keys(GENERATED_VOCABULARY.graph!).sort()).toEqual(['accept', 'caption', 'decision', 'edge', 'highlight', 'node', 'rankdir', 'start', 'terminal']);
    expect(Object.keys(GENERATED_VOCABULARY.circuit!).sort()).toEqual(['caption', 'highlight', 'kind', 'label', 'port', 'probe', 'std', 'title', 'wire']);
    expect(GENERATED_VOCABULARY.plot!.fn).toBe('many');
    expect(GENERATED_VOCABULARY.plot!.domain).toBe('one');
    expect(GENERATED_VOCABULARY.stack!.layers).toBe('list');
  });

  it('covers every key of every guide specimen', () => {
    const guide = readFileSync(resolve(root, 'src/protocol/core-protocol.md'), 'utf8');
    const specimens = [...guide.matchAll(/^@diagram id=\S+ type=(\S+)\n([\s\S]*?)\n@enddiagram$/gm)].filter((match) => !match[1]!.startsWith('<'));
    expect(specimens.length).toBeGreaterThan(20);
    for (const [, type, content] of specimens) {
      const kind = /^kind:\s*(\S+)/m.exec(content!)?.[1];
      const variant = type === 'scene' || type === 'table' ? resolveVariant(type, kind!)?.kind : undefined;
      const vocabulary = vocabularyOf(type === 'mo' || type === 'cft' ? type : type!, variant);
      expect(vocabulary, type).toBeDefined();
      for (const key of specKeysPresent(content!)) {
        const device = type === 'circuit' && /^[rclvidmsaq]/.test(key);
        expect(device || vocabulary!.keys.has(key), `${type}: ${key}`).toBe(true);
      }
    }
  });
});

describe('family vocabulary', () => {
  it('reads variants from the catalog, not from a copy', () => {
    for (const [family, variants] of [['scene', SCENE_VARIANTS], ['table', TABLE_VARIANTS]] as const) {
      for (const [kind, variant] of Object.entries(variants)) {
        const keys = vocabularyOf(family, kind)!.keys;
        for (const key of variant.allowed) expect(keys.has(key), `${family}.${kind}: ${key}`).toBe(true);
        expect(keys.has('kind') && keys.has('highlight') && keys.has('caption')).toBe(true);
      }
    }
    expect(vocabularyOf('scene', 'fbd')!.keys.has('point')).toBe(false);
    expect(vocabularyOf('table', 'ice')!.spellings.get('equilibrium')).toBe('e');
    expect(vocabularyOf('table', 'matrix')!.spellings.get('equilibrium')).toBeUndefined();
  });

  it('offers only families the dispatcher compiles', () => {
    const families = compilableFamilies();
    for (const family of ['plot', 'scene', 'graph', 'table', 'circuit', 'chem.smiles', 'timing', 'kmap', 'sfd', 'ladder']) expect(families).toContain(family);
    for (const family of ['svg', 'mermaid', 'lewis', 'beam', 'isosurface', 'chair']) expect(families).not.toContain(family);
    for (const family of families) expect(Object.prototype.hasOwnProperty.call(FAMILY_CATALOG, family) || family === 'ladder').toBe(true);
    expect(vocabularyOf('__proto__')).toBeUndefined();
    expect(vocabularyOf('toString')).toBeUndefined();
  });

  it('never lets a synonym shadow a real key of the family', () => {
    for (const family of compilableFamilies()) {
      const vocabulary = vocabularyOf(family)!;
      for (const key of vocabulary.keys.keys()) expect(vocabulary.spellings.get(key.replace(/[\s_.\-]+/g, '')), `${family}: ${key}`).toBe(key);
    }
    // `kind` is a key of cycle, `type` of reactor: neither is treated as a family line there.
    expect(vocabularyOf('reactor')!.keys.has('type')).toBe(true);
  });

  it('resolves type tokens by alias, separator, suffix, synonym and one unambiguous typo', () => {
    const families = (token: string) => typeCandidates(token).map((candidate) => `${candidate.family}${candidate.kind ? `#${candidate.kind}` : ''}:${candidate.via}`);
    expect(families('free-body-diagram')).toEqual(['scene#fbd:alias']);
    expect(families('Free Body Diagram')).toEqual(['scene#fbd:alias']);
    expect(families('flowchart')).toEqual(['graph:alias']);
    expect(families('state_machine')).toEqual(['graph:alias']);
    expect(families('phasor-diagram')).toEqual(['phasor:alias']);
    expect(families('chem-smiles')).toEqual(['chem.smiles:alias']);
    expect(families('K-Map')).toEqual(['kmap:alias']);
    expect(families('circiut')).toEqual(['circuit:fuzzy']);
    expect(families('ice')).toEqual(['table#ice:alias']);
    // Tokens no family answers to. (An extension family's own aliases resolve once its pack is registered.)
    for (const token of ['diagram', 'figure', 'image', 'zzz', '']) expect(families(token), token).toEqual([]);
  });

  it('knows enumerated values, variants, decoration and real words', () => {
    expect(canonicalEnum('graph.rankdir', 'Left-to-Right')).toBe('LR');
    expect(canonicalEnum('graph.rankdir', 'RL')).toBeUndefined();
    expect(canonicalEnum('circuit.std', 'ANSI')).toBe('ieee');
    expect(resolveVariant('scene', 'Free-Body Diagram')).toEqual({ kind: 'fbd', exact: false });
    expect(resolveVariant('scene', 'geometry')).toEqual({ kind: 'geom', exact: true });
    expect(resolveVariant('table', 'chart')).toBeUndefined();
    const plot = vocabularyOf('plot')!;
    expect(isDecoration(plot, 'color', 'blue')).toBe(true);
    expect(isDecoration(plot, 'width', '600px')).toBe(true);
    expect(isDecoration(plot, 'scale', 'x=log')).toBe(false);
    expect(isDecoration(vocabularyOf('truss')!, 'width', '5 m')).toBe(false);
    expect(isDecoration(vocabularyOf('mccabe')!, 'alpha', '2.5')).toBe(false);
    expect(isKnownWord('note') && isKnownWord('anode') && !isKnownWord('domian')).toBe(true);
  });
});
