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
  let body = (step.body ?? '').trim();
  if (isDiagnosticBodyText(body)) body = '';
  if (body) return body;

  const formula = step.formula?.trim() ?? '';
  if (formula && formulaShowsNumericWork(formula)) return formula;

  return null;
}

/** TeX of an equation without its delimiters or any whitespace, for comparing two writings of it. */
function texCore(math: string): string {
  return math
    .trim()
    .replace(/^(?:\$\$|\$|\\\[|\\\()/, '')
    .replace(/(?:\$\$|\$|\\\]|\\\))[.,;:]?$/, '')
    .replace(/\s+/g, '');
}

/**
 * The display equations in a body (`$$...$$` and `\[...\]`), left to right. A plain scan rather
 * than a pattern: the body is model text, and a wall of unclosed delimiters must stay linear.
 */
function displayEquations(body: string): string[] {
  const out: string[] = [];
  let dollars = body.indexOf('$$');
  let brackets = body.indexOf('\\[');
  while (dollars >= 0 || brackets >= 0) {
    const dollar = dollars >= 0 && (brackets < 0 || dollars < brackets);
    const open = dollar ? dollars : brackets;
    // `\\[2pt]` is a line break with spacing inside an equation, not an opener.
    if (!dollar && body[open - 1] === '\\') {
      brackets = body.indexOf('\\[', open + 2);
      continue;
    }
    const close = body.indexOf(dollar ? '$$' : '\\]', open + 2);
    const next = close < 0 ? open + 2 : close + 2;
    if (close >= 0) out.push(body.slice(open + 2, close));
    // An opener that never closes means no later opener of its kind closes either.
    if (dollar) dollars = close < 0 ? -1 : body.indexOf('$$', next);
    else brackets = close < 0 ? -1 : body.indexOf('\\[', next);
    if (dollars >= 0 && dollars < next) dollars = body.indexOf('$$', next);
    if (brackets >= 0 && brackets < next) brackets = body.indexOf('\\[', next);
  }
  return out;
}

/**
 * True when the body sets the formula as a display equation of its own. An answer structured
 * from a plain reply keeps the equation in the body whenever its sentence runs through it, and
 * would otherwise show the same display line twice. Inline mentions do not count: "so $F = ma$
 * gives ..." is the body using the formula, not showing it.
 */
function bodyDisplaysFormula(body: string, formula: string): boolean {
  const core = texCore(formula);
  if (!core) return false;
  if (displayEquations(body).some((tex) => tex.replace(/\s+/g, '') === core)) return true;
  // An environment written without delimiters (\begin{align} ... \end{align}) is its own display.
  return core.startsWith('\\begin{') && body.replace(/\s+/g, '').includes(core);
}

/** Hide the separate Formula block when Work already shows the same math. */
export function shouldShowFormulaBlock(step: Step): boolean {
  const formula = step.formula?.trim() ?? '';
  if (!formula) return false;
  const work = resolveStepWorkText(step);
  if (!work) return true;
  if (normalizeMath(work) === normalizeMath(formula)) return false;
  return !bodyDisplaysFormula(work, formula);
}
