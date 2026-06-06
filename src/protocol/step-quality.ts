/**
 * Pedagogical completeness checks for @step blocks.
 *
 * Catches formula-only steps (bare law with no symbol defs or numeric work)
 * that pass structural parsing but leave students unable to follow the math.
 */
import type { ParseWarningCode, Step } from './types';

const SYMBOL_CONTEXT =
  /\b(where|means|is the|represents|denotes|defined as|angular frequency|reactance|resistance|impedance|voltage|current|capacit|induct)\b/i;

const NUMERIC_WORK = /\d/;

function bodyShowsNumericWork(body: string): boolean {
  if (!NUMERIC_WORK.test(body)) return false;
  return /=|≈|~|\\approx|\\times|\\cdot|\\frac|\\angle/.test(body);
}

function formulaShowsNumericWork(formula: string): boolean {
  if (!NUMERIC_WORK.test(formula)) return false;
  if (/\\frac\s*\{\s*1\s*\}/.test(formula) && !/\\times|\\cdot|≈|~|\\approx/.test(formula)) {
    return false;
  }
  return (
    /=/.test(formula) &&
    (/\\times|\\cdot|≈|~|\\approx/.test(formula) || (formula.match(/\d/g)?.length ?? 0) >= 2)
  );
}

function bodyDefinesSymbols(body: string): boolean {
  return (
    SYMBOL_CONTEXT.test(body) &&
    /\b(is|are|means|where|denotes|represents|defined as|equals)\b/i.test(body)
  );
}

function formulaIntroducesSymbols(formula: string): boolean {
  return /_[A-Za-z]|\\omega|\\Omega|\\mu|\\theta|\\phi|\\angle\s*[A-Za-z]/i.test(formula);
}

export function auditStepQuality(step: Step): ParseWarningCode[] {
  const issues: ParseWarningCode[] = [];
  const body = step.body.trim();
  const formula = step.formula?.trim() ?? '';

  if (!body) {
    issues.push('missing_step_body');
    if (formula) issues.push('formula_without_body');
    return issues;
  }

  if (!formula) return issues;

  const formulaWorked = formulaShowsNumericWork(formula);
  const hasSubstitution = bodyShowsNumericWork(body);
  const hasSymbolContext = bodyDefinesSymbols(body);

  if (!hasSubstitution) {
    issues.push('step_missing_substitution');
  }

  const symbolicLaw =
    !formulaWorked &&
    formulaIntroducesSymbols(formula) &&
    /\\frac|\\omega|_[A-Za-z]|\\Omega|\\mu|\\angle/i.test(formula);

  if (symbolicLaw && !hasSymbolContext) {
    issues.push('step_missing_symbol_defs');
  }

  return issues;
}

export function stepQualityMessage(code: ParseWarningCode, step: Step): string {
  const title = step.title || `Step ${step.index}`;
  switch (code) {
    case 'missing_step_body':
      return `Step ${step.index} ("${title}") has no @body — add symbol definitions and the worked calculation.`;
    case 'formula_without_body':
      return `Step ${step.index} ("${title}") shows a formula but no @body work — define symbols and substitute values.`;
    case 'step_missing_substitution':
      return `Step ${step.index} ("${title}") needs numeric substitution in @body (plug in givens and compute).`;
    case 'step_missing_symbol_defs':
      return `Step ${step.index} ("${title}") introduces symbols in @formula without defining them in @body.`;
    default:
      return `Step ${step.index} ("${title}") is missing worked explanation.`;
  }
}

export function stepHasQualityIssues(step: Step): boolean {
  return auditStepQuality(step).length > 0;
}

export function primaryStepQualityIssue(step: Step): ParseWarningCode | null {
  return auditStepQuality(step)[0] ?? null;
}
