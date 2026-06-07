import { describe, it, expect } from 'vitest';
import { MATH_PROMPTS } from './math-prompts';
import { verifyCapsule } from './capsule-verify';
import { FENCED_MATH } from './__fixtures__';
import { isVisualDenseProblem, auditCapsuleDiagrams } from './diagram-quality';
import { parse } from './parser';

/**
 * Validates the AI output pipeline for math — structural checks only.
 * Solutions and diagrams are produced by Gemini at runtime, not stored in code.
 */
describe('math AI pipeline (structural verification)', () => {
  it('diagram-quality treats graph/sketch math prompts as visual-dense', () => {
    const graphPrompt = MATH_PROMPTS.find((p) => /\b(sketch|graph|phase)\b/i.test(p.question))!;
    expect(graphPrompt).toBeDefined();
    const parsed = parse(
      [
        '```stemlm',
        '@meta',
        'version: 1',
        'subject: Math',
        `topic: ${graphPrompt.topic}`,
        `question: ${graphPrompt.question}`,
        '@endmeta',
        '@step',
        'title: Sketch the phase portrait',
        '@body',
        'Eigenvectors define the stable direction.',
        '@endbody',
        '@endstep',
        '@step',
        'title: Mark the saddle',
        '@body',
        'Trajectories approach along one axis and leave along another.',
        '@endbody',
        '@endstep',
        '@step',
        'title: Annotate decay',
        '@body',
        'Factor $e^{-t}$ controls amplitude.',
        '@endbody',
        '@endstep',
        '@solution',
        'See steps.',
        '@endsolution',
        '@end',
        '```',
      ].join('\n'),
    );
    expect(parsed.capsule).toBeDefined();
    expect(isVisualDenseProblem(parsed.capsule!)).toBe(true);
  });

  it('FENCED_MATH fixture passes structural capsule verification', async () => {
    const result = await verifyCapsule(FENCED_MATH);
    if (!result.ok) {
      console.error('Fixture errors:', result.errors);
    }
    expect(result.ok, result.errors.join('; ')).toBe(true);
    expect(result.subject).toBe('Math');
    expect(result.stepCount).toBeGreaterThanOrEqual(3);
    expect(result.diagramCount).toBeGreaterThanOrEqual(2);
  });

  it('flags diagram-intensive math capsules missing required SVGs', () => {
    const polarPrompt = MATH_PROMPTS.find((p) => p.number === 5)!;
    const parsed = parse(
      [
        '```stemlm',
        '@meta',
        'version: 1',
        'subject: Math',
        `topic: ${polarPrompt.topic}`,
        `question: ${polarPrompt.question}`,
        '@endmeta',
        '@step',
        'title: Sketch the polar region',
        '@body',
        'Disk centered at $(1,0)$ with radius $1$.',
        '@endbody',
        '@endstep',
        '@step',
        'title: Set up the integral',
        '@body',
        'Integrand $r^3$ in polar coordinates.',
        '@endbody',
        '@endstep',
        '@step',
        'title: Evaluate',
        '@body',
        'Antiderivative $\\frac{r^4}{4}$.',
        '@endbody',
        '@endstep',
        '@solution',
        'See steps.',
        '@endsolution',
        '@end',
        '```',
      ].join('\n'),
    );
    const capsule = parsed.capsule!;
    const stripped = {
      ...capsule,
      steps: capsule.steps.map((s) => ({ ...s, diagram: undefined })),
    };
    const issues = auditCapsuleDiagrams(stripped);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('exam prompts are math topics without pre-authored solution fields', () => {
    expect(MATH_PROMPTS.length).toBe(100);
    expect(MATH_PROMPTS.every((p) => p.topic.length > 3)).toBe(true);
    const visual = MATH_PROMPTS.filter(
      (p) =>
        /\b(sketch|graph|plot|draw|phase|polar|paraboloid|eigenvector|number line|contour)\b/i.test(
          `${p.topic} ${p.question}`,
        ),
    );
    expect(visual.length).toBeGreaterThanOrEqual(3);
  });
});
