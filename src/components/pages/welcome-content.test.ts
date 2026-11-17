import { describe, expect, it } from 'vitest';
import { compileDiagram } from '@/src/lib/resolve-diagram';
import { parse } from '@/src/protocol/parser';
import { DEMO_ANSWER_TEXT, DEMO_CAPSULE, DEMO_QUESTION } from './demo-answer';
import { GALLERY_FIGURES } from './figure-gallery';

/**
 * The welcome page shows the product with the product: a real answer through the real parser, and
 * real specs through the real compiler. These tests are what keeps that true as both change.
 */
describe('welcome page content', () => {
  it('the demo answer parses cleanly into steps, a quick check and a closing answer', () => {
    const result = parse(DEMO_ANSWER_TEXT);
    expect(result.status).toBe('ok');
    expect(result.warnings).toEqual([]);
    expect(DEMO_CAPSULE).not.toBeNull();
    const capsule = DEMO_CAPSULE!;
    expect(capsule.steps.length).toBeGreaterThanOrEqual(3);
    expect(capsule.steps.some((step) => step.quickCheck)).toBe(true);
    expect(capsule.steps.some((step) => step.formula)).toBe(true);
    expect(capsule.solution.trim().length).toBeGreaterThan(0);
    expect(capsule.meta.question).toBe(DEMO_QUESTION);
  });

  it('every figure in the demo answer compiles', async () => {
    const diagrams = DEMO_CAPSULE!.steps.flatMap((step) => (step.diagram ? [step.diagram] : []));
    expect(diagrams.length).toBeGreaterThanOrEqual(2);
    for (const diagram of diagrams) {
      const compiled = await compileDiagram(diagram, 'step');
      expect(compiled.ok, `${diagram.type}: ${compiled.ok ? '' : compiled.diagnostic.reason}`).toBe(true);
    }
  });

  it('every gallery figure compiles, and each shows a different family', async () => {
    expect(GALLERY_FIGURES.length).toBeGreaterThanOrEqual(4);
    expect(GALLERY_FIGURES.length).toBeLessThanOrEqual(6);
    expect(new Set(GALLERY_FIGURES.map((figure) => figure.diagram.type)).size).toBe(GALLERY_FIGURES.length);
    for (const figure of GALLERY_FIGURES) {
      const compiled = await compileDiagram(figure.diagram, 'step');
      expect(compiled.ok, `${figure.id}: ${compiled.ok ? '' : compiled.diagnostic.reason}`).toBe(true);
    }
  });
});
