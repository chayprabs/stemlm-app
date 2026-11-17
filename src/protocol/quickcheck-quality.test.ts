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
        answer: 'I_load = Vth / (Rth + R_load) = (70/11) / (48/11) = 70/48 ≈ 1.46 A, because that is the load current.',
      }),
    ).toBe(true);
  });

  it('rejects rationale without step evidence', () => {
    expect(
      isSubstantiveQuickCheck({
        question: 'Is the net reactance inductive or capacitive here?',
        answer: 'Capacitive because it dominates at this frequency.',
      }),
    ).toBe(false);
  });

  it('rejects math without because or since', () => {
    expect(
      isSubstantiveQuickCheck({
        question: 'What is the Thevenin current?',
        answer: 'I_load = Vth / (Rth + R_load) = 70/48 ≈ 1.46 A.',
      }),
    ).toBe(false);
  });

  it('accepts a result followed by its reason in a second sentence', () => {
    expect(
      isSubstantiveQuickCheck({
        question: 'Differentiate $e^{5x}$.',
        answer: '$5e^{5x}$. The chain rule multiplies by the derivative of the exponent, which is 5.',
      }),
    ).toBe(true);
    expect(
      isSubstantiveQuickCheck({
        question: 'What percentage of men are shorter than 161 cm?',
        answer: 'About 2.3%. The height 161 cm is $z = (161 - 175)/7 = -2$, and the curve is symmetric.',
      }),
    ).toBe(true);
  });

  it('does not read a decimal point, or a full stop inside maths, as a second sentence', () => {
    expect(isSubstantiveQuickCheck({ question: 'What is the current?', answer: 'About 1.46 A.' })).toBe(false);
    expect(isSubstantiveQuickCheck({ question: 'What is x?', answer: '$x = 2. 5$' })).toBe(false);
    // A second sentence with nothing from the step in it is still not evidence.
    expect(isSubstantiveQuickCheck({ question: 'Which is larger?', answer: 'The first one. It dominates here.' })).toBe(false);
  });

  it('rejects padded frequency trivia without numbers', () => {
    expect(
      isSubstantiveQuickCheck({
        question: 'Is reactance higher at low or high frequencies?',
        answer: 'Reactance is higher at low frequencies for capacitors because of the formula.',
      }),
    ).toBe(false);
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
