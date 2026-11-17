/**
 * Student-facing fold of protocol @verify / @uncertainty.
 * Keep parsing those blocks internally; never surface their chrome. What they say is shown as
 * the model's own words, never as something stemLM checked.
 */
import type { Capsule } from '@/src/protocol/types';

const PLACEHOLDER =
  /^(none|n\/a|n\.a\.|na|nil|null|unknown|-|—|–|nada)$/i;

const DROP_META =
  /^(status|methods|low[-_ ]confidence(?:\s+ids)?|student check)\s*:/i;

const STRIP_META = /^(correction|assumptions?)\s*:\s*/i;

const VERIFY_PROMPT =
  /^(verify|double-?check|check that|check the|confirm that|confirm the|confirm they|please (?:verify|check)|make sure (?:to |you )?(?:verify|check))\b/i;

const VERIFY_PROMPT_INLINE =
  /\b(verify that|you should verify|student (?:should|must) (?:verify|check|double-?check)|must double-?check)\b/i;

export function isProtocolPlaceholder(text: string): boolean {
  const t = text.trim().replace(/[.\s]+$/g, '');
  return !t || PLACEHOLDER.test(t);
}

export function isStudentVerifyPrompt(text: string): boolean {
  const t = text.trim();
  if (!t) return true;
  return VERIFY_PROMPT.test(t) || VERIFY_PROMPT_INLINE.test(t);
}

/** Null when the line is protocol chrome or a student-check prompt. */
export function normalizeStudentLine(text: string): string | null {
  let t = text.trim();
  if (!t || DROP_META.test(t)) return null;
  t = t.replace(STRIP_META, '').trim();
  if (isProtocolPlaceholder(t)) return null;
  if (/^(pass|fail)$/i.test(t)) return null;
  if (isStudentVerifyPrompt(t)) return null;
  return t;
}

export interface StudentNotes {
  /** What the model wrote about checking its own answer, and any correction it made. */
  check: string[];
  /** The model itself reported that its check did not pass. */
  checkFailed: boolean;
  /** What the model assumed that the question did not give. */
  assumptions: string[];
}

/**
 * Contentful statements trapped in verification/uncertainty, by what they are. Drops status,
 * methods, low-confidence ids, student-check prompts, and empty/`none` placeholders. A failed
 * self-check is kept as a fact of its own: without it a "fail" reads exactly like a pass.
 */
export function studentNotes(capsule: Capsule): StudentNotes {
  const seen = new Set<string>();
  const lines = (...raw: Array<string | undefined>) => {
    const out: string[] = [];
    for (const piece of raw.flatMap((text) => text?.split(/\n+/) ?? [])) {
      const t = normalizeStudentLine(piece);
      if (!t || seen.has(t.toLowerCase())) continue;
      seen.add(t.toLowerCase());
      out.push(t);
    }
    return out;
  };

  return {
    check: lines(capsule.verification?.notes, capsule.verification?.correction),
    checkFailed: capsule.verification?.status === 'fail',
    assumptions: lines(...(capsule.uncertainty?.assumptions ?? [])),
  };
}