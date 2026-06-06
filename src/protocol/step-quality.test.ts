import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { RLC_AC_IMPEDANCE } from './__fixtures__';
import { auditStepQuality } from './step-quality';

describe('auditStepQuality', () => {
  it('flags formula-only steps with no body', () => {
    const issues = auditStepQuality({
      id: 's1',
      index: 1,
      title: 'Compute capacitive reactance',
      formula: '$$X_C = \\frac{1}{\\omega C}$$',
      body: '',
    });
    expect(issues).toContain('missing_step_body');
    expect(issues).toContain('formula_without_body');
  });

  it('flags symbolic formula with no symbol definitions or substitution', () => {
    const issues = auditStepQuality({
      id: 's1',
      index: 1,
      title: 'Compute capacitive reactance',
      formula: '$$X_C = \\frac{1}{\\omega C}$$',
      body: 'The capacitor opposes voltage changes.',
    });
    expect(issues).toContain('step_missing_substitution');
    expect(issues).toContain('step_missing_symbol_defs');
  });

  it('flags numeric work only in @formula', () => {
    const issues = auditStepQuality({
      id: 's2',
      index: 2,
      title: 'Compute RMS current',
      formula: '$$I = \\frac{120}{214.6} \\approx 0.559\\,\\text{A}$$',
      body: 'The current depends on the net reactance sign.',
    });
    expect(issues).toContain('step_missing_substitution');
  });

  it('passes gold-standard RLC reactance steps', () => {
    const capsule = parse(RLC_AC_IMPEDANCE).capsule!;
    for (const step of capsule.steps) {
      expect(auditStepQuality(step)).toEqual([]);
    }
  });
});

describe('parse step quality warnings', () => {
  it('warns on thin formula steps', () => {
    const raw = [
      '```stemlm',
      '@meta',
      'subject: Electrical',
      'topic: Thin step',
      '@endmeta',
      '@step',
      'title: Compute capacitive reactance',
      '@formula',
      '$$X_C = \\frac{1}{\\omega C}$$',
      '@endformula',
      '@body',
      'The capacitor opposes voltage changes.',
      '@endbody',
      '@endstep',
      '@step',
      'title: Dummy step two',
      '@body',
      'Fill step count with $X_L=75\\,\\Omega$ substitution example for parser minimum.',
      '@endbody',
      '@endstep',
      '@step',
      'title: Dummy step three',
      '@body',
      'Another body with $I=2\\,\\text{A}$ numeric work.',
      '@endbody',
      '@endstep',
      '@solution',
      'Done.',
      '@endsolution',
      '@end',
      '```',
    ].join('\n');
    const result = parse(raw);
    expect(result.warningCodes).toContain('step_missing_substitution');
    expect(result.warningCodes).toContain('step_missing_symbol_defs');
  });
});
