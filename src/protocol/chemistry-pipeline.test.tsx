import { describe, it, expect } from 'vitest';
import { CHEMISTRY_PROMPTS } from './chemistry-prompts';
import { verifyCapsule } from './capsule-verify';
import { FENCED_CHEMISTRY } from './__fixtures__';
import { isVisualDenseProblem, auditCapsuleDiagrams } from './diagram-quality';
import { parse } from './parser';

/**
 * Validates the AI output pipeline for chemistry — structural checks only.
 * Solutions and diagrams are produced by Gemini at runtime, not stored in code.
 */
describe('chemistry AI pipeline (structural verification)', () => {
  it('diagram-quality treats chemistry diagram prompts as visual-dense', () => {
    const drawPrompt = CHEMISTRY_PROMPTS.find((p) => p.number === 1)!;
    const parsed = parse(
      [
        '```stemlm',
        '@meta',
        'version: 1',
        'subject: Chemistry',
        `topic: ${drawPrompt.topic}`,
        `question: ${drawPrompt.question}`,
        '@endmeta',
        '@step',
        'title: Draw hydrogen energy levels',
        '@body',
        'Energy levels follow $E_n=-13.6/n^2$ eV.',
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

  it('FENCED_CHEMISTRY fixture passes structural capsule verification', async () => {
    const result = await verifyCapsule(FENCED_CHEMISTRY);
    if (!result.ok) {
      console.error('Fixture errors:', result.errors);
    }
    expect(result.ok, result.errors.join('; ')).toBe(true);
    expect(result.subject).toBe('Chemistry');
    expect(result.stepCount).toBeGreaterThanOrEqual(3);
    expect(result.diagramCount).toBeGreaterThanOrEqual(2);
  });

  it('flags diagram-intensive chemistry capsules missing required SVGs', () => {
    const drawPrompt = CHEMISTRY_PROMPTS.find((p) => p.number === 1)!;
    const parsed = parse(
      [
        '```stemlm',
        '@meta',
        'version: 1',
        'subject: Chemistry',
        `topic: ${drawPrompt.topic}`,
        `question: ${drawPrompt.question}`,
        '@endmeta',
        '@step',
        'title: Draw hydrogen energy levels',
        '@body',
        'Energy levels follow $E_n=-13.6/n^2$ eV.',
        '@endbody',
        '@endstep',
        '@step',
        'title: Sketch radial probability',
        '@body',
        '2s has one radial node.',
        '@endbody',
        '@endstep',
        '@step',
        'title: Compare shielding',
        '@body',
        '3s penetrates more than 3p.',
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

  it('exam prompts are chemistry topics that require Gemini-generated diagrams', () => {
    expect(CHEMISTRY_PROMPTS.every((p) => p.topic.length > 3)).toBe(true);
    const explicitDraw = CHEMISTRY_PROMPTS.filter((p) => /\b(draw|sketch)\b/i.test(p.question));
    expect(explicitDraw.length).toBeGreaterThanOrEqual(8);
  });
});
