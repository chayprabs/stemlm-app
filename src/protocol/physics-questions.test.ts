import { describe, it, expect } from 'vitest';
import { PHYSICS_QUESTIONS } from './physics-question-bank';
import { verifyPhysicsQuestion } from './physics-verify';
import { classifySubject } from './classifier';
import { auditCapsuleDiagrams } from './diagram-quality';
import { buildPhysicsCapsule } from './physics-question-bank/build-capsule';
import { parse } from './parser';

describe('physics question bank', () => {
  it('has 50 questions when complete', () => {
    expect(PHYSICS_QUESTIONS.length).toBe(50);
  });

  it('questions are numbered uniquely without gaps in loaded set', () => {
    const nums = PHYSICS_QUESTIONS.map((q) => q.number).sort((a, b) => a - b);
    for (let i = 0; i < nums.length; i++) {
      expect(nums[i]).toBe(i + 1);
    }
  });

  for (const def of PHYSICS_QUESTIONS) {
    describe(`Q${def.number}: ${def.topic}`, () => {
      it('classifies as Physics', () => {
        expect(classifySubject(def.question)).toBe('Physics');
      });

      it('passes full verification (parse, answers, diagrams, PDF)', async () => {
        const result = await verifyPhysicsQuestion(def);
        const parsed = parse(buildPhysicsCapsule(def));
        const diagramIssues = parsed.capsule ? auditCapsuleDiagrams(parsed.capsule) : [];

        if (!result.ok || result.warnings.length || diagramIssues.length) {
          console.error(`Q${def.number} errors:`, result.errors);
          console.error(`Q${def.number} warnings:`, result.warnings);
          console.error(`Q${def.number} diagram-quality:`, diagramIssues);
        }

        expect(result.ok, result.errors.join('; ')).toBe(true);
        expect(result.warnings, `Q${def.number} warnings: ${result.warnings.join('; ')}`).toHaveLength(0);
        expect(
          diagramIssues,
          `Q${def.number} diagram-quality: ${diagramIssues.join('; ')}`,
        ).toHaveLength(0);
        expect(result.stepCount).toBeGreaterThanOrEqual(3);
        expect(result.diagramCount).toBeGreaterThanOrEqual(def.minDiagramSteps ?? 2);
      });
    });
  }
});
