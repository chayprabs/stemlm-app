import { describe, it, expect } from 'vitest';
import { CHEMISTRY_QUESTIONS } from './chemistry-question-bank';
import { verifyChemistryQuestion } from './chemistry-verify';
import { classifySubject } from './classifier';

describe('chemistry question bank', () => {
  it('has exactly 50 questions when complete', () => {
    expect(CHEMISTRY_QUESTIONS.length).toBe(50);
  });

  it('questions are numbered uniquely without gaps in loaded set', () => {
    const nums = CHEMISTRY_QUESTIONS.map((q) => q.number).sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      expect(nums[i]).toBe(i + 1);
    }
  });

  for (const def of CHEMISTRY_QUESTIONS) {
    describe(`Q${def.number}: ${def.topic}`, () => {
      it('classifies as Chemistry', () => {
        expect(classifySubject(def.question)).toBe('Chemistry');
      });

      it('passes full verification (parse, answers, diagrams, PDF)', async () => {
        const result = await verifyChemistryQuestion(def);
        if (!result.ok) {
          console.error(`Q${def.number} errors:`, result.errors);
          console.error(`Q${def.number} warnings:`, result.warnings);
        }
        expect(result.ok, result.errors.join('; ')).toBe(true);
        expect(result.stepCount).toBeGreaterThanOrEqual(3);
        expect(result.diagramCount).toBeGreaterThanOrEqual(def.minDiagramSteps ?? 2);
      });
    });
  }
});
