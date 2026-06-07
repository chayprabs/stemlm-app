import { describe, expect, it } from 'vitest';
import { buildInjectionPayload } from '../builder';
import { classifySubject } from '../classifier';
import { biologyBenchmarkSpecs } from './specs';

describe('biology benchmark routing audit (live extension path)', () => {
  const mismatches: string[] = [];

  for (const spec of biologyBenchmarkSpecs) {
    const subject = classifySubject(spec.question);
    const payload = buildInjectionPayload(spec.question);
    if (subject !== 'Biology' || payload.subject !== 'Biology') {
      mismatches.push(
        `${spec.id}: classify=${subject}, payload=${payload.subject}, topic=${spec.topic}`,
      );
    }
  }

  it('all 50 questions classify and inject as Biology', () => {
    if (mismatches.length > 0) {
      console.error('Routing mismatches:\n', mismatches.join('\n'));
    }
    expect(mismatches, mismatches.join('; ')).toEqual([]);
  });

  it('every payload includes Biology playbook content', () => {
    for (const spec of biologyBenchmarkSpecs) {
      const payload = buildInjectionPayload(spec.question);
      expect(payload.fileContent).toMatch(/Biology/i);
      expect(payload.composerText.length).toBeGreaterThan(spec.question.length);
    }
  });
});
