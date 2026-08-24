import type { Capsule } from '@/src/protocol/types';
import { foldStudentNotesMarkdown } from '@/src/lib/student-notes';
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

  const insufficientData =
    /insufficient data|missing data|ill-posed|unsolvable/.test(hay) ||
    (capsule.uncertainty?.assumptions.some((a) =>
      /missing|not given|unknown|insufficient/i.test(a),
    ) ??
      false);

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

/** Real assumptions / contentful verify notes as ordinary unlabeled answer lines. */
export function StudentAnswerNotes({ capsule }: { capsule: Capsule }) {
  const markdown = foldStudentNotesMarkdown(capsule);
  if (!markdown) return null;
  return <MathMarkdown className="slm-answer-notes" content={markdown} />;
}
