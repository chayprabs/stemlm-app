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
