import { describe, expect, it } from 'vitest';
import { applyStepPatch } from './apply';
import { parse } from './parser';
import type { Capsule, Step } from './types';

function step(id: string, title: string, body = 'One move.'): Step {
  return { id, index: 1, title, body };
}

function capsuleText(extra: string[] = []): string {
  return [
    '```stemlm',
    '@meta',
    'version: 2',
    'subject: Math',
    'topic: Release remediation',
    'qid: q1',
    'mode: full',
    '@endmeta',
    '@step id=s1',
    'title: Identify the relation',
    '@body',
    'Start from the relation.',
    '@endbody',
    '@endstep',
    '@step id=s2',
    'title: Substitute values',
    '@body',
    'Substitute the values.',
    '@endbody',
    '@endstep',
    '@step id=s3',
    'title: Report the result',
    '@body',
    'Report the result.',
    '@endbody',
    '@endstep',
    ...extra,
    '@solution',
    'The result follows from the relation.',
    '@endsolution',
    '@end',
    '```',
  ].join('\n');
}

function completeCapsuleText(extra: string[] = []): string {
  return capsuleText([
    ...extra,
    '@verify',
    'methods: backsub',
    'status: pass',
    'notes: 2+2=4; substitution recovers the result',
    '@endverify',
    '@uncertainty',
    'assumption: none',
    'low_confidence: none',
    'check: arithmetic',
    '@enduncertainty',
  ]);
}

function baseCapsule(steps: Step[]): Capsule {
  return {
    meta: { version: 2, subject: 'Math', topic: 'Patch', qid: 'q1' },
    steps: steps.map((value, index) => ({ ...value, index: index + 1 })),
    solution: 'done',
    solutionDiagrams: [],
  };
}

