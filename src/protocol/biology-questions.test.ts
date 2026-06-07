import { describe, it, expect } from 'vitest';
import { BIOLOGY_QUESTIONS } from './biology-question-bank';
import { verifyBiologyQuestion } from './biology-verify';
import { classifySubject } from './classifier';

describe('biology question bank', () => {
  it('has 50 questions when complete', () => {
    expect(BIOLOGY_QUESTIONS.length).toBeGreaterThanOrEqual(1);
    expect(BIOLOGY_QUESTIONS.length).toBeLessThanOrEqual(50);
  });

  it('questions are numbered uniquely without gaps in loaded set', () => {
    const nums = BIOLOGY_QUESTIONS.map((q) => q.number).sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      expect(nums[i]).toBe(i + 1);
    }
  });

  for (const def of BIOLOGY_QUESTIONS) {
    describe(`Q${def.number}: ${def.topic}`, () => {
      it('classifies as Biology', () => {
        expect(classifySubject(def.question)).toBe('Biology');
      });

      it('passes full verification (parse, answers, diagrams, PDF)', async () => {
        const result = await verifyBiologyQuestion(def);
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
