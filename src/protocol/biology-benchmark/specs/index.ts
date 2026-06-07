import type { BiologyBenchmarkSpec, BiologyBenchmarkVerifyResult } from '../types';
import { BIOLOGY_SPEC_ROWS } from './data';

const NUMERIC_TOKEN_RE = /[-+]?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi;

function normalizeNumericToken(token: string): string {
  const numeric = Number(token);
  if (Number.isFinite(numeric)) return String(numeric);
  return token.toLowerCase();
}

function extractNumericTokens(text: string): string[] {
  const seen = new Set<string>();
  const matches = text.match(NUMERIC_TOKEN_RE) ?? [];
  for (const raw of matches) {
    const normalized = normalizeNumericToken(raw);
    if (normalized.length > 0) seen.add(normalized);
  }
  return [...seen];
}

/** Grounding check uses only numbers present in the question text — never pre-coded answers. */
function createQuestionVerifier(
  question: string,
): (capsuleText: string) => BiologyBenchmarkVerifyResult {
  const expectedTokens = extractNumericTokens(question);
  const expectedRequiredHits = Math.min(3, expectedTokens.length);

  return (capsuleText: string): BiologyBenchmarkVerifyResult => {
    if (!capsuleText.trim()) {
      return { ok: false, errors: ['Capsule text is empty.'] };
    }

    if (expectedTokens.length === 0) {
      return { ok: true, errors: [] };
    }

    const answerTokens = new Set(extractNumericTokens(capsuleText));
    const matched = expectedTokens.filter((token) => answerTokens.has(token));

    if (matched.length >= expectedRequiredHits) {
      return { ok: true, errors: [] };
    }

    return {
      ok: false,
      errors: [
        `Numeric grounding too weak: matched ${matched.length}/${expectedTokens.length} expected numeric tokens from question.`,
      ],
    };
  };
}

export const biologyBenchmarkSpecs: BiologyBenchmarkSpec[] = BIOLOGY_SPEC_ROWS.map((row) => ({
  id: row.id,
  number: row.number,
  topic: row.topic,
  question: row.question,
  year: 1 as const,
  difficulty: row.difficulty,
  verify: createQuestionVerifier(row.question),
}));

export function getBiologyBenchmarkSpec(id: string): BiologyBenchmarkSpec | undefined {
  return biologyBenchmarkSpecs.find((spec) => spec.id === id);
}
