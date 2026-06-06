import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { isSubstantiveQuickCheck, auditQuickCheck } from './quickcheck-quality';

const step = { id: 's3', index: 3, title: 'Compute capacitive reactance', body: 'work' };

describe('isSubstantiveQuickCheck', () => {
  it('rejects one-word frequency verdicts', () => {
    expect(
      isSubstantiveQuickCheck({
        question: "Is a capacitor's reactance higher at low frequencies or high frequencies?",
        answer: 'Low frequencies.',
      }),
    ).toBe(false);
  });

  it('accepts answers with because and numbers', () => {
    expect(
      isSubstantiveQuickCheck({
        question: 'Is the net reactance inductive or capacitive here?',
        answer: 'Capacitive, because XC > XL (265.3 > 75.4).',
      }),
    ).toBe(true);
  });

  it('accepts answers with worked math', () => {
    expect(
      isSubstantiveQuickCheck({
        question: 'What is the Thevenin current?',
        answer: 'I_load = Vth / (Rth + R_load) = (70/11) / (48/11) = 70/48 ≈ 1.46 A.',
      }),
    ).toBe(true);
  });
});

describe('parse strips thin quickchecks', () => {
  it('removes terse quickcheck from the capsule and records a warning', () => {
    const raw = [
      '```stemlm',
      '@meta',
      'subject: Electrical',
      'topic: Thin check',
      '@endmeta',
      '@step',
      'title: Compute capacitive reactance',
      '@body',
      '$X_C$ is capacitive reactance. $X_C=1/(\\omega C)=1591\\,\\Omega$.',
      '@endbody',
      '@quickcheck',
      "q: Is a capacitor's reactance higher at low or high frequencies?",
      'a: Low frequencies.',
      '@endquickcheck',
      '@endstep',
      '@step',
      'title: Padding step two',
      '@body',
      'Second step with $I=2\\,\\text{A}$ numeric work.',
      '@endbody',
      '@endstep',
      '@step',
      'title: Padding step three',
      '@body',
      'Third step with $V=12\\,\\text{V}$ numeric work.',
      '@endbody',
      '@endstep',
      '@solution',
      'Done.',
      '@endsolution',
      '@end',
      '```',
    ].join('\n');
    const result = parse(raw);
    expect(result.capsule?.steps[0]?.quickCheck).toBeUndefined();
    expect(result.warningCodes).toContain('quickcheck_thin_answer');
  });
});

describe('auditQuickCheck', () => {
  it('flags generic frequency trivia', () => {
    const qc = {
      question: 'Is reactance higher at low frequencies or high frequencies?',
      answer: 'Low frequencies.',
    };
    expect(auditQuickCheck(qc, step)).toContain('quickcheck_generic_trivia');
  });
});
