import { describe, expect, it } from 'vitest';
import { compileDiagram } from '@/src/lib/resolve-diagram';
import { canonicalizeDiagramType, familyRequiredMissing } from '../../catalog';
import { STATS_MANIFESTS } from '../packs/stats.manifest';
import { STATS_COMPILERS } from '../packs/stats';
import { compile } from '../cs/testing';

/** Specs per family that between them use every key its manifest documents (one spec per kind that owns keys). */
const EVERY_KEY: Record<string, string[]> = {
  chart: [
    'kind: grouped\ntitle: Sales\nlabels: Q1, Q2\nvalues: 1, 2\nseries: North 3, 4\nxlabel: Quarter\nylabel: Units\nunit: %',
    'kind: histogram\ndata: 1, 2, 2, 3, 3, 3, 4\nbins: 4',
    'kind: histogram\ndata: 1, 2, 2, 3\nedges: 0, 2, 4',
    'kind: scatter\npoints: 1,2; 2,3.9; 3,6.1\nfit: linear',
  ],
  dist: [
    'kind: normal\nmean: 100\nsd: 15\nshade: 85 115\nmark: 100\nxlabel: IQ',
    'mu: 0\nsigma: 1',
    'kind: t\ndf: 10',
    'kind: exponential\nrate: 0.5',
    'kind: poisson\nlambda: 3',
    'kind: uniform\nmin: 0\nmax: 10',
    'kind: binomial\nn: 10\np: 0.3',
  ],
  numberline: ['range: -5 5\npoint: 4 open\ninterval: [-3, 2)\nineq: x > 3'],
  venn: ['sets: A, B\nonly: A=12, B=7\nshade: A & B\nuniverse: U'],
};

describe('statistics pack', () => {
  it('registers a compiler for every manifest and nothing else', () => {
    expect(Object.keys(STATS_COMPILERS).sort()).toEqual(STATS_MANIFESTS.map((manifest) => manifest.token).sort());
    expect(STATS_MANIFESTS.map((manifest) => manifest.token)).toEqual(['chart', 'dist', 'numberline', 'venn']);
  });

  it.each(STATS_MANIFESTS)('$token: the specimen compiles through compileDiagram', async (manifest) => {
    const compiled = await compileDiagram({ type: manifest.token, content: manifest.specimen });
    expect(compiled.ok ? 'drawn' : compiled.diagnostic.reason).toBe('drawn');
    expect(compiled.svg).toContain(`data-stemlm-family="${manifest.token}"`);
  });

  it.each(STATS_MANIFESTS)('$token: every alias reaches the family and admission stays within budget', async (manifest) => {
    for (const alias of manifest.aliases ?? []) {
      expect(canonicalizeDiagramType(alias), alias).toBe(manifest.token);
      const compiled = await compileDiagram({ type: alias, content: EVERY_KEY[manifest.token]![0]! });
      expect(compiled.ok ? 'drawn' : compiled.diagnostic.reason, alias).toBe('drawn');
    }
    const admission = [...(manifest.required ?? []), ...(manifest.requiredAny ?? [])];
    expect(admission.length).toBeGreaterThan(0);
    expect(admission.length).toBeLessThanOrEqual(4);
    for (const key of admission) expect(manifest.keys).toContain(key);
    expect(familyRequiredMissing(manifest.token, manifest.specimen)).toEqual([]);
    expect(familyRequiredMissing(manifest.token, 'caption: nothing to draw')).not.toEqual([]);
    expect(manifest.grammar.startsWith(`${manifest.token}:`)).toBe(true);
  });

  it.each(STATS_MANIFESTS)('$token: every documented key is read by the compiler', async (manifest) => {
    const specs = EVERY_KEY[manifest.token]!;
    const used = new Set(specs.flatMap((content) => content.split('\n').map((line) => line.split(':')[0]!)));
    expect([...used].sort()).toEqual([...manifest.keys].sort());
    for (const content of specs) {
      const result = await compile(manifest.token, `${content}\ncaption: a caption\nhighlight: A`);
      expect(result.ok ? 'drawn' : result.reason, content).toBe('drawn');
    }
    // A key outside the manifest is never silently ignored.
    const stray = await compile(manifest.token, `${manifest.specimen}\nflavour: vanilla`);
    expect(stray.ok ? 'drawn' : stray.reason).toBe('unconsumed declaration: flavour');
  });

  it.each(STATS_MANIFESTS)('$token: hostile text is escaped, never markup', async (manifest) => {
    const hostile: Record<string, string> = {
      chart: 'title: <img src=x onerror=alert(1)>\nlabels: <script>alert(1)</script>, "<b>x</b>"\nvalues: 1, 2\nylabel: <svg onload=alert(1)>',
      dist: 'kind: normal\nxlabel: <img src=x onerror=alert(1)><script>alert(1)</script>',
      numberline: 'point: 2 <script>alert(1)</script>\npoint: 5 <b>x</b>',
      venn: 'sets: <script>, <b>x</b>\nuniverse: <img src=x onerror=alert(1)>\nonly: none=<svg onload=alert(1)>',
    };
    const compiled = await compileDiagram({ type: manifest.token, content: hostile[manifest.token]! });
    expect(compiled.svg).not.toMatch(/<(?:script|img|b)\b/i);
    const root = new DOMParser().parseFromString(compiled.svg || '<svg xmlns="http://www.w3.org/2000/svg"/>', 'image/svg+xml').documentElement;
    for (const element of [root, ...root.querySelectorAll('*')]) {
      expect(element.getAttributeNames().filter((name) => /^on/i.test(name)), element.tagName).toEqual([]);
    }
  });

  it('draws the pie a Mermaid translation hands over', async () => {
    const compiled = await compileDiagram({ type: 'mermaid', content: 'pie title Pets adopted\n  "Dogs" : 386\n  "Cats" : 85\n  "Rats" : 15' });
    expect(compiled.ok ? 'drawn' : compiled.diagnostic.reason).toBe('drawn');
    expect(compiled.svg).toContain('data-stemlm-family="chart"');
    expect(compiled.svg).toContain('Dogs 79%');
  });
});
