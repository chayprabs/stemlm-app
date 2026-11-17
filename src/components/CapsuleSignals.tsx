import type { Capsule } from '@/src/protocol/types';
import { studentNotes } from '@/src/lib/student-notes';
import { MathMarkdown } from './MathMarkdown';

export function capsuleSignals(capsule: Capsule): {
  nonStem: boolean;
  insufficientData: boolean;
} {
  const hay = [
    capsule.meta.topic,
    capsule.meta.question ?? '',
    capsule.solution,
    ...(capsule.uncertainty?.assumptions ?? []),
    ...(capsule.uncertainty?.studentChecks ?? []),
    ...capsule.steps.map((s) => `${s.title} ${s.body}`),
  ]
    .join('\n')
    .toLowerCase();

  const nonStem =
    (capsule.meta.subject === 'General' &&
      (capsule.meta.archetype === 'conceptual' ||
        /not a stem|non-stem|not stem/.test(hay))) ||
    /not a stem question|not a stem solve/.test(hay);

  // Only the model's explicit verdict: an assumption that names an unknown it
  // then neglects ("air resistance unknown, neglected") is a normal solve.
  const insufficientData = /insufficient data|missing data|ill-posed|unsolvable/.test(hay);

  return { nonStem, insufficientData };
}

/** Flags only — never verification/uncertainty protocol chrome. */
export function CapsuleSignals({ capsule }: { capsule: Capsule }) {
  const { nonStem, insufficientData } = capsuleSignals(capsule);
  if (!nonStem && !insufficientData) return null;

  return (
    <div className="slm-signals">
      {nonStem && (
        <div className="slm-signal slm-signal--flag" role="status">
          Not a STEM question
        </div>
      )}
      {insufficientData && (
        <div className="slm-signal slm-signal--flag" role="status">
          Insufficient data
        </div>
      )}
    </div>
  );
}

/** What the model said when a check of its own answer did not pass. */
export const CHECK_FAILED_NOTE = 'The model reported that this answer did not pass its own check.';

/**
 * What the model said about its own answer, as small print under it: its check, and what it
 * assumed. Each is labelled as the model's, so neither reads as something stemLM verified, and
 * a check the model reported as failed is said in words.
 */
export function StudentAnswerNotes({ capsule }: { capsule: Capsule }) {
  const { check, checkFailed, assumptions } = studentNotes(capsule);
  const checked = checkFailed || check.length > 0;
  if (!checked && assumptions.length === 0) return null;
  return (
    <div className="slm-answer-notes">
      {checked && (
        <div className="slm-answer-note" data-failed={checkFailed || undefined}>
          <span className="slm-answer-note-label">The model's own check</span>
          {checkFailed && <p className="slm-answer-note-failed">{CHECK_FAILED_NOTE}</p>}
          {check.length > 0 && <MathMarkdown content={check.join('\n\n')} />}
        </div>
      )}
      {assumptions.length > 0 && (
        <div className="slm-answer-note">
          <span className="slm-answer-note-label">The model assumed</span>
          <MathMarkdown content={assumptions.join('\n\n')} />
        </div>
      )}
    </div>
  );
}
