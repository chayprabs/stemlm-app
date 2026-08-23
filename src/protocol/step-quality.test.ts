import { describe, expect, it } from 'vitest';
import { parse } from './parser';
import { FENCED_ELECTRICAL } from './__fixtures__';
import { TEN_STEP_ELECTRICAL } from './__fixtures-long-steps';
import {
  auditStepQuality,
  capsuleNeedsStepQualityRepair,
  enrichStepBody,
  isDiagnosticBodyText,
} from './step-quality';

describe('isDiagnosticBodyText', () => {
  it('flags repair prompts and quality warnings echoed into @body', () => {
    expect(
      isDiagnosticBodyText(
        'Your previous stemLM capsule was incomplete or malformed. The parser error code was missing_step_body.',
      ),
    ).toBe(true);
    expect(
      isDiagnosticBodyText('Re-emit the FULL answer as exactly one fenced block with info string stemlm.'),
    ).toBe(true);
    expect(isDiagnosticBodyText('Step 3 ("Split reactance") packs multiple moves; split into smaller steps.')).toBe(
      true,
    );
    expect(isDiagnosticBodyText('Step 2 ("XL") is missing worked explanation.')).toBe(true);
    expect(isDiagnosticBodyText('$X_L=75\\,\\Omega$ with numeric substitution.')).toBe(false);
  });
});

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

  it('passes when body substitutes formula symbols inline (no explicit "is" line)', () => {
    const issues = auditStepQuality({
      id: 's1',
      index: 1,
      title: 'Compute capacitive reactance',
      formula: '$$X_C = \\frac{1}{\\omega C}$$',
      body: 'With $\\omega=377\\,\\text{rad/s}$ and $C=10\\,\\mu\\text{F}$: $X_C=1/(\\omega C)\\approx265.3\\,\\Omega$.',
    });
    expect(issues).toEqual([]);
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

  it('does not require numeric plug-in on a proof or symbolic body', () => {
    const proof = auditStepQuality(
      {
        id: 's2',
        index: 2,
        title: 'Expand n squared',
        formula: '$$n^2=(2k)^2=4k^2=2(2k^2)$$',
        body: '$n^2$ is twice the integer $2k^2$, so $n^2$ is even by definition.',
      },
      { archetype: 'proof' },
    );
    expect(proof).not.toContain('step_missing_substitution');
    expect(proof).not.toContain('missing_step_body');

    const symbolic = auditStepQuality(
      {
        id: 's1',
        index: 1,
        title: 'Apply the identity',
        formula: '$$\\sin 2\\theta = 2\\sin\\theta\\cos\\theta$$',
        body: 'The double-angle identity applies because the goal is to rewrite $\\sin 2\\theta$.',
      },
      { archetype: 'symbolic' },
    );
    expect(symbolic).not.toContain('step_missing_substitution');
  });

  it('does not require substitution on proof-like Math that omitted archetype:', () => {
    const issues = auditStepQuality(
      {
        id: 's1',
        index: 1,
        title: 'Prove n squared is even',
        formula: '$$n^2=(2k)^2=4k^2$$',
        body: 'Assume $n=2k$. Then $n^2$ is twice an integer, so $n^2$ is even.',
      },
      { subject: 'Math', question: 'Prove that if n is even then n^2 is even.' },
    );
    expect(issues).not.toContain('step_missing_substitution');
    expect(issues).toContain('missing_archetype');
  });

  it('still requires substitution on numeric and lab archetypes', () => {
    const step = {
      id: 's1',
      index: 1,
      title: 'Compute capacitive reactance',
      formula: '$$X_C = \\frac{1}{\\omega C}$$',
      body: 'The capacitor opposes voltage changes.',
    };
    expect(auditStepQuality(step, { archetype: 'numeric' })).toContain('step_missing_substitution');
    expect(auditStepQuality(step, { archetype: 'lab' })).toContain('step_missing_substitution');
  });

  it('enrichStepBody copies worked formula into empty body', () => {
    const step = {
      id: 's1',
      index: 1,
      title: 'Calculate XL',
      formula: '$$X_L = \\omega L = 377 \\times 0.2 = 75.4\\,\\Omega$$',
      body: '',
    };
    enrichStepBody(step);
    expect(step.body).toContain('75.4');
    expect(auditStepQuality(step)).toEqual([]);
  });

  it.each([
    ['FENCED_ELECTRICAL', FENCED_ELECTRICAL],
    ['TEN_STEP_ELECTRICAL', TEN_STEP_ELECTRICAL],
  ] as const)('passes structural %s steps with no quality issues', (_name, raw) => {
    const result = parse(raw);
    expect(result.status).toBe('ok');
    expect(result.warningCodes).not.toContain('step_missing_symbol_defs');
    for (const step of result.capsule!.steps) {
      expect(auditStepQuality(step), `step ${step.index} "${step.title}"`).toEqual([]);
    }
  });
});

describe('capsuleNeedsStepQualityRepair', () => {
  it('skips repair for a single soft symbol-def miss on an otherwise strong capsule', () => {
    const steps = Array.from({ length: 6 }, (_, i) => ({
      id: `s${i + 1}`,
      index: i + 1,
      title: `Step ${i + 1}`,
      body: '$I=2\\,\\text{A}$ with numeric substitution.',
      formula: i === 2 ? '$$X_C = \\frac{1}{\\omega C}$$' : undefined,
    }));
    steps[2] = {
      id: 's3',
      index: 3,
      title: 'Compute capacitive reactance',
      formula: '$$X_C = \\frac{1}{\\omega C}$$',
      body: 'The equivalent branch measures $R_{eq}=265.3\\,\\Omega$ at this frequency.',
    };
    expect(auditStepQuality(steps[2]!)).toContain('step_missing_symbol_defs');
    expect(capsuleNeedsStepQualityRepair(steps)).toBe(false);
  });

  it('requires repair when many steps lack worked math', () => {
    const steps = [
      {
        id: 's1',
        index: 1,
        title: 'Thin',
        formula: '$$X_C = \\frac{1}{\\omega C}$$',
        body: 'The capacitor opposes voltage changes.',
      },
      {
        id: 's2',
        index: 2,
        title: 'Thin two',
        formula: '$$X_L = \\omega L$$',
        body: 'Inductors store energy.',
      },
      {
        id: 's3',
        index: 3,
        title: 'Ok',
        body: '$I=2\\,\\text{A}$ numeric work.',
      },
    ];
    expect(capsuleNeedsStepQualityRepair(steps)).toBe(true);
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
