import { describe, expect, it } from 'vitest';
import { FAMILY_CATALOG, familyRequiredMissing, isKnownDiagramType, lookupFamily } from './catalog';
import { parseCapsule } from '@/src/protocol/parser';

const SYNONYM_GROUPS = [
  ['label', 'name', 'text', 'lbl'],
  ['kind', 'type'],
  ['highlight', 'emphasis'],
  ['caption', 'title'],
  ['node', 'vertex'],
  ['edge', 'link', 'connection'],
];

function declaredKeys(): Map<string, Set<string>> {
  const byFamily = new Map<string, Set<string>>();
  for (const [family, def] of Object.entries(FAMILY_CATALOG)) {
    byFamily.set(family, new Set([...(def.required ?? []), ...(def.requiredAny ?? [])].map((key) => key.toLowerCase())));
  }
  return byFamily;
}

describe('catalog vocabulary and DSL budget', () => {
  it('keeps every family and the catalog within the hard key budgets', () => {
    const byFamily = declaredKeys();
    expect(Math.max(...[...byFamily.values()].map((keys) => keys.size))).toBeLessThanOrEqual(12);
    expect(new Set([...byFamily.values()].flatMap((keys) => [...keys])).size).toBeLessThanOrEqual(180);
  });

  it('uses at most one spelling from each cross-family synonym group per family', () => {
    for (const [family, keys] of declaredKeys()) {
      for (const group of SYNONYM_GROUPS) {
        expect(group.filter((key) => keys.has(key)).length, `${family}: ${group.join('/')}`).toBeLessThanOrEqual(1);
      }
    }
  });

  it('does not accept a subtype or family marker as the only semantic content', () => {
    for (const [family, content] of [
      ['scene', 'kind: fbd'],
      ['table', 'kind: matrix'],
      ['reactor', 'type: cstr'],
      ['cmos', 'kind: inverter'],
      ['sphere', 'kind: surface'],
    ] as const) {
      expect(familyRequiredMissing(family, content), family).not.toHaveLength(0);
    }
  });

  it('admits the documented scene geometry keys through the family gate', () => {
    expect(familyRequiredMissing('scene', [
      'kind: geom',
      'point: O',
      'point: A',
      'segment: OA O A',
    ].join('\n'))).toEqual([]);
  });

  it('requires a real circuit device instead of accepting control metadata alone', () => {
    expect(familyRequiredMissing('circuit', 'std: ieee\nprobe: Vout=n1')).toEqual(['device']);
    expect(familyRequiredMissing('circuit', 'std: ieee\ncaption: source and load')).toEqual(['device']);
    expect(familyRequiredMissing('circuit', 'std: ieee\nmap: world colors unknown')).toEqual(['device']);
    expect(familyRequiredMissing('circuit', 'std: ieee\nRload: n1 0 1k')).toEqual([]);
  });

  it('treats inherited object property names as unknown diagram types', () => {
    for (const token of ['__proto__', 'constructor', 'toString']) {
      expect(() => isKnownDiagramType(token), token).not.toThrow();
      expect(isKnownDiagramType(token), token).toBe(false);
      expect(lookupFamily(token), token).toBeUndefined();
    }
  });

  it('keeps hostile inherited type names inside the parser error path', () => {
    const capsule = [
      '@meta',
      'subject: Electrical',
      'topic: hostile type',
      '@endmeta',
      '@step id=s1',
      'title: Draw',
      '@body',
      'A circuit is shown.',
      '@endbody',
      '@diagram id=f1 type=__proto__',
      'device: R1 a b 1k',
      '@enddiagram',
      '@endstep',
      '@solution',
      'Done.',
      '@endsolution',
      '@end',
    ].join('\n');
    expect(() => parseCapsule(capsule)).not.toThrow();
    expect(parseCapsule(capsule).warningCodes).toContain('unknown_diagram_type');
  });
});
