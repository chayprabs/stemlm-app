/**
 * Quality checks for @quickcheck blocks — catches one-word verdicts and
 * generic trivia that don't reinforce the step just worked.
 */
import type { ParseWarningCode, QuickCheck, Step } from './types';

const VERDICT_ONLY =
  /^(yes|no|true|false|low|high|inductive|capacitive|resistive)\.?$/i;

const FREQUENCY_VERDICT = /^(low|high)\s+frequenc(y|ies)\.?$/i;

function hasRationale(text: string): boolean {
  return /\bbecause\b|\bsince\b|—|–|--/.test(text);
}

function hasMathOrNumbers(text: string): boolean {
  return /\$|\\\(|\\frac|\\Omega|\\text|≈|~|\\approx/.test(text) || /\d/.test(text);
}

/** True when the check is worth showing to the student. */
export function isSubstantiveQuickCheck(qc: QuickCheck): boolean {
  const q = qc.question.trim();
  const a = qc.answer.trim();
  if (!q || !a) return false;

  if (VERDICT_ONLY.test(a) || FREQUENCY_VERDICT.test(a)) return false;

  const words = a.split(/\s+/).filter(Boolean);
  if (hasRationale(a) || hasMathOrNumbers(a)) return true;
  if (words.length >= 8) return true;
  if (words.length >= 5 && /—|–|--/.test(a)) return true;
  if (words.length <= 3) return false;
  if (words.length <= 5 && !hasMathOrNumbers(a)) return false;

  return words.length >= 6;
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

  if (/higher at (low|high) frequenc/i.test(q) && !hasRationale(a) && !hasMathOrNumbers(a)) {
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
