import type { Capsule } from '@/src/protocol/types';
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

export function CapsuleSignals({ capsule }: { capsule: Capsule }) {
  const { nonStem, insufficientData } = capsuleSignals(capsule);
  const verification = capsule.verification;
  const uncertainty = capsule.uncertainty;
  if (!nonStem && !insufficientData && !verification && !uncertainty) return null;

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
      {verification && (
        <section
          className={`slm-verify ${verification.status === 'fail' ? 'is-fail' : 'is-pass'}`}
          data-verify-status={verification.status}
        >
          <h3 className="slm-signals-title">Verification</h3>
          <p className="slm-verify-status">status: {verification.status}</p>
          {verification.methods.length > 0 && (
            <p className="slm-verify-methods">methods: {verification.methods.join(', ')}</p>
          )}
          {verification.notes && (
            <div className="slm-verify-notes">
              <MathMarkdown content={verification.notes} />
            </div>
          )}
          {verification.status === 'fail' && verification.correction && (
            <p className="slm-verify-correction">correction: {verification.correction}</p>
          )}
        </section>
      )}
      {uncertainty && (
        <section className="slm-uncertainty">
          <h3 className="slm-signals-title">Uncertainty</h3>
          {uncertainty.assumptions.length > 0 && (
            <div className="slm-uncertainty-assumptions">
              <span className="slm-signals-label">assumptions</span>
              <ul>
                {uncertainty.assumptions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
          {uncertainty.lowConfidenceSteps.length > 0 && (
            <p className="slm-uncertainty-ids">
              low-confidence ids: {uncertainty.lowConfidenceSteps.join(', ')}
            </p>
          )}
          {uncertainty.studentChecks.length > 0 && (
            <div className="slm-uncertainty-check">
              <span className="slm-signals-label">student check</span>
              <ul>
                {uncertainty.studentChecks.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
