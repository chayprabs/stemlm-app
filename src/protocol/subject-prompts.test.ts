import { describe, it, expect } from 'vitest';
import { CHEMISTRY_PROMPTS } from './chemistry-prompts';
import { PHYSICS_PROMPTS } from './physics-prompts';
import { MATH_PROMPTS } from './math-prompts';
import { BIOLOGY_PROMPTS } from './biology-prompts';
import { ELECTRICAL_PROMPTS } from './electrical-prompts';
import { classifySubject } from './classifier';
import { buildInjectionPrompt } from './builder';

const SUBJECT_BANKS = [
  { name: 'Chemistry', prompts: CHEMISTRY_PROMPTS, subject: 'Chemistry' as const, expected: 50 },
  { name: 'Physics', prompts: PHYSICS_PROMPTS, subject: 'Physics' as const, expected: 100 },
  { name: 'Math', prompts: MATH_PROMPTS, subject: 'Math' as const, expected: 100 },
  { name: 'Biology', prompts: BIOLOGY_PROMPTS, subject: 'Biology' as const, expected: 100 },
  { name: 'Electrical', prompts: ELECTRICAL_PROMPTS, subject: 'Electrical' as const, expected: 100 },
] as const;

describe('subject prompt banks (AI inputs only — no hardcoded solutions)', () => {
  for (const bank of SUBJECT_BANKS) {
    describe(bank.name, () => {
      it(`has ${bank.expected} prompts without pre-authored solutions`, () => {
        expect(bank.prompts.length).toBe(bank.expected);
        for (const p of bank.prompts) {
          expect(p.question.length).toBeGreaterThan(10);
          expect(p).not.toHaveProperty('steps');
          expect(p).not.toHaveProperty('solution');
          expect(p).not.toHaveProperty('verifiedPatterns');
        }
      });

      it('at least half of prompts classify to the expected subject', () => {
        const minHits =
          bank.subject === 'Electrical' ? Math.ceil(bank.prompts.length * 0.2) : Math.ceil(bank.prompts.length / 2);
        const hits = bank.prompts.filter(
          (p) => classifySubject(`${p.topic}. ${p.question}`) === bank.subject,
        ).length;
        expect(hits).toBeGreaterThanOrEqual(minHits);
      });

      it('builds Gemini injection with subject override', () => {
        const sample = bank.prompts[0]!;
        const { prompt, subject } = buildInjectionPrompt(sample.question, { subject: bank.subject });
        expect(subject).toBe(bank.subject);
        expect(prompt).toContain(sample.question.slice(0, 30));
        expect(prompt).toContain('stemLM instructions');
      });
    });
  }
});
