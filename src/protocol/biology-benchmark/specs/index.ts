import type { BiologyBenchmarkSpec, BiologyBenchmarkVerifyResult } from '../types';
import { BIOLOGY_SPEC_ROWS } from './data';

function createPatternVerifier(
  patterns: string[],
): (capsuleText: string) => BiologyBenchmarkVerifyResult {
  const requiredHits = Math.min(3, Math.max(1, Math.ceil(patterns.length * 0.35)));

  return (capsuleText: string): BiologyBenchmarkVerifyResult => {
    if (!capsuleText.trim()) {
      return { ok: false, errors: ['Capsule text is empty.'] };
    }

    if (patterns.length === 0) {
      return { ok: true, errors: [] };
    }

    const matched = patterns.filter((pattern) => capsuleText.includes(pattern));
    if (matched.length >= requiredHits) {
      return { ok: true, errors: [] };
    }

    const missing = patterns.filter((pattern) => !capsuleText.includes(pattern));
    return {
      ok: false,
      errors: [
        `Concept grounding too weak: matched ${matched.length}/${patterns.length} patterns (need ${requiredHits}). Missing examples: ${missing.slice(0, 5).join(', ')}`,
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
  verify: createPatternVerifier(row.patterns),
}));

export function getBiologyBenchmarkSpec(id: string): BiologyBenchmarkSpec | undefined {
  return biologyBenchmarkSpecs.find((spec) => spec.id === id);
}
