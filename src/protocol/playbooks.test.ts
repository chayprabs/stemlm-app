import { describe, it, expect } from 'vitest';
import { SUBJECTS } from './types';
import {
  PLAYBOOKS,
  getPlaybook,
  getUniversalPlaybook,
  UNIVERSAL_PLAYBOOK_HEADER,
  SUBJECT_REGISTRY,
} from './playbooks';
import { CORE_PROTOCOL, CORE_PROTOCOL_BY_VARIANT } from './protocol';
import { buildComposerStub, buildInjectionPayload } from './builder';

describe('subject registry', () => {
  it('defines a compact row for every subject and no extras', () => {
    expect(Object.keys(PLAYBOOKS).sort()).toEqual([...SUBJECTS].sort());
    expect(Object.keys(SUBJECT_REGISTRY).sort()).toEqual([...SUBJECTS].sort());
    for (const subject of SUBJECTS) {
      expect(PLAYBOOKS[subject]?.length, `${subject} row missing`).toBeGreaterThan(40);
      expect(getPlaybook(subject)).toBe(PLAYBOOKS[subject]);
      expect(getPlaybook(subject)).toContain(SUBJECT_REGISTRY[subject].marker);
      expect(SUBJECT_REGISTRY[subject].diagrams.length).toBeGreaterThan(8);
      expect(SUBJECT_REGISTRY[subject].verify.length).toBeGreaterThan(4);
    }
  });

  it('ships every subject row so a classifier miss cannot omit conventions', () => {
    const universal = getUniversalPlaybook();
    expect(universal.startsWith(UNIVERSAL_PLAYBOOK_HEADER)).toBe(true);
    expect(universal).toContain(SUBJECTS.join('|'));
    expect(universal).toContain('subject\tarchetypes\tdiagrams\tverify\tnodraw\tnotation\ttraps');
    expect(universal).not.toContain('PHYSICS: subject=');
    expect(universal).not.toContain('ELECTRICAL: subject=');
    for (const subject of SUBJECTS) {
      const row = SUBJECT_REGISTRY[subject];
      expect(universal, `missing ${subject}`).toContain(row.marker);
      expect(universal).toContain(row.diagrams.split(',')[0]!.trim());
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
