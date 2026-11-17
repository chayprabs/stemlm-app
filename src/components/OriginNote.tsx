import type { Session } from '@/src/protocol/types';

/** Shown wherever an answer structured from a plain chat reply is read: panel, solution, PDF. */
export const ORIGIN_NOTE = 'Structured from the chat answer. Not checked by stemlm.';
export const ORIGIN_NOTE_DETAIL =
  'stemlm arranged this answer into steps without changing its wording. It did not verify the working.';

/**
 * The provenance of a session that was structured from a plain chat answer. A stemLM answer
 * renders nothing.
 *
 * - `label`: the one line under the question, with the explanation on hover.
 * - `detail`: the explanation itself, closing the Solution document. The label stays in the
 *   header above it, so the two never say the same sentence twice on one screen, and a reader
 *   who cannot hover still gets the explanation.
 * - `print`: both, as the PDF report's small print. A page has no hover and no panel styles.
 */
export function OriginNote({
  session,
  variant = 'label',
}: {
  session: Pick<Session, 'origin'>;
  variant?: 'label' | 'detail' | 'print';
}) {
  if (session.origin !== 'ingest') return null;
  if (variant === 'print') {
    return (
      <p className="slm-report-origin">
        <small>{ORIGIN_NOTE} {ORIGIN_NOTE_DETAIL}</small>
      </p>
    );
  }
  if (variant === 'detail') return <p className="slm-origin-note">{ORIGIN_NOTE_DETAIL}</p>;
  return (
    <p className="slm-origin-note" title={ORIGIN_NOTE_DETAIL}>
      {ORIGIN_NOTE}
    </p>
  );
}
