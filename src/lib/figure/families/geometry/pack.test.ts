import { describe, expect, it } from 'vitest';
import { compileDiagram } from '@/src/lib/resolve-diagram';
import { canonicalizeDiagramType, familyRequiredMissing } from '../../catalog';
import { GEOMETRY_MANIFESTS } from '../packs/geometry.manifest';
import { GEOMETRY_COMPILERS } from '../packs/geometry';
import { compile } from '../cs/testing';

/** Specs per family that between them use every key its manifest documents. */
const EVERY_KEY: Record<string, string[]> = {
  triangle: ['sides: a=7, b=10\nangles: A=30\nvertices: A, B, C\nshow: solved\naltitude: C\nunit: cm\ncase: acute'],
  coord: ['point: A 1 2\npoint: B 5 5\npoint: C 6 1\nsegment: A B\nline: y = 0.5x + 4\ncircle: C 1\npolygon: A B C\nwindow: -3 9 -3 8\nshow: distance A B'],
  vectors: ['vec: A 3 4\nvec: B 5∠30\nmode: origin\nsum: R\nunit: N'],
  unitcircle: ['angle: 150\nshow: coords, triangle'],
  slopefield: ['dydx: x - y\nx: -3 3\ny: -3 3\nthrough: 0,1'],
  curve: ['kind: polar\nr: 1 + cos(theta)\nt: 0 2*pi', 'x: cos(t)\ny: sin(2*t)'],
};
/**
 * Text that would be markup or an attribute break if a family ever concatenated it into the SVG.
 * A family absent here prints numbers and its own words only: no text of the spec reaches the figure.
 */
const HOSTILE: Record<string, string> = {
  triangle: 'sides: 3, 4, 5\nvertices: <b>, <i>, <u>\nunit: <script>',
  coord: 'point: a"onload 1 2\npoint: <b> 4 3',
  vectors: 'vec: a"onload 3 4\nsum: <img>\nunit: <b>',
};

describe('geometry pack', () => {
  it('registers a compiler for every manifest and nothing else', () => {
    expect(Object.keys(GEOMETRY_COMPILERS).sort()).toEqual(GEOMETRY_MANIFESTS.map((manifest) => manifest.token).sort());
    expect(Object.keys(EVERY_KEY).sort()).toEqual(Object.keys(GEOMETRY_COMPILERS).sort());
  });

  it.each(GEOMETRY_MANIFESTS)('$token: the specimen compiles through compileDiagram', async (manifest) => {
    const compiled = await compileDiagram({ type: manifest.token, content: manifest.specimen });
    expect(compiled.ok ? 'drawn' : compiled.diagnostic.reason).toBe('drawn');
    expect(compiled.svg).toContain(`data-stemlm-family="${manifest.token}"`);
    expect(compiled.corrected, 'the specimen needs no repair').toBeUndefined();
  });

  it.each(GEOMETRY_MANIFESTS)('$token: every alias reaches the family and admission stays within budget', async (manifest) => {
    for (const alias of manifest.aliases ?? []) {
      expect(canonicalizeDiagramType(alias), alias).toBe(manifest.token);
      const compiled = await compileDiagram({ type: alias, content: manifest.specimen });
      expect(compiled.ok, alias).toBe(true);
    }
    const admission = [...(manifest.required ?? []), ...(manifest.requiredAny ?? [])];
    expect(admission.length).toBeGreaterThan(0);
    expect(admission.length).toBeLessThanOrEqual(4);
    for (const key of admission) expect(manifest.keys).toContain(key);
    expect(familyRequiredMissing(manifest.token, manifest.specimen)).toEqual([]);
    expect(familyRequiredMissing(manifest.token, 'caption: nothing to draw')).not.toEqual([]);
    expect(manifest.grammar.startsWith(`${manifest.token}:`)).toBe(true);
    expect(manifest.grammar).not.toContain('\n');
  });

  it.each(GEOMETRY_MANIFESTS)('$token: every documented key is read by the compiler', async (manifest) => {
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

  it.each(GEOMETRY_MANIFESTS.filter((manifest) => manifest.token in HOSTILE))('$token: hostile text is escaped, never markup', async (manifest) => {
    const compiled = await compileDiagram({ type: manifest.token, content: HOSTILE[manifest.token]! });
    expect(compiled.ok ? 'drawn' : compiled.diagnostic.reason, 'the hostile spec is drawn, so its text reaches the SVG').toBe('drawn');
    expect(compiled.svg).not.toMatch(/<(?:script|img|b|i|u)\b/i);
    const root = new DOMParser().parseFromString(compiled.svg, 'image/svg+xml').documentElement;
    for (const element of [root, ...root.querySelectorAll('*')]) {
      expect(element.getAttributeNames().filter((name) => /^on/i.test(name)), element.tagName).toEqual([]);
    }
  });
});
