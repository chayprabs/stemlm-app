import { describe, expect, it } from 'vitest';
import { compileDiagram } from '@/src/lib/resolve-diagram';
import { canonicalizeDiagramType, familyRequiredMissing } from '../../catalog';
import { CS_MANIFESTS } from '../packs/cs.manifest';
import { CS_COMPILERS } from '../packs/cs';
import { compile } from './testing';

/** One spec per family that uses every key its manifest documents. */
const EVERY_KEY: Record<string, string> = {
  sequence: 'actor: c Client\nactor: s Server\nmsg: c s GET /users\nreply: s c 200 OK\nnote: s validates token',
  truth: "expr: F = A·B + C'\ninputs: A, B, C\nshow: minterms",
  logic: 'expr: F = (A AND B) OR NOT C\nstd: iec\ninputs: A, B, C',
  tree: 'kind: binary\nvalues: 8, 3, 10, 1, 6\npath: 8, 3, 6\ntraversal: inorder',
};
/** Keys that belong to another kind of the same family, each in a spec of its own. */
const OTHER_KINDS: Record<string, string[]> = {
  tree: ['kind: bst\ninsert: 8, 3, 10', 'kind: heap\nheap: max\nvalues: 9, 5, 7', 'kind: nary\nnode: A B C D'],
};

describe('computer-science pack', () => {
  it('registers a compiler for every manifest and nothing else', () => {
    expect(Object.keys(CS_COMPILERS).sort()).toEqual(CS_MANIFESTS.map((manifest) => manifest.token).sort());
    expect(CS_MANIFESTS.map((manifest) => manifest.token)).toEqual(['sequence', 'truth', 'logic', 'tree']);
  });

  it.each(CS_MANIFESTS)('$token: the specimen compiles through compileDiagram', async (manifest) => {
    const compiled = await compileDiagram({ type: manifest.token, content: manifest.specimen });
    expect(compiled.ok ? 'drawn' : compiled.diagnostic.reason).toBe('drawn');
    expect(compiled.svg).toContain(`data-stemlm-family="${manifest.token}"`);
  });

  it.each(CS_MANIFESTS)('$token: every alias reaches the family and admission stays within budget', async (manifest) => {
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
  });

  it.each(CS_MANIFESTS)('$token: every documented key is read by the compiler', async (manifest) => {
    const specs = [EVERY_KEY[manifest.token]!, ...(OTHER_KINDS[manifest.token] ?? [])];
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

  it.each(CS_MANIFESTS)('$token: hostile text is escaped, never markup', async (manifest) => {
    const hostile: Record<string, string> = {
      sequence: 'msg: a b <img src=x onerror=alert(1)>',
      truth: 'expr: F = A + B\ninputs: A, B, <script>',
      logic: 'expr: <svg onload=alert(1)> = A·B',
      tree: 'values: <script>alert(1)</script>, "<b>x</b>"',
    };
    const compiled = await compileDiagram({ type: manifest.token, content: hostile[manifest.token]! });
    expect(compiled.svg).not.toMatch(/<(?:script|img|b)\b/i);
    const root = new DOMParser().parseFromString(compiled.svg || '<svg xmlns="http://www.w3.org/2000/svg"/>', 'image/svg+xml').documentElement;
    for (const element of [root, ...root.querySelectorAll('*')]) {
      expect(element.getAttributeNames().filter((name) => /^on/i.test(name)), element.tagName).toEqual([]);
    }
  });
});
