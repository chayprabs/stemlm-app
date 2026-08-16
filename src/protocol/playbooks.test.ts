import { describe, it, expect } from 'vitest';
import { SUBJECTS } from './types';
import { PLAYBOOKS, getPlaybook, getUniversalPlaybook, UNIVERSAL_PLAYBOOK_HEADER } from './playbooks';

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

describe('universal playbook', () => {
  it('defines a playbook for every subject', () => {
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
    }
  });
});
