import { describe, it, expect } from 'vitest';
import { BIOLOGY_PROMPTS } from './biology-prompts';
import { verifyCapsule } from './capsule-verify';
import { FENCED_BIOLOGY } from './__fixtures__';
import { isVisualDenseProblem, auditCapsuleDiagrams } from './diagram-quality';
import { parse } from './parser';

/**
 * Validates the AI output pipeline for biology — structural checks only.
 * Solutions and diagrams are produced by Gemini at runtime, not stored in code.
 */
describe('biology AI pipeline (structural verification)', () => {
  it('diagram-quality treats biology diagram prompts as visual-dense', () => {
    const drawPrompt = BIOLOGY_PROMPTS.find((p) => p.number === 1)!;
    const parsed = parse(
      [
        '```stemlm',
        '@meta',
        'version: 1',
        'subject: Biology',
        `topic: ${drawPrompt.topic}`,
        `question: ${drawPrompt.question}`,
        '@endmeta',
        '@step',
        'title: Draw prokaryotic cell',
        '@body',
        'Prokaryotes lack membrane-bound organelles.',
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

  it('FENCED_BIOLOGY fixture passes structural capsule verification', async () => {
    const result = await verifyCapsule(FENCED_BIOLOGY);
    if (!result.ok) {
      console.error('Fixture errors:', result.errors);
    }
    expect(result.ok, result.errors.join('; ')).toBe(true);
    expect(result.subject).toBe('Biology');
    expect(result.stepCount).toBeGreaterThanOrEqual(3);
    expect(result.diagramCount).toBeGreaterThanOrEqual(2);
  });

  it('flags diagram-intensive biology capsules missing required SVGs', () => {
    const drawPrompt = BIOLOGY_PROMPTS.find((p) => p.number === 1)!;
    const parsed = parse(
      [
        '```stemlm',
        '@meta',
        'version: 1',
        'subject: Biology',
        `topic: ${drawPrompt.topic}`,
        `question: ${drawPrompt.question}`,
        '@endmeta',
        '@step',
        'title: Draw prokaryotic cell',
        '@body',
        'Label nucleoid, ribosomes, and cell wall.',
        '@endbody',
        '@endstep',
        '@step',
        'title: Draw eukaryotic cell',
        '@body',
        'Label nucleus and mitochondria.',
        '@endbody',
        '@endstep',
        '@step',
        'title: Endosymbiosis evidence',
        '@body',
        'Double membranes and own DNA support endosymbiosis.',
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

  it('exam prompts are biology topics that require Gemini-generated diagrams', () => {
    expect(BIOLOGY_PROMPTS.every((p) => p.topic.length > 3)).toBe(true);
    const explicitDraw = BIOLOGY_PROMPTS.filter((p) => /\b(draw|diagram|label|sketch)\b/i.test(p.question));
    expect(explicitDraw.length).toBeGreaterThanOrEqual(8);
  });
});
