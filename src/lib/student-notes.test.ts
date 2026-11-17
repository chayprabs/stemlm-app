import { describe, expect, it } from 'vitest';
import type { Capsule } from '@/src/protocol/types';
import {
  studentNotes,
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

describe('studentNotes', () => {
  it('keeps a contentful verify note and drops screenshot chrome', () => {
    const notes = studentNotes(
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
    expect(notes).toEqual({ check: [BACK_SUB], checkFailed: false, assumptions: [] });
    expect(JSON.stringify(notes)).not.toMatch(/status:|methods:|student check|low-confidence|\bnone\b|Verify that/i);
  });

  it('keeps real assumptions and a failed check with its correction, each as what it is', () => {
    const notes = studentNotes(
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
    expect(notes).toEqual({
      check: ['mA vs A', 'I is 2 A, not 2 mA'],
      // The model said its own check did not pass: that is not dropped with the status line.
      checkFailed: true,
      assumptions: ['g = 9.81 m/s^2 (not given)', 'rms not peak'],
    });
    expect(JSON.stringify(notes)).not.toContain('s2');
    expect(JSON.stringify(notes)).not.toContain('photo labels');
  });

  it('reports a failed check that came with no words at all', () => {
    expect(studentNotes(capsule({ verification: { methods: ['units'], status: 'fail', notes: 'none' } }))).toEqual({
      check: [],
      checkFailed: true,
      assumptions: [],
    });
  });

  it('says a line once, where it first appears', () => {
    expect(
      studentNotes(
        capsule({
          verification: { methods: ['units'], status: 'pass', notes: 'g = 9.81 m/s^2 (not given)' },
          uncertainty: { assumptions: ['G = 9.81 m/s^2 (not given)', 'rms not peak'], lowConfidenceSteps: [], studentChecks: [] },
        }),
      ),
    ).toEqual({ check: ['g = 9.81 m/s^2 (not given)'], checkFailed: false, assumptions: ['rms not peak'] });
  });

  it('returns nothing when every field is a placeholder or student check', () => {
    expect(
      studentNotes(
        capsule({
          verification: { methods: ['units'], status: 'pass', notes: 'none' },
          uncertainty: {
            assumptions: ['None', 'n/a'],
            lowConfidenceSteps: ['s1'],
            studentChecks: [STUDENT_CHECK, 'confirm the request'],
          },
        }),
      ),
    ).toEqual({ check: [], checkFailed: false, assumptions: [] });
  });

  it('strips assumption:/correction: prefixes but drops status/methods lines', () => {
    const notes = studentNotes(
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
    expect(notes).toEqual({ check: ['I is 2 A, not 2 mA'], checkFailed: false, assumptions: ['g = 9.81 m/s^2 (not given)'] });
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
