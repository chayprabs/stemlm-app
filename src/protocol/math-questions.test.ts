import { describe, it, expect } from 'vitest';
import { MATH_QUESTIONS } from './math-question-bank';
import { verifyMathQuestion } from './math-verify';
import { classifySubject } from './classifier';

describe('mathematics question bank', () => {
  it('has all 50 mathematics benchmark questions', () => {
    expect(MATH_QUESTIONS.length).toBe(50);
  });

  it('questions are numbered uniquely without gaps in loaded set', () => {
    const nums = MATH_QUESTIONS.map((q) => q.number).sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      expect(nums[i]).toBe(i + 1);
    }
  });

  for (const def of MATH_QUESTIONS) {
    describe(`Q${def.number}: ${def.topic}`, () => {
      it('classifies as Math', () => {
        expect(classifySubject(def.question)).toBe('Math');
      });

      it('passes full verification (parse, answers, diagrams, PDF)', async () => {
        const result = await verifyMathQuestion(def);
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
