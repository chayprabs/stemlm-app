import { describe, expect, it } from 'vitest';
import { scoreRaw } from './score';

const THREE_STEP_CAPSULE = [
  '```stemlm',
  '@meta',
  'version: 1',
  'subject: Math',
  'topic: Linear solve',
  '@endmeta',
  '@step id=s1',
  'title: Identify the equation',
  '@body',
  'Start from $2x+3=7$.',
  '@endbody',
  '@endstep',
  '@step id=s2',
  'title: Isolate the term',
  '@body',
  'Subtract $3$ from both sides to get $2x=4$.',
  '@endbody',
  '@endstep',
  '@step id=s3',
  'title: Divide by the coefficient',
  '@body',
  'Divide by $2$ to get $x=2$.',
  '@endbody',
  '@endstep',
  '@verify',
  'methods: alt',
  'status: pass',
  'notes: reverse the algebra recovers 7',
  '@endverify',
  '@uncertainty',
  'assumption: none',
  'low_confidence: none',
  'check: arithmetic signs',
  '@enduncertainty',
  '@solution',
  'The solution is $x=2$.',
  '@endsolution',
  '@end',
  '```',
].join('\n');

describe('scoreRaw', () => {
  it('scores a clean three-step capsule as parseable', async () => {
    const score = await scoreRaw(THREE_STEP_CAPSULE);
    expect(score.parse_ok).toBe(1);
    expect(score.clean_fence).toBe(1);
    expect(score.step_count).toBe(3);
    expect(score.markers).toBe(2);
  });

  it('returns stable failure metadata for non-capsule text', async () => {
    const score = await scoreRaw('plain answer');
    expect(score.parse_ok).toBe(0);
    expect(score.error_code).toBe('no_capsule');
    expect(score.warning_codes).toContain('no_capsule');
  });
});
