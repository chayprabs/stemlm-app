/**
 * Pedagogical completeness checks for @step blocks.
 *
 * Catches formula-only steps (bare law with no symbol defs or numeric work)
 * that pass structural parsing but leave students unable to follow the math.
 */
import type { Archetype, ParseWarningCode, Step } from './types';

/** Substitution/plug-in is required only for these archetypes. */
export const NUMERIC_PLUG_IN_ARCHETYPES: ReadonlySet<Archetype> = new Set(['numeric', 'lab']);

export function stepNeedsNumericPlugIn(archetype?: Archetype): boolean {
  if (!archetype) return true;
  return NUMERIC_PLUG_IN_ARCHETYPES.has(archetype);
}

const SYMBOL_CONTEXT =
  /\b(where|means|is the|represents|denotes|defined as|angular frequency|reactance|resistance|impedance|voltage|current|capacit|induct)\b/i;

const NUMERIC_WORK = /\d/;

function bodyShowsNumericWork(body: string): boolean {
  if (!NUMERIC_WORK.test(body)) return false;
  return /=|≈|~|\\approx|\\times|\\cdot|\\frac|\\angle/.test(body);
}

const DIAGNOSTIC_BODY_PATTERNS = [
  /\bhas no @body\b/i,
  /\bno @body work\b/i,
  /needs numeric substitution in @body/i,
  /introduces symbols in @formula without defining them/i,
  /add symbol definitions and the worked calculation/i,
  /\bstep_missing_/i,
  /\bmissing_step_body\b/i,
  /\bformula_without_body\b/i,
  /\bparser error code was\b/i,
  /\bre-emit the (same|FULL) answer\b/i,
  /\bprevious stemLM capsule\b/i,
  /fix every step's @body/i,
  /\bEach @step with @formula\b/i,
  /\bis missing worked explanation\b/i,
  /packs multiple moves/i,
  /shows a formula but no @body/i,
  /without defining them in @body/i,
  /incomplete or malformed/i,
];

export function isDiagnosticBodyText(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return DIAGNOSTIC_BODY_PATTERNS.some((re) => re.test(t));
}

export function formulaShowsNumericWork(formula: string): boolean {
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
  if (
    SYMBOL_CONTEXT.test(body) &&
    /\b(is|are|means|where|denotes|represents|defined as|equals)\b/i.test(body)
  ) {
    return true;
  }
  // Gold-standard pattern: "$X_L$ is inductive reactance in $\Omega$."
  return /\$[^$\n]{1,48}\$\s+is\b/i.test(body);
}

/** Variables introduced in a symbolic @formula (subscripts, greek, hybrid-π). */
function extractFormulaVars(formula: string): string[] {
  const vars: string[] = [];
  for (const m of formula.matchAll(/\b([A-Z])(?:_\{?([A-Za-z0-9]+)\}?)?\b/g)) {
    if (m[2]) vars.push(`${m[1]}_${m[2]}`);
    else if ('RCILVXZYWPQFN'.includes(m[1]!)) vars.push(m[1]!);
  }
  if (/\\omega/i.test(formula)) vars.push('omega');
  if (/\\theta/i.test(formula)) vars.push('theta');
  if (/\\phi/i.test(formula)) vars.push('phi');
  if (/r[_\s]?(?:π|pi)\b/i.test(formula)) vars.push('r_pi');
  if (/\bg[_]?m\b/i.test(formula)) vars.push('g_m');
  return [...new Set(vars)];
}

function normalizeVarToken(s: string): string {
  return s
    .replace(/\\Omega/g, 'ΩUNIT')
    .toLowerCase()
    .replace(/\\omega/g, 'omega')
    .replace(/\\pi/g, 'pi')
    .replace(/[_\s]/g, '');
}

