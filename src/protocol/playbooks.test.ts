import { describe, it, expect } from 'vitest';
import { SUBJECTS } from './types';
import { PLAYBOOKS, getPlaybook, getUniversalPlaybook, UNIVERSAL_PLAYBOOK_HEADER } from './playbooks';
import { CORE_PROTOCOL, CORE_PROTOCOL_BY_VARIANT } from './protocol';
import { buildComposerStub, buildInjectionPayload } from './builder';

const SUBJECT_MARKERS: Record<(typeof SUBJECTS)[number], string> = {
  Physics: 'PHYSICS:',
  Chemistry: 'CHEMISTRY:',
  Math: 'MATH:',
  Biology: 'BIOLOGY:',
  CS: 'CS:',
  Electrical: 'ELECTRICAL:',
  Mechanical: 'MECHANICAL:',
  Civil: 'CIVIL:',
  Chemical: 'CHEMICAL ENG:',
  General: 'GENERAL:',
};

/** Distinctive conventions that must survive in the attached file — not just a header. */
const SUBJECT_FINGERPRINTS: Record<(typeof SUBJECTS)[number], string[]> = {
  Physics: ['FBD', 'F/2F', 'de Broglie'],
  Chemistry: ['mhchem', 'curved-arrow', 'VSEPR'],
  Math: ['eigen', '$$…$$', 'phase portrait'],
  Biology: ['Punnett', 'blunt bar', 'HWE'],
  CS: ['mermaid', 'inline `code`', 'Dijkstra'],
  Electrical: ['HYBRID-π', 'Thévenin', 'KVL'],
  Mechanical: ['FoS', 'P-V', 'Bernoulli'],
  Civil: ['SFD', 'BMD', 'pin (triangle)'],
  Chemical: ['McCabe-Thiele', 'CSTR', 'stream table'],
  General: ['most specific subject', 'sanity/limit check'],
};

describe('universal playbook', () => {
  it('defines a playbook for every subject and no extras', () => {
    expect(Object.keys(PLAYBOOKS).sort()).toEqual([...SUBJECTS].sort());
    for (const subject of SUBJECTS) {
      expect(PLAYBOOKS[subject]?.length, `${subject} playbook missing`).toBeGreaterThan(80);
      expect(getPlaybook(subject)).toBe(PLAYBOOKS[subject]);
      expect(getPlaybook(subject)).toContain(SUBJECT_MARKERS[subject]);
    }
  });

  it('ships every subject so a classifier miss cannot omit the right conventions', () => {
    const universal = getUniversalPlaybook();
    expect(universal.startsWith(UNIVERSAL_PLAYBOOK_HEADER)).toBe(true);
    expect(universal).toContain(SUBJECTS.join('|'));
    for (const subject of SUBJECTS) {
      expect(universal, `universal playbook missing ${subject}`).toContain(SUBJECT_MARKERS[subject]);
      expect(universal).toContain(getPlaybook(subject));
      for (const fingerprint of SUBJECT_FINGERPRINTS[subject]) {
        expect(universal, `${subject} missing fingerprint "${fingerprint}"`).toContain(fingerprint);
      }
    }
  });

  it('lists the same subject names in the core template the parser accepts', () => {
    const listed = SUBJECTS.join('|');
    expect(CORE_PROTOCOL).toContain(listed);
    expect(CORE_PROTOCOL_BY_VARIANT.ultra).toContain(listed);
    expect(UNIVERSAL_PLAYBOOK_HEADER).toContain(listed);
  });

  it('never pins a classified subject on the composer stub', () => {
    const stub = buildComposerStub('Solve this circuit with a resistor and 12V voltage source');
    expect(stub).toContain('Infer the subject from the problem');
    for (const subject of SUBJECTS) {
      expect(stub).not.toContain(`(${subject})`);
    }
    const payload = buildInjectionPayload('A projectile is launched at 20 m/s at 45 degrees');
    expect(payload.subject).toBe('Physics');
    expect(payload.composerText).not.toContain('(Physics)');
    expect(payload.fileContent).toContain(getUniversalPlaybook());
  });
});
