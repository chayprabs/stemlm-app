import type { Session } from '@/src/protocol/types';

/**
 * What stemLM did with an answer and what it did not check. Every answer says it once, under the
 * answer; the PDF report says the same sentence in its foot.
 */
export const REPORT_NOTE =
  'The steps and figures were written by the chat model and laid out by stemLM, which does not verify them.';

/** The same for an answer structured from a plain chat reply, where stemLM did the arranging. */
export const ORIGIN_NOTE_DETAIL =
  'stemLM arranged this answer into steps without changing its wording. It did not verify the working.';

/** Where such an answer came from, under its question. What was checked is said under the answer. */
export const ORIGIN_NOTE = 'Structured from the chat answer.';

/**
 * The provenance of an answer.
 *
 * - `label`: the one line under the question of an answer structured from a plain chat reply,
 *   with the explanation on hover. A stemLM answer renders nothing here.
 * - `detail`: the line under every answer, closing the last step and the Solution document:
 *   what stemLM did and did not check. It never repeats the label's sentence.
 * - `print`: both, as the PDF report's small print for a structured answer. A page has no hover,
 *   and the report's own print sheet styles it (src/lib/pdf.ts): panel styles never reach that
 *   document. A stemLM answer's report carries REPORT_NOTE in its foot instead.
 */
export function OriginNote({
  session,
  variant = 'label',
}: {
  session: Pick<Session, 'origin'>;
  variant?: 'label' | 'detail' | 'print';
}) {
  const ingest = session.origin === 'ingest';
  if (variant === 'detail') return <p className="slm-origin-note">{ingest ? ORIGIN_NOTE_DETAIL : REPORT_NOTE}</p>;
  if (!ingest) return null;
  if (variant === 'print') return <p className="slm-report-origin">{ORIGIN_NOTE} {ORIGIN_NOTE_DETAIL}</p>;
  return (
    <p className="slm-origin-note" title={ORIGIN_NOTE_DETAIL}>
      {ORIGIN_NOTE}
    </p>
  );
}
