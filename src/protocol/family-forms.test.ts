import { describe, expect, it } from 'vitest';
import { FAMILY_MANIFESTS } from '@/src/lib/figure/families/manifest';
import { SUBJECT_REGISTRY } from './playbooks';
import { assembleProtocolFile } from './protocol';
import { renderDiagramRegistry, renderFamilyForms } from './registries';

// A pack family reaches the model only through the attached guide. Its manifest is the single
// source: the subject rows, the registry table and the grammar section are all derived from it.
describe('pack families in the guide', () => {
  const guide = assembleProtocolFile();

  it('has families to teach', () => {
    expect(FAMILY_MANIFESTS.length).toBeGreaterThan(0);
  });

  it.each(FAMILY_MANIFESTS.map((manifest) => [manifest.token, manifest] as const))('%s is named in its subject rows, listed in the registry and taught with its own specimen', (token, manifest) => {
    expect(manifest.subjects.length).toBeGreaterThan(0);
    for (const subject of manifest.subjects) {
      expect(SUBJECT_REGISTRY[subject].diagrams.split(',')).toContain(token);
    }
    expect(renderDiagramRegistry()).toMatch(new RegExp(`^${token.replace('.', '\.')}\t`, 'm'));
    expect(guide).toContain(`@diagram id=f${token} type=${token}\n${manifest.specimen}\n@enddiagram`);
    // The guide cuts this prefix off, since its SCHEMA line already names the family.
    expect(manifest.grammar.startsWith(`${token}: `)).toBe(true);
    // The grammar line names every key the compiler admits the family by.
    const schema = renderFamilyForms().split('\n').find((line) => line.startsWith(`SCHEMA ${token} `));
    for (const key of [...(manifest.required ?? []), ...(manifest.requiredAny ?? [])]) expect(schema, key).toContain(`${key}:`);
  });

  it('adds nothing to a subject no pack names', () => {
    expect(SUBJECT_REGISTRY.General.diagrams).not.toMatch(/,(?:sequence|truth|logic|tree)\b/);
  });
});