describe('release remediation regressions', () => {
  it('diagnoses missing full-capsule contract blocks without losing recovered steps', () => {
    const result = parse(capsuleText());

    expect(result.status).toBe('ok');
    expect(result.capsule?.steps).toHaveLength(3);
    expect(result.warningCodes).toEqual(
      expect.arrayContaining(['missing_verify', 'missing_uncertainty']),
    );
  });

  it('keeps patch mode usable without full-capsule blocks', () => {
    const result = parse(
      capsuleText([
        '@patch op=replace id=s2',
        '@step id=s2',
        'title: Replace the substitution',
        '@body',
        'Use the corrected value.',
        '@endbody',
        '@endstep',
        '@endpatch',
      ]).replace('mode: full', 'mode: patch'),
    );

    expect(result.status).toBe('ok');
    expect(result.patch).toHaveLength(1);
  });

  it('marks unknown verification status/methods and empty evidence non-pass', () => {
    const result = parse(
      capsuleText([
        '@verify',
        'methods: made_up_method',
        'status: not-a-status',
        'notes:',
        '@endverify',
        '@uncertainty',
        'assumption: none',
        'low_confidence: none',
        'check: arithmetic',
        '@enduncertainty',
      ]),
    );

    expect(result.status).toBe('ok');
    expect(result.capsule?.verification?.status).toBe('fail');
    expect(result.capsule?.verification?.methods).toEqual([]);
    expect(result.capsule?.verification?.correction).toBeTruthy();
    expect(result.warningCodes).toContain('malformed_verify');
  });

  it('preserves omitted optional fields when replacing a targeted step', () => {
    const originalStep = {
      ...step('s2', 'Old substitution'),
      takeaway: 'Keep this insight.',
      quickCheck: { question: 'What changed?', answer: 'The value.' },
      followup: 'Explain the unit conversion.',
    };
    const replacement = step('s2', 'Correct substitution', 'Use the corrected value.');

    const result = applyStepPatch(baseCapsule([step('s1', 'First'), originalStep, step('s3', 'Last')]), [
      { op: 'replace', id: 's2', step: replacement },
    ]);
    const next = result.capsule.steps[1]!;

    expect(next.title).toBe('Correct substitution');
    expect(next.body).toBe('Use the corrected value.');
    expect(next.takeaway).toBe(originalStep.takeaway);
    expect(next.quickCheck).toEqual(originalStep.quickCheck);
    expect(next.followup).toBe(originalStep.followup);
  });

  it('returns a safe parse result for adversarial nesting and oversized specs', () => {
    const deeplyNested = [
      '```stemlm',
      Array.from({ length: 5000 }, () => '@q').join('\n'),
      Array.from({ length: 5000 }, () => '@endq').join('\n'),
      '```',
    ].join('\n');
    let nestedResult: ReturnType<typeof parse> | undefined;
    expect(() => {
      nestedResult = parse(deeplyNested);
    }).not.toThrow();
    expect(nestedResult?.status).toBe('empty');
    expect(nestedResult?.errorCode).toBe('parser_failure');

    const oversizedSpec = [
      '```stemlm',
      '@meta',
      'version: 2',
      'subject: Math',
      'topic: Oversized input',
      '@endmeta',
      '@step id=s1',
      'title: Render',
      '@body',
      'Render the figure.',
      '@endbody',
      '@diagram type=plot',
      `caption: ${'x'.repeat(70_000)}`,
      '@enddiagram',
      '@endstep',
      '@end',
      '```',
    ].join('\n');
    let oversizedResult: ReturnType<typeof parse> | undefined;
    expect(() => {
      oversizedResult = parse(oversizedSpec);
    }).not.toThrow();
    expect(oversizedResult?.status).toBe('empty');
    expect(oversizedResult?.errorCode).toBe('parser_failure');
  });

  it('does not hide an oversized nested question step count', () => {
    const steps = Array.from({ length: 21 }, (_, index) => [
      `@step id=q1.s${index + 1}`,
      `title: Move ${index + 1}`,
      '@body',
      'Apply the declared transformation.',
      '@endbody',
      '@endstep',
    ].join('\n'));
    const raw = [
      '```stemlm',
      '@meta',
      'version: 2',
      'subject: Math',
      'topic: Parts',
      '@endmeta',
      '@q id=q1',
      'topic: Part one',
      ...steps,
      '@endq',
      '@end',
      '```',
    ].join('\n');
    const result = parse(raw);

    expect(result.status).toBe('ok');
    expect(result.questions?.[0]?.steps).toHaveLength(21);
    expect(result.warningCodes).toContain('invalid_step_count');
  });

  it('fails closed on duplicate declared step ids', () => {
    const result = parse(
      completeCapsuleText([
        '@step id=s2',
        'title: Duplicate substitution',
        '@body',
        'Repeat the substitution.',
        '@endbody',
        '@endstep',
      ]),
    );

    expect(result.status).toBe('empty');
    expect(result.errorCode).toBe('invalid_structure');
    expect(result.capsule).toBeUndefined();
    expect(result.warningCodes).toContain('duplicate_step_id');
  });

  it('fails closed on duplicate declared diagram ids', () => {
    const diagramStep = (stepId: string) => [
      `@step id=${stepId}`,
      'title: Render the relation',
      '@body',
      'Render the relation.',
      '@endbody',
      '@diagram id=f1 type=plot',
      'fn: x',
      'domain: 0 1',
      '@enddiagram',
      '@endstep',
    ];
    const result = parse(
      completeCapsuleText([...diagramStep('s4'), ...diagramStep('s5')]),
    );

    expect(result.status).toBe('empty');
    expect(result.errorCode).toBe('invalid_structure');
    expect(result.capsule).toBeUndefined();
    expect(result.warningCodes).toContain('duplicate_diagram_id');
  });

  it('fails closed on an unsupported metadata mode', () => {
    const result = parse(completeCapsuleText().replace('mode: full', 'mode: speculative'));

    expect(result.status).toBe('empty');
    expect(result.errorCode).toBe('invalid_structure');
    expect(result.capsule).toBeUndefined();
    expect(result.warningCodes).toContain('invalid_mode');
  });

  it('fails closed on an unsupported @patch operation', () => {
    const raw = [
      '```stemlm',
      '@meta',
      'version: 2',
      'subject: Math',
      'topic: Invalid patch',
      'qid: q1',
      'mode: patch',
      '@endmeta',
      '@patch op=bogus id=s1',
      '@step id=s1',
      'title: Replacement',
      '@body',
      'Use the corrected relation.',
      '@endbody',
      '@endstep',
      '@endpatch',
      '@end',
      '```',
    ].join('\n');
    const result = parse(raw);

    expect(result.status).toBe('empty');
    expect(result.errorCode).toBe('invalid_structure');
    expect(result.capsule).toBeUndefined();
    expect(result.warningCodes).toContain('invalid_patch_op');
  });
});
