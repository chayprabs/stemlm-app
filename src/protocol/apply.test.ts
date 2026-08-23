import { describe, it, expect } from 'vitest';
import { applyStepPatch, findResumeToken, groupResumeParts, stitchResume } from './apply';
import { parse, parseCapsule } from './parser';
import type { Capsule, Step } from './types';

function step(id: string, title: string, body = 'work'): Step {
  return { id, index: 1, title, body };
}

function capsule(steps: Step[]): Capsule {
  return {
    meta: { version: 2, subject: 'Math', topic: 'Patch', qid: 'q1' },
    steps: steps.map((s, i) => ({ ...s, index: i + 1 })),
    solution: 'done',
    solutionDiagrams: [],
  };
}

describe('findResumeToken', () => {
  it('reads token= from an @resume line', () => {
    expect(findResumeToken('@resume token=ab12cd34 next=1')).toBe('ab12cd34');
  });

  it('returns null when no resume marker is present', () => {
    expect(findResumeToken('@meta\nsubject: Math\n@end')).toBeNull();
  });
});

describe('stitchResume', () => {
  it('joins a truncated prefix and a continuation into one parseable capsule', () => {
    const part1 = [
      '```stemlm',
      '@meta',
      'version: 2',
      'subject: Physics',
      'topic: Range',
      'question: Find the range.',
      '@endmeta',
      '@step id=s1',
      'title: Write the range formula',
      '@formula id=e1',
      '$$R=u^2\\sin 2\\theta/g$$',
      '@endformula',
      '@body',
      '$R$ is range. With $u=20\\,\\text{m/s}$: keep the formula.',
      '@endbody',
      '@endstep',
      '@resume token=aa11bb22',
    ].join('\n');
    const part2 = [
      '```stemlm',
      '@resume token=aa11bb22',
      '@step id=s2',
      'title: Substitute the angle',
      '@body',
      'With $\\theta=45^\\circ$: $R=40.8\\,\\text{m}$.',
      '@endbody',
      '@endstep',
      '@solution',
      'Range is $40.8\\,\\text{m}$.',
      '@endsolution',
      '@end',
      '```',
    ].join('\n');
    const stitched = stitchResume([part1, part2]);
    expect(stitched).not.toMatch(/@resume/);
    const result = parseCapsule(stitched);
    expect(result.status).toBe('ok');
    expect(result.capsule?.steps.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(result.capsule?.meta.version).toBe(2);
    expect(result.capsule?.solution).toContain('40.8');
  });
});

describe('applyStepPatch', () => {
  it('replaces a step by id and keeps the others', () => {
    const original = capsule([
      step('s1', 'Name the law'),
      step('s2', 'Wrong substitution'),
      step('s3', 'Verify units'),
    ]);
    const next = applyStepPatch(original, [
      {
        op: 'replace',
        id: 's2',
        step: step('s2', 'Correct substitution', 'Use 12 V not 12 mV.'),
      },
    ]);
    expect(next.capsule.steps).toHaveLength(3);
    expect(next.capsule.steps[1]!.id).toBe('s2');
    expect(next.capsule.steps[1]!.title).toBe('Correct substitution');
    expect(next.capsule.steps[0]!.title).toBe('Name the law');
    expect(next.capsule.steps.map((s) => s.index)).toEqual([1, 2, 3]);
    expect(next.warningCodes).not.toContain('patch_unknown_id');
  });

  it('inserts after a named id', () => {
    const original = capsule([step('s1', 'A'), step('s2', 'B')]);
    const next = applyStepPatch(original, [
      { op: 'insert', after: 's1', step: step('s1a', 'Inserted') },
    ]);
    expect(next.capsule.steps.map((s) => s.id)).toEqual(['s1', 's1a', 's2']);
  });

  it('deletes a named id', () => {
    const original = capsule([step('s1', 'A'), step('s2', 'B'), step('s3', 'C')]);
    const next = applyStepPatch(original, [{ op: 'delete', id: 's2' }]);
    expect(next.capsule.steps.map((s) => s.id)).toEqual(['s1', 's3']);
  });

  it('warns patch_unknown_id instead of silently no-oping', () => {
    const original = capsule([step('s1', 'A'), step('s2', 'B')]);
    const next = applyStepPatch(original, [
      { op: 'replace', id: 's3', step: step('s3', 'Ghost') },
    ]);
    expect(next.capsule.steps.map((s) => s.id)).toEqual(['s1', 's2']);
    expect(next.warningCodes).toContain('patch_unknown_id');
  });

  it('applies @solution and @verify carried on the patch op', () => {
    const original = capsule([step('s1', 'A'), step('s2', 'Wrong')]);
    original.solution = 'I = 2 mA';
    original.verification = { methods: ['units'], status: 'fail', notes: 'mA vs A' };
    const next = applyStepPatch(original, [
      {
        op: 'replace',
        id: 's2',
        step: step('s2', 'Correct', 'I is 2 A.'),
        solution: 'I = 2 A',
        verification: { methods: ['units', 'backsub'], status: 'pass', notes: '12/6=2 A' },
      },
    ]);
    expect(next.capsule.solution).toBe('I = 2 A');
    expect(next.capsule.verification?.status).toBe('pass');
    expect(next.capsule.verification?.notes).toContain('2 A');
  });
});

describe('parse patch capsules', () => {
  it('parses @patch replace into ops the applier consumes', () => {
    const raw = [
      '```stemlm',
      '@meta',
      'version: 2',
      'subject: Electrical',
      'topic: Patch current',
      'qid: q1',
      'mode: patch',
      '@endmeta',
      '@patch op=replace id=s3',
      '@step id=s3',
      'title: Correct the current units',
      '@body',
      '$I$ is 2 A, not 2 mA, because $V/R=12/6=2\\,\\text{A}$.',
      '@endbody',
      '@endstep',
      '@endpatch',
      '@end',
      '```',
    ].join('\n');
    const result = parse(raw);
    expect(result.patch).toHaveLength(1);
    expect(result.patch![0]!.op).toBe('replace');
    expect(result.patch![0]!.id).toBe('s3');
    expect(result.patch![0]!.step?.id).toBe('s3');
    expect(result.capsule?.meta.mode).toBe('patch');
    const original = capsule([step('s1', 'A'), step('s2', 'B'), step('s3', 'Wrong')]);
    const next = applyStepPatch(original, result.patch!);
    expect(next.capsule.steps[2]!.title).toBe('Correct the current units');
  });

  it('parses @solution/@verify inside @patch and applies them', () => {
    const raw = [
      '```stemlm',
      '@meta',
      'version: 2',
      'subject: Electrical',
      'topic: Patch current',
      'qid: q1',
      'mode: patch',
      '@endmeta',
      '@patch op=replace id=s2',
      '@step id=s2',
      'title: Correct the current',
      '@body',
      '$I$ is $2\\,\\text{A}$.',
      '@endbody',
      '@endstep',
      '@solution',
      '$I=2\\,\\text{A}$.',
      '@endsolution',
      '@verify',
      'methods: units',
      'status: pass',
      'notes: 12/6 recovers 2 A',
      '@endverify',
      '@endpatch',
      '@end',
      '```',
    ].join('\n');
    const result = parse(raw);
    expect(result.patch?.[0]?.solution).toContain('2');
    expect(result.patch?.[0]?.verification?.status).toBe('pass');
    const original = capsule([step('s1', 'A'), step('s2', 'Wrong')]);
    original.solution = '2 mA';
    const next = applyStepPatch(original, result.patch!);
    expect(next.capsule.solution).toContain('2');
    expect(next.capsule.verification?.status).toBe('pass');
  });
});

describe('groupResumeParts', () => {
  it('stitches two parts that share a resume token', () => {
    const part1 = [
      '```stemlm',
      '@meta',
      'subject: Math',
      'topic: Resume',
      '@endmeta',
      '@step id=s1',
      'title: First',
      '@body',
      'Move one.',
      '@endbody',
      '@endstep',
      '@resume token=aa11bb22',
    ].join('\n');
    const part2 = [
      '```stemlm',
      '@resume token=aa11bb22',
      '@step id=s2',
      'title: Second',
      '@body',
      'Move two.',
      '@endbody',
      '@endstep',
      '@solution',
      'done',
      '@endsolution',
      '@end',
      '```',
    ].join('\n');
    const grouped = groupResumeParts([part1, part2]);
    expect(grouped).toHaveLength(1);
    const parsed = parseCapsule(grouped[0]!);
    expect(parsed.capsule?.steps.map((s) => s.id)).toEqual(['s1', 's2']);
  });
});
