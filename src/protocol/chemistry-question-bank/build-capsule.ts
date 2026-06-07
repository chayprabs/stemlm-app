import type { ChemistryQuestionDef } from './types';

function ensureSvg(content: string): string {
  const trimmed = content.trim();
  if (trimmed.startsWith('<svg')) return trimmed;
  return `<svg viewBox="0 0 300 180">${trimmed}</svg>`;
}

/** Build a fenced stemLM capsule string from a structured chemistry question. */
export function buildChemistryCapsule(def: ChemistryQuestionDef): string {
  const steps = def.steps
    .map((step) => {
      const parts = [
        '@step',
        `title: ${step.title}`,
        step.formula ? '@formula' : '',
        step.formula ?? '',
        step.formula ? '@endformula' : '',
        '@body',
        step.body,
        '@endbody',
      ];
      if (step.diagram) {
        parts.push('@diagram type=svg', ensureSvg(step.diagram), '@enddiagram');
      }
      if (step.takeaway) {
        parts.push('@takeaway', step.takeaway, '@endtakeaway');
      }
      parts.push('@endstep');
      return parts.filter((p) => p !== '').join('\n');
    })
    .join('\n');

  return [
    '```stemlm',
    '@meta',
    'version: 1',
    'subject: Chemistry',
    `topic: ${def.topic}`,
    `question: ${def.question.replace(/\n/g, ' ').slice(0, 500)}`,
    '@endmeta',
    steps,
    '@solution',
    def.solution,
    '@endsolution',
    '@end',
    '```',
  ].join('\n');
}
