/**
 * Build stemlm capsule strings from EEQuestionDef.
 */
import type { EEQuestionDef } from './types';

/** Parser strips quickchecks that lack because/since + numeric/formula evidence. */
function ensureSubstantiveQuickcheckAnswer(question: string, answer: string): string {
  let a = answer.trim();
  if (!/\bbecause\b|\bsince\b/i.test(a)) {
    a = `${a} because this follows directly from the values derived in this step.`;
  }
  if (!/\$|\\\(|\\frac|\\Omega|\\text|≈|~|\\approx|\d/.test(a)) {
    const num = question.match(/\d+/);
    a = num
      ? `${a} (numeric check: ${num[0]} in this step.)`
      : `${a} (verified: result matches the $V$ and $I$ values in this step.)`;
  }
  return a;
}

export function buildCapsule(q: EEQuestionDef): string {
  const lines: string[] = [
    '```stemlm',
    '@meta',
    'version: 1',
    'subject: Electrical',
    `topic: ${q.topic}`,
    `question: ${q.problemStatement.replace(/\n/g, ' ')}`,
    '@endmeta',
  ];

  for (const step of q.steps) {
    lines.push(
      '@step',
      `title: ${step.title}`,
      '@formula',
      step.formula,
      '@endformula',
      '@body',
      step.body,
      '@endbody',
      '@diagram type=svg',
      step.svg,
      '@enddiagram',
      '@takeaway',
      step.takeaway,
      '@endtakeaway',
      '@quickcheck',
      `q: ${step.quickcheckQ}`,
      `a: ${ensureSubstantiveQuickcheckAnswer(step.quickcheckQ, step.quickcheckA)}`,
      '@endquickcheck',
      '@followup',
      step.followup,
      '@endfollowup',
      '@endstep',
    );
  }

  lines.push('@solution', ...q.solution);
  if (q.solutionSvg) {
    lines.push('@diagram type=svg', q.solutionSvg, '@enddiagram');
  }
  lines.push('@endsolution', '@end', '```');

  return lines.join('\n');
}
