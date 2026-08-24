import { describe, expect, it } from 'vitest';
import type { Capsule } from '@/src/protocol/types';
import {
  foldStudentNotes,
  isProtocolPlaceholder,
  isStudentVerifyPrompt,
  normalizeStudentLine,
} from './student-notes';

const BACK_SUB =
  'Back-substitution yields (1/2)^6 = 1/64, matching the factor 64 in 108 days.';
const STUDENT_CHECK =
  'Verify that half-life is 18 days and radiation factor is 64.';

function capsule(over: Partial<Capsule> = {}): Capsule {
  return {
    meta: { version: 2, subject: 'Physics', topic: 'Radioactive decay' },
    steps: [],
    solution: '',
    solutionDiagrams: [],
    ...over,
  };
}

describe('foldStudentNotes', () => {
  it('keeps a contentful verify note and drops screenshot chrome', () => {
    const notes = foldStudentNotes(
      capsule({
        verification: {
          methods: ['units', 'backsub', 'oom'],
          status: 'pass',
          notes: BACK_SUB,
        },
        uncertainty: {
          assumptions: ['none'],
          lowConfidenceSteps: ['none'],
          studentChecks: [STUDENT_CHECK],
        },
      }),
    );
    expect(notes).toEqual([BACK_SUB]);
    expect(notes.join('\n')).not.toMatch(/status:|methods:|student check|low-confidence|\bnone\b|Verify that/i);
  });

  it('folds real assumptions and fail corrections as ordinary lines', () => {
    const notes = foldStudentNotes(
      capsule({
        verification: {
          methods: ['units'],
          status: 'fail',
          notes: 'mA vs A',
          correction: 'I is 2 A, not 2 mA',
        },
        uncertainty: {
          assumptions: ['g = 9.81 m/s^2 (not given)', 'rms not peak'],
          lowConfidenceSteps: ['s2'],
          studentChecks: ['photo labels for current units'],
        },
      }),
    );
    expect(notes).toEqual([
      'mA vs A',
      'I is 2 A, not 2 mA',
      'g = 9.81 m/s^2 (not given)',
      'rms not peak',
    ]);
    expect(notes.join('\n')).not.toContain('s2');
    expect(notes.join('\n')).not.toContain('photo labels');
  });

  it('returns nothing when every field is a placeholder or student check', () => {
    expect(
      foldStudentNotes(
        capsule({
          verification: { methods: ['units'], status: 'pass', notes: 'none' },
          uncertainty: {
            assumptions: ['None', 'n/a'],
            lowConfidenceSteps: ['s1'],
            studentChecks: [STUDENT_CHECK, 'confirm the request'],
          },
        }),
      ),
    ).toEqual([]);
  });

  it('strips assumption:/correction: prefixes but drops status/methods lines', () => {
    const notes = foldStudentNotes(
      capsule({
        verification: {
          methods: ['units'],
          status: 'pass',
          notes: 'status: pass\nmethods: units, backsub\ncorrection: I is 2 A, not 2 mA',
        },
        uncertainty: {
          assumptions: ['assumption: g = 9.81 m/s^2 (not given)'],
          lowConfidenceSteps: [],
          studentChecks: [],
        },
      }),
    );
    expect(notes).toEqual(['I is 2 A, not 2 mA', 'g = 9.81 m/s^2 (not given)']);
  });
});

describe('normalizeStudentLine', () => {
  it('classifies placeholders and verify-that prompts', () => {
    expect(isProtocolPlaceholder('none')).toBe(true);
    expect(isProtocolPlaceholder('N/A.')).toBe(true);
    expect(isProtocolPlaceholder('g = 9.81')).toBe(false);
    expect(isStudentVerifyPrompt(STUDENT_CHECK)).toBe(true);
    expect(isStudentVerifyPrompt('Double-check the half-life on the paper')).toBe(true);
    expect(isStudentVerifyPrompt(BACK_SUB)).toBe(false);
    expect(normalizeStudentLine('status: pass')).toBeNull();
    expect(normalizeStudentLine('low-confidence ids: s1, s2')).toBeNull();
    expect(normalizeStudentLine(STUDENT_CHECK)).toBeNull();
    expect(normalizeStudentLine(BACK_SUB)).toBe(BACK_SUB);
  });
});