function bodyContainsVar(body: string, v: string): boolean {
  if (v === 'omega') {
    // Case-sensitive: do not treat \Omega (ohm unit) as angular frequency \omega.
    return /\\omega\b/.test(body) || /\bangular frequency\b/i.test(body);
  }
  const tok = normalizeVarToken(v);
  if (tok.length > 1 || tok === 'rpi' || tok === 'gm') {
    const escaped = tok.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(escaped, 'i').test(normalizeVarToken(body)) || new RegExp(escaped, 'i').test(body);
  }
  // Single-letter symbols must appear as math tokens — not inside words like "frequency".
  return (
    new RegExp(`\\$[^$]*\\b${v}\\b[^$]*\\$`, 'i').test(body) ||
    new RegExp(`\\b${v}[_=\\{\\(]`, 'i').test(body) ||
    new RegExp(`_${v}\\b`, 'i').test(body)
  );
}

/** Body uses formula symbols in math (plug-in counts as defining them for students). */
function bodyUsesFormulaVars(body: string, formula: string): boolean {
  const vars = extractFormulaVars(formula);
  if (!vars.length) return false;
  return vars.some((v) => bodyContainsVar(body, v));
}

function formulaIntroducesSymbols(formula: string): boolean {
  return /_[A-Za-z]|\\omega|\\Omega|\\mu|\\theta|\\phi|\\angle\s*[A-Za-z]/i.test(formula);
}

/** Fill empty @body from worked @formula so students see math instead of blank steps. */
export function enrichStepBody(step: Step): void {
  let body = (step.body ?? '').trim();
  if (isDiagnosticBodyText(body)) {
    step.body = '';
    body = '';
  }
  if (body) return;

  const formula = step.formula?.trim() ?? '';
  if (formula && formulaShowsNumericWork(formula)) {
    step.body = formula;
  }
}

export function auditStepQuality(
  step: Step,
  opt?: { archetype?: Archetype },
): ParseWarningCode[] {
  const issues: ParseWarningCode[] = [];
  const body = (step.body ?? '').trim();
  const formula = step.formula?.trim() ?? '';

  if (isDiagnosticBodyText(body)) {
    issues.push('missing_step_body');
    if (formula) issues.push('formula_without_body');
    return issues;
  }

  if (!body) {
    issues.push('missing_step_body');
    if (formula) issues.push('formula_without_body');
    return issues;
  }

  if (!formula) return issues;

  const formulaWorked = formulaShowsNumericWork(formula);
  const hasSubstitution = bodyShowsNumericWork(body);
  const hasSymbolContext =
    bodyDefinesSymbols(body) || (hasSubstitution && bodyUsesFormulaVars(body, formula));

  if (stepNeedsNumericPlugIn(opt?.archetype) && !hasSubstitution) {
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

export function stepHasQualityIssues(step: Step, opt?: { archetype?: Archetype }): boolean {
  return auditStepQuality(step, opt).length > 0;
}

export function primaryStepQualityIssue(
  step: Step,
  opt?: { archetype?: Archetype },
): ParseWarningCode | null {
  return auditStepQuality(step, opt)[0] ?? null;
}

const HARD_STEP_QUALITY_CODES = new Set<ParseWarningCode>([
  'missing_step_body',
  'formula_without_body',
  'step_missing_substitution',
]);

/** Hard failures (empty body, no numbers) — always worth a repair prompt. */
export function stepHasHardQualityIssue(step: Step, opt?: { archetype?: Archetype }): boolean {
  return auditStepQuality(step, opt).some((c) => HARD_STEP_QUALITY_CODES.has(c));
}

/** Only queue chatbox repair when work is broadly broken, not one soft symbol line. */
export function capsuleNeedsStepQualityRepair(
  steps: Step[],
  opt?: { archetype?: Archetype },
): boolean {
  const weak = steps.filter((s) => auditStepQuality(s, opt).length > 0);
  if (!weak.length) return false;
  if (weak.some((s) => stepHasHardQualityIssue(s, opt))) return true;
  return weak.length >= Math.ceil(steps.length * 0.5);
}
