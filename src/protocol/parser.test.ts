import { describe, it, expect } from 'vitest';
import { parse, parseCapsule, findCapsuleRaw, looksComplete, SOLUTION_DIAGRAM_TOKEN } from './parser';
import {
  FENCED_ELECTRICAL,
  TOLERANT_PARTIAL,
  NO_CAPSULE,
  NOISY_FENCED,
} from './__fixtures__';

describe('findCapsuleRaw', () => {
  it('extracts content from a ```stemlm fence', () => {
    const raw = findCapsuleRaw(FENCED_ELECTRICAL);
    expect(raw).toContain('@meta');
    expect(raw).toContain('@end');
    expect(raw).not.toContain('```');
  });

  it('extracts from a noisy message with preamble/trailer', () => {
    const raw = findCapsuleRaw(NOISY_FENCED);
    expect(raw).toContain('subject: Biology');
    expect(raw).not.toContain('Hope that helps');
  });

  it('extracts a bare @meta..@end span without a fence', () => {
    const raw = findCapsuleRaw(TOLERANT_PARTIAL);
    expect(raw?.startsWith('@meta')).toBe(true);
  });

  it('returns null when there is no capsule', () => {
    expect(findCapsuleRaw(NO_CAPSULE)).toBeNull();
  });
});

describe('looksComplete', () => {
  it('is true once the @end token is present on its own line', () => {
    expect(looksComplete(FENCED_ELECTRICAL)).toBe(true);
  });
  it('is false for a streaming fragment without @end', () => {
    const fragment = '```stemlm\n@meta\nsubject: Physics\n@endmeta\n@step\ntitle: Start';
    expect(looksComplete(fragment)).toBe(false);
  });
});

describe('parse warning and error codes', () => {
  it('flags inner triple backticks instead of silently trusting them', () => {
    const raw = [
      '```stemlm',
      '@meta',
      'version: 1',
      'subject: CS',
      'topic: Code fence',
      '@endmeta',
      '@step',
      'title: Trace code',
      '@body',
      'Do not use fences:',
      '```python',
      'print(1)',
      '```',
      '@endbody',
      '@solution',
      'Use inline `print(1)` instead.',
      '@endsolution',
      '@end',
      '```',
    ].join('\n');
    const result = parse(raw);
    expect(result.warningCodes).toContain('inner_triple_backticks');
  });

  it('normalizes invalid subjects and records a code', () => {
    const result = parseCapsule('@meta\nsubject: Astronomy\ntopic: Stars\n@endmeta\n@step\ntitle: A\n@body\nb\n@endbody\n@endstep\n@solution\ns\n@endsolution\n@end');
    expect(result.capsule?.meta.subject).toBe('General');
    expect(result.warningCodes).toContain('invalid_subject');
  });

  it('reports missing final @end while still recovering usable content', () => {
    const result = parseCapsule('@meta\nsubject: Physics\ntopic: Missing end\n@endmeta\n@step\ntitle: A\n@body\nb\n@endbody\n@endstep\n@solution\ns\n@endsolution');
    expect(result.status).toBe('ok');
    expect(result.warningCodes).toContain('missing_end');
  });

  it('keeps topic single-line when the model spills onto the next line', () => {
    const result = parseCapsule('@meta\nsubject: Math\ntopic: First line\nsecond line\n@endmeta\n@step\ntitle: A\n@body\nb\n@endbody\n@endstep\n@solution\ns\n@endsolution\n@end');
    expect(result.capsule?.meta.topic).toBe('First line');
  });
});

describe('parse (full capsule)', () => {
  const result = parse(FENCED_ELECTRICAL);

  it('returns ok status', () => {
    expect(result.status).toBe('ok');
  });

  it('parses meta', () => {
    expect(result.capsule?.meta.subject).toBe('Electrical');
    expect(result.capsule?.meta.topic).toBe('Series resistor voltage');
    expect(result.capsule?.meta.version).toBe(1);
  });

  it('parses two steps with fields', () => {
    const steps = result.capsule!.steps;
    expect(steps).toHaveLength(2);
    expect(steps[0]!.title).toBe('Label the circuit');
    expect(steps[0]!.formula).toContain('V = IR');
    expect(steps[0]!.body).toContain('12');
    expect(steps[0]!.diagram?.type).toBe('svg');
    expect(steps[0]!.diagram?.content).toContain('<svg');
    expect(steps[0]!.takeaway).toContain('elements');
    expect(steps[0]!.quickCheck?.question).toContain('series');
    expect(steps[0]!.quickCheck?.answer).toContain('current');
    expect(steps[0]!.followup).toContain('R2');
  });

  it('parses the solution and extracts inline diagrams', () => {
    const cap = result.capsule!;
    expect(cap.solution).toContain('2');
    expect(cap.solutionDiagrams).toHaveLength(1);
    expect(cap.solutionDiagrams[0]!.type).toBe('mermaid');
    expect(cap.solution).toContain(SOLUTION_DIAGRAM_TOKEN(0));
  });
});

describe('parse (tolerant / missing terminators)', () => {
  const result = parse(TOLERANT_PARTIAL);

  it('still recovers both steps', () => {
    expect(result.capsule?.steps).toHaveLength(2);
    expect(result.capsule?.steps[0]!.title).toBe('Apply the power rule');
    expect(result.capsule?.steps[1]!.title).toBe('Result');
  });

  it('captures body even without @endbody before next @step', () => {
    expect(result.capsule?.steps[0]!.body).toContain('exponent');
  });

  it('normalizes subject', () => {
    expect(result.capsule?.meta.subject).toBe('Math');
  });
});

describe('parse (no capsule)', () => {
  it('returns empty status', () => {
    const result = parse(NO_CAPSULE);
    expect(result.status).toBe('empty');
    expect(result.capsule).toBeUndefined();
  });
});

describe('parseCapsule subject normalization', () => {
  it('maps aliases to canonical subjects', () => {
    const r = parseCapsule('@meta\nsubject: computer science\ntopic: x\n@endmeta\n@step\ntitle: a\n@body\nb\n@endstep\n@end');
    expect(r.capsule?.meta.subject).toBe('CS');
  });
});

describe('atomic step guidance', () => {
  it('warns when a step body packs multiple moves', () => {
    const body = [
      'First we substitute $x=2$.',
      'Then we expand the bracket.',
      'Next we collect like terms.',
      'Finally we divide by the coefficient.',
      'The result follows immediately.',
    ].join(' ');
    const r = parseCapsule(
      `@meta\nsubject: Math\ntopic: test\n@endmeta\n@step\ntitle: Do everything\n@body\n${body}\n@endbody\n@endstep\n@step\ntitle: b\n@body\nok\n@endbody\n@endstep\n@step\ntitle: c\n@body\nok\n@endbody\n@endstep\n@solution\ns\n@endsolution\n@end`,
    );
    expect(r.warningCodes).toContain('step_body_too_long');
  });

  it('warns when step count exceeds the maximum', () => {
    const steps = Array.from({ length: 13 }, (_, i) =>
      `@step\ntitle: Move ${i + 1}\n@body\nOne line.\n@endbody\n@endstep`,
    ).join('\n');
    const r = parseCapsule(`@meta\nsubject: Math\ntopic: test\n@endmeta\n${steps}\n@solution\ns\n@endsolution\n@end`);
    expect(r.warningCodes).toContain('invalid_step_count');
  });
});
