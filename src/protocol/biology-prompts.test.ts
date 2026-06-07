import { describe, it, expect } from 'vitest';
import { BIOLOGY_PROMPTS } from './biology-prompts';
import { classifySubject } from './classifier';
import { buildInjectionPrompt, buildInjectionPayload } from './builder';

describe('biology prompts (AI pipeline inputs)', () => {
  it('has exactly 100 exam prompts without pre-authored solutions', () => {
    expect(BIOLOGY_PROMPTS.length).toBe(100);
    for (const p of BIOLOGY_PROMPTS) {
      expect(p.question.length).toBeGreaterThan(20);
      expect(p).not.toHaveProperty('steps');
      expect(p).not.toHaveProperty('solution');
      expect(p).not.toHaveProperty('verifiedPatterns');
    }
  });

  it('questions are numbered uniquely 1–100', () => {
    const nums = BIOLOGY_PROMPTS.map((q) => q.number).sort((a, b) => a - b);
    expect(nums).toEqual(Array.from({ length: 100 }, (_, i) => i + 1));
  });

  it('ids are unique q01–q100', () => {
    const ids = BIOLOGY_PROMPTS.map((q) => q.id);
    expect(new Set(ids).size).toBe(100);
  });

  for (const prompt of BIOLOGY_PROMPTS) {
    describe(`Q${prompt.number}: ${prompt.topic}`, () => {
      it('classifies as Biology', () => {
        expect(classifySubject(prompt.question)).toBe('Biology');
      });

      it('builds Gemini injection prompt with biology playbook', () => {
        const { prompt: injected, subject } = buildInjectionPrompt(prompt.question, {
          subject: 'Biology',
        });
        expect(subject).toBe('Biology');
        expect(injected).toContain(prompt.question.slice(0, 40));
        expect(injected).toContain('stemLM instructions');
        expect(injected).toMatch(/Biology/i);
      });

      it('file-attach payload routes to Biology playbook', () => {
        const payload = buildInjectionPayload(prompt.question, { subject: 'Biology' });
        expect(payload.subject).toBe('Biology');
        expect(payload.fileContent).toMatch(/Biology/i);
        expect(payload.composerText).toContain(prompt.question.slice(0, 30));
      });
    });
  }
});
