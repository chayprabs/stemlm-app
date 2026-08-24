/**
 * Student-facing fold of protocol @verify / @uncertainty.
 * Keep parsing those blocks internally; never surface their chrome.
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

/**
 * Contentful statements trapped in verification/uncertainty, as ordinary
 * unlabeled answer lines. Drops status, methods, low-confidence ids,
 * student-check prompts, and empty/`none` placeholders.
 */
export function foldStudentNotes(capsule: Capsule): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const push = (raw: string | undefined) => {
    if (!raw) return;
    for (const piece of raw.split(/\n+/)) {
      const t = normalizeStudentLine(piece);
      if (!t) continue;
      const key = t.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(t);
    }
  };

  push(capsule.verification?.notes);
  push(capsule.verification?.correction);
  for (const assumption of capsule.uncertainty?.assumptions ?? []) {
    push(assumption);
  }

  return out;
}

export function foldStudentNotesMarkdown(capsule: Capsule): string {
  return foldStudentNotes(capsule).join('\n\n');
}
