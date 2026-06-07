export interface VerificationResult {
  ok: boolean;
  errors: string[];
}

export interface ParsedStepLike {
  body?: string;
  formula?: string;
  takeaway?: string;
}

export interface ParsedCapsuleTextLike {
  allText?: string;
  steps?: ParsedStepLike[];
  solution?: string;
}

export type SolverInput = string | ParsedCapsuleTextLike;

export type PhysicsVerificationSolver = (input: SolverInput) => VerificationResult;

export interface NumericTolerance {
  abs?: number;
  rel?: number;
}

interface SolverContext {
  allText: string;
  normalizedText: string;
  numbers: number[];
  errors: string[];
}

function toAllText(input: SolverInput): string {
  if (typeof input === 'string') return input;
  if (typeof input.allText === 'string' && input.allText.trim()) return input.allText;
  const stepsText = (input.steps ?? [])
    .map((step) => [step.body ?? '', step.formula ?? '', step.takeaway ?? ''].join(' '))
    .join(' ');
  return [stepsText, input.solution ?? ''].join(' ').trim();
}

function normalizeScientificNotation(raw: string): string {
  return raw
    .replace(/\u2212/g, '-')
    .replace(/\\times/g, 'x')
    .replace(/×/g, 'x')
    .replace(/([+-]?\d+(?:\.\d+)?)\s*x\s*10\^\{?\s*([+-]?\d+)\s*\}?/gi, '$1e$2')
    .replace(/([+-]?\d+(?:\.\d+)?)\s*\*\s*10\^\{?\s*([+-]?\d+)\s*\}?/gi, '$1e$2');
}

function extractFractions(text: string): number[] {
  const out: number[] = [];
  const latexFrac = /\\frac\{\s*([+-]?\d+(?:\.\d+)?)\s*\}\{\s*([+-]?\d+(?:\.\d+)?)\s*\}/g;
  let match: RegExpExecArray | null;
  while ((match = latexFrac.exec(text)) !== null) {
    const numerator = Number.parseFloat(match[1] ?? '');
    const denominator = Number.parseFloat(match[2] ?? '');
    if (Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0) {
      out.push(numerator / denominator);
    }
  }
  return out;
}

function extractNumbers(text: string): number[] {
  const normalized = normalizeScientificNotation(text).replace(/,/g, '');
  const out = extractFractions(normalized);
  const numberToken = /(?<![A-Za-z])([+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?)(?![A-Za-z])/g;
  let match: RegExpExecArray | null;
  while ((match = numberToken.exec(normalized)) !== null) {
    const value = Number.parseFloat(match[1] ?? '');
    if (Number.isFinite(value)) out.push(value);
  }
  return out;
}

function isApproxEqual(actual: number, expected: number, tolerance?: NumericTolerance): boolean {
  const abs = tolerance?.abs ?? 1e-3;
  const rel = tolerance?.rel ?? 0.03;
  const scale = Math.max(1, Math.abs(expected), Math.abs(actual));
  return Math.abs(actual - expected) <= abs + rel * scale;
}

function buildContext(input: SolverInput): SolverContext {
  const allText = toAllText(input);
  return {
    allText,
    normalizedText: allText.toLowerCase(),
    numbers: extractNumbers(allText),
    errors: [],
  };
}

export function expectApprox(
  context: SolverContext,
  label: string,
  expected: number,
  tolerance?: NumericTolerance,
): void {
  const found = context.numbers.some((value) => isApproxEqual(value, expected, tolerance));
  if (!found) {
    context.errors.push(`Missing ${label} ≈ ${expected.toPrecision(6)}`);
  }
}

export function expectRegex(context: SolverContext, label: string, pattern: RegExp): void {
  if (!pattern.test(context.allText)) {
    context.errors.push(`Missing ${label}`);
  }
}

export function expectContains(context: SolverContext, label: string, snippet: string): void {
  if (!context.normalizedText.includes(snippet.toLowerCase())) {
    context.errors.push(`Missing ${label}`);
  }
}

export function withSolverContext(
  input: SolverInput,
  verify: (context: SolverContext) => void,
): VerificationResult {
  const context = buildContext(input);
  verify(context);
  return {
    ok: context.errors.length === 0,
    errors: context.errors,
  };
}
