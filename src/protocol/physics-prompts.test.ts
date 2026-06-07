import { describe, it, expect } from 'vitest';
import { PHYSICS_PROMPTS } from './physics-prompts';
import { classifySubject } from './classifier';
import { buildInjectionPrompt, buildInjectionPayload, getDiagramRequirement } from './builder';

describe('physics prompts (AI pipeline inputs)', () => {
  it('has exactly 100 exam prompts without pre-authored solutions', () => {
    expect(PHYSICS_PROMPTS.length).toBe(100);
    for (const p of PHYSICS_PROMPTS) {
      expect(p.question.length).toBeGreaterThan(20);
      expect(p).not.toHaveProperty('steps');
      expect(p).not.toHaveProperty('solution');
      expect(p).not.toHaveProperty('verifiedPatterns');
    }
  });

  it('questions are numbered uniquely 1–100', () => {
    const nums = PHYSICS_PROMPTS.map((q) => q.number).sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      expect(nums[i]).toBe(i + 1);
    }
  });

  for (const prompt of PHYSICS_PROMPTS) {
    describe(`Q${prompt.number}: ${prompt.topic}`, () => {
      it('classifies as Physics', () => {
        expect(classifySubject(`${prompt.topic}. ${prompt.question}`)).toBe('Physics');
      });

      it('builds Gemini injection prompt with physics playbook', () => {
        const { prompt: injected, subject } = buildInjectionPrompt(prompt.question);
        expect(subject).toBe('Physics');
        expect(injected).toContain(prompt.question.slice(0, 40));
        expect(injected).toContain('stemLM instructions');
        expect(injected).toContain('PHYSICS');
      });

      it('file-attach payload routes to Physics playbook', () => {
        const payload = buildInjectionPayload(prompt.question);
        expect(payload.subject).toBe('Physics');
        expect(payload.fileContent).toContain('PHYSICS');
        expect(payload.composerText).toContain(getDiagramRequirement('Physics').slice(0, 30));
      });
    });
  }
});
