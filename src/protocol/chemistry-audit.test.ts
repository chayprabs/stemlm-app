/**
 * Deep audit: verify every chemistry question individually with full error reporting.
 * This is the ground-truth check — not a summary claim.
 */
import { describe, it, expect } from 'vitest';
import { CHEMISTRY_QUESTIONS } from './chemistry-question-bank';
import { verifyChemistryQuestion } from './chemistry-verify';
import { classifySubject } from './classifier';
import { buildChemistryCapsule } from './chemistry-question-bank/build-capsule';
import { parse } from './parser';
import { extractSvg, sanitizeSvg } from '@/src/lib/sanitize';
import { presentSvg } from '@/src/lib/svg-present';
import { computeDisplaySize, DIAGRAM_BOUNDS } from '@/src/lib/diagram-bounds';

describe('chemistry deep audit (ground truth)', () => {
  it('has exactly 50 questions numbered 1-50 without gaps', () => {
    expect(CHEMISTRY_QUESTIONS.length).toBe(50);
    const nums = CHEMISTRY_QUESTIONS.map((q) => q.number).sort((a, b) => a - b);
    expect(nums).toEqual([...Array(50)].map((_, i) => i + 1));
  });

  for (const def of CHEMISTRY_QUESTIONS) {
    describe(`Q${String(def.number).padStart(2, '0')}: ${def.topic}`, () => {
      it('classifies as Chemistry', () => {
        expect(classifySubject(def.question)).toBe('Chemistry');
      });

      it('passes strict end-to-end verification', async () => {
        const result = await verifyChemistryQuestion(def);
        if (!result.ok) {
          console.error(`\n=== Q${def.number} FAILED ===`);
          console.error('Errors:', result.errors);
          console.error('Warnings:', result.warnings);
        }
        expect(result.ok, `Q${def.number}: ${result.errors.join('; ')}`).toBe(true);
        expect(result.stepCount).toBeGreaterThanOrEqual(3);
        expect(result.diagramCount).toBeGreaterThanOrEqual(def.minDiagramSteps ?? 2);
      });

      it('every diagram step has valid SVG, sizing, and no label collisions (step profile)', async () => {
        const raw = buildChemistryCapsule(def);
        const parsed = parse(raw);
        expect(parsed.status).toBe('ok');
        const diagrams = parsed.capsule!.steps.flatMap((s) =>
          s.diagram?.type === 'svg' ? [s.diagram] : [],
        );
        expect(diagrams.length).toBeGreaterThanOrEqual(def.minDiagramSteps ?? 2);

        for (const [i, diagram] of diagrams.entries()) {
          const clean = sanitizeSvg(extractSvg(diagram.content));
          const doc = new DOMParser().parseFromString(clean, 'image/svg+xml');
          expect(doc.querySelector('parsererror'), `Q${def.number} diagram ${i + 1}: SVG parse error`).toBeNull();
          expect(doc.documentElement.tagName.toLowerCase()).toBe('svg');

          const presented = presentSvg(clean, 'light', 'step');
          const { width, height } = computeDisplaySize(
            doc.documentElement.getAttribute('viewBox'),
            'step',
          );
          const { maxW, maxH } = DIAGRAM_BOUNDS.step;
          expect(width).toBeLessThanOrEqual(maxW + 2);
          expect(height).toBeLessThanOrEqual(maxH + 2);

          const texts = [...doc.querySelectorAll('text')];
          for (let a = 0; a < texts.length; a++) {
            for (let b = a + 1; b < texts.length; b++) {
              const ax = Number(texts[a]!.getAttribute('x'));
              const ay = Number(texts[a]!.getAttribute('y'));
              const bx = Number(texts[b]!.getAttribute('x'));
              const by = Number(texts[b]!.getAttribute('y'));
              if (Number.isNaN(ax) || Number.isNaN(ay) || Number.isNaN(bx) || Number.isNaN(by)) continue;
              const collide = Math.abs(ax - bx) < 3 && Math.abs(ay - by) < 3;
              expect(
                collide,
                `Q${def.number} diagram ${i + 1}: labels collide at (${ax},${ay}): "${texts[a]!.textContent}" vs "${texts[b]!.textContent}"`,
              ).toBe(false);
            }
          }
        }
      });
    });
  }
});
