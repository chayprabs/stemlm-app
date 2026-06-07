/**
 * Student-facing step content — never surface parser/repair diagnostic text.
 */
import type { Step } from '@/src/protocol/types';
import {
  formulaShowsNumericWork,
  isDiagnosticBodyText,
} from '@/src/protocol/step-quality';

function normalizeMath(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Worked explanation to show under "Work", or null when nothing to show. */
export function resolveStepWorkText(step: Step): string | null {
  let body = step.body.trim();
  if (isDiagnosticBodyText(body)) body = '';
  if (body) return body;

  const formula = step.formula?.trim() ?? '';
  if (formula && formulaShowsNumericWork(formula)) return formula;

  return null;
}

/** Hide the separate Formula block when Work already shows the same math. */
export function shouldShowFormulaBlock(step: Step): boolean {
  const formula = step.formula?.trim() ?? '';
  if (!formula) return false;
  const work = resolveStepWorkText(step);
  if (!work) return true;
  return normalizeMath(work) !== normalizeMath(formula);
}
