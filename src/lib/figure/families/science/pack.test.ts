import { describe, expect, it } from 'vitest';
import { compileDiagram } from '@/src/lib/resolve-diagram';
import { canonicalizeDiagramType, familyRequiredMissing } from '../../catalog';
import { SCIENCE_MANIFESTS } from '../packs/science.manifest';
import { SCIENCE_COMPILERS } from '../packs/science';
import { compile, draw, expectCleanLabels } from '../cs/testing';

/** One spec per family that uses every key its manifest documents. */
const EVERY_KEY: Record<string, string> = {
  energy: 'level: r 0 A + B\nlevel: ts 85 TS\nlevel: p -40 C + D\nunit: kJ/mol\nshow: ea, dh\ncatalyst: ts 55',
  probtree: 'branch: root R 0.3\nbranch: root B 0.7\nshow: products',
  projectile: 'v0: 20\nangle: 35\nh0: 2\ng: 9.81\nshow: range, hmax, time\nmark: 1.2',
  econfig: 'element: Fe\ncharge: 3+\nshow: both\ncore: noble',
  bohr: 'element: Na\ncharge: 1+\nmass: 23',
  pedigree: 'person: I-1 male affected\nperson: I-2 female\nperson: II-1 female carrier deceased\ncouple: I-1 I-2\nchild: I-1 I-2 II-1',
};
/** Something each family can accent, so the shared `highlight:` line is exercised with a real target. */
const HIGHLIGHT: Record<string, string> = { energy: 'ts', probtree: 'R', projectile: 'v0', econfig: '3d', bohr: 'nucleus', pedigree: 'II-1' };

describe('science pack', () => {
  it('registers a compiler for every manifest and nothing else', () => {
    expect(Object.keys(SCIENCE_COMPILERS).sort()).toEqual(SCIENCE_MANIFESTS.map((manifest) => manifest.token).sort());
    expect(SCIENCE_MANIFESTS.map((manifest) => manifest.token)).toEqual(['energy', 'probtree', 'projectile', 'econfig', 'bohr', 'pedigree']);
  });

  it.each(SCIENCE_MANIFESTS)('$token: the specimen compiles through compileDiagram with clean labels', async (manifest) => {
    const compiled = await compileDiagram({ type: manifest.token, content: manifest.specimen });
    expect(compiled.ok ? 'drawn' : compiled.diagnostic.reason).toBe('drawn');
    expect(compiled.svg).toContain(`data-stemlm-family="${manifest.token}"`);
    expectCleanLabels(await draw(manifest.token, manifest.specimen));
  });

  it.each(SCIENCE_MANIFESTS)('$token: every alias reaches the family and admission stays within budget', async (manifest) => {
    for (const alias of manifest.aliases ?? []) {
      expect(canonicalizeDiagramType(alias), alias).toBe(manifest.token);
      const compiled = await compileDiagram({ type: alias, content: manifest.specimen });
      expect(compiled.ok, alias).toBe(true);
    }
    const admission = [...(manifest.required ?? []), ...(manifest.requiredAny ?? [])];
    expect(admission.length).toBeGreaterThan(0);
    expect(admission.length).toBeLessThanOrEqual(2);
    for (const key of admission) expect(manifest.keys).toContain(key);
    expect(familyRequiredMissing(manifest.token, manifest.specimen)).toEqual([]);
    expect(familyRequiredMissing(manifest.token, 'caption: nothing to draw')).not.toEqual([]);
    expect(manifest.grammar.startsWith(`${manifest.token}:`)).toBe(true);
    expect(manifest.grammar).not.toContain('\n');
    // The grammar line teaches every key by name.
    for (const key of manifest.keys) expect(manifest.grammar, key).toContain(`${key}:`);
  });

  it.each(SCIENCE_MANIFESTS)('$token: every documented key is read by the compiler', async (manifest) => {
    const content = EVERY_KEY[manifest.token]!;
    const used = new Set(content.split('\n').map((line) => line.split(':')[0]!));
    expect([...used].sort()).toEqual([...manifest.keys].sort());
    const result = await compile(manifest.token, `${content}\ncaption: a caption\nhighlight: ${HIGHLIGHT[manifest.token]}`);
    expect(result.ok ? 'drawn' : result.reason).toBe('drawn');
    // A key outside the manifest is never silently ignored.
    const stray = await compile(manifest.token, `${manifest.specimen}\nflavour: vanilla`);
    expect(stray.ok ? 'drawn' : stray.reason).toBe('unconsumed declaration: flavour');
  });

  it.each(SCIENCE_MANIFESTS)('$token: hostile text is escaped, never markup', async (manifest) => {
    const hostile: Record<string, string> = {
      energy: 'level: a 0 <img src=x onerror=alert(1)>\nlevel: b 5 <script>alert(1)</script>\nunit: <b>kJ</b>',
      probtree: 'branch: root <script> 1 <img src=x onerror=alert(1)>',
      projectile: 'v0: 20 <script>alert(1)</script>\nangle: 35',
      econfig: 'element: <svg onload=alert(1)>',
      bohr: 'element: Na\nmass: <img src=x onerror=alert(1)>',
      pedigree: 'person: <script>alert(1)</script> male\nperson: <b>x</b> female',
    };
    const compiled = await compileDiagram({ type: manifest.token, content: hostile[manifest.token]! });
    expect(compiled.svg).not.toMatch(/<(?:script|img|b)\b/i);
    const root = new DOMParser().parseFromString(compiled.svg || '<svg xmlns="http://www.w3.org/2000/svg"/>', 'image/svg+xml').documentElement;
    for (const element of [root, ...root.querySelectorAll('*')]) {
      expect(element.getAttributeNames().filter((name) => /^on/i.test(name)), element.tagName).toEqual([]);
    }
  });

  it.each(SCIENCE_MANIFESTS)('$token: garbage in an admission key is refused, never thrown', async (manifest) => {
    for (const value of ['1', '', '∞ ∞ ∞', 'NaN NaN NaN NaN', '-1e999 -1e999 -1e999', `${'x'.repeat(4000)} 1 1`]) {
      const content = (manifest.required ?? []).map((key) => `${key}: ${value}`).join('\n');
      const result = await compile(manifest.token, content);
      if (!result.ok) expect(result.code, `${manifest.token} ${value.slice(0, 20)}`).not.toBe('throw');
    }
  });
});
