import { describe, it, expect } from 'vitest';
import { CHEMISTRY_PROMPTS } from './chemistry-prompts';
import { classifySubject } from './classifier';
import {
  buildInjectionPrompt,
  buildInjectionPayload,
  CHEMISTRY_DIAGRAM_REQUIREMENT,
  getDiagramRequirement,
} from './builder';

describe('chemistry prompts (AI pipeline inputs)', () => {
  it('has exactly 50 exam prompts without pre-authored solutions', () => {
    expect(CHEMISTRY_PROMPTS.length).toBe(50);
    for (const p of CHEMISTRY_PROMPTS) {
      expect(p.question.length).toBeGreaterThan(20);
      expect(p).not.toHaveProperty('steps');
      expect(p).not.toHaveProperty('solution');
      expect(p).not.toHaveProperty('verifiedPatterns');
    }
  });

  it('questions are numbered uniquely 1–50', () => {
    const nums = CHEMISTRY_PROMPTS.map((q) => q.number).sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      expect(nums[i]).toBe(i + 1);
    }
  });

  for (const prompt of CHEMISTRY_PROMPTS) {
    describe(`Q${prompt.number}: ${prompt.topic}`, () => {
      it('classifies as Chemistry', () => {
        expect(classifySubject(prompt.question)).toBe('Chemistry');
      });

      it('builds Gemini injection prompt with chemistry playbook and diagram rules', () => {
        const { prompt: injected, subject } = buildInjectionPrompt(prompt.question);
        expect(subject).toBe('Chemistry');
        expect(injected).toContain(prompt.question.slice(0, 40));
        expect(injected).toContain('stemLM instructions');
        expect(injected).toContain('CHEMISTRY');
        expect(injected).toContain('mhchem');
        expect(injected).toContain(CHEMISTRY_DIAGRAM_REQUIREMENT.slice(0, 40));
      });

      it('file-attach payload routes to Chemistry playbook', () => {
        const payload = buildInjectionPayload(prompt.question);
        expect(payload.subject).toBe('Chemistry');
        expect(payload.fileContent).toContain('CHEMISTRY');
        expect(payload.composerText).toContain(getDiagramRequirement('Chemistry').slice(0, 30));
      });
    });
  }
});
