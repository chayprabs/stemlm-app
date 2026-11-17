/**
 * Subject for an ingested answer, on top of the question classifier.
 *
 * `classifySubject` scores keywords and was built for questions. A whole answer drowns it in
 * incidental words ("product rule", "base case"), so only the answer's opening is added, and the
 * question counts twice. Notation settles what keywords cannot.
 */
import type { Subject } from '@/src/protocol/types';
import { classifySubject } from '@/src/protocol/classifier';

export interface AnswerEvidence {
  /** Opening prose of the answer, as plain text. */
  opening: string;
  /** The answer writes chemistry with mhchem (`\ce{...}`). */
  chemistry: boolean;
  /** The answer contains a programming-language code block. */
  code: boolean;
  /** The answer contains TeX math. */
  math: boolean;
}

/** The classifier reads the unit "km" as the Michaelis constant K_m; spell the unit out for it. */
function spellUnits(text: string): string {
  return text.replace(/\bkm\b/g, 'kilometre');
}

export function inferSubject(question: string, evidence: AnswerEvidence): Subject {
  const q = spellUnits(question.trim());
  const scored = classifySubject(`${q}\n${q}\n${spellUnits(evidence.opening)}`);
  // mhchem is only ever written for chemistry; generic science words must not outvote it.
  if (evidence.chemistry && (scored === 'General' || scored === 'Math' || scored === 'Physics')) return 'Chemistry';
  if (scored !== 'General') return scored;
  if (evidence.code) return 'CS';
  return evidence.math ? 'Math' : 'General';
}
