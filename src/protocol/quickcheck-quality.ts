/**
 * Quality checks for @quickcheck blocks — catches one-word verdicts and
 * generic trivia that don't reinforce the step just worked.
 */
import type { ParseWarningCode, QuickCheck, Step } from './types';

const VERDICT_ONLY =
  /^(yes|no|true|false|low|high|inductive|capacitive|resistive)\.?$/i;

const FREQUENCY_VERDICT = /^(low|high)\s+frequenc(y|ies)\.?$/i;

function hasExplicitRationale(text: string): boolean {
  return /\bbecause\b|\bsince\b/i.test(text);
}

function hasStepEvidence(text: string): boolean {
  return (
    /\$|\\\(|\\frac|\\Omega|\\text|≈|~|\\approx/.test(text) ||
    /[=<>]/.test(text) ||
    /\d/.test(text)
  );
}

/** True when the check is worth showing to the student. */
export function isSubstantiveQuickCheck(qc: QuickCheck): boolean {
  const q = qc.question.trim();
  const a = qc.answer.trim();
  if (!q || !a) return false;

  if (VERDICT_ONLY.test(a) || FREQUENCY_VERDICT.test(a)) return false;
  if (!hasExplicitRationale(a)) return false;
  if (!hasStepEvidence(a)) return false;

  if (/\b(low|high)\s+frequenc/i.test(a) && !/\d/.test(a)) return false;

  return true;
}

export function auditQuickCheck(qc: QuickCheck, step: Step): ParseWarningCode[] {
  const issues: ParseWarningCode[] = [];
  const q = qc.question.trim();
  const a = qc.answer.trim();

  if (!q) issues.push('quickcheck_missing_question');
  if (!a) issues.push('quickcheck_missing_answer');
  if (!q || !a) return issues;

  if (!isSubstantiveQuickCheck(qc)) {
    issues.push('quickcheck_thin_answer');
  }

  const genericFreqQ = /frequenc|low or high|inductive or capacitive/i;
  const genericFreqA = /\b(low|high)\s+frequenc|\binductive\b|\bcapacitive\b/i;
  if (genericFreqQ.test(q) && genericFreqA.test(a) && !hasStepEvidence(a)) {
    issues.push('quickcheck_generic_trivia');
  }

  return issues;
}

export function quickCheckQualityMessage(code: ParseWarningCode, step: Step): string {
  const title = step.title || `Step ${step.index}`;
  switch (code) {
    case 'quickcheck_missing_question':
      return `Step ${step.index} ("${title}") @quickcheck is missing q:.`;
    case 'quickcheck_missing_answer':
      return `Step ${step.index} ("${title}") @quickcheck is missing a:.`;
    case 'quickcheck_thin_answer':
      return `Step ${step.index} ("${title}") @quickcheck answer is too terse — include because/since and a formula or number from this step.`;
    case 'quickcheck_generic_trivia':
      return `Step ${step.index} ("${title}") @quickcheck is generic trivia — test this step's specific result instead.`;
    default:
      return `Step ${step.index} ("${title}") has a weak @quickcheck.`;
  }
}
