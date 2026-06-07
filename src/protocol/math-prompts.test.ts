import { describe, it, expect } from 'vitest';
import { MATH_PROMPTS } from './math-prompts';
import { classifySubject } from './classifier';
import { buildInjectionPrompt, buildInjectionPayload, getDiagramRequirement } from './builder';

describe('math prompts (AI pipeline inputs)', () => {
  it('has exactly 61 exam prompts without pre-authored solutions', () => {
    expect(MATH_PROMPTS.length).toBe(61);
    for (const p of MATH_PROMPTS) {
      expect(p.question.length).toBeGreaterThan(20);
      expect(p).not.toHaveProperty('steps');
      expect(p).not.toHaveProperty('solution');
      expect(p).not.toHaveProperty('verifiedPatterns');
    }
  });

  it('questions are numbered uniquely 1–61', () => {
    const nums = MATH_PROMPTS.map((q) => q.number).sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      expect(nums[i]).toBe(i + 1);
    }
  });

  for (const prompt of MATH_PROMPTS) {
    describe(`Q${prompt.number}: ${prompt.topic}`, () => {
      it('classifies as Math', () => {
        expect(classifySubject(prompt.question)).toBe('Math');
      });

      it('builds Gemini injection prompt with math playbook', () => {
        const { prompt: injected, subject } = buildInjectionPrompt(prompt.question);
        expect(subject).toBe('Math');
        expect(injected).toContain(prompt.question.slice(0, 40));
        expect(injected).toContain('stemLM instructions');
        expect(injected).toContain('MATH');
      });

      it('file-attach payload routes to Math playbook', () => {
        const payload = buildInjectionPayload(prompt.question);
        expect(payload.subject).toBe('Math');
        expect(payload.fileContent).toContain('MATH');
        expect(payload.composerText).toContain(getDiagramRequirement('Math').slice(0, 30));
      });
    });
  }
});
